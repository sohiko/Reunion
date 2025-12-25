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
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberDecrementStepper,
  NumberIncrementStepper,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import NextLink from 'next/link';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name_sei: '',
    name_mei: '',
    email: '',
    password: '',
    confirmPassword: '',
    graduation_year: new Date().getFullYear(),
    student_number: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const { register, error, clearError } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGraduationYearChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      graduation_year: parseInt(value) || new Date().getFullYear()
    }));
  };

  const validateForm = () => {
    if (!formData.name_sei || !formData.name_mei) {
      throw new Error('氏名を入力してください');
    }
    if (!formData.email) {
      throw new Error('メールアドレスを入力してください');
    }
    if (!formData.password) {
      throw new Error('パスワードを入力してください');
    }
    if (formData.password !== formData.confirmPassword) {
      throw new Error('パスワードが一致しません');
    }
    if (formData.password.length < 12) {
      throw new Error('パスワードは12文字以上で入力してください');
    }
    if (!/\d/.test(formData.password) || !/[a-zA-Z]/.test(formData.password)) {
      throw new Error('パスワードには数字と英字を含めてください');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearError();

    try {
      validateForm();

      await register({
        name_sei: formData.name_sei,
        name_mei: formData.name_mei,
        email: formData.email,
        password: formData.password,
        graduation_year: formData.graduation_year,
        student_number: formData.student_number || undefined,
      });

      toast({
        title: '登録申請完了',
        description: '承認されるまでお待ちください。承認完了のメールが届きます。',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      router.push('/login');
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
              新規登録
            </Heading>

            <Text fontSize="sm" color="gray.600" textAlign="center">
              登録後、役員による承認が必要です。承認完了までログインできません。
            </Text>

            {error && (
              <Alert status="error">
                <AlertIcon />
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>姓</FormLabel>
                  <Input
                    name="name_sei"
                    value={formData.name_sei}
                    onChange={handleInputChange}
                    placeholder="山田"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>名</FormLabel>
                  <Input
                    name="name_mei"
                    value={formData.name_mei}
                    onChange={handleInputChange}
                    placeholder="太郎"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>メールアドレス</FormLabel>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your@email.com"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>卒業年</FormLabel>
                  <NumberInput
                    value={formData.graduation_year}
                    onChange={handleGraduationYearChange}
                    min={1950}
                    max={new Date().getFullYear() + 10}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl>
                  <FormLabel>学生番号（任意）</FormLabel>
                  <Input
                    name="student_number"
                    value={formData.student_number}
                    onChange={handleInputChange}
                    placeholder="12345678"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>パスワード</FormLabel>
                  <Input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="12文字以上の英数字混在"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>パスワード（確認）</FormLabel>
                  <Input
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="パスワードを再入力"
                  />
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="brand"
                  size="lg"
                  width="full"
                  isLoading={isLoading}
                  loadingText="登録中..."
                >
                  登録申請
                </Button>
              </VStack>
            </form>

            <Text fontSize="sm" color="gray.600">
              すでにアカウントをお持ちですか？{' '}
              <Link as={NextLink} href="/login" color="brand.500">
                ログイン
              </Link>
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
};

export default RegisterPage;
