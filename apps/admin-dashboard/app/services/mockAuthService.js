// Mock Auth Service for testing purposes
class MockAuthService {
  constructor() {
    this.mockUsers = [
      {
        id: 1,
        email: 'admin@restaurant.com',
        password: 'admin123',
        name: 'Admin User',
        role: 'admin',
        permissions: ['*']
      },
      {
        id: 2,
        email: 'manager@restaurant.com',
        password: 'manager123',
        name: 'Manager User',
        role: 'manager',
        permissions: ['menu.view', 'staff.view', 'inventory.view', 'analytics.view']
      },
      // {
      //   id: 3,
      //   email: 'ghodeabhijeet18@gmail.com',
      //   password: 'ShreeSwamiSamarth@28',
      //   name: 'Abhijeet Ghode',
      //   role: 'admin',
      //   permissions: ['*']
      // }
    ];
  }

  async login(email, password) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const user = this.mockUsers.find(u => u.email === email);
    
    if (!user || password !== user.password) {
      throw new Error('Invalid credentials');
    }

    // Generate mock JWT token
    const token = btoa(JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    }));

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions
      }
    };
  }

  async validateToken(token) {
    try {
      const decoded = JSON.parse(atob(token));
      
      if (decoded.exp < Date.now()) {
        throw new Error('Token expired');
      }

      const user = this.mockUsers.find(u => u.id === decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions
      };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async refreshToken() {
    // For mock purposes, just return a new token
    return {
      success: true,
      token: btoa(JSON.stringify({
        userId: 1,
        email: 'admin@restaurant.com',
        role: 'admin',
        exp: Date.now() + (24 * 60 * 60 * 1000)
      }))
    };
  }

  async logout() {
    // Mock logout - just return success
    return { success: true };
  }

  async changePassword(currentPassword, newPassword) {
    // Mock password change
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, message: 'Password changed successfully' };
  }
}

export const mockAuthService = new MockAuthService();