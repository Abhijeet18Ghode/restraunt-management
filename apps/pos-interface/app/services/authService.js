import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
        document.cookie.split('; ').find(row => row.startsWith('pos_auth_token='))?.split('=')[1] : 
        null;
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async login(email, password, outletId) {
    const response = await this.api.post('/pos-login', { 
      email, 
      password, 
      outletId 
    });
    return response.data;
  }

  async validateToken(token) {
    const response = await this.api.get('/validate', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.user;
  }

  async logout() {
    await this.api.post('/logout');
  }
}

export const authService = new AuthService();