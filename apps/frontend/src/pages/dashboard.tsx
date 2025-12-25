import React, { useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Grid,
  GridItem,
  Card,
  CardBody,
  Button,
  Badge,
  Avatar,
  HStack,
  useToast,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '@reunion/shared';

const DashboardPage: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: 'ログアウトしました',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      router.push('/login');
    } catch (error) {
      toast({
        title: 'ログアウトエラー',
        description: 'ログアウトに失敗しました',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Text>読み込み中...</Text>
      </Container>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.SYSTEM_ADMIN:
        return 'red';
      case UserRole.OFFICER:
        return 'purple';
      case UserRole.COORDINATOR:
        return 'blue';
      case UserRole.TEACHER:
        return 'green';
      default:
        return 'gray';
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case UserRole.SYSTEM_ADMIN:
        return 'システム管理者';
      case UserRole.OFFICER:
        return '同窓会役員';
      case UserRole.COORDINATOR:
        return '幹事';
      case UserRole.TEACHER:
        return '教員';
      default:
        return '一般会員';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'green';
      case 'PENDING':
        return 'yellow';
      case 'SUSPENDED':
        return 'red';
      case 'DELETED':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '承認済み';
      case 'PENDING':
        return '承認待ち';
      case 'SUSPENDED':
        return '停止中';
      case 'DELETED':
        return '削除済み';
      default:
        return status;
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* ヘッダー */}
        <Box>
          <HStack justify="space-between" align="center">
            <Heading as="h1" size="xl">
              ダッシュボード
            </Heading>
            <Button onClick={handleLogout} colorScheme="red" variant="outline">
              ログアウト
            </Button>
          </HStack>
        </Box>

        {/* ユーザー情報 */}
        <Card>
          <CardBody>
            <HStack spacing={4}>
              <Avatar
                size="lg"
                name={`${user.profile?.name_sei} ${user.profile?.name_mei}`}
              />
              <VStack align="start" spacing={2}>
                <HStack>
                  <Heading size="md">
                    {user.profile?.name_sei} {user.profile?.name_mei}
                  </Heading>
                  <Badge colorScheme={getRoleBadgeColor(user.role as UserRole)}>
                    {getRoleDisplayName(user.role as UserRole)}
                  </Badge>
                  <Badge colorScheme={getStatusBadgeColor(user.status)}>
                    {getStatusDisplayName(user.status)}
                  </Badge>
                </HStack>
                <Text color="gray.600">{user.email}</Text>
                {user.profile?.graduation_year && (
                  <Text color="gray.600">
                    卒業年: {user.profile.graduation_year}年
                  </Text>
                )}
              </VStack>
            </HStack>
          </CardBody>
        </Card>

        {/* メニューグリッド */}
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={6}>
          {/* プロフィール管理 */}
          <GridItem>
            <Card>
              <CardBody>
                <VStack spacing={4}>
                  <Heading size="md">プロフィール管理</Heading>
                  <Text color="gray.600">
                    個人情報の閲覧・編集を行います
                  </Text>
                  <Button colorScheme="brand" width="full">
                    プロフィール編集
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          </GridItem>

          {/* 会員検索 */}
          <GridItem>
            <Card>
              <CardBody>
                <VStack spacing={4}>
                  <Heading size="md">会員検索</Heading>
                  <Text color="gray.600">
                    他の卒業生を検索します
                  </Text>
                  <Button colorScheme="brand" width="full">
                    検索
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          </GridItem>

          {/* イベント */}
          <GridItem>
            <Card>
              <CardBody>
                <VStack spacing={4}>
                  <Heading size="md">イベント</Heading>
                  <Text color="gray.600">
                    同窓会イベントの確認・参加登録
                  </Text>
                  <Button colorScheme="brand" width="full">
                    イベント一覧
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          </GridItem>

          {/* メッセージ */}
          <GridItem>
            <Card>
              <CardBody>
                <VStack spacing={4}>
                  <Heading size="md">メッセージ</Heading>
                  <Text color="gray.600">
                    他の会員とのメッセージ交換
                  </Text>
                  <Button colorScheme="brand" width="full">
                    メッセージ
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          </GridItem>

          {/* 管理機能（幹事以上） */}
          {(user.role === UserRole.COORDINATOR ||
            user.role === UserRole.OFFICER ||
            user.role === UserRole.SYSTEM_ADMIN) && (
            <GridItem>
              <Card>
                <CardBody>
                  <VStack spacing={4}>
                    <Heading size="md">管理機能</Heading>
                    <Text color="gray.600">
                      担当学年の会員管理を行います
                    </Text>
                    <Button colorScheme="brand" width="full">
                      会員管理
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </GridItem>
          )}

          {/* システム管理（管理者） */}
          {user.role === UserRole.SYSTEM_ADMIN && (
            <GridItem>
              <Card>
                <CardBody>
                  <VStack spacing={4}>
                    <Heading size="md">システム管理</Heading>
                    <Text color="gray.600">
                      システム全体の管理を行います
                    </Text>
                    <Button colorScheme="brand" width="full">
                      システム設定
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </GridItem>
          )}
        </Grid>
      </VStack>
    </Container>
  );
};

export default DashboardPage;
