import { PrismaClient } from '@prisma/client';
import { PasswordUtil } from '../packages/shared/src/utils';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ロールデータの作成
  const roles = [
    {
      id: 'role-general-member',
      name: 'GENERAL_MEMBER',
      description: '一般会員',
      permissions: {
        auth: ['login', 'register', 'change_password'],
        profile: ['read_own', 'update_own'],
        search: ['same_graduation_year'],
        contact: ['request_access', 'grant_access'],
        events: ['read', 'register'],
        messages: ['send_individual', 'receive'],
      },
    },
    {
      id: 'role-coordinator',
      name: 'COORDINATOR',
      description: '幹事',
      permissions: {
        auth: ['login', 'register', 'change_password'],
        profile: ['read_own', 'update_own', 'read_assigned_year', 'update_assigned_year'],
        search: ['same_graduation_year', 'assigned_year'],
        contact: ['read_assigned_year', 'request_access', 'grant_access'],
        events: ['read', 'create_assigned_year', 'update_assigned_year'],
        messages: ['send_individual', 'send_bulk_assigned_year', 'receive'],
        management: ['delete_assigned_year'],
        audit: ['read_assigned_year'],
      },
    },
    {
      id: 'role-officer',
      name: 'OFFICER',
      description: '同窓会役員',
      permissions: {
        auth: ['login', 'register', 'change_password'],
        profile: ['read_own', 'update_own', 'read_all', 'update_all'],
        search: ['same_graduation_year', 'all_years_with_approval'],
        contact: ['read_all', 'request_access', 'grant_access'],
        events: ['read', 'create_all', 'update_all', 'delete_all'],
        messages: ['send_individual', 'send_bulk_all', 'receive'],
        management: ['approve_users', 'manage_roles', 'assign_coordinators', 'delete_all'],
        audit: ['read_all', 'approve_operations'],
        export: ['user_data', 'audit_logs'],
      },
    },
    {
      id: 'role-teacher',
      name: 'TEACHER',
      description: '教員',
      permissions: {
        auth: ['login', 'register', 'change_password'],
        profile: ['read_own', 'update_own'],
        events: ['read'],
        messages: ['send_bulk_graduation_years'],
      },
    },
    {
      id: 'role-system-admin',
      name: 'SYSTEM_ADMIN',
      description: 'システム管理者',
      permissions: {
        system: ['monitor', 'configure', 'backup', 'restore'],
      },
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: {},
      create: role,
    });
  }

  console.log('Roles created');

  // システム管理者ユーザーの作成（開発環境用）
  if (process.env.NODE_ENV === 'development') {
    const systemAdminRole = await prisma.role.findUnique({
      where: { name: 'SYSTEM_ADMIN' }
    });

    if (systemAdminRole) {
      const adminPassword = await PasswordUtil.hash('Admin123!@#');

      const adminUser = await prisma.user.upsert({
        where: { email: 'admin@reunion.com' },
        update: {},
        create: {
          id: 'user-admin',
          email: 'admin@reunion.com',
          password_hash: adminPassword,
          status: 'ACTIVE',
          role_id: systemAdminRole.id,
        },
      });

      await prisma.profile.upsert({
        where: { id: adminUser.id },
        update: {},
        create: {
          id: adminUser.id,
          name_sei: 'システム',
          name_mei: '管理者',
          graduation_year: 2000,
        },
      });

      console.log('System admin user created');
    }

    // テストユーザーの作成
    const generalMemberRole = await prisma.role.findUnique({
      where: { name: 'GENERAL_MEMBER' }
    });

    if (generalMemberRole) {
      const testUsers = [
        {
          id: 'user-test-1',
          email: 'test1@example.com',
          name_sei: 'テスト',
          name_mei: '太郎',
          graduation_year: 2020,
        },
        {
          id: 'user-test-2',
          email: 'test2@example.com',
          name_sei: 'テスト',
          name_mei: '次郎',
          graduation_year: 2020,
        },
        {
          id: 'user-test-3',
          email: 'test3@example.com',
          name_sei: 'テスト',
          name_mei: '三郎',
          graduation_year: 2019,
        },
      ];

      for (const testUser of testUsers) {
        const password = await PasswordUtil.hash('Test123!@#');

        await prisma.user.upsert({
          where: { email: testUser.email },
          update: {},
          create: {
            id: testUser.id,
            email: testUser.email,
            password_hash: password,
            status: 'ACTIVE',
            role_id: generalMemberRole.id,
          },
        });

        await prisma.profile.upsert({
          where: { id: testUser.id },
          update: {},
          create: {
            id: testUser.id,
            name_sei: testUser.name_sei,
            name_mei: testUser.name_mei,
            graduation_year: testUser.graduation_year,
          },
        });
      }

      console.log('Test users created');
    }
  }

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
