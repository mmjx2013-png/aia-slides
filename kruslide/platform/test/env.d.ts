import type { Env as AppEnv } from '../src/env';
import type { D1Migration } from 'cloudflare:test';

declare global {
  namespace Cloudflare {
    interface Env extends AppEnv {
      TEST_MIGRATIONS: D1Migration[];
      /** The tests run with the production storage: the R2 bucket from wrangler.toml. */
      DECKS: R2Bucket;
    }
  }
}
export {};
