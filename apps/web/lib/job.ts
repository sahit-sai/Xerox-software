import crypto from 'crypto';
import { supabaseAdmin, isSupabaseConfigured } from './supabase';
import { calculateSheets } from '@printq/shared';
import { getSessionStatus } from './session';
import { consumeKioskPaper } from './kiosk';

export interface StoredJob {
  id: string;
  session_id: string | null;
  kiosk_id: string;
  token_no: number;
  token: number; // alias for compatibility
  customer_phone: string;
  file_path: string;
  file_name: string;
  total_pages: number;
  pages: number; // alias for compatibility
  page_range?: string | null;
  copies: number;
  colour: boolean;
  double_sided: boolean;
  orientation: 'auto' | 'portrait' | 'landscape';
  sheets: number;
  amount_paise: number;
  payment_status: 'unpaid' | 'awaiting_payment' | 'paid' | 'refunded' | 'failed';
  status: 'awaiting_payment' | 'queued' | 'printing' | 'done' | 'failed' | 'refunded';
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  printed_sheets: number;
  fail_reason?: string | null;
  refund_paise: number;
  created_at: string;
  paid_at?: string | null;
  done_at?: string | null;
  file_buffer?: Buffer | null;
}

// In-memory store for local execution, dev, and offline resilience
const memoryJobs = new Map<string, StoredJob>();
const memoryJobFiles = new Map<string, Buffer>();
const kioskTokenCounters = new Map<string, { date: string; counter: number }>();

function getNextTokenNumber(kioskId: string): number {
  const today = new Date().toISOString().split('T')[0];
  const current = kioskTokenCounters.get(kioskId);
  if (!current || current.date !== today) {
    kioskTokenCounters.set(kioskId, { date: today, counter: 1 });
    return 1;
  }
  current.counter += 1;
  kioskTokenCounters.set(kioskId, current);
  return current.counter;
}

export function createOrQueueJob(params: {
  jobId?: string;
  sessionId?: string | null;
  kioskId: string;
  customerPhone?: string;
  fileName: string;
  filePath?: string;
  totalPages: number;
  copies?: number;
  colour?: boolean;
  doubleSided?: boolean;
  orientation?: 'auto' | 'portrait' | 'landscape';
  pageRange?: string;
  sheets?: number;
  amountPaise: number;
  status?: 'awaiting_payment' | 'queued';
  paymentStatus?: 'unpaid' | 'paid';
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  fileBuffer?: Buffer | null;
}): StoredJob {
  const id = params.jobId || crypto.randomUUID();
  const copies = params.copies || 1;
  const doubleSided = Boolean(params.doubleSided);
  const totalPages = Math.max(1, params.totalPages || 1);
  const sheets = params.sheets || calculateSheets(totalPages, copies, doubleSided);
  const status = params.status || 'queued';
  const paymentStatus = params.paymentStatus || (status === 'queued' ? 'paid' : 'unpaid');
  const now = new Date().toISOString();

  let token = 1;
  if (status === 'queued') {
    token = getNextTokenNumber(params.kioskId);
  }

  const job: StoredJob = {
    id,
    session_id: params.sessionId || null,
    kiosk_id: params.kioskId,
    token_no: token,
    token,
    customer_phone: params.customerPhone || '+910000000000',
    file_path: params.filePath || `jobs/${id}_${params.fileName}`,
    file_name: params.fileName,
    total_pages: totalPages,
    pages: totalPages,
    page_range: params.pageRange || null,
    copies,
    colour: Boolean(params.colour),
    double_sided: doubleSided,
    orientation: params.orientation || 'portrait',
    sheets,
    amount_paise: params.amountPaise,
    payment_status: paymentStatus,
    status,
    razorpay_order_id: params.razorpayOrderId || null,
    razorpay_payment_id: params.razorpayPaymentId || null,
    printed_sheets: 0,
    fail_reason: null,
    refund_paise: 0,
    created_at: now,
    paid_at: status === 'queued' ? now : null,
    done_at: null,
  };

  if (params.fileBuffer) {
    memoryJobFiles.set(id, params.fileBuffer);
  }

  memoryJobs.set(id, job);

  // Sync to Supabase in background if configured
  if (isSupabaseConfigured) {
    supabaseAdmin
      .from('jobs')
      .upsert({
        id: job.id,
        session_id: job.session_id,
        kiosk_id: job.kiosk_id,
        token_no: job.token_no,
        customer_phone: job.customer_phone,
        file_path: job.file_path,
        file_name: job.file_name,
        total_pages: job.total_pages,
        page_range: job.page_range,
        copies: job.copies,
        colour: job.colour,
        double_sided: job.double_sided,
        orientation: job.orientation,
        sheets: job.sheets,
        amount_paise: job.amount_paise,
        payment_status: job.payment_status,
        status: job.status,
        razorpay_payment_id: job.razorpay_payment_id,
        created_at: job.created_at,
        paid_at: job.paid_at,
      })
      .then(
        ({ error }: any) => {
          if (error) console.warn('Supabase job sync warning:', error);
        },
        (err: any) => console.warn('Supabase job sync error:', err)
      );
  }

  return job;
}

