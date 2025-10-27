// jest.setup.js

// Add custom matchers
import '@testing-library/jest-dom';

// Mock environment variables for testing
process.env = {
  ...process.env,
  DATABASE_URL: 'postgresql://test@localhost/test',
  WHOP_API_KEY: 'test_api_key',
  WHOP_WEBHOOK_SECRET: 'test_webhook_secret',
  NEXT_PUBLIC_WHOP_APP_ID: 'test_app_id',
  NEXT_PUBLIC_WHOP_COMPANY_ID: 'test_company_id',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  CRON_SECRET: 'test_cron_secret',
  IP_HASH_SALT: 'test_ip_salt',
};

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return {
      get: jest.fn(),
    };
  },
  usePathname() {
    return '/test';
  },
  notFound: jest.fn(),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn((message, ...args) => {
    // Only show actual errors, not React warnings
    if (
      typeof message === 'string' &&
      !message.includes('Warning:') &&
      !message.includes('ReactDOM.render')
    ) {
      originalError(message, ...args);
    }
  });

  console.warn = jest.fn((message, ...args) => {
    // Filter out expected warnings
    if (
      typeof message === 'string' &&
      !message.includes('Warning:')
    ) {
      originalWarn(message, ...args);
    }
  });
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});