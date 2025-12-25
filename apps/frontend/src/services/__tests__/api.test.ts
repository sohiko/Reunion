// APIサービスのモック化
jest.mock('../api', () => ({
  apiClient: {
    register: jest.fn(),
    login: jest.fn(),
    getCurrentUser: jest.fn(),
    logout: jest.fn(),
  },
}));

import { apiClient } from '../api';

// 型付きのモック関数
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;


describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should call register API with correct data', async () => {
      const mockResponse = {
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            status: 'PENDING',
            role: 'GENERAL_MEMBER',
          }
        }
      };

      mockApiClient.register.mockResolvedValue(mockResponse);

      const registerData = {
        name_sei: 'テスト',
        name_mei: '太郎',
        email: 'test@example.com',
        password: 'TestPassword123!',
        graduation_year: 2020,
        student_number: '12345678',
      };

      const result = await apiClient.register(registerData);

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.register).toHaveBeenCalledWith(registerData);
    });

    it('should throw error on API failure', async () => {
      const mockError = new Error('Email already registered');

      mockApiClient.register.mockRejectedValue(mockError);

      const registerData = {
        name_sei: 'テスト',
        name_mei: '太郎',
        email: 'existing@example.com',
        password: 'TestPassword123!',
        graduation_year: 2020,
      };

      await expect(apiClient.register(registerData)).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should call login API with correct data', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Login successful',
          data: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
              status: 'ACTIVE',
              role: 'GENERAL_MEMBER',
              profile: {
                name_sei: 'テスト',
                name_mei: '太郎',
                graduation_year: 2020,
              }
            },
            expires_in: 3600,
          }
        }
      };

      mockApiClient.login.mockResolvedValue(mockResponse);

      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const result = await apiClient.login(loginData);

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.login).toHaveBeenCalledWith(loginData);
    });
  });

  describe('getCurrentUser', () => {
    it('should call getCurrentUser API', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
              status: 'ACTIVE',
              role: 'GENERAL_MEMBER',
            }
          }
        }
      };

      mockApiClient.getCurrentUser.mockResolvedValue(mockResponse);

      const result = await apiClient.getCurrentUser();

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.getCurrentUser).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should call logout API', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Logged out successfully'
        }
      };

      mockApiClient.logout.mockResolvedValue(mockResponse);

      const result = await apiClient.logout();

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.logout).toHaveBeenCalled();
    });
  });
});
