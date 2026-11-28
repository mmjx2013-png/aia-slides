import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';

// Tests run inside workerd (the Workers runtime) with local D1 and R2 from Miniflare.
// The values below are throwaway TEST fixtures, not real credentials.
export default defineConfig(async () => {
  const migrations = await readD1Migrations('./migrations');
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            ENVIRONMENT: 'test',
            APP_ORIGIN: 'https://kruslide.test',
            LINE_CHANNEL_ID: '1234567890',
            LINE_CHANNEL_SECRET: 'test-channel-secret-not-real-000',
            SESSION_SECRET: 'test-session-secret-not-real-0000000000000000',
            ADMIN_LINE_IDS: 'Uaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            PROMPTPAY_ID: '0812345678',
          },
        },
      }),
    ],
    test: {
      setupFiles: ['./test/setup.ts'],
    },
  };
});
