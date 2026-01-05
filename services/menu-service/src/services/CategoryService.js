const { 
  BaseModel,
  createApiResponse,
  ValidationError,
  ResourceNotFoundError,
  DatabaseError
} = require('@rms/shared');

/**
 * Category management service
 */
class CategoryService {
  constructor(dbManager) {
    this.db = dbManager;
    this.categoryModel = new BaseModel(dbManager, 'menu_categories');
  }

  /**
   * Create a new category
   */
  async createCategory(tenantId, categoryData) {
    try {
      const { name, description, sortOrder = 0 } = categoryData;

      if (!name) {
        throw new ValidationError('Category name is required');
      }

      const data = {
        name,
        description,
        sort_order: sortOrder,
        is_active: true,
      };

      const category = await this.categoryModel.create(tenantId, data);
      return createApiResponse(category, 'Category created successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to create category', error.message);
    }
  }

  /**
   * Get category by ID
   */
  async getCategory(tenantId, categoryId) {
    try {
      const category = await this.categoryModel.findById(tenantId, categoryId);
      
      if (!category) {
        throw new ResourceNotFoundError('Category', categoryId);
      }

      return createApiResponse(category, 'Category retrieved successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to get category', error.message);
    }
  }

  /**
   * Update category
   */
  async updateCategory(tenantId, categoryId, updateData) {
    try {
      const data = { ...updateData };
      
      // Handle field mapping
      if (data.sortOrder !== undefined) {
        data.sort_order = data.sortOrder;
        delete data.sortOrder;
      }
      if (data.isActive !== undefined) {
        data.is_active = data.isActive;
        delete data.isActive;
      }

      const updatedCategory = await this.categoryModel.updateById(tenantId, categoryId, data);
      
      if (!updatedCategory) {
        throw new ResourceNotFoundError('Category', categoryId);
      }

      return createApiResponse(updatedCategory, 'Category updated successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to update category', error.message);
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(tenantId, categoryId) {
    try {
      // Check if category has menu items
      const itemsResult = await this.db.query(tenantId, 
        'SELECT COUNT(*) FROM menu_items WHERE category_id = $1 AND is_available = true',
        [categoryId]
      );
      
      const itemCount = parseInt(itemsResult.rows[0].count);
      if (itemCount > 0) {
        throw new ValidationError(
          `Cannot delete category with ${itemCount} active menu items. Please move or delete the items first.`
        );
      }

      const deleted = await this.categoryModel.deleteById(tenantId, categoryId);
      
      if (!deleted) {
        throw new ResourceNotFoundError('Category', categoryId);
      }

      return createApiResponse(null, 'Category deleted successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete category', error.message);
    }
  }

  /**
   * Get all categories
   */
  async getCategories(tenantId, options = {}) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        isActive = true,
        orderBy = 'sort_order',
        orderDirection = 'ASC'
      } = options;

      const conditions = {};
      if (isActive !== undefined) {
        conditions.is_active = isActive;
      }

      const result = await this.categoryModel.find(tenantId, conditions, {
        page,
        limit,
        orderBy,
        orderDirection,
      });

      return createApiResponse(result.data, 'Categories retrieved successfully', result.meta);
    } catch (error) {
      throw new DatabaseError('Failed to get categories', error.message);
    }
  }

  /**
   * Get categories with item counts
   */
  async getCategoriesWithItemCounts(tenantId) {
    try {
      const query = `
        SELECT 
          c.*,
          COUNT(mi.id) as item_count,
          COUNT(CASE WHEN mi.is_available = true THEN 1 END) as available_item_count
        FROM menu_categories c
        LEFT JOIN menu_items mi ON c.id = mi.category_id
        WHERE c.is_active = true
        GROUP BY c.id
        ORDER BY c.sort_order ASC, c.name ASC
      `;

      const result = await this.db.query(tenantId, query);
      
      const categories = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        sortOrder: row.sort_order,
        isActive: row.is_active,
        itemCount: parseInt(row.item_count),
        availableItemCount: parseInt(row.available_item_count),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return createApiResponse(categories, 'Categories with item counts retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get categories with item counts', error.message);
    }
  }

  /**
   * Reorder categories
   */
  async reorderCategories(tenantId, categoryOrders) {
    try {
      const results = [];

      for (const { categoryId, sortOrder } of categoryOrders) {
        const updatedCategory = await this.categoryModel.updateById(
          tenantId, 
          categoryId, 
          { sort_order: sortOrder }
        );
        
        if (updatedCategory) {
          results.push(updatedCategory);
        }
      }

      return createApiResponse(
        results, 
        `Category order updated for ${results.length} categories`
      );
    } catch (error) {
      throw new DatabaseError('Failed to reorder categories', error.message);
    }
  }

  /**
   * Get category statistics
   */
  async getCategoryStatistics(tenantId) {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT c.id) as total_categories,
          COUNT(DISTINCT mi.id) as total_items,
          COUNT(DISTINCT CASE WHEN mi.is_available = true THEN mi.id END) as available_items,
          AVG(mi.price) as average_price
        FROM menu_categories c
        LEFT JOIN menu_items mi ON c.id = mi.category_id
        WHERE c.is_active = true
      `;

      const result = await this.db.query(tenantId, query);
      const row = result.rows[0];

      const stats = {
        totalCategories: parseInt(row.total_categories) || 0,
        totalItems: parseInt(row.total_items) || 0,
        availableItems: parseInt(row.available_items) || 0,
        averagePrice: parseFloat(row.average_price) || 0,
      };

      return createApiResponse(stats, 'Category statistics retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get category statistics', error.message);
    }
  }
}

module.exports = CategoryService;