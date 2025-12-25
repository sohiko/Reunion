import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  Alert,
  AlertIcon,
  Link,
  Heading,
  useToast,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import NextLink from 'next/link';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, error, clearError } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearError();

    try {
      await login(email, password);
      toast({
        title: 'ログイン成功',
        description: 'ダッシュボードへ移動します',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      router.push('/dashboard');
    } catch (error) {
      // エラーはAuthContextで処理される
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="md" py={12}>
      <VStack spacing={8}>
        <Heading as="h1" size="xl" textAlign="center">
          同窓会アプリ
        </Heading>

        <Box
          bg="white"
          p={8}
          rounded="lg"
          shadow="lg"
          w="full"
        >
          <VStack spacing={4}>
            <Heading as="h2" size="lg" textAlign="center">
              ログイン
            </Heading>

            {error && (
              <Alert status="error">
                <AlertIcon />
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>メールアドレス</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>パスワード</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワード"
                  />
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="brand"
                  size="lg"
                  width="full"
                  isLoading={isLoading}
                  loadingText="ログイン中..."
                >
                  ログイン
                </Button>
              </VStack>
            </form>

            <Text fontSize="sm" color="gray.600">
              パスワードをお忘れですか？{' '}
              <Link as={NextLink} href="/forgot-password" color="brand.500">
                パスワードリセット
              </Link>
            </Text>

            <Text fontSize="sm" color="gray.600">
              アカウントをお持ちでないですか？{' '}
              <Link as={NextLink} href="/register" color="brand.500">
                新規登録
              </Link>
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
};

export default LoginPage;
