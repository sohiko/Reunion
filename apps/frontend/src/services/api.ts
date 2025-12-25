import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse } from '@reunion/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // リクエストインターセプター
    this.client.interceptors.request.use(
      (config) => {
        // リクエストログ
        if (process.env.NODE_ENV === 'development') {
          console.log('API Request:', config.method?.toUpperCase(), config.url);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // レスポンスインターセプター
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        // レスポンスログ
        if (process.env.NODE_ENV === 'development') {
          console.log('API Response:', response.status, response.config.url);
        }

        // APIレスポンスの検証
        if (response.data && typeof response.data === 'object') {
          if (response.data.success === false) {
            const error = new Error(response.data.error || 'API request failed');
            (error as any).status = response.status;
            return Promise.reject(error);
          }
        }

        return response;
      },
      (error) => {
        // エラーハンドリング
        if (error.response) {
          const status = error.response.status;
          const message = error.response.data?.error || error.message;

          if (status === 401) {
            // 認証エラー
            if (typeof window !== 'undefined') {
              // ブラウザ環境でのみ実行
              window.location.href = '/login';
            }
          }

          const apiError = new Error(message);
          (apiError as any).status = status;
          return Promise.reject(apiError);
        }

        if (error.request) {
          // ネットワークエラー
          const networkError = new Error('Network error - please check your connection');
          return Promise.reject(networkError);
        }

        return Promise.reject(error);
      }
    );
  }

  // 認証関連API
  async register(data: {
    name_sei: string;
    name_mei: string;
    email: string;
    password: string;
    graduation_year: number;
    student_number?: string;
  }): Promise<ApiResponse> {
    const response = await this.client.post('/api/auth/register', data);
    return response.data;
  }

  async login(data: { email: string; password: string }): Promise<ApiResponse> {
    const response = await this.client.post('/api/auth/login', data);
    return response.data;
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.client.post('/api/auth/logout');
    return response.data;
  }

  async refreshToken(): Promise<ApiResponse> {
    const response = await this.client.post('/api/auth/refresh', {
      refresh_token: this.getRefreshToken(),
    });
    return response.data;
  }

  async getCurrentUser(): Promise<ApiResponse> {
    const response = await this.client.get('/api/auth/me');
    return response.data;
  }

  async changePassword(data: {
    current_password: string;
    new_password: string;
  }): Promise<ApiResponse> {
    const response = await this.client.post('/api/auth/change-password', data);
    return response.data;
  }

  async requestPasswordReset(data: { email: string }): Promise<ApiResponse> {
    const response = await this.client.post('/api/auth/request-password-reset', data);
    return response.data;
  }

  // ヘルパーメソッド
  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    // Cookieからリフレッシュトークンを取得
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('refresh_token='))
      ?.split('=')[1] || null;
  }

  // 汎用HTTPメソッド
  async get<T = any>(url: string, params?: any): Promise<ApiResponse<T>> {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.post(url, data);
    return response.data;
  }

  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.put(url, data);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.patch(url, data);
    return response.data;
  }

  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    const response = await this.client.delete(url);
    return response.data;
  }
}

// シングルトンインスタンス
export const apiClient = new ApiClient();
export default apiClient;
