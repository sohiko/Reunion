const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // next.config.jsと.test.jsファイルが置かれているディレクトリへのパス
  dir: './',
})

// Jestに渡す設定を追加
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    // CSSモジュールのモック
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/pages/_app.tsx',
    '!src/pages/_document.tsx',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
  ],
}

// createJestConfigはnext/jestが提供する関数で、next.jsの設定を基にしたJest設定を作成
module.exports = createJestConfig(customJestConfig)
