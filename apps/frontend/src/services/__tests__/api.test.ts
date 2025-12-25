import { apiClient } from '../api';

// APIサービスのモック化
jest.mock('axios');
import axios from 'axios';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should call register API with correct data', async () => {
      const mockResponse = {
        data: {
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
        }
      };

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse),
      } as any);

      const registerData = {
        name_sei: 'テスト',
        name_mei: '太郎',
        email: 'test@example.com',
        password: 'TestPassword123!',
        graduation_year: 2020,
        student_number: '12345678',
      };

      const result = await apiClient.register(registerData);

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.create).toHaveBeenCalled();
    });

    it('should throw error on API failure', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            error: 'Email already registered'
          },
          status: 400
        }
      };

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockRejectedValue(mockError),
      } as any);

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

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse),
      } as any);

      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const result = await apiClient.login(loginData);

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.create).toHaveBeenCalled();
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

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse),
      } as any);

      const result = await apiClient.getCurrentUser();

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.create).toHaveBeenCalled();
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

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse),
      } as any);

      const result = await apiClient.logout();

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.create).toHaveBeenCalled();
    });
  });
});
