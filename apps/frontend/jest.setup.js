import '@testing-library/jest-dom';

// axiosのモックは各テストファイルで個別に設定

// React Queryのテスト設定
import { QueryClient } from 'react-query';
global.queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// コンソールエラーの抑制（テスト時に不要な警告を隠す）
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
