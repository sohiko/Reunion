import { AuthService } from '../../services/authService';
import { prisma } from '../../utils/prisma';
import { PasswordUtil } from '@reunion/shared';

describe('AuthService', () => {
  beforeEach(async () => {
    // テストデータのクリーンアップ
    await prisma.consentRecord.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerData = {
        name_sei: 'テスト',
        name_mei: '太郎',
        email: 'test@example.com',
        password: 'TestPassword123!',
        graduation_year: 2020,
        student_number: '12345678',
      };

      const ipAddress = '127.0.0.1';
      const userAgent = 'Test Agent';

      const user = await AuthService.register(registerData, ipAddress, userAgent);

      expect(user).toBeDefined();
      expect(user.email).toBe(registerData.email);
      expect(user.status).toBe('PENDING');

      // プロファイルが作成されていることを確認
      const profile = await prisma.profile.findUnique({
        where: { id: user.id }
      });
      expect(profile).toBeDefined();
      expect(profile?.name_sei).toBe(registerData.name_sei);
      expect(profile?.name_mei).toBe(registerData.name_mei);
      expect(profile?.graduation_year).toBe(registerData.graduation_year);
    });

    it('should throw error for duplicate email', async () => {
      const registerData = {
        name_sei: 'テスト',
        name_mei: '太郎',
        email: 'duplicate@example.com',
        password: 'TestPassword123!',
        graduation_year: 2020,
      };

      // 最初の登録
      await AuthService.register(registerData, '127.0.0.1', 'Test Agent');

      // 重複登録の試行
      await expect(
        AuthService.register(registerData, '127.0.0.1', 'Test Agent')
      ).rejects.toThrow('Email already registered');
    });

    it('should throw error for weak password', async () => {
      const registerData = {
        name_sei: 'テスト',
        name_mei: '太郎',
        email: 'weak@example.com',
        password: 'weak',
        graduation_year: 2020,
      };

      await expect(
        AuthService.register(registerData, '127.0.0.1', 'Test Agent')
      ).rejects.toThrow('Password does not meet security requirements');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // テストユーザーを作成
      const generalMemberRole = await prisma.role.findUnique({
        where: { name: 'GENERAL_MEMBER' }
      });

      if (generalMemberRole) {
        const passwordHash = await PasswordUtil.hash('TestPassword123!');

        await prisma.user.create({
          data: {
            id: 'test-user-id',
            email: 'login-test@example.com',
            password_hash: passwordHash,
            status: 'ACTIVE',
            role_id: generalMemberRole.id,
          }
        });

        await prisma.profile.create({
          data: {
            id: 'test-user-id',
            name_sei: 'テスト',
            name_mei: 'ユーザー',
            graduation_year: 2020,
          }
        });
      }
    });

    it('should login successfully with correct credentials', async () => {
      const loginData = {
        email: 'login-test@example.com',
        password: 'TestPassword123!',
      };

      const result = await AuthService.login(loginData, '127.0.0.1', 'Test Agent');

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(loginData.email);
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
    });

    it('should throw error for invalid credentials', async () => {
      const loginData = {
        email: 'login-test@example.com',
        password: 'WrongPassword123!',
      };

      await expect(
        AuthService.login(loginData, '127.0.0.1', 'Test Agent')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for pending user', async () => {
      // ステータスをPENDINGに変更
      await prisma.user.update({
        where: { email: 'login-test@example.com' },
        data: { status: 'PENDING' }
      });

      const loginData = {
        email: 'login-test@example.com',
        password: 'TestPassword123!',
      };

      await expect(
        AuthService.login(loginData, '127.0.0.1', 'Test Agent')
      ).rejects.toThrow('Account is pending approval');
    });
  });

  describe('changePassword', () => {
    const userId = 'change-password-user';

    beforeEach(async () => {
      const generalMemberRole = await prisma.role.findUnique({
        where: { name: 'GENERAL_MEMBER' }
      });

      if (generalMemberRole) {
        const passwordHash = await PasswordUtil.hash('OldPassword123!');

        await prisma.user.create({
          data: {
            id: userId,
            email: 'change-password@example.com',
            password_hash: passwordHash,
            status: 'ACTIVE',
            role_id: generalMemberRole.id,
          }
        });
      }
    });

    it('should change password successfully', async () => {
      await AuthService.changePassword(userId, 'OldPassword123!', 'NewPassword123!');

      // 新しいパスワードで認証できることを確認
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      expect(user).toBeDefined();
      const isValidPassword = await PasswordUtil.verify('NewPassword123!', user!.password_hash);
      expect(isValidPassword).toBe(true);
    });

    it('should throw error for incorrect current password', async () => {
      await expect(
        AuthService.changePassword(userId, 'WrongPassword123!', 'NewPassword123!')
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw error for weak new password', async () => {
      await expect(
        AuthService.changePassword(userId, 'OldPassword123!', 'weak')
      ).rejects.toThrow('New password does not meet security requirements');
    });
  });
});
