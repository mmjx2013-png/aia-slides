/** Bindings, variables and secrets of the Worker. Secrets are set with `wrangler secret put`, never in files. */
export interface Env {
  DB: D1Database;
  DECKS: R2Bucket;

  // Secrets
  LINE_CHANNEL_ID: string;
  LINE_CHANNEL_SECRET: string;
  SESSION_SECRET: string;
  /** Comma-separated LINE user IDs (U + 32 hex) of the admins. */
  ADMIN_LINE_IDS: string;
  /** PromptPay target: a 10-digit mobile number, a 13-digit national/tax ID or a 15-digit e-wallet ID. */
  PROMPTPAY_ID?: string;

  // Plain variables (wrangler.toml [vars])
  ENVIRONMENT?: string;
  APP_ORIGIN?: string;
  LINE_OA_ID?: string;
  PAYMENT_PROVIDER?: string;
  LINE_BOT_PROMPT?: string;

  /** Local development only: point LINE Login at the mock server. Ignored when ENVIRONMENT is "production". */
  LINE_AUTH_ORIGIN?: string;
  LINE_API_ORIGIN?: string;
}

export interface Teacher {
  id: number;
  line_user_id: string;
  display_name: string;
  school: string;
  status: 'active' | 'blocked';
  created_at: number;
  last_login_at: number | null;
}

export interface Book {
  id: number;
  title: string;
  subject: string;
  grade: string;
  slide_count: number;
  rate_baht_per_slide: number;
  status: 'draft' | 'published' | 'archived';
  created_at: number;
  updated_at: number;
}

export interface Unit {
  id: number;
  book_id: number;
  position: number;
  title: string;
  slide_count: number;
  r2_key: string | null;
  script_hashes: string;
  html_sha256: string | null;
  html_bytes: number | null;
  uploaded_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface Subscription {
  id: number;
  teacher_id: number;
  book_id: number;
  period_start: number | null;
  period_end: number | null;
  monthly_price: number;
  status: 'pending' | 'active' | 'expired';
  created_at: number;
  updated_at: number;
}

export interface Payment {
  id: number;
  subscription_id: number;
  teacher_id: number;
  provider: 'manual' | 'stripe';
  months: number;
  slide_count: number;
  rate_baht: number;
  monthly_price: number;
  amount_satang: number;
  ref: string | null;
  status: 'pending' | 'confirmed' | 'rejected';
  notified_at: number | null;
  confirmed_by: string | null;
  decided_at: number | null;
  created_at: number;
}

/** Everything a route handler needs about the current request. */
export interface Ctx {
  req: Request;
  env: Env;
  exec: ExecutionContext;
  url: URL;
  /** The public origin, e.g. https://kruslide.example */
  origin: string;
  ip: string;
  now: number;
  params: Record<string, string>;
  sessionId: string | null;
  teacher: Teacher | null;
  isAdmin: boolean;
  csrf: string;
}
