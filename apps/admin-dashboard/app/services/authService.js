import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const USE_MOCK_AUTH = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true';

class AuthService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/auth`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? 
        document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1] : 
        null;
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async login(email, password, tenantId = null) {
    if (USE_MOCK_AUTH) {
      const { mockAuthService } = await import('./mockAuthService');
      return await mockAuthService.login(email, password);
    }
    
    // For real API, we need to include tenantId
    const loginData = { email, password };
    if (tenantId) {
      loginData.tenantId = tenantId;
    }
    
    const response = await this.api.post('/login', loginData);
    
    // Backend returns data in response.data.data format
    if (response.data.success) {
      return {
        success: true,
        token: response.data.data.token,
        user: response.data.data.user
      };
    } else {
      throw new Error(response.data.message || 'Login failed');
    }
  }

  async validateToken(token) {
    if (USE_MOCK_AUTH) {
      const { mockAuthService } = await import('./mockAuthService');
      return await mockAuthService.validateToken(token);
    }
    
    const response = await this.api.get('/validate', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.user;
  }

  async refreshToken() {
    if (USE_MOCK_AUTH) {
      const { mockAuthService } = await import('./mockAuthService');
      return await mockAuthService.refreshToken();
    }
    
    const response = await this.api.post('/refresh');
    return response.data;
  }

  async logout() {
    if (USE_MOCK_AUTH) {
      const { mockAuthService } = await import('./mockAuthService');
      return await mockAuthService.logout();
    }
    
    await this.api.post('/logout');
  }

  async changePassword(currentPassword, newPassword) {
    if (USE_MOCK_AUTH) {
      const { mockAuthService } = await import('./mockAuthService');
      return await mockAuthService.changePassword(currentPassword, newPassword);
    }
    
    const response = await this.api.post('/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  }
}

export const authService = new AuthService();