export function queueJobById(jobId: string, paymentId?: string): StoredJob | null {
  const job = memoryJobs.get(jobId);
  if (!job) return null;

  if (job.status === 'awaiting_payment') {
    job.token_no = getNextTokenNumber(job.kiosk_id);
    job.token = job.token_no;
  }
  job.status = 'queued';
  job.payment_status = 'paid';
  job.paid_at = new Date().toISOString();
  if (paymentId) job.razorpay_payment_id = paymentId;

  memoryJobs.set(jobId, job);

  if (isSupabaseConfigured) {
    supabaseAdmin
      .from('jobs')
      .update({
        status: 'queued',
        token_no: job.token_no,
        paid_at: job.paid_at,
        razorpay_payment_id: job.razorpay_payment_id,
      })
      .eq('id', jobId)
      .then(() => {}, () => {});
  }

  return job;
}

export function getJobById(jobId: string): StoredJob | null {
  return memoryJobs.get(jobId) || null;
}

export function getJobFileBuffer(jobId: string): Buffer | null {
  return memoryJobFiles.get(jobId) || null;
}

export function setJobFileBuffer(jobId: string, buffer: Buffer): void {
  memoryJobFiles.set(jobId, buffer);
}

export function getNextQueuedJob(kioskId: string): StoredJob | null {
  for (const job of Array.from(memoryJobs.values())) {
    if (job.kiosk_id === kioskId && job.status === 'queued') {
      job.status = 'printing';
      memoryJobs.set(job.id, job);

      if (isSupabaseConfigured) {
        supabaseAdmin
          .from('jobs')
          .update({ status: 'printing' })
          .eq('id', job.id)
          .then(() => {}, () => {});
      }

      return job;
    }
  }
  return null;
}

export function updateJobProgress(jobId: string, printedSheets: number): StoredJob | null {
  const job = memoryJobs.get(jobId);
  if (!job) return null;

  job.printed_sheets = printedSheets;
  memoryJobs.set(jobId, job);

  if (isSupabaseConfigured) {
    supabaseAdmin
      .from('jobs')
      .update({ printed_sheets: printedSheets })
      .eq('id', jobId)
      .then(() => {}, () => {});
  }

  return job;
}

export function completeJob(jobId: string): StoredJob | null {
  const job = memoryJobs.get(jobId);
  if (!job) return null;

  job.status = 'done';
  job.done_at = new Date().toISOString();
  job.printed_sheets = job.sheets;
  memoryJobs.set(jobId, job);
  consumeKioskPaper(job.kiosk_id, job.sheets);

  if (isSupabaseConfigured) {
    supabaseAdmin
      .from('jobs')
      .update({ status: 'done', done_at: job.done_at, printed_sheets: job.printed_sheets })
      .eq('id', jobId)
      .then(() => {}, () => {});
  }

  return job;
}

export function failJob(jobId: string, failReason: string, printedSheets: number = 0): StoredJob | null {
  const job = memoryJobs.get(jobId);
  if (!job) return null;

  const totalSheets = job.sheets || 1;
  const unprintedSheets = Math.max(0, totalSheets - printedSheets);
  const refundPaise = Math.round((unprintedSheets / totalSheets) * job.amount_paise);

  job.status = 'failed';
  job.fail_reason = failReason;
  job.printed_sheets = printedSheets;
  job.refund_paise = refundPaise;
  memoryJobs.set(jobId, job);
  if (printedSheets > 0) consumeKioskPaper(job.kiosk_id, printedSheets);

  if (isSupabaseConfigured) {
    supabaseAdmin
      .from('jobs')
      .update({
        status: 'failed',
        fail_reason: failReason,
        printed_sheets: printedSheets,
        refund_paise: refundPaise,
      })
      .eq('id', jobId)
      .then(() => {}, () => {});
  }

  return job;
}

export function getAllJobs(): StoredJob[] {
  return Array.from(memoryJobs.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function getKioskJobStats(kioskId: string): { queueCount: number; activeJob: StoredJob | null } {
  let queueCount = 0;
  let activeJob: StoredJob | null = null;
  for (const job of Array.from(memoryJobs.values())) {
    if (job.kiosk_id === kioskId) {
      if (job.status === 'queued') queueCount++;
      if (job.status === 'printing' && !activeJob) activeJob = job;
    }
  }
  return { queueCount, activeJob };
}

export function createJobFromSession(sessionToken: string, options: {
  kioskId: string;
  copies?: number;
  colour?: boolean;
  doubleSided?: boolean;
  orientation?: 'auto' | 'portrait' | 'landscape';
  pageRange?: string;
  amountPaise: number;
}): StoredJob | null {
  const { session } = getSessionStatus(sessionToken);
  const file = session?.file;
  if (!file) return null;

  return createOrQueueJob({
    sessionId: session.id,
    kioskId: options.kioskId,
    customerPhone: '+917842410691',
    fileName: file.name || 'document.pdf',
    filePath: file.path,
    totalPages: file.pages || 1,
    copies: options.copies || 1,
    colour: Boolean(options.colour),
    doubleSided: Boolean(options.doubleSided),
    orientation: options.orientation || 'portrait',
    pageRange: options.pageRange,
    amountPaise: options.amountPaise,
    status: 'queued',
    paymentStatus: 'paid',
    fileBuffer: file.buffer || null,
  });
}
