const BaseModel = require('./BaseModel');
const { ValidationError, DatabaseError } = require('../errors');

/**
 * Outlet model for managing restaurant locations
 */
class OutletModel extends BaseModel {
  constructor(dbManager) {
    super(dbManager, 'outlets');
  }

  /**
   * Create a new outlet
   */
  async create(tenantId, outletData) {
    const { name, address, operatingHours, taxConfig, isActive = true } = outletData;

    // Validate required fields
    if (!name || !address || !operatingHours || !taxConfig) {
      throw new ValidationError('Name, address, operating hours, and tax config are required');
    }

    const data = {
      name,
      address: JSON.stringify(address),
      operating_hours: JSON.stringify(operatingHours),
      tax_config: JSON.stringify(taxConfig),
      is_active: isActive,
    };

    return await super.create(tenantId, data);
  }

  /**
   * Update outlet
   */
  async updateById(tenantId, id, updateData) {
    const data = { ...updateData };
    
    // Convert objects to JSON strings for database storage
    if (data.address) {
      data.address = JSON.stringify(data.address);
    }
    if (data.operatingHours) {
      data.operating_hours = JSON.stringify(data.operatingHours);
      delete data.operatingHours;
    }
    if (data.taxConfig) {
      data.tax_config = JSON.stringify(data.taxConfig);
      delete data.taxConfig;
    }
    if (data.isActive !== undefined) {
      data.is_active = data.isActive;
      delete data.isActive;
    }

    return await super.updateById(tenantId, id, data);
  }

  /**
   * Get active outlets for tenant
   */
  async getActiveOutlets(tenantId) {
    return await this.find(tenantId, { is_active: true });
  }

  /**
   * Get outlet by name
   */
  async findByName(tenantId, name) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE name = $1 AND is_active = true`;
      const result = await this.db.query(tenantId, query, [name]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToObject(result.rows[0]);
    } catch (error) {
      throw new DatabaseError(`Failed to find outlet by name`, error.message);
    }
  }

  /**
   * Check if outlet is operational at given time
   */
  async isOperational(tenantId, outletId, dateTime = new Date()) {
    const outlet = await this.findById(tenantId, outletId);
    if (!outlet || !outlet.isActive) {
      return false;
    }

    const dayOfWeek = dateTime.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const currentTime = dateTime.toTimeString().slice(0, 5); // HH:MM format
    
    const operatingHours = outlet.operatingHours;
    const dayHours = operatingHours[dayOfWeek];
    
    if (!dayHours || !dayHours.open || !dayHours.close) {
      return false; // Closed on this day
    }

    return currentTime >= dayHours.open && currentTime <= dayHours.close;
  }

  /**
   * Map database row to object
   */
  mapRowToObject(row) {
    if (!row) return null;
    
    const obj = super.mapRowToObject(row);
    
    // Parse JSON fields
    if (obj.address && typeof obj.address === 'string') {
      obj.address = JSON.parse(obj.address);
    }
    if (obj.operatingHours && typeof obj.operatingHours === 'string') {
      obj.operatingHours = JSON.parse(obj.operatingHours);
    }
    if (obj.taxConfig && typeof obj.taxConfig === 'string') {
      obj.taxConfig = JSON.parse(obj.taxConfig);
    }
    
    return obj;
  }
}

module.exports = OutletModel;