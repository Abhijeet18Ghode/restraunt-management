const axios = require('axios');
const logger = require('../utils/logger');

class InventoryTransferService {
  constructor() {
    this.inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
    this.transferStatuses = {
      PENDING: 'pending',
      IN_TRANSIT: 'in_transit',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled',
      REJECTED: 'rejected'
    };
  }

  async createTransferRequest(tenantId, transferData) {
    try {
      const {
        fromOutletId,
        toOutletId,
        items,
        requestedBy,
        priority = 'normal',
        notes = '',
        expectedDeliveryDate
      } = transferData;

      logger.info('Creating inventory transfer request', {
        tenantId,
        fromOutletId,
        toOutletId,
        itemCount: items.length
      });

      // Validate source outlet has sufficient inventory
      const validationResult = await this.validateTransferRequest(tenantId, fromOutletId, items);
      if (!validationResult.valid) {
        throw new Error(`Transfer validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Generate transfer ID
      const transferId = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Create transfer record
      const transferRecord = {
        id: transferId,
        tenantId,
        fromOutletId,
        toOutletId,
        items: items.map(item => ({
          inventoryItemId: item.inventoryItemId,
          itemName: item.itemName,
          requestedQuantity: item.quantity,
          unit: item.unit,
          estimatedValue: item.estimatedValue || 0
        })),
        status: this.transferStatuses.PENDING,
        requestedBy,
        requestedAt: new Date().toISOString(),
        priority,
        notes,
        expectedDeliveryDate,
        totalEstimatedValue: items.reduce((sum, item) => sum + (item.estimatedValue || 0), 0)
      };

      // Reserve inventory at source outlet
      await this.reserveInventoryForTransfer(tenantId, fromOutletId, transferId, items);

      logger.info('Transfer request created successfully', {
        tenantId,
        transferId,
        fromOutletId,
        toOutletId
      });

      return {
        success: true,
        transferId,
        transfer: transferRecord,
        validationResult
      };
    } catch (error) {
      logger.error('Failed to create transfer request:', error);
      throw error;
    }
  }

  async approveTransferRequest(tenantId, transferId, approvedBy, approvalNotes = '') {
    try {
      logger.info('Approving transfer request', { tenantId, transferId, approvedBy });

      // Get transfer details
      const transfer = await this.getTransferById(tenantId, transferId);
      if (!transfer) {
        throw new Error('Transfer request not found');
      }

      if (transfer.status !== this.transferStatuses.PENDING) {
        throw new Error(`Cannot approve transfer in status: ${transfer.status}`);
      }

      // Update transfer status
      const updatedTransfer = {
        ...transfer,
        status: this.transferStatuses.IN_TRANSIT,
        approvedBy,
        approvedAt: new Date().toISOString(),
        approvalNotes,
        estimatedDeliveryDate: this.calculateEstimatedDelivery(transfer.fromOutletId, transfer.toOutletId)
      };

      // Deduct inventory from source outlet
      await this.deductInventoryFromSource(tenantId, transfer.fromOutletId, transferId, transfer.items);

      // Create shipment tracking
      const trackingInfo = await this.createShipmentTracking(tenantId, transferId, updatedTransfer);

      logger.info('Transfer request approved successfully', {
        tenantId,
        transferId,
        approvedBy
      });

      return {
        success: true,
        transfer: updatedTransfer,
        trackingInfo
      };
    } catch (error) {
      logger.error('Failed to approve transfer request:', error);
      throw error;
    }
  }

  async completeTransferDelivery(tenantId, transferId, receivedBy, receivedItems, deliveryNotes = '') {
    try {
      logger.info('Completing transfer delivery', { tenantId, transferId, receivedBy });

      const transfer = await this.getTransferById(tenantId, transferId);
      if (!transfer) {
        throw new Error('Transfer request not found');
      }

      if (transfer.status !== this.transferStatuses.IN_TRANSIT) {
        throw new Error(`Cannot complete transfer in status: ${transfer.status}`);
      }

      // Validate received items
      const validationResult = this.validateReceivedItems(transfer.items, receivedItems);

      // Add inventory to destination outlet
      await this.addInventoryToDestination(tenantId, transfer.toOutletId, transferId, receivedItems);

      // Update transfer status
      const completedTransfer = {
        ...transfer,
        status: this.transferStatuses.DELIVERED,
        receivedBy,
        receivedAt: new Date().toISOString(),
        deliveryNotes,
        receivedItems,
        discrepancies: validationResult.discrepancies,
        actualValue: receivedItems.reduce((sum, item) => sum + (item.actualValue || 0), 0)
      };

      // Release any remaining reserved inventory
      await this.releaseReservedInventory(tenantId, transfer.fromOutletId, transferId);

      logger.info('Transfer delivery completed successfully', {
        tenantId,
        transferId,
        receivedBy,
        discrepancies: validationResult.discrepancies.length
      });

      return {
        success: true,
        transfer: completedTransfer,
        validationResult
      };
    } catch (error) {
      logger.error('Failed to complete transfer delivery:', error);
      throw error;
    }
  }

  async cancelTransferRequest(tenantId, transferId, cancelledBy, cancellationReason) {
    try {
      logger.info('Cancelling transfer request', { tenantId, transferId, cancelledBy });

      const transfer = await this.getTransferById(tenantId, transferId);
      if (!transfer) {
        throw new Error('Transfer request not found');
      }

      if (![this.transferStatuses.PENDING, this.transferStatuses.IN_TRANSIT].includes(transfer.status)) {
        throw new Error(`Cannot cancel transfer in status: ${transfer.status}`);
      }

      // Release reserved inventory
      await this.releaseReservedInventory(tenantId, transfer.fromOutletId, transferId);

      // If in transit, handle return to source
      if (transfer.status === this.transferStatuses.IN_TRANSIT) {
        await this.returnInventoryToSource(tenantId, transfer.fromOutletId, transferId, transfer.items);
      }

      const cancelledTransfer = {
        ...transfer,
        status: this.transferStatuses.CANCELLED,
        cancelledBy,
        cancelledAt: new Date().toISOString(),
        cancellationReason
      };

      logger.info('Transfer request cancelled successfully', {
        tenantId,
        transferId,
        cancelledBy
      });

      return {
        success: true,
        transfer: cancelledTransfer
      };
    } catch (error) {
      logger.error('Failed to cancel transfer request:', error);
      throw error;
    }
  }

  async getTransferHistory(tenantId, filters = {}) {
    try {
      const {
        outletId,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = filters;

      logger.info('Getting transfer history', { tenantId, filters });

      // Mock implementation - in production, query database
      const mockTransfers = this.generateMockTransferHistory(tenantId, filters);

      // Apply filters
      let filteredTransfers = mockTransfers;

      if (outletId) {
        filteredTransfers = filteredTransfers.filter(t => 
          t.fromOutletId === outletId || t.toOutletId === outletId
        );
      }

      if (status) {
        filteredTransfers = filteredTransfers.filter(t => t.status === status);
      }

      if (startDate) {
        filteredTransfers = filteredTransfers.filter(t => 
          new Date(t.requestedAt) >= new Date(startDate)
        );
      }

      if (endDate) {
        filteredTransfers = filteredTransfers.filter(t => 
          new Date(t.requestedAt) <= new Date(endDate)
        );
      }

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedTransfers = filteredTransfers.slice(startIndex, endIndex);

      return {
        success: true,
        transfers: paginatedTransfers,
        pagination: {
          page,
          limit,
          total: filteredTransfers.length,
          pages: Math.ceil(filteredTransfers.length / limit)
        },
        summary: {
          totalTransfers: filteredTransfers.length,
          byStatus: this.getTransferStatusSummary(filteredTransfers),
          totalValue: filteredTransfers.reduce((sum, t) => sum + (t.totalEstimatedValue || 0), 0)
        }
      };
    } catch (error) {
      logger.error('Failed to get transfer history:', error);
      throw error;
    }
  }

  async getOutletInventoryLevels(tenantId, outletId) {
    try {
      logger.info('Getting outlet inventory levels', { tenantId, outletId });

      const response = await axios.get(
        `${this.inventoryServiceUrl}/inventory/levels?outletId=${outletId}`,
        {
          headers: {
            'x-tenant-id': tenantId,
            'Authorization': 'Bearer mock-token'
          }
        }
      );

      return {
        success: true,
        outletId,
        inventoryLevels: response.data.levels || [],
        lowStockItems: response.data.lowStockItems || [],
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get outlet inventory levels:', error);
      return {
        success: false,
        error: error.message,
        outletId,
        inventoryLevels: [],
        lowStockItems: []
      };
    }
  }

  // Helper methods
  async validateTransferRequest(tenantId, fromOutletId, items) {
    const errors = [];
    const warnings = [];

    try {
      const inventoryLevels = await this.getOutletInventoryLevels(tenantId, fromOutletId);
      
      if (!inventoryLevels.success) {
        errors.push('Unable to validate source outlet inventory');
        return { valid: false, errors, warnings };
      }

      for (const item of items) {
        const inventoryItem = inventoryLevels.inventoryLevels.find(
          inv => inv.inventoryItemId === item.inventoryItemId
        );

        if (!inventoryItem) {
          errors.push(`Item ${item.itemName} not found in source outlet`);
          continue;
        }

        if (inventoryItem.availableQuantity < item.quantity) {
          errors.push(
            `Insufficient quantity for ${item.itemName}. Available: ${inventoryItem.availableQuantity}, Requested: ${item.quantity}`
          );
        }

        if (inventoryItem.availableQuantity - item.quantity < inventoryItem.minimumStock) {
          warnings.push(
            `Transfer will bring ${item.itemName} below minimum stock level at source outlet`
          );
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        valid: false,
        errors: ['Validation failed: ' + error.message],
        warnings: []
      };
    }
  }

  async reserveInventoryForTransfer(tenantId, outletId, transferId, items) {
    try {
      for (const item of items) {
        await axios.post(
          `${this.inventoryServiceUrl}/inventory/reserve`,
          {
            outletId,
            inventoryItemId: item.inventoryItemId,
            quantity: item.quantity,
            reservationType: 'transfer',
            referenceId: transferId,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
          },
          {
            headers: {
              'x-tenant-id': tenantId,
              'Authorization': 'Bearer mock-token'
            }
          }
        );
      }
    } catch (error) {
      logger.error('Failed to reserve inventory:', error);
      throw error;
    }
  }

  async deductInventoryFromSource(tenantId, outletId, transferId, items) {
    try {
      for (const item of items) {
        await axios.post(
          `${this.inventoryServiceUrl}/inventory/deduct`,
          {
            outletId,
            inventoryItemId: item.inventoryItemId,
            quantity: item.requestedQuantity,
            reason: 'inter_outlet_transfer',
            referenceId: transferId
          },
          {
            headers: {
              'x-tenant-id': tenantId,
              'Authorization': 'Bearer mock-token'
            }
          }
        );
      }
    } catch (error) {
      logger.error('Failed to deduct inventory from source:', error);
      throw error;
    }
  }

  async addInventoryToDestination(tenantId, outletId, transferId, items) {
    try {
      for (const item of items) {
        await axios.post(
          `${this.inventoryServiceUrl}/inventory/add`,
          {
            outletId,
            inventoryItemId: item.inventoryItemId,
            quantity: item.receivedQuantity,
            reason: 'inter_outlet_transfer',
            referenceId: transferId,
            actualValue: item.actualValue
          },
          {
            headers: {
              'x-tenant-id': tenantId,
              'Authorization': 'Bearer mock-token'
            }
          }
        );
      }
    } catch (error) {
      logger.error('Failed to add inventory to destination:', error);
      throw error;
    }
  }

  async releaseReservedInventory(tenantId, outletId, transferId) {
    try {
      await axios.delete(
        `${this.inventoryServiceUrl}/inventory/reservations/${transferId}`,
        {
          headers: {
            'x-tenant-id': tenantId,
            'Authorization': 'Bearer mock-token'
          }
        }
      );
    } catch (error) {
      logger.error('Failed to release reserved inventory:', error);
    }
  }

  async returnInventoryToSource(tenantId, outletId, transferId, items) {
    try {
      for (const item of items) {
        await axios.post(
          `${this.inventoryServiceUrl}/inventory/add`,
          {
            outletId,
            inventoryItemId: item.inventoryItemId,
            quantity: item.requestedQuantity,
            reason: 'transfer_cancellation',
            referenceId: transferId
          },
          {
            headers: {
              'x-tenant-id': tenantId,
              'Authorization': 'Bearer mock-token'
            }
          }
        );
      }
    } catch (error) {
      logger.error('Failed to return inventory to source:', error);
      throw error;
    }
  }

  validateReceivedItems(requestedItems, receivedItems) {
    const discrepancies = [];

    for (const requested of requestedItems) {
      const received = receivedItems.find(r => r.inventoryItemId === requested.inventoryItemId);
      
      if (!received) {
        discrepancies.push({
          inventoryItemId: requested.inventoryItemId,
          itemName: requested.itemName,
          type: 'missing',
          requested: requested.requestedQuantity,
          received: 0
        });
      } else if (received.receivedQuantity !== requested.requestedQuantity) {
        discrepancies.push({
          inventoryItemId: requested.inventoryItemId,
          itemName: requested.itemName,
          type: 'quantity_mismatch',
          requested: requested.requestedQuantity,
          received: received.receivedQuantity,
          difference: received.receivedQuantity - requested.requestedQuantity
        });
      }
    }

    return { discrepancies };
  }

  calculateEstimatedDelivery(fromOutletId, toOutletId) {
    // Mock calculation - in production, use actual distance/logistics data
    const baseDeliveryTime = 2; // hours
    return new Date(Date.now() + baseDeliveryTime * 60 * 60 * 1000).toISOString();
  }

  async createShipmentTracking(tenantId, transferId, transfer) {
    return {
      trackingId: `TRACK-${transferId}`,
      status: 'in_transit',
      estimatedDelivery: transfer.estimatedDeliveryDate,
      currentLocation: 'In transit',
      updates: [
        {
          timestamp: new Date().toISOString(),
          status: 'shipped',
          location: `Outlet ${transfer.fromOutletId}`,
          description: 'Package shipped from source outlet'
        }
      ]
    };
  }

  async getTransferById(tenantId, transferId) {
    // Mock implementation - in production, query database
    return {
      id: transferId,
      tenantId,
      fromOutletId: 'outlet-1',
      toOutletId: 'outlet-2',
      status: this.transferStatuses.PENDING,
      items: [
        {
          inventoryItemId: 'item-1',
          itemName: 'Tomatoes',
          requestedQuantity: 10,
          unit: 'kg'
        }
      ]
    };
  }

  generateMockTransferHistory(tenantId, filters) {
    // Mock data for testing
    return [
      {
        id: 'TRF-001',
        tenantId,
        fromOutletId: 'outlet-1',
        toOutletId: 'outlet-2',
        status: this.transferStatuses.DELIVERED,
        requestedAt: '2024-01-01T10:00:00Z',
        totalEstimatedValue: 500
      },
      {
        id: 'TRF-002',
        tenantId,
        fromOutletId: 'outlet-2',
        toOutletId: 'outlet-3',
        status: this.transferStatuses.IN_TRANSIT,
        requestedAt: '2024-01-02T14:00:00Z',
        totalEstimatedValue: 750
      }
    ];
  }

  getTransferStatusSummary(transfers) {
    const summary = {};
    Object.values(this.transferStatuses).forEach(status => {
      summary[status] = transfers.filter(t => t.status === status).length;
    });
    return summary;
  }
}

module.exports = InventoryTransferService;