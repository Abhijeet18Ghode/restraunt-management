const StaffService = require('../../src/services/StaffService');
const { DatabaseManager } = require('@rms/shared');

describe('StaffService', () => {
  let staffService;
  let mockDbManager;

  beforeEach(() => {
    mockDbManager = new DatabaseManager();
    staffService = new StaffService(mockDbManager);
  });

  afterEach(() => {
    // Clear in-memory data
    staffService.staffData.clear();
    staffService.loginAttempts.clear();
  });

  describe('registerStaff', () => {
    const validStaffData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      role: 'WAITER',
      phone: '+1234567890',
      outletId: 'outlet-123',
      department: 'Service',
      position: 'Senior Waiter',
      salary: 50000,
      hireDate: '2024-01-01',
      emergencyContact: {
        name: 'Jane Doe',
        phone: '+1234567891',
        relationship: 'Spouse',
      },
    };

    test('should register staff member successfully', async () => {
      const result = await staffService.registerStaff('tenant-1', validStaffData, 'admin-1');

      expect(result.success).toBe(true);
      expect(result.data.email).toBe(validStaffData.email);
      expect(result.data.firstName).toBe(validStaffData.firstName);
      expect(result.data.lastName).toBe(validStaffData.lastName);
      expect(result.data.role).toBe(validStaffData.role);
      expect(result.data.isActive).toBe(true);
      expect(result.data.isVerified).toBe(false);
      expect(result.data.password).toBeUndefined(); // Password should not be in response
      expect(result.data.permissions).toContain('orders.create');
      expect(result.data.permissions).toContain('orders.read');
    });

    test('should throw validation error for missing required fields', async () => {
      const invalidData = { email: 'test@example.com' };

      await expect(
        staffService.registerStaff('tenant-1', invalidData, 'admin-1')
      ).rejects.toThrow('Email, password, first name, last name, and role are required');
    });

    test('should throw validation error for invalid email format', async () => {
      const invalidData = {
        ...validStaffData,
        email: 'invalid-email',
      };

      await expect(
        staffService.registerStaff('tenant-1', invalidData, 'admin-1')
      ).rejects.toThrow('Invalid email format');
    });

    test('should throw validation error for weak password', async () => {
      const invalidData = {
        ...validStaffData,
        password: '123',
      };

      await expect(
        staffService.registerStaff('tenant-1', invalidData, 'admin-1')
      ).rejects.toThrow('Password must be at least 8 characters long');
    });

    test('should throw validation error for invalid role', async () => {
      const invalidData = {
        ...validStaffData,
        role: 'INVALID_ROLE',
      };

      await expect(
        staffService.registerStaff('tenant-1', invalidData, 'admin-1')
      ).rejects.toThrow('Invalid role');
    });

    test('should throw validation error for duplicate email', async () => {
      await staffService.registerStaff('tenant-1', validStaffData, 'admin-1');

      await expect(
        staffService.registerStaff('tenant-1', validStaffData, 'admin-1')
      ).rejects.toThrow('Email already exists');
    });

    test('should assign correct default permissions for different roles', async () => {
      const adminData = { ...validStaffData, email: 'admin@example.com', role: 'ADMIN' };
      const managerData = { ...validStaffData, email: 'manager@example.com', role: 'MANAGER' };
      const kitchenData = { ...validStaffData, email: 'kitchen@example.com', role: 'KITCHEN_STAFF' };

      const adminResult = await staffService.registerStaff('tenant-1', adminData, 'admin-1');
      const managerResult = await staffService.registerStaff('tenant-1', managerData, 'admin-1');
      const kitchenResult = await staffService.registerStaff('tenant-1', kitchenData, 'admin-1');

      expect(adminResult.data.permissions).toContain('staff.create');
      expect(adminResult.data.permissions).toContain('staff.delete');
      expect(adminResult.data.permissions).toContain('settings.update');

      expect(managerResult.data.permissions).toContain('staff.read');
      expect(managerResult.data.permissions).toContain('staff.update');
      expect(managerResult.data.permissions).not.toContain('staff.delete');

      expect(kitchenResult.data.permissions).toContain('orders.read');
      expect(kitchenResult.data.permissions).toContain('menu.read');
      expect(kitchenResult.data.permissions).not.toContain('staff.create');
    });
  });

  describe('authenticateStaff', () => {
    const staffData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      role: 'WAITER',
    };

    beforeEach(async () => {
      await staffService.registerStaff('tenant-1', staffData, 'admin-1');
    });

    test('should authenticate staff member successfully', async () => {
      const result = await staffService.authenticateStaff('tenant-1', staffData.email, staffData.password);

      expect(result.success).toBe(true);
      expect(result.data.staff.email).toBe(staffData.email);
      expect(result.data.accessToken).toBeDefined();
      expect(result.data.refreshToken).toBeDefined();
      expect(result.data.staff.password).toBeUndefined();
    });

    test('should throw error for invalid email', async () => {
      await expect(
        staffService.authenticateStaff('tenant-1', 'invalid@example.com', staffData.password)
      ).rejects.toThrow('Invalid email or password');
    });

    test('should throw error for invalid password', async () => {
      await expect(
        staffService.authenticateStaff('tenant-1', staffData.email, 'wrongpassword')
      ).rejects.toThrow('Invalid email or password');
    });

    test('should throw error for deactivated account', async () => {
      // First get the staff member and deactivate
      const staff = await staffService.findStaffByEmail('tenant-1', staffData.email);
      await staffService.deactivateStaff('tenant-1', staff.id, 'admin-1', 'Test deactivation');

      await expect(
        staffService.authenticateStaff('tenant-1', staffData.email, staffData.password)
      ).rejects.toThrow('Account is deactivated');
    });

    test('should lock account after max failed attempts', async () => {
      // Attempt login with wrong password multiple times
      for (let i = 0; i < 5; i++) {
        try {
          await staffService.authenticateStaff('tenant-1', staffData.email, 'wrongpassword');
        } catch (error) {
          // Expected to fail
        }
      }

      // Next attempt should be locked
      await expect(
        staffService.authenticateStaff('tenant-1', staffData.email, 'wrongpassword')
      ).rejects.toThrow('Account locked');
    });
  });

  describe('updateStaff', () => {
    let staffId;

    beforeEach(async () => {
      const result = await staffService.registerStaff('tenant-1', {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'WAITER',
      }, 'admin-1');
      staffId = result.data.id;
    });

    test('should update staff member successfully', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'MANAGER',
        department: 'Management',
      };

      const result = await staffService.updateStaff('tenant-1', staffId, updateData, 'admin-1');

      expect(result.success).toBe(true);
      expect(result.data.firstName).toBe('Jane');
      expect(result.data.lastName).toBe('Smith');
      expect(result.data.role).toBe('MANAGER');
      expect(result.data.department).toBe('Management');
      expect(result.data.permissions).toContain('staff.read'); // Manager permissions
    });

    test('should throw error for non-existent staff member', async () => {
      await expect(
        staffService.updateStaff('tenant-1', 'non-existent-id', { firstName: 'Jane' }, 'admin-1')
      ).rejects.toThrow('Staff member not found');
    });

    test('should update permissions when role changes', async () => {
      const updateData = { role: 'ADMIN' };

      const result = await staffService.updateStaff('tenant-1', staffId, updateData, 'admin-1');

      expect(result.data.role).toBe('ADMIN');
      expect(result.data.permissions).toContain('staff.create');
      expect(result.data.permissions).toContain('staff.delete');
    });
  });

  describe('changePassword', () => {
    let staffId;
    const originalPassword = 'password123';

    beforeEach(async () => {
      const result = await staffService.registerStaff('tenant-1', {
        email: 'test@example.com',
        password: originalPassword,
        firstName: 'John',
        lastName: 'Doe',
        role: 'WAITER',
      }, 'admin-1');
      staffId = result.data.id;
    });

    test('should change password successfully', async () => {
      const newPassword = 'newpassword123';

      const result = await staffService.changePassword('tenant-1', staffId, originalPassword, newPassword);

      expect(result.success).toBe(true);

      // Verify new password works
      const authResult = await staffService.authenticateStaff('tenant-1', 'test@example.com', newPassword);
      expect(authResult.success).toBe(true);
    });

    test('should throw error for incorrect current password', async () => {
      await expect(
        staffService.changePassword('tenant-1', staffId, 'wrongpassword', 'newpassword123')
      ).rejects.toThrow('Current password is incorrect');
    });

    test('should throw error for weak new password', async () => {
      await expect(
        staffService.changePassword('tenant-1', staffId, originalPassword, '123')
      ).rejects.toThrow('New password must be at least 8 characters long');
    });

    test('should throw error for non-existent staff member', async () => {
      await expect(
        staffService.changePassword('tenant-1', 'non-existent-id', originalPassword, 'newpassword123')
      ).rejects.toThrow('Staff member not found');
    });
  });

  describe('getAllStaff', () => {
    beforeEach(async () => {
      // Create multiple staff members
      await staffService.registerStaff('tenant-1', {
        email: 'admin@example.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        department: 'Management',
        outletId: 'outlet-1',
      }, 'admin-1');

      await staffService.registerStaff('tenant-1', {
        email: 'waiter@example.com',
        password: 'password123',
        firstName: 'Waiter',
        lastName: 'User',
        role: 'WAITER',
        department: 'Service',
        outletId: 'outlet-1',
      }, 'admin-1');

      await staffService.registerStaff('tenant-1', {
        email: 'kitchen@example.com',
        password: 'password123',
        firstName: 'Kitchen',
        lastName: 'User',
        role: 'KITCHEN_STAFF',
        department: 'Kitchen',
        outletId: 'outlet-2',
      }, 'admin-1');
    });

    test('should get all staff members', async () => {
      const result = await staffService.getAllStaff('tenant-1');

      expect(result.success).toBe(true);
      expect(result.data.staff).toHaveLength(3);
      expect(result.data.total).toBe(3);
      expect(result.data.staff[0].password).toBeUndefined(); // Passwords should not be included
    });

    test('should filter staff by role', async () => {
      const result = await staffService.getAllStaff('tenant-1', { role: 'WAITER' });

      expect(result.success).toBe(true);
      expect(result.data.staff).toHaveLength(1);
      expect(result.data.staff[0].role).toBe('WAITER');
    });

    test('should filter staff by outlet', async () => {
      const result = await staffService.getAllStaff('tenant-1', { outletId: 'outlet-1' });

      expect(result.success).toBe(true);
      expect(result.data.staff).toHaveLength(2);
      expect(result.data.staff.every(s => s.outletId === 'outlet-1')).toBe(true);
    });

    test('should filter staff by department', async () => {
      const result = await staffService.getAllStaff('tenant-1', { department: 'Service' });

      expect(result.success).toBe(true);
      expect(result.data.staff).toHaveLength(1);
      expect(result.data.staff[0].department).toBe('Service');
    });

    test('should filter staff by active status', async () => {
      // Deactivate one staff member
      const allStaff = await staffService.getAllStaff('tenant-1');
      const staffToDeactivate = allStaff.data.staff[0];
      await staffService.deactivateStaff('tenant-1', staffToDeactivate.id, 'admin-1');

      const activeResult = await staffService.getAllStaff('tenant-1', { isActive: true });
      const inactiveResult = await staffService.getAllStaff('tenant-1', { isActive: false });

      expect(activeResult.data.staff).toHaveLength(2);
      expect(inactiveResult.data.staff).toHaveLength(1);
      expect(inactiveResult.data.staff[0].isActive).toBe(false);
    });
  });

  describe('getDefaultPermissions', () => {
    test('should return correct permissions for ADMIN role', () => {
      const permissions = staffService.getDefaultPermissions('ADMIN');

      expect(permissions).toContain('staff.create');
      expect(permissions).toContain('staff.read');
      expect(permissions).toContain('staff.update');
      expect(permissions).toContain('staff.delete');
      expect(permissions).toContain('settings.update');
    });

    test('should return correct permissions for MANAGER role', () => {
      const permissions = staffService.getDefaultPermissions('MANAGER');

      expect(permissions).toContain('staff.read');
      expect(permissions).toContain('staff.update');
      expect(permissions).toContain('reports.read');
      expect(permissions).not.toContain('staff.delete');
      expect(permissions).not.toContain('settings.update');
    });

    test('should return correct permissions for WAITER role', () => {
      const permissions = staffService.getDefaultPermissions('WAITER');

      expect(permissions).toContain('orders.create');
      expect(permissions).toContain('orders.read');
      expect(permissions).toContain('orders.update');
      expect(permissions).toContain('menu.read');
      expect(permissions).not.toContain('staff.create');
    });

    test('should return correct permissions for KITCHEN_STAFF role', () => {
      const permissions = staffService.getDefaultPermissions('KITCHEN_STAFF');

      expect(permissions).toContain('orders.read');
      expect(permissions).toContain('orders.update');
      expect(permissions).toContain('menu.read');
      expect(permissions).toContain('inventory.read');
      expect(permissions).not.toContain('orders.create');
    });

    test('should return empty array for unknown role', () => {
      const permissions = staffService.getDefaultPermissions('UNKNOWN_ROLE');

      expect(permissions).toEqual([]);
    });
  });
});