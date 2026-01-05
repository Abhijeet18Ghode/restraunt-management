const { 
  createApiResponse,
  ValidationError,
  ResourceNotFoundError,
  DatabaseError
} = require('@rms/shared');

/**
 * Kitchen Order Ticket (KOT) management service
 */
class KOTService {
  constructor(dbManager) {
    this.db = dbManager;
  }

  /**
   * Generate KOT for finalized bill
   */
  async generateKOT(tenantId, kotData) {
    const { 
      orderId, 
      orderNumber, 
      tableId, 
      orderType = 'DINE_IN',
      items,
      priority = 'NORMAL',
      notes 
    } = kotData;

    try {
      if (!items || items.length === 0) {
        throw new ValidationError('KOT must contain at least one item');
      }

      // Generate unique KOT number
      const kotNumber = await this.generateKOTNumber(tenantId, orderNumber);

      // Calculate estimated completion time based on items
      const estimatedCompletionTime = this.calculateEstimatedTime(items);

      const kot = {
        id: `kot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        kotNumber,
        orderId,
        orderNumber,
        tableId,
        orderType,
        items: items.map(item => ({
          id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          menuItemId: item.menuItemId,
          name: item.menuItemName || item.name,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions || null,
          status: 'PENDING',
          startedAt: null,
          completedAt: null,
        })),
        priority,
        status: 'PENDING',
        notes,
        createdAt: new Date(),
        estimatedCompletionTime,
        actualCompletionTime: null,
        assignedTo: null,
      };

      // In a real system, this would be saved to a KOT table
      return createApiResponse(kot, 'KOT generated successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to generate KOT', error.message);
    }
  }
  /**
   * Get KOT by ID
   */
  async getKOT(tenantId, kotId) {
    try {
      // In a real system, this would query the KOT table
      // For now, return mock data
      const kot = {
        id: kotId,
        kotNumber: 'KOT-001-20240105-123456',
        orderId: 'order-1',
        orderNumber: 'ORD-001-20240105-123456',
        tableId: 'table-1',
        orderType: 'DINE_IN',
        items: [
          {
            id: 'item-1',
            menuItemId: 'menu-1',
            name: 'Sample Item',
            quantity: 2,
            specialInstructions: 'Extra spicy',
            status: 'PENDING',
          },
        ],
        priority: 'NORMAL',
        status: 'PENDING',
        createdAt: new Date(),
        estimatedCompletionTime: new Date(Date.now() + 30 * 60 * 1000),
      };

      return createApiResponse(kot, 'KOT retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get KOT', error.message);
    }
  }

  /**
   * Update KOT status
   */
  async updateKOTStatus(tenantId, kotId, status) {
    try {
      const validStatuses = ['PENDING', 'IN_PROGRESS', 'READY', 'SERVED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      // In a real system, this would update the KOT table
      const updatedKOT = {
        id: kotId,
        status,
        updatedAt: new Date(),
        actualCompletionTime: status === 'READY' ? new Date() : null,
      };

      return createApiResponse(updatedKOT, `KOT status updated to ${status}`);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to update KOT status', error.message);
    }
  }

  /**
   * Update item status within KOT
   */
  async updateKOTItemStatus(tenantId, kotId, itemId, status) {
    try {
      const validStatuses = ['PENDING', 'IN_PROGRESS', 'READY', 'SERVED'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError(`Invalid item status. Must be one of: ${validStatuses.join(', ')}`);
      }

      // In a real system, this would update the KOT item status
      const updatedItem = {
        id: itemId,
        status,
        updatedAt: new Date(),
        startedAt: status === 'IN_PROGRESS' ? new Date() : null,
        completedAt: status === 'READY' ? new Date() : null,
      };

      return createApiResponse(updatedItem, `KOT item status updated to ${status}`);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to update KOT item status', error.message);
    }
  }
  /**
   * Get KOTs for kitchen display
   */
  async getKitchenDisplay(tenantId, options = {}) {
    try {
      const { 
        outletId, 
        status, 
        orderBy = 'createdAt',
        orderDirection = 'ASC',
        limit = 50 
      } = options;

      // In a real system, this would query the KOT table with filters
      // For now, return mock data
      const kots = [
        {
          id: 'kot-1',
          kotNumber: 'KOT-001-20240105-123456',
          orderNumber: 'ORD-001-20240105-123456',
          tableId: 'table-1',
          orderType: 'DINE_IN',
          items: [
            {
              id: 'item-1',
              name: 'Chicken Curry',
              quantity: 2,
              status: 'PENDING',
              specialInstructions: 'Extra spicy',
            },
          ],
          priority: 'HIGH',
          status: 'PENDING',
          createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
          estimatedCompletionTime: new Date(Date.now() + 20 * 60 * 1000), // 20 minutes from now
        },
        {
          id: 'kot-2',
          kotNumber: 'KOT-002-20240105-123457',
          orderNumber: 'ORD-002-20240105-123457',
          tableId: 'table-2',
          orderType: 'TAKEAWAY',
          items: [
            {
              id: 'item-2',
              name: 'Vegetable Biryani',
              quantity: 1,
              status: 'IN_PROGRESS',
              specialInstructions: null,
            },
          ],
          priority: 'NORMAL',
          status: 'IN_PROGRESS',
          createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          estimatedCompletionTime: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
        },
      ];

      // Filter by status if provided
      const filteredKOTs = status ? kots.filter(kot => kot.status === status) : kots;

      return createApiResponse(
        filteredKOTs,
        `Retrieved ${filteredKOTs.length} KOTs for kitchen display`
      );
    } catch (error) {
      throw new DatabaseError('Failed to get kitchen display', error.message);
    }
  }

  /**
   * Assign KOT to kitchen staff
   */
  async assignKOT(tenantId, kotId, staffId) {
    try {
      if (!staffId) {
        throw new ValidationError('Staff ID is required for assignment');
      }

      // In a real system, this would update the KOT assignment
      const updatedKOT = {
        id: kotId,
        assignedTo: staffId,
        assignedAt: new Date(),
        status: 'IN_PROGRESS',
      };

      return createApiResponse(updatedKOT, 'KOT assigned successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to assign KOT', error.message);
    }
  }
  /**
   * Get KOT statistics
   */
  async getKOTStatistics(tenantId, outletId) {
    try {
      // In a real system, this would query the KOT table for statistics
      const stats = {
        total: 15,
        pending: 5,
        inProgress: 7,
        ready: 2,
        served: 1,
        cancelled: 0,
        averageCompletionTime: 25, // minutes
        overdueKOTs: 2,
        highPriorityKOTs: 3,
      };

      return createApiResponse(stats, 'KOT statistics retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get KOT statistics', error.message);
    }
  }

  /**
   * Generate unique KOT number
   */
  async generateKOTNumber(tenantId, orderNumber) {
    const timestamp = Date.now().toString().slice(-6);
    return `KOT-${orderNumber}-${timestamp}`;
  }

  /**
   * Calculate estimated completion time based on items
   */
  calculateEstimatedTime(items) {
    // Base time per item (in minutes)
    const baseTimePerItem = 15;
    
    // Calculate total estimated time
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const estimatedMinutes = Math.max(15, totalItems * baseTimePerItem);
    
    return new Date(Date.now() + estimatedMinutes * 60 * 1000);
  }

  /**
   * Get overdue KOTs
   */
  async getOverdueKOTs(tenantId, outletId) {
    try {
      const currentTime = new Date();
      
      // In a real system, this would query KOTs where estimatedCompletionTime < currentTime
      const overdueKOTs = [
        {
          id: 'kot-overdue-1',
          kotNumber: 'KOT-001-20240105-123450',
          orderNumber: 'ORD-001-20240105-123450',
          tableId: 'table-3',
          status: 'IN_PROGRESS',
          estimatedCompletionTime: new Date(currentTime.getTime() - 10 * 60 * 1000), // 10 minutes overdue
          overdueBy: 10, // minutes
        },
      ];

      return createApiResponse(
        overdueKOTs,
        `Found ${overdueKOTs.length} overdue KOTs`
      );
    } catch (error) {
      throw new DatabaseError('Failed to get overdue KOTs', error.message);
    }
  }

  /**
   * Update preparation time estimate
   */
  async updatePreparationTime(tenantId, kotId, newEstimatedTime) {
    try {
      if (!newEstimatedTime || new Date(newEstimatedTime) <= new Date()) {
        throw new ValidationError('New estimated time must be in the future');
      }

      // In a real system, this would update the KOT estimated completion time
      const updatedKOT = {
        id: kotId,
        estimatedCompletionTime: new Date(newEstimatedTime),
        updatedAt: new Date(),
      };

      return createApiResponse(updatedKOT, 'Preparation time updated successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to update preparation time', error.message);
    }
  }
}

module.exports = KOTService;