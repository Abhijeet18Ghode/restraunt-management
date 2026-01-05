const { 
  createApiResponse,
  ValidationError,
  ResourceNotFoundError,
  DatabaseError,
  UnauthorizedError
} = require('@rms/shared');
const { hashPassword, comparePassword, generateToken, generateRefreshToken } = require('../middleware/auth');

/**
 * Staff Management service for handling staff operations
 */
class StaffService {
  constructor(dbManager) {
    this.db = dbManager;
    this.staffData = new Map(); // In-memory storage for demo
    this.loginAttempts = new Map(); // Track login attempts
    this.maxLoginAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    this.lockoutDuration = parseInt(process.env.LOCKOUT_DURATION_MINUTES) || 30;
  }

  /**
   * Register a new staff member
   */
  async registerStaff(tenantId, staffData, registeredBy) {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      role, 
      permissions = [],
      outletId,
      department,
      position,
      salary,
      hireDate,
      emergencyContact
    } = staffData;

    try {
      // Validate required fields
      if (!email || !password || !firstName || !lastName || !role) {
        throw new ValidationError('Email, password, first name, last name, and role are required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new ValidationError('Invalid email format');
      }

      // Validate password strength
      if (password.length < (parseInt(process.env.PASSWORD_MIN_LENGTH) || 8)) {
        throw new ValidationError(`Password must be at least ${process.env.PASSWORD_MIN_LENGTH || 8} characters long`);
      }

      // Check if email already exists
      const existingStaff = await this.findStaffByEmail(tenantId, email);
      if (existingStaff) {
        throw new ValidationError('Email already exists');
      }

      // Validate role
      const validRoles = ['ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'WAITER', 'CASHIER', 'DELIVERY_PARTNER'];
      if (!validRoles.includes(role)) {
        throw new ValidationError(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Generate staff ID
      const staffId = `staff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create staff record
      const staff = {
        id: staffId,
        tenantId,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role,
        permissions: this.getDefaultPermissions(role).concat(permissions),
        outletId,
        department,
        position,
        salary,
        hireDate: hireDate ? new Date(hireDate) : new Date(),
        emergencyContact,
        isActive: true,
        isVerified: false,
        lastLogin: null,
        createdAt: new Date(),
        createdBy: registeredBy,
        updatedAt: new Date(),
      };

      // Store staff data
      const staffKey = `${tenantId}:${staffId}`;
      this.staffData.set(staffKey, staff);

      // Remove password from response
      const { password: _, ...staffResponse } = staff;

      return createApiResponse(staffResponse, 'Staff member registered successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to register staff member', error.message);
    }
  }

  /**
   * Authenticate staff member
   */
  async authenticateStaff(tenantId, email, password) {
    try {
      // Check if account is locked
      const lockoutKey = `${tenantId}:${email}`;
      const attemptData = this.loginAttempts.get(lockoutKey);
      
      if (attemptData && attemptData.lockedUntil && attemptData.lockedUntil > new Date()) {
        const remainingTime = Math.ceil((attemptData.lockedUntil - new Date()) / (1000 * 60));
        throw new UnauthorizedError(`Account locked. Try again in ${remainingTime} minutes.`);
      }

      // Find staff member
      const staff = await this.findStaffByEmail(tenantId, email);
      if (!staff) {
        await this.recordFailedLogin(lockoutKey);
        throw new UnauthorizedError('Invalid email or password');
      }

      // Check if staff is active
      if (!staff.isActive) {
        throw new UnauthorizedError('Account is deactivated');
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, staff.password);
      if (!isPasswordValid) {
        await this.recordFailedLogin(lockoutKey);
        throw new UnauthorizedError('Invalid email or password');
      }

      // Clear failed login attempts
      this.loginAttempts.delete(lockoutKey);

      // Update last login
      staff.lastLogin = new Date();
      const staffKey = `${tenantId}:${staff.id}`;
      this.staffData.set(staffKey, staff);

      // Generate tokens
      const tokenPayload = {
        id: staff.id,
        tenantId: staff.tenantId,
        email: staff.email,
        role: staff.role,
        permissions: staff.permissions,
        outletId: staff.outletId,
      };

      const accessToken = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken({ id: staff.id, tenantId });

      // Remove password from response
      const { password: _, ...staffResponse } = staff;

      return createApiResponse({
        staff: staffResponse,
        accessToken,
        refreshToken,
      }, 'Authentication successful');
    } catch (error) {
      if (error instanceof ValidationError || error instanceof UnauthorizedError) {
        throw error;
      }
      throw new DatabaseError('Failed to authenticate staff member', error.message);
    }
  }

  /**
   * Get staff member by ID
   */
  async getStaffById(tenantId, staffId) {
    try {
      const staffKey = `${tenantId}:${staffId}`;
      const staff = this.staffData.get(staffKey);

      if (!staff) {
        throw new ResourceNotFoundError('Staff member', staffId);
      }

      // Remove password from response
      const { password: _, ...staffResponse } = staff;

      return createApiResponse(staffResponse, 'Staff member retrieved successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to get staff member', error.message);
    }
  }

  /**
   * Update staff member
   */
  async updateStaff(tenantId, staffId, updateData, updatedBy) {
    try {
      const staffKey = `${tenantId}:${staffId}`;
      const staff = this.staffData.get(staffKey);

      if (!staff) {
        throw new ResourceNotFoundError('Staff member', staffId);
      }

      // Fields that can be updated
      const allowedFields = [
        'firstName', 'lastName', 'phone', 'role', 'permissions', 
        'outletId', 'department', 'position', 'salary', 'emergencyContact', 'isActive'
      ];

      // Update allowed fields
      const updatedStaff = { ...staff };
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updatedStaff[field] = updateData[field];
        }
      }

      // Update permissions based on role if role changed
      if (updateData.role && updateData.role !== staff.role) {
        updatedStaff.permissions = this.getDefaultPermissions(updateData.role);
      }

      updatedStaff.updatedAt = new Date();
      updatedStaff.updatedBy = updatedBy;

      // Store updated staff data
      this.staffData.set(staffKey, updatedStaff);

      // Remove password from response
      const { password: _, ...staffResponse } = updatedStaff;

      return createApiResponse(staffResponse, 'Staff member updated successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update staff member', error.message);
    }
  }

  /**
   * Deactivate staff member
   */
  async deactivateStaff(tenantId, staffId, deactivatedBy, reason = null) {
    try {
      const updateData = {
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy,
        deactivationReason: reason,
      };

      return await this.updateStaff(tenantId, staffId, updateData, deactivatedBy);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all staff members for tenant
   */
  async getAllStaff(tenantId, filters = {}) {
    try {
      const allStaff = [];
      
      for (const [key, staff] of this.staffData.entries()) {
        if (key.startsWith(`${tenantId}:`)) {
          // Apply filters
          let includeStaff = true;
          
          if (filters.role && staff.role !== filters.role) {
            includeStaff = false;
          }
          
          if (filters.outletId && staff.outletId !== filters.outletId) {
            includeStaff = false;
          }
          
          if (filters.isActive !== undefined && staff.isActive !== filters.isActive) {
            includeStaff = false;
          }
          
          if (filters.department && staff.department !== filters.department) {
            includeStaff = false;
          }

          if (includeStaff) {
            // Remove password from response
            const { password: _, ...staffResponse } = staff;
            allStaff.push(staffResponse);
          }
        }
      }

      // Sort by creation date (newest first)
      allStaff.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return createApiResponse({
        staff: allStaff,
        total: allStaff.length,
        filters: filters,
      }, 'Staff members retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get staff members', error.message);
    }
  }

  /**
   * Change staff password
   */
  async changePassword(tenantId, staffId, currentPassword, newPassword) {
    try {
      const staffKey = `${tenantId}:${staffId}`;
      const staff = this.staffData.get(staffKey);

      if (!staff) {
        throw new ResourceNotFoundError('Staff member', staffId);
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(currentPassword, staff.password);
      if (!isCurrentPasswordValid) {
        throw new UnauthorizedError('Current password is incorrect');
      }

      // Validate new password
      if (newPassword.length < (parseInt(process.env.PASSWORD_MIN_LENGTH) || 8)) {
        throw new ValidationError(`New password must be at least ${process.env.PASSWORD_MIN_LENGTH || 8} characters long`);
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);

      // Update password
      staff.password = hashedNewPassword;
      staff.updatedAt = new Date();
      staff.passwordChangedAt = new Date();

      this.staffData.set(staffKey, staff);

      return createApiResponse(null, 'Password changed successfully');
    } catch (error) {
      if (error instanceof ValidationError || error instanceof UnauthorizedError || error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to change password', error.message);
    }
  }

  /**
   * Get default permissions for role
   */
  getDefaultPermissions(role) {
    const rolePermissions = {
      'ADMIN': [
        'staff.create', 'staff.read', 'staff.update', 'staff.delete',
        'orders.read', 'orders.update', 'menu.read', 'menu.update',
        'inventory.read', 'inventory.update', 'reports.read', 'settings.update'
      ],
      'MANAGER': [
        'staff.read', 'staff.update', 'orders.read', 'orders.update',
        'menu.read', 'menu.update', 'inventory.read', 'inventory.update', 'reports.read'
      ],
      'KITCHEN_STAFF': [
        'orders.read', 'orders.update', 'menu.read', 'inventory.read'
      ],
      'WAITER': [
        'orders.create', 'orders.read', 'orders.update', 'menu.read'
      ],
      'CASHIER': [
        'orders.read', 'orders.update', 'billing.create', 'billing.read'
      ],
      'DELIVERY_PARTNER': [
        'orders.read', 'orders.update', 'delivery.read', 'delivery.update'
      ],
    };

    return rolePermissions[role] || [];
  }

  /**
   * Find staff by email
   */
  async findStaffByEmail(tenantId, email) {
    for (const [key, staff] of this.staffData.entries()) {
      if (key.startsWith(`${tenantId}:`) && staff.email === email) {
        return staff;
      }
    }
    return null;
  }

  /**
   * Record failed login attempt
   */
  async recordFailedLogin(lockoutKey) {
    const attemptData = this.loginAttempts.get(lockoutKey) || { attempts: 0 };
    attemptData.attempts += 1;
    attemptData.lastAttempt = new Date();

    if (attemptData.attempts >= this.maxLoginAttempts) {
      attemptData.lockedUntil = new Date(Date.now() + (this.lockoutDuration * 60 * 1000));
    }

    this.loginAttempts.set(lockoutKey, attemptData);
  }

  /**
   * Reset password (admin only)
   */
  async resetPassword(tenantId, staffId, newPassword, resetBy) {
    try {
      const staffKey = `${tenantId}:${staffId}`;
      const staff = this.staffData.get(staffKey);

      if (!staff) {
        throw new ResourceNotFoundError('Staff member', staffId);
      }

      // Validate new password
      if (newPassword.length < (parseInt(process.env.PASSWORD_MIN_LENGTH) || 8)) {
        throw new ValidationError(`New password must be at least ${process.env.PASSWORD_MIN_LENGTH || 8} characters long`);
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);

      // Update password
      staff.password = hashedNewPassword;
      staff.updatedAt = new Date();
      staff.passwordResetAt = new Date();
      staff.passwordResetBy = resetBy;

      this.staffData.set(staffKey, staff);

      return createApiResponse(null, 'Password reset successfully');
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to reset password', error.message);
    }
  }
}

module.exports = StaffService;