export type KioskState = 'ok' | 'jam' | 'offline' | 'no_paper' | 'disabled';

export type SessionState =
  | 'idle'
  | 'qr_shown'
  | 'phone_connected'
  | 'file_uploaded'
  | 'file_ready'
  | 'options_set'
  | 'awaiting_payment'
  | 'paid'
  | 'printing'
  | 'printed'
  | 'completed'
  | 'expired'
  | 'cancelled'
  | 'payment_failed'
  | 'print_failed'
  | 'refunded';

export type PaymentStatus = 'unpaid' | 'awaiting_payment' | 'paid' | 'refunded' | 'failed';

export interface Kiosk {
  id: string;
  owner_id: string;
  code: string;
  name: string;
  location: string;
  supports_colour: boolean;
  paper_sheets: number;
  paper_capacity: number;
  toner_pct: number;
  state: KioskState;
  last_heartbeat: string | null;
  device_secret_hash: string;
  rate_bw_paise: number;
  rate_colour_paise: number;
  double_discount_pct: number;
  cost_bw_paise: number;
  cost_colour_paise: number;
  created_at: string;
}

export interface KioskSession {
  id: string;
  kiosk_id: string;
  token_hash: string;
  short_code: string; // 6-char backup code e.g. K7P-2QX
  state: SessionState;
  phone_device_id: string | null;
  created_at: string;
  expires_at: string;
  claimed_at: string | null;
  job_id: string | null;
  updated_at: string;
}

export interface Job {
  id: string;
  session_id: string | null;
  kiosk_id: string;
  token_no: number | null;
  customer_phone: string;
  file_path: string;
  file_name: string;
  total_pages: number;
  page_range?: string | null;
  copies: number;
  colour: boolean;
  double_sided: boolean;
  orientation: 'auto' | 'portrait' | 'landscape';
  sheets: number;
  amount_paise: number;
  payment_status: PaymentStatus;
  razorpay_qr_id: string | null;
  razorpay_payment_id: string | null;
  printed_sheets: number;
  fail_reason: string | null;
  refund_paise: number;
  created_at: string;
  paid_at: string | null;
  done_at: string | null;
}

export interface KioskEvent {
  id: string;
  kiosk_id: string;
  type: string;
  payload: Record<string, any>;
  created_at: string;
}

export interface PrintJobOptions {
  pages: number;
  copies: number;
  colour: boolean;
  double_sided: boolean;
  orientation?: 'auto' | 'portrait' | 'landscape';
  page_range?: string;
}

export interface PricingBreakdown {
  pages: number;
  copies: number;
  sheets: number;
  ratePerPagePaise: number;
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  totalRupees: string;
}
