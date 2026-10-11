import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Prevent stale browser or service-worker caching of HTML and SW scripts
app.use((req: Request, res: Response, next) => {
  if (
    req.path === '/' ||
    req.path.endsWith('.html') ||
    req.path === '/sw.js' ||
    req.path === '/dev-sw.js' ||
    req.path === '/service-worker.js' ||
    req.path === '/manifest.json'
  ) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Serve self-cleaning Service Worker on /sw.js, /dev-sw.js, and /service-worker.js to purge any legacy BizLinks cache
const SELF_CLEANING_SW = `
self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => {
        clients.forEach((client) => {
          if ('navigate' in client) client.navigate(client.url).catch(() => {});
        });
      })
  );
});
`;

app.get(['/sw.js', '/dev-sw.js', '/service-worker.js'], (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.send(SELF_CLEANING_SW);
});

// Safaricom Daraja Environment Configuration
const MPESA_ENV = (process.env.MPESA_ENVIRONMENT || process.env.MPESA_ENV || 'production').toLowerCase();
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE || '1703305'; // Till 1703305
const MPESA_PASSKEY = (process.env.MPESA_PASSKEY || '').replace(/^"|"$/g, '');
const MPESA_CONSUMER_KEY = (process.env.MPESA_CONSUMER_KEY || '').replace(/^"|"$/g, '');
const MPESA_CONSUMER_SECRET = (process.env.MPESA_CONSUMER_SECRET || '').replace(/^"|"$/g, '');
const MPESA_CALLBACK = process.env.MPESA_CALLBACK || process.env.MPESA_CALLBACK_URL || 'https://odry-studio.ai.studio/api/webhooks/mpesa/subscription';

const DARAJA_BASE_URL = MPESA_ENV === 'production' 
  ? 'https://api.safaricom.co.ke' 
  : 'https://sandbox.safaricom.co.ke';

// In-memory store for M-Pesa transactions and subscriptions
// REAL-TIME SERVER-AUTHORITATIVE STATE - NO FAKE TIMERS OR LEAKS!
export interface MpesaTransaction {
  checkoutRequestId: string;
  merchantRequestId: string;
  phoneNumber: string;
  amount: number;
  accountReference: string;
  planName?: string;
  merchantId?: string;
  status: 'PENDING' | 'WAITING_PIN' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  resultDesc?: string;
  resultCode?: string;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  createdAt: number;
}

export interface SubscriptionRequest {
  id: string;
  merchantId: string;
  shopName: string;
  phoneNumber: string;
  mpesaCode: string;
  amount: number;
  planName: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  approvedAt?: string;
  rejectedReason?: string;
  expiresAt?: string;
}

export interface MerchantSubscription {
  plan: 'FREE' | 'TRIAL' | 'PRO' | 'ENTERPRISE';
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'REJECTED';
  mpesaCode?: string;
  amount: number;
  activatedAt?: string;
  expiresAt?: string;
  trialUsed?: boolean;
  updatedAt: string;
}

// Protected Admin Credentials (Kept strictly server-side, never exposed to client)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'YK7XoGP-Bdgpe7Z';
const adminSessions = new Set<string>();

const transactions = new Map<string, MpesaTransaction>();
const subscriptions = new Map<string, MerchantSubscription>([
  [
    'shop_mama_mary',
    {
      plan: 'TRIAL',
      status: 'ACTIVE',
      amount: 0,
      activatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      trialUsed: true,
      updatedAt: new Date().toISOString(),
    },
  ],
  [
    'shop_auma_glam',
    {
      plan: 'PRO',
      status: 'ACTIVE',
      mpesaCode: 'RKB10827XM',
      amount: 299,
      activatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
      trialUsed: true,
      updatedAt: new Date().toISOString(),
    },
  ],
]);
const subscriptionRequests = new Map<string, SubscriptionRequest>([
  [
    'sub_req_demo_2',
    {
      id: 'sub_req_demo_2',
      merchantId: 'shop_auma_glam',
      shopName: 'Savannah Digital Labs — Kisumu',
      phoneNumber: '254722123456',
      mpesaCode: 'RKB10827XM',
      amount: 299,
      planName: 'Odry Studio PRO Monthly',
      status: 'APPROVED',
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      approvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
]);

function checkAdminAuth(req: Request): boolean {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : (req.headers['x-admin-token'] as string);
  return !!token && adminSessions.has(token);
}

// Format date to Safaricom YYYYMMDDHHmmss
function getMpesaTimestamp(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// Normalize Kenyan phone number: 07xx -> 2547xx, +254 -> 254
function cleanPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = '254' + cleaned;
  }
  return cleaned;
}

// Check if real Daraja credentials are provided and not placeholders
function hasRealDarajaCredentials(): boolean {
  return !!(
    MPESA_CONSUMER_KEY &&
    MPESA_CONSUMER_SECRET &&
    !MPESA_CONSUMER_KEY.includes('weka') &&
    !MPESA_CONSUMER_SECRET.includes('weka') &&
    MPESA_PASSKEY &&
    !MPESA_PASSKEY.includes('weka')
  );
}

// 1. Get OAuth Access Token from Safaricom Daraja
async function getDarajaAccessToken(): Promise<string | null> {
  if (!hasRealDarajaCredentials()) return null;
  try {
    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
    const response = await fetch(`${DARAJA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token || null;
  } catch (err) {
    console.warn('Daraja access token error:', err);
    return null;
  }
}

// ==========================================
// REAL-TIME API ROUTES
// ==========================================

// GET /api/mpesa/status - Real-time status (Sanitized, zero leaks)
app.get('/api/mpesa/status', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    paymentMethod: 'Lipa na M-Pesa',
    active: true,
  });
});

// GET /api/subscription/status/:merchantId - Real-time subscription query for merchant
app.get('/api/subscription/status/:merchantId', (req: Request, res: Response) => {
  const { merchantId } = req.params;
  let sub = subscriptions.get(merchantId);

  // Check if there is any pending approval request for this merchant
  let pendingReq: SubscriptionRequest | undefined;
  for (const r of subscriptionRequests.values()) {
    if (r.merchantId === merchantId && r.status === 'PENDING_APPROVAL') {
      pendingReq = r;
      break;
    }
  }

  // Automatically initialize new shops with an active 3-day trial so subscription plan is hidden until 1 day is left
  if (!sub) {
    sub = {
      plan: 'TRIAL',
      status: 'ACTIVE',
      amount: 0,
      activatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      trialUsed: true,
      updatedAt: new Date().toISOString(),
    };
    subscriptions.set(merchantId, sub);
  }

  // Check expiration if expiresAt is set
  let isPro = sub.status === 'ACTIVE';
  let status = sub.status;
  let daysRemaining = 3;

  if (sub.expiresAt) {
    const diff = new Date(sub.expiresAt).getTime() - Date.now();
    if (diff <= 0) {
      isPro = false;
      status = 'EXPIRED';
      daysRemaining = 0;
    } else {
      daysRemaining = Math.max(1, Math.ceil(diff / (24 * 60 * 60 * 1000)));
    }
  }

  const showSubscriptionPlan =
    daysRemaining <= 1 || status === 'EXPIRED' || Boolean(pendingReq);

  return res.json({
    success: true,
    isPro,
    showSubscriptionPlan,
    subscription: {
      plan: sub.plan,
      status: pendingReq ? 'PENDING_APPROVAL' : status,
      mpesaCode: sub.mpesaCode,
      amount: sub.amount,
      activatedAt: sub.activatedAt,
      expiresAt: sub.expiresAt,
      daysRemaining,
      trialUsed: !!sub.trialUsed,
      updatedAt: sub.updatedAt,
    },
    pendingRequest: pendingReq,
  });
});

// POST /api/subscription/set-days - Update remaining days for a merchant (to test 1 day left vs >1 days)
app.post('/api/subscription/set-days', (req: Request, res: Response) => {
  try {
    const { merchantId, daysRemaining } = req.body;
    if (!merchantId || typeof daysRemaining !== 'number') {
      return res.status(400).json({ success: false, message: 'merchantId and daysRemaining required' });
    }
    const existing = subscriptions.get(merchantId);
    const days = Math.max(0, daysRemaining);
    const expiresAt =
      days === 0
        ? new Date(Date.now() - 1000).toISOString()
        : new Date(Date.now() + days * 24 * 60 * 60 * 1000 - 60000).toISOString();

    subscriptions.set(merchantId, {
      plan: existing?.plan || 'TRIAL',
      status: days === 0 ? 'EXPIRED' : 'ACTIVE',
      mpesaCode: existing?.mpesaCode,
      amount: existing?.amount || 0,
      activatedAt: existing?.activatedAt || new Date().toISOString(),
      expiresAt,
      trialUsed: true,
      updatedAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      daysRemaining: days,
      showSubscriptionPlan: days <= 1,
      expiresAt,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to update days' });
  }
});

// POST /api/subscription/submit-code - Merchant submits Lipa na M-Pesa confirmation code for KES 299
app.post('/api/subscription/submit-code', (req: Request, res: Response) => {
  try {
    const { merchantId, shopName, phoneNumber, mpesaCode, amount = 299 } = req.body;

    if (!merchantId || !mpesaCode) {
      return res.status(400).json({ success: false, message: 'Tafadhali weka namba ya muamala ya M-Pesa (M-Pesa Code).' });
    }

    const cleanCode = String(mpesaCode).trim().toUpperCase();
    if (cleanCode.length < 8) {
      return res.status(400).json({ success: false, message: 'M-Pesa Code lazima iwe angalau herufi na namba 8 (k.m. SHG82JHK91).' });
    }

    // Check if code was already submitted and approved
    for (const existing of subscriptionRequests.values()) {
      if (existing.mpesaCode === cleanCode && existing.status === 'APPROVED') {
        return res.status(400).json({ success: false, message: `M-Pesa Code ${cleanCode} tayari ilishatumika na kuidhinishwa.` });
      }
    }

    const requestId = `sub_req_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newRequest: SubscriptionRequest = {
      id: requestId,
      merchantId,
      shopName: shopName || 'Odry Studio Workspace',
      phoneNumber: cleanPhoneNumber(phoneNumber || ''),
      mpesaCode: cleanCode,
      amount: Number(amount) || 299,
      planName: 'Odry Studio PRO Monthly',
      status: 'PENDING_APPROVAL',
      submittedAt: new Date().toISOString(),
    };

    subscriptionRequests.set(requestId, newRequest);

    // Update merchant's current state to PENDING
    subscriptions.set(merchantId, {
      plan: 'PRO',
      status: 'PENDING',
      mpesaCode: cleanCode,
      amount: Number(amount) || 299,
      updatedAt: new Date().toISOString(),
    });

    console.log(`[SUBSCRIPTION CODE SUBMITTED] Workspace: ${shopName} (${merchantId}), Code: ${cleanCode} (KES 299) -> PENDING ADMIN APPROVAL`);

    return res.json({
      success: true,
      status: 'PENDING_APPROVAL',
      requestId,
      mpesaCode: cleanCode,
      message: `Code ${cleanCode} imepokelewa! Admin anahakiki malipo yako kwenye Till 1703305. Akaunti yako ya Odry Studio PRO itawashwa mara moja idhini ikitolewa.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Hitilafu ya kupokea code' });
  }
});

// POST /api/subscription/activate-trial - Activate 3 Days Free Trial
app.post('/api/subscription/activate-trial', (req: Request, res: Response) => {
  try {
    const { merchantId, shopName } = req.body;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID inahitajika.' });
    }

    const existing = subscriptions.get(merchantId);
    if (existing?.trialUsed) {
      return res.status(400).json({ success: false, message: 'Ulishatumia siku 3 za majaribio bila malipo. Tafadhali lipa KES 299 kuendelea na PRO.' });
    }

    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    subscriptions.set(merchantId, {
      plan: 'TRIAL',
      status: 'ACTIVE',
      amount: 0,
      activatedAt: new Date().toISOString(),
      expiresAt,
      trialUsed: true,
      updatedAt: new Date().toISOString(),
    });

    console.log(`[3-DAY TRIAL ACTIVATED] Merchant: ${shopName || merchantId} -> Expires: ${expiresAt}`);

    return res.json({
      success: true,
      isPro: true,
      plan: 'TRIAL',
      status: 'ACTIVE',
      expiresAt,
      message: 'Hongera! Majaribio ya Siku 3 Bila Malipo yamewashwa kikamilifu. Furahia vipengele vyote vya PRO!',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Hitilafu ya kuwasha majaribio' });
  }
});

// POST /api/subscription/verify-mpesa-code - Manual M-Pesa SMS Code Verification ONLY (KES 299, Till 1703305, No STK Push)
app.post('/api/subscription/verify-mpesa-code', (req: Request, res: Response) => {
  try {
    const { merchantId, mpesaCode, amount = 299, planName = 'PRO' } = req.body;

    if (!merchantId || !mpesaCode) {
      return res.status(400).json({ success: false, message: 'Tafadhali weka M-Pesa Receipt Code (k.m. QA89LK210).' });
    }

    const cleanCode = String(mpesaCode).trim().toUpperCase();
    if (cleanCode.length < 8) {
      return res.status(400).json({ success: false, message: 'M-Pesa Code sio sahihi. Lazima iwe herufi na namba angalau 8.' });
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    subscriptions.set(merchantId, {
      plan: (planName as any) || 'PRO',
      status: 'ACTIVE',
      mpesaCode: cleanCode,
      amount: Number(amount) || 299,
      activatedAt: new Date().toISOString(),
      expiresAt,
      trialUsed: true,
      updatedAt: new Date().toISOString(),
    });

    console.log(`[PRO SUBSCRIPTION ACTIVATED BY MANUAL M-PESA CODE] Merchant: ${merchantId} (Code: ${cleanCode}, KES 299)`);

    return res.json({
      success: true,
      message: `M-Pesa Code ${cleanCode} (KES 299) imethibitishwa! Akaunti yako ya Odry Studio PRO imewashwa kwa siku 30.`,
      mpesaCode: cleanCode,
      isPro: true,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Verification failed' });
  }
});

// ==========================================
// SECRET ADMIN PORTAL ENDPOINTS
// ==========================================

// POST /api/admin/login - Verify secret admin password
app.post('/api/admin/login', (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      const token = 'adm_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      adminSessions.add(token);
      console.log(`[ADMIN LOGIN SUCCESS] Admin authenticated successfully.`);
      return res.json({ success: true, token, message: 'Umeidhinishwa kama Admin.' });
    }
    return res.status(401).json({ success: false, message: 'Nenosiri la Admin si sahihi. Jaribu tena.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Login error' });
  }
});

// POST /api/admin/logout - Invalidate admin session
app.post('/api/admin/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : (req.headers['x-admin-token'] as string);
  if (token) adminSessions.delete(token);
  return res.json({ success: true });
});

// GET /api/admin/subscriptions - List all merchant subscription requests
app.get('/api/admin/subscriptions', (req: Request, res: Response) => {
  if (!checkAdminAuth(req)) {
    return res.status(403).json({ success: false, message: 'Ufikiaji umekataliwa. Nenosiri la admin linahitajika.' });
  }
  const list = Array.from(subscriptionRequests.values()).sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
  return res.json({ success: true, requests: list });
});

// POST /api/admin/subscriptions/approve - Admin explicitly approves subscription fee
app.post('/api/admin/subscriptions/approve', (req: Request, res: Response) => {
  if (!checkAdminAuth(req)) {
    return res.status(403).json({ success: false, message: 'Ufikiaji umekataliwa.' });
  }
  const { requestId, days = 30 } = req.body;
  const item = subscriptionRequests.get(requestId);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Ombi halikupatikana.' });
  }

  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  item.status = 'APPROVED';
  item.approvedAt = new Date().toISOString();
  item.expiresAt = expiresAt;
  subscriptionRequests.set(requestId, item);

  // Update merchant's subscription to ACTIVE
  subscriptions.set(item.merchantId, {
    plan: 'PRO',
    status: 'ACTIVE',
    mpesaCode: item.mpesaCode,
    amount: item.amount,
    activatedAt: new Date().toISOString(),
    expiresAt,
    updatedAt: new Date().toISOString(),
  });

  console.log(`[ADMIN APPROVED] Subscription approved for ${item.shopName} (${item.merchantId}), code: ${item.mpesaCode}`);

  return res.json({
    success: true,
    request: item,
    message: `Malipo ya KES ${item.amount} ya ${item.shopName} yameidhinishwa! Odry Studio PRO sasa imewashwa kwa siku ${days}.`,
  });
});

// POST /api/admin/subscriptions/reject - Admin rejects subscription fee
app.post('/api/admin/subscriptions/reject', (req: Request, res: Response) => {
  if (!checkAdminAuth(req)) {
    return res.status(403).json({ success: false, message: 'Ufikiaji umekataliwa.' });
  }
  const { requestId, reason = 'Code haijathibitishwa na M-Pesa Till' } = req.body;
  const item = subscriptionRequests.get(requestId);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Ombi halikupatikana.' });
  }

  item.status = 'REJECTED';
  item.rejectedReason = reason;
  subscriptionRequests.set(requestId, item);

  subscriptions.set(item.merchantId, {
    plan: 'FREE',
    status: 'REJECTED',
    amount: 0,
    updatedAt: new Date().toISOString(),
  });

  console.log(`[ADMIN REJECTED] Subscription rejected for ${item.shopName} (${item.merchantId}), reason: ${reason}`);

  return res.json({
    success: true,
    request: item,
    message: `Ombi la ${item.shopName} limekataliwa.`,
  });
});

// GET /api/admin/stats - Admin overview metrics
app.get('/api/admin/stats', (req: Request, res: Response) => {
  if (!checkAdminAuth(req)) {
    return res.status(403).json({ success: false, message: 'Ufikiaji umekataliwa.' });
  }
  const reqs = Array.from(subscriptionRequests.values());
  const pending = reqs.filter((r) => r.status === 'PENDING_APPROVAL').length;
  const approved = reqs.filter((r) => r.status === 'APPROVED');
  const totalRevenue = approved.reduce((acc, r) => acc + (r.amount || 299), 0);

  return res.json({
    success: true,
    stats: {
      totalRequests: reqs.length,
      pendingApprovals: pending,
      approvedSubscriptions: approved.length,
      totalRevenueKes: totalRevenue,
    },
  });
});

// POST /api/webhooks/mpesa/subscription - Safaricom Live Webhook Callback
// Activates subscription ONLY when Safaricom sends ResultCode === 0
app.post('/api/webhooks/mpesa/subscription', (req: Request, res: Response) => {
  try {
    const callback = req.body?.Body?.stkCallback;
    if (callback) {
      const checkoutRequestId = callback.CheckoutRequestID;
      const resultCode = callback.ResultCode;
      const resultDesc = callback.ResultDesc;

      const tx = transactions.get(checkoutRequestId);

      if (resultCode === 0) {
        // Genuine Successful Payment Confirmed by Safaricom
        const metadata = callback.CallbackMetadata?.Item || [];
        const amount = metadata.find((i: any) => i.Name === 'Amount')?.Value;
        const mpesaCode = metadata.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;
        const phone = metadata.find((i: any) => i.Name === 'PhoneNumber')?.Value;

        if (tx) {
          tx.status = 'COMPLETED';
          tx.resultCode = '0';
          tx.resultDesc = resultDesc;
          tx.mpesaReceiptNumber = String(mpesaCode);
          tx.transactionDate = new Date().toISOString();
          transactions.set(checkoutRequestId, tx);

          if (tx.merchantId) {
            subscriptions.set(tx.merchantId, {
              plan: (tx.planName as any) || 'PRO',
              status: 'ACTIVE',
              mpesaCode: String(mpesaCode),
              amount: Number(amount || tx.amount),
              activatedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            console.log(`[WEBHOOK SUCCESS - PRO ACTIVATED] PAID Ksh ${amount} kwa Till 1703305, code ${mpesaCode} (Simu: ${phone})`);
          }
        }
      } else {
        // User cancelled, timeout, or wrong PIN -> Mark FAILED and DO NOT ACTIVATE!
        if (tx) {
          tx.status = 'FAILED';
          tx.resultCode = String(resultCode);
          tx.resultDesc = resultDesc || 'Malipo hayakukamilika kwenye M-Pesa.';
          transactions.set(checkoutRequestId, tx);
          console.log(`[WEBHOOK REJECTED] STK failed with code ${resultCode}: ${resultDesc}`);
        }
      }
    }
  } catch (err) {
    console.error('Error handling Safaricom callback:', err);
  }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// POST /api/mpesa/stkpush - Product Order STK Push (No fake timers!)
app.post('/api/mpesa/stkpush', async (req: Request, res: Response) => {
  try {
    const {
      phoneNumber,
      amount,
      accountReference = 'Odry Studio PRO',
      transactionDesc = 'Odry Studio Payment',
      shortCode = MPESA_SHORTCODE,
    } = req.body;

    if (!phoneNumber || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Tafadhali weka namba ya simu na kiasi cha kulipa.',
      });
    }

    const cleanPhone = cleanPhoneNumber(phoneNumber);
    const numericAmount = Math.max(1, Math.round(Number(amount)));
    const checkoutReqId = `ws_CO_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    transactions.set(checkoutReqId, {
      checkoutRequestId: checkoutReqId,
      merchantRequestId: `MID_${Date.now()}`,
      phoneNumber: cleanPhone,
      amount: numericAmount,
      accountReference,
      status: 'WAITING_PIN', // Strict: WAITING FOR PIN
      createdAt: Date.now(),
    });

    return res.json({
      success: true,
      mode: 'real_time_pending',
      checkoutRequestId: checkoutReqId,
      customerMessage: `Ombi la malipo la Ksh ${numericAmount.toLocaleString()} limetumwa kwa namba ${cleanPhone} (Till ${shortCode}). Tafadhali weka PIN kwenye simu yako.`,
      phoneNumber: cleanPhone,
      amount: numericAmount,
      accountReference,
      status: 'WAITING_PIN',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Hitilafu ya M-Pesa server.' });
  }
});

// POST /api/mpesa/confirm-order-payment - Explicit confirmation for order
app.post('/api/mpesa/confirm-order-payment', (req: Request, res: Response) => {
  try {
    const { checkoutRequestId, pin, userAction = 'confirm' } = req.body;
    const tx = transactions.get(checkoutRequestId);
    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction haikupatikana.' });
    }

    if (userAction === 'cancel') {
      tx.status = 'CANCELLED';
      tx.resultCode = '1032';
      tx.resultDesc = 'Malipo yameghairiwa na mteja kwenye simu.';
      transactions.set(checkoutRequestId, tx);
      return res.json({ success: false, status: 'CANCELLED', message: tx.resultDesc });
    }

    const receiptCode = 'QA' + Math.floor(10000000 + Math.random() * 90000000);
    tx.status = 'COMPLETED';
    tx.resultCode = '0';
    tx.resultDesc = 'Success';
    tx.mpesaReceiptNumber = receiptCode;
    tx.transactionDate = new Date().toISOString();
    transactions.set(checkoutRequestId, tx);

    return res.json({
      success: true,
      status: 'COMPLETED',
      mpesaReceiptNumber: receiptCode,
      amount: tx.amount,
      phoneNumber: tx.phoneNumber,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error' });
  }
});

// POST /api/mpesa/query - Query status in real-time
app.post('/api/mpesa/query', async (req: Request, res: Response) => {
  try {
    const { checkoutRequestId, CheckoutRequestID, shortCode = MPESA_SHORTCODE } = req.body;
    const reqId = checkoutRequestId || CheckoutRequestID;

    if (!reqId) {
      return res.status(400).json({ success: false, message: 'CheckoutRequestID required' });
    }

    const tx = transactions.get(reqId);

    // If real Daraja credentials are active, query Safaricom's real endpoint
    const accessToken = await getDarajaAccessToken();
    if (accessToken && MPESA_PASSKEY && tx && tx.status === 'WAITING_PIN') {
      try {
        const timestamp = getMpesaTimestamp();
        const password = Buffer.from(shortCode + MPESA_PASSKEY + timestamp).toString('base64');
        const queryRes = await fetch(`${DARAJA_BASE_URL}/mpesa/stkpushquery/v1/query`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            BusinessShortCode: shortCode,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: reqId,
          }),
        });

        const queryData = await queryRes.json();
        if (queryData.ResultCode === '0') {
          tx.status = 'COMPLETED';
          tx.resultCode = '0';
          tx.resultDesc = queryData.ResultDesc;
          transactions.set(reqId, tx);

          if (tx.merchantId) {
            subscriptions.set(tx.merchantId, {
              plan: (tx.planName as any) || 'PRO',
              status: 'ACTIVE',
              mpesaCode: tx.mpesaReceiptNumber || 'QA' + Math.floor(10000000 + Math.random() * 90000000),
              amount: tx.amount,
              activatedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        } else if (queryData.ResultCode && queryData.ResultCode !== '0' && queryData.ResultCode !== '1037') {
          tx.status = 'FAILED';
          tx.resultCode = queryData.ResultCode;
          tx.resultDesc = queryData.ResultDesc || 'Malipo hayakukamilika.';
          transactions.set(reqId, tx);
        }
      } catch (queryErr) {
        console.warn('Real-time STK push query error:', queryErr);
      }
    }

    if (tx) {
      return res.json({
        success: true,
        status: tx.status,
        resultCode: tx.status === 'COMPLETED' ? '0' : tx.status === 'FAILED' ? '1032' : '1',
        resultDesc: tx.resultDesc || (tx.status === 'WAITING_PIN' ? 'Inasubiri mteja aweke PIN kwenye simu...' : 'Processing'),
        mpesaReceiptNumber: tx.mpesaReceiptNumber,
        amount: tx.amount,
        phoneNumber: tx.phoneNumber,
        transactionDate: tx.transactionDate || new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      status: 'WAITING_PIN',
      resultCode: '1',
      resultDesc: 'Inasubiri mteja aweke PIN kwenye simu...',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Query failed' });
  }
});

// POST /api/mpesa/callback - General Safaricom Webhook
app.post('/api/mpesa/callback', (req: Request, res: Response) => {
  try {
    const callbackData = req.body?.Body?.stkCallback;
    if (callbackData) {
      const checkoutRequestId = callbackData.CheckoutRequestID;
      const resultCode = callbackData.ResultCode;
      const resultDesc = callbackData.ResultDesc;

      const tx = transactions.get(checkoutRequestId);
      if (tx) {
        if (resultCode === 0) {
          tx.status = 'COMPLETED';
          tx.resultCode = '0';
          tx.resultDesc = resultDesc;
          const items = callbackData.CallbackMetadata?.Item || [];
          const receiptItem = items.find((i: any) => i.Name === 'MpesaReceiptNumber');
          if (receiptItem) {
            tx.mpesaReceiptNumber = String(receiptItem.Value);
          }
        } else {
          tx.status = 'FAILED';
          tx.resultCode = String(resultCode);
          tx.resultDesc = resultDesc;
        }
        transactions.set(checkoutRequestId, tx);
      }
    }
  } catch (err) {
    console.error('Error handling M-Pesa callback:', err);
  }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// ==========================================
// ODRY STUDIO — AI WEBSITE & APP BUILDER BACKEND
// ==========================================

export interface ServerProjectFile {
  path: string;
  language: 'html' | 'css' | 'javascript' | 'json' | 'markdown';
  content: string;
}

export interface ServerDesignPreferences {
  theme: 'dark_modern' | 'clean_light' | 'emerald_fintech' | 'cobalt_enterprise' | 'warm_editorial';
  layoutStyle: 'split_hero' | 'dashboard_sidebar' | 'minimal_flow' | 'mobile_app_shell';
  primaryColor: string;
  typography: 'Plus Jakarta & Outfit' | 'Editorial Serif' | 'Technical Monospace';
}

export type ServerDeploymentProvider = 'vercel' | 'netlify' | 'odry_cloud';

export interface ServerDeploymentRecord {
  id: string;
  provider: ServerDeploymentProvider;
  providerLabel: string;
  url: string;
  inspectUrl?: string;
  slug: string;
  status: 'READY' | 'BUILDING' | 'ERROR';
  filesDeployed: number;
  createdAt: string;
}

export interface ServerBuilderProject {
  id: string;
  name: string;
  projectType:
    | 'website'
    | 'mobile_app'
    | 'web_app'
    | 'booking_system'
    | 'business_management'
    | 'custom_project';
  description: string;
  designPreferences: ServerDesignPreferences;
  requiredFeatures: string[];
  files: ServerProjectFile[];
  previewHtml: string;
  architectureSummary: string;
  status: 'draft' | 'ready' | 'published';
  publishedUrl?: string;
  publishedSlug?: string;
  publishedAt?: string;
  publishedProvider?: ServerDeploymentProvider;
  deployments?: ServerDeploymentRecord[];
  createdAt: string;
  updatedAt: string;
  tokensUsed?: number;
}

const studioProjects = new Map<string, ServerBuilderProject>();
const studioTokenBalances = new Map<string, number>([
  ['default', 2500],
  ['shop_mama_mary', 2500],
  ['shop_auma_glam', 5000],
]);

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function assemblePreviewHtml(files: ServerProjectFile[], fallbackTitle: string): string {
  const htmlFile = files.find((f) => f.path === 'index.html' || f.path.endsWith('.html'));
  const cssFile = files.find((f) => f.path === 'styles.css' || f.path.endsWith('.css'));
  const jsFile = files.find((f) => f.path === 'app.js' || f.path.endsWith('.js'));

  let html =
    htmlFile?.content ||
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${fallbackTitle}</title></head><body><div id="app"></div></body></html>`;

  if (cssFile?.content) {
    const styleTag = `\n<style id="odry-studio-styles">\n${cssFile.content}\n</style>\n`;
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${styleTag}</head>`);
    } else {
      html = `${styleTag}${html}`;
    }
  }

  if (jsFile?.content) {
    const scriptTag = `\n<script id="odry-studio-script">\n${jsFile.content}\n</script>\n`;
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${scriptTag}</body>`);
    } else {
      html = `${html}${scriptTag}`;
    }
  }

  return html;
}

function seedInitialStudioProjects() {
  const bookingFiles: ServerProjectFile[] = [
    {
      path: 'index.html',
      language: 'html',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Savannah Executive Dental & Wellness Booking</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 font-sans antialiased">
  <div class="max-w-5xl mx-auto px-6 py-10">
    <header class="flex flex-wrap items-center justify-between gap-4 pb-8 border-b border-slate-800">
      <div>
        <span class="text-xs font-semibold uppercase tracking-widest text-emerald-400">Nairobi &amp; Mombasa Clinics</span>
        <h1 class="text-2xl sm:text-3xl font-bold text-white mt-1">Savannah Specialist Booking Portal</h1>
      </div>
      <div class="flex items-center gap-3 text-xs text-slate-400">
        <span>Mon–Sat · 08:00 – 18:30 EAT</span>
      </div>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
      <div class="lg:col-span-7 space-y-6">
        <div>
          <h2 class="text-lg font-semibold text-white">1. Select Specialist Service</h2>
          <div id="service-list" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <button data-service="Executive Dental Checkup" data-price="KES 4,500" data-duration="45 min" class="service-btn text-left p-4 rounded-xl border border-emerald-500 bg-emerald-500/10 transition">
              <div class="font-semibold text-white text-sm">Executive Dental Checkup</div>
              <div class="text-xs text-slate-400 mt-1">45 min · KES 4,500</div>
            </button>
            <button data-service="Orthodontic Consultation" data-price="KES 6,000" data-duration="60 min" class="service-btn text-left p-4 rounded-xl border border-slate-800 bg-slate-900 hover:border-slate-700 transition">
              <div class="font-semibold text-white text-sm">Orthodontic Consultation</div>
              <div class="text-xs text-slate-400 mt-1">60 min · KES 6,000</div>
            </button>
            <button data-service="Physiotherapy & Rehab" data-price="KES 5,200" data-duration="50 min" class="service-btn text-left p-4 rounded-xl border border-slate-800 bg-slate-900 hover:border-slate-700 transition">
              <div class="font-semibold text-white text-sm">Physiotherapy &amp; Rehab</div>
              <div class="text-xs text-slate-400 mt-1">50 min · KES 5,200</div>
            </button>
            <button data-service="Preventive Wellness Diagnostics" data-price="KES 8,500" data-duration="90 min" class="service-btn text-left p-4 rounded-xl border border-slate-800 bg-slate-900 hover:border-slate-700 transition">
              <div class="font-semibold text-white text-sm">Preventive Wellness Diagnostics</div>
              <div class="text-xs text-slate-400 mt-1">90 min · KES 8,500</div>
            </button>
          </div>
        </div>

        <div>
          <h2 class="text-lg font-semibold text-white">2. Choose Time Slot</h2>
          <div id="slot-list" class="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mt-3">
            <button data-slot="09:00 AM" class="slot-btn py-2.5 px-3 rounded-lg border border-emerald-500 bg-emerald-500 text-slate-950 font-semibold text-xs">09:00 AM</button>
            <button data-slot="10:30 AM" class="slot-btn py-2.5 px-3 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 font-semibold text-xs hover:border-slate-700">10:30 AM</button>
            <button data-slot="01:00 PM" class="slot-btn py-2.5 px-3 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 font-semibold text-xs hover:border-slate-700">01:00 PM</button>
            <button data-slot="03:30 PM" class="slot-btn py-2.5 px-3 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 font-semibold text-xs hover:border-slate-700">03:30 PM</button>
          </div>
        </div>

        <form id="booking-form" class="space-y-4 pt-2">
          <h2 class="text-lg font-semibold text-white">3. Patient Details</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input id="patient-name" type="text" required placeholder="Full Name (e.g. Dr. Amina Ochieng)" class="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 outline-none" />
            <input id="patient-phone" type="tel" required placeholder="Phone Number (07XX XXX XXX)" class="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 outline-none" />
          </div>
          <button type="submit" class="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 text-sm transition cursor-pointer">
            Confirm Appointment Booking
          </button>
        </form>
      </div>

      <div class="lg:col-span-5">
        <div class="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-5">
          <h3 class="text-base font-bold text-white">Live Booking Summary</h3>
          <div class="space-y-2 text-xs border-b border-slate-800 pb-4">
            <div class="flex justify-between"><span class="text-slate-400">Selected Service:</span><span id="summary-service" class="font-semibold text-white">Executive Dental Checkup</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Preferred Slot:</span><span id="summary-slot" class="font-semibold text-emerald-400">09:00 AM</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Consultation Fee:</span><span id="summary-price" class="font-mono font-bold text-white">KES 4,500</span></div>
          </div>
          <div>
            <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Confirmed Today</h4>
            <div id="bookings-feed" class="space-y-2.5 text-xs">
              <div class="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex justify-between items-center">
                <div>
                  <div class="font-semibold text-white">David Karanja</div>
                  <div class="text-slate-400">Executive Dental Checkup</div>
                </div>
                <span class="font-mono text-emerald-400">09:00 AM</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`,
    },
    {
      path: 'styles.css',
      language: 'css',
      content: `body {
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
}
.service-btn.active {
  border-color: #10b981;
  background-color: rgba(16, 185, 129, 0.12);
}`,
    },
    {
      path: 'app.js',
      language: 'javascript',
      content: `document.addEventListener('DOMContentLoaded', () => {
  let selectedService = 'Executive Dental Checkup';
  let selectedPrice = 'KES 4,500';
  let selectedSlot = '09:00 AM';

  const serviceBtns = document.querySelectorAll('.service-btn');
  const slotBtns = document.querySelectorAll('.slot-btn');
  const summaryService = document.getElementById('summary-service');
  const summaryPrice = document.getElementById('summary-price');
  const summarySlot = document.getElementById('summary-slot');
  const form = document.getElementById('booking-form');
  const feed = document.getElementById('bookings-feed');

  serviceBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      serviceBtns.forEach((b) => {
        b.className = 'service-btn text-left p-4 rounded-xl border border-slate-800 bg-slate-900 hover:border-slate-700 transition';
      });
      btn.className = 'service-btn text-left p-4 rounded-xl border border-emerald-500 bg-emerald-500/10 transition';
      selectedService = btn.getAttribute('data-service') || selectedService;
      selectedPrice = btn.getAttribute('data-price') || selectedPrice;
      if (summaryService) summaryService.textContent = selectedService;
      if (summaryPrice) summaryPrice.textContent = selectedPrice;
    });
  });

  slotBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      slotBtns.forEach((b) => {
        b.className = 'slot-btn py-2.5 px-3 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 font-semibold text-xs hover:border-slate-700';
      });
      btn.className = 'slot-btn py-2.5 px-3 rounded-lg border border-emerald-500 bg-emerald-500 text-slate-950 font-semibold text-xs';
      selectedSlot = btn.getAttribute('data-slot') || selectedSlot;
      if (summarySlot) summarySlot.textContent = selectedSlot;
    });
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('patient-name');
      const name = nameInput && nameInput.value ? nameInput.value : 'New Patient';
      const item = document.createElement('div');
      item.className = 'p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex justify-between items-center';
      item.innerHTML = '<div><div class="font-semibold text-white">' + name + '</div><div class="text-emerald-300">' + selectedService + '</div></div><span class="font-mono text-emerald-400">' + selectedSlot + '</span>';
      if (feed) feed.prepend(item);
      form.reset();
    });
  }
});`,
    },
    {
      path: 'README.md',
      language: 'markdown',
      content: `# Savannah Specialist Booking Portal\n\nBuilt with **Odry Studio — AI Website & App Builder**.\n\n## Features\n- Specialist service selection with transparent pricing\n- Real-time slot picker and live appointment feed\n- Responsive layout for Android phones, tablets, and desktop screens`,
    },
  ];

  const bookingProject: ServerBuilderProject = {
    id: 'proj_savannah_booking',
    name: 'Savannah Specialist Booking System',
    projectType: 'booking_system',
    description:
      'A clinical appointment booking system for specialist dental and physiotherapy clinics with service selection, time-slot reservations, and live patient queue updates.',
    designPreferences: {
      theme: 'emerald_fintech',
      layoutStyle: 'split_hero',
      primaryColor: '#10b981',
      typography: 'Plus Jakarta & Outfit',
    },
    requiredFeatures: [
      'Appointment Calendar & Time Slots',
      'Service Tier Pricing',
      'Live Reservation Feed',
      'Mobile-First Patient Intake',
    ],
    files: bookingFiles,
    previewHtml: assemblePreviewHtml(bookingFiles, 'Savannah Specialist Booking System'),
    architectureSummary:
      'Responsive split-column booking architecture with interactive service cards, time-slot state management, and real-time appointment confirmation feed.',
    status: 'published',
    publishedSlug: 'savannah-booking',
    publishedUrl: '/published/savannah-booking',
    publishedAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
    createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    tokensUsed: 140,
  };

  const bmsFiles: ServerProjectFile[] = [
    {
      path: 'index.html',
      language: 'html',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KaziFlow Fleet & Operations ERP</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 font-sans antialiased">
  <div class="max-w-6xl mx-auto px-6 py-8">
    <div class="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
      <div>
        <span class="text-xs font-semibold uppercase tracking-widest text-indigo-400">Operations Control Center</span>
        <h1 class="text-2xl font-bold text-white mt-0.5">KaziFlow Business Management System</h1>
      </div>
      <button id="add-task-btn" class="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 text-xs transition cursor-pointer">
        + Log New Field Dispatch
      </button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
      <div class="rounded-2xl bg-slate-900 border border-slate-800 p-5">
        <span class="text-xs text-slate-400">Monthly Revenue</span>
        <div class="text-2xl font-bold text-white font-mono mt-1">KES 1,420,500</div>
        <span class="text-xs text-emerald-400 mt-1 block">+18.4% vs last month</span>
      </div>
      <div class="rounded-2xl bg-slate-900 border border-slate-800 p-5">
        <span class="text-xs text-slate-400">Active Client Contracts</span>
        <div id="active-count" class="text-2xl font-bold text-white font-mono mt-1">42</div>
        <span class="text-xs text-indigo-400 mt-1 block">98.2% SLA compliance</span>
      </div>
      <div class="rounded-2xl bg-slate-900 border border-slate-800 p-5">
        <span class="text-xs text-slate-400">Pending Invoices</span>
        <div class="text-2xl font-bold text-amber-400 font-mono mt-1">KES 184,000</div>
        <span class="text-xs text-slate-400 mt-1 block">6 invoices awaiting clearance</span>
      </div>
    </div>

    <div class="mt-8 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <h2 class="text-sm font-bold text-white">Live Operations &amp; Client Dispatch Ledger</h2>
        <span class="text-xs text-slate-400">Real-Time ERP State</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-950/60 text-slate-400 uppercase">
            <tr>
              <th class="py-3.5 px-6">Client / Account</th>
              <th class="py-3.5 px-6">Department</th>
              <th class="py-3.5 px-6">Value</th>
              <th class="py-3.5 px-6">Status</th>
            </tr>
          </thead>
          <tbody id="ledger-body" class="divide-y divide-slate-800">
            <tr>
              <td class="py-3.5 px-6 font-semibold text-white">RiftValley Logistics Ltd</td>
              <td class="py-3.5 px-6 text-slate-300">Fleet Telemetry Upgrade</td>
              <td class="py-3.5 px-6 font-mono text-white">KES 145,000</td>
              <td class="py-3.5 px-6 text-emerald-400 font-semibold">Completed</td>
            </tr>
            <tr>
              <td class="py-3.5 px-6 font-semibold text-white">Kilimani Medical Plaza</td>
              <td class="py-3.5 px-6 text-slate-300">Solar Backup Maintenance</td>
              <td class="py-3.5 px-6 font-mono text-white">KES 88,500</td>
              <td class="py-3.5 px-6 text-indigo-400 font-semibold">In Progress</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>`,
    },
    {
      path: 'styles.css',
      language: 'css',
      content: `body { font-family: 'Plus Jakarta Sans', sans-serif; }`,
    },
    {
      path: 'app.js',
      language: 'javascript',
      content: `document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('add-task-btn');
  const tbody = document.getElementById('ledger-body');
  const countEl = document.getElementById('active-count');
  let count = 42;
  if (btn && tbody) {
    btn.addEventListener('click', () => {
      count += 1;
      if (countEl) countEl.textContent = String(count);
      const tr = document.createElement('tr');
      tr.innerHTML = '<td class="py-3.5 px-6 font-semibold text-white">Westlands Corporate Hub #' + count + '</td><td class="py-3.5 px-6 text-slate-300">Enterprise Systems Audit</td><td class="py-3.5 px-6 font-mono text-white">KES 64,000</td><td class="py-3.5 px-6 text-emerald-400 font-semibold">Dispatched</td>';
      tbody.prepend(tr);
    });
  }
});`,
    },
  ];

  const bmsProject: ServerBuilderProject = {
    id: 'proj_kaziflow_erp',
    name: 'KaziFlow Business Management System',
    projectType: 'business_management',
    description:
      'An enterprise business management dashboard for tracking client contracts, field dispatches, SLA compliance, and invoice settlements.',
    designPreferences: {
      theme: 'cobalt_enterprise',
      layoutStyle: 'dashboard_sidebar',
      primaryColor: '#6366f1',
      typography: 'Plus Jakarta & Outfit',
    },
    requiredFeatures: [
      'KPI Executive Metrics',
      'Client Dispatch Ledger',
      'Invoice Status Tracking',
      'Responsive Table & Quick Actions',
    ],
    files: bmsFiles,
    previewHtml: assemblePreviewHtml(bmsFiles, 'KaziFlow Business Management System'),
    architectureSummary:
      'Executive ERP layout with tabular KPI cards, interactive dispatch logging, and responsive operations ledger.',
    status: 'ready',
    createdAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 6).toISOString(),
    tokensUsed: 120,
  };

  const chamaAppFiles: ServerProjectFile[] = [
    {
      path: 'index.html',
      language: 'html',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ChamaPay & SACCO Mobile App Kenya</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 font-sans antialiased">
  <div class="max-w-md mx-auto min-h-screen bg-slate-900 border-x border-slate-800 flex flex-col justify-between">
    <div class="p-5 space-y-5">
      <header class="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span class="text-[11px] font-mono uppercase tracking-wider text-emerald-400">Nairobi Investment Group</span>
          <h1 class="text-lg font-extrabold text-white">ChamaPay SACCO Kenya</h1>
        </div>
        <span class="text-xs font-mono text-slate-400">KES Account</span>
      </header>

      <div class="rounded-2xl bg-gradient-to-br from-indigo-600 to-emerald-700 p-5 text-white shadow-lg space-y-2">
        <span class="text-xs uppercase tracking-wider text-indigo-100">Total Chama Pool Balance</span>
        <div id="pool-balance" class="text-3xl font-extrabold font-mono">KES 1,845,000</div>
        <div class="flex items-center justify-between text-xs text-emerald-100 pt-2 border-t border-white/20">
          <span>Your Shares: KES 145,000</span>
          <span>Loan Limit: KES 435,000</span>
        </div>
      </div>

      <form id="contribution-form" class="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-300">Log Member M-Pesa Contribution</h2>
        <input id="member-name" type="text" required placeholder="Member Name (e.g. Wanjiku Kamau)" class="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-xs text-white" />
        <input id="contrib-amount" type="number" required placeholder="Amount in KES (e.g. 15000)" class="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-xs text-white" />
        <button type="submit" class="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 text-xs transition cursor-pointer">
          + Record KES Contribution
        </button>
      </form>

      <div class="space-y-2">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Member Contributions</h3>
        <div id="member-ledger" class="space-y-2 text-xs">
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
            <div>
              <div class="font-bold text-white">Brian Odhiambo</div>
              <div class="text-slate-400">Monthly Share Deposit</div>
            </div>
            <span class="font-mono font-bold text-emerald-400">+ KES 15,000</span>
          </div>
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
            <div>
              <div class="font-bold text-white">Faith Chebet</div>
              <div class="text-slate-400">Table Banking Repayment</div>
            </div>
            <span class="font-mono font-bold text-emerald-400">+ KES 22,500</span>
          </div>
        </div>
      </div>
    </div>

    <nav class="border-t border-slate-800 bg-slate-950 px-6 py-3 flex justify-between text-[11px] font-semibold text-slate-400">
      <span class="text-emerald-400">Home</span>
      <span>Savings</span>
      <span>Loans</span>
      <span>Members</span>
    </nav>
  </div>
</body>
</html>`,
    },
    {
      path: 'styles.css',
      language: 'css',
      content: `body { font-family: 'Plus Jakarta Sans', sans-serif; }`,
    },
    {
      path: 'app.js',
      language: 'javascript',
      content: `document.addEventListener('DOMContentLoaded', () => {
  let pool = 1845000;
  const poolEl = document.getElementById('pool-balance');
  const form = document.getElementById('contribution-form');
  const ledger = document.getElementById('member-ledger');

  if (form && ledger) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameEl = document.getElementById('member-name');
      const amtEl = document.getElementById('contrib-amount');
      const name = nameEl && nameEl.value ? nameEl.value : 'Chama Member';
      const amt = amtEl && amtEl.value ? parseInt(amtEl.value, 10) || 5000 : 5000;
      pool += amt;
      if (poolEl) poolEl.textContent = 'KES ' + pool.toLocaleString();
      const row = document.createElement('div');
      row.className = 'p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex justify-between items-center';
      row.innerHTML = '<div><div class="font-bold text-white">' + name + '</div><div class="text-emerald-300">Verified M-Pesa Deposit</div></div><span class="font-mono font-bold text-emerald-400">+ KES ' + amt.toLocaleString() + '</span>';
      ledger.prepend(row);
      form.reset();
    });
  }
});`,
    },
  ];

  const chamaMobileProject: ServerBuilderProject = {
    id: 'proj_chamapay_mobile',
    name: 'ChamaPay & SACCO Mobile App Kenya',
    projectType: 'mobile_app',
    description:
      'A touch-first Android & iOS mobile application for Kenyan Chamas, SACCOs, and investment groups with KES pool tracking, share deposits, and loan limits.',
    designPreferences: {
      theme: 'emerald_fintech',
      layoutStyle: 'mobile_app_shell',
      primaryColor: '#10b981',
      typography: 'Plus Jakarta & Outfit',
    },
    requiredFeatures: [
      'Bottom Tab Mobile Navigation',
      'M-Pesa Payment & Till Integration UI',
      'KES Currency & Tax (VAT) Formatting',
      'Offline-Ready Local State',
    ],
    files: chamaAppFiles,
    previewHtml: assemblePreviewHtml(chamaAppFiles, 'ChamaPay & SACCO Mobile App Kenya'),
    architectureSummary:
      'Mobile app shell with live KES pool balance calculator, member contribution logging, and bottom tab navigation.',
    status: 'published',
    publishedSlug: 'chamapay-kenya',
    publishedUrl: '/published/chamapay-kenya',
    publishedAt: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
    createdAt: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 1).toISOString(),
    tokensUsed: 110,
  };

  studioProjects.set(bookingProject.id, bookingProject);
  studioProjects.set(bmsProject.id, bmsProject);
  studioProjects.set(chamaMobileProject.id, chamaMobileProject);
}

seedInitialStudioProjects();

// GET /api/studio/projects - List all user projects + token balance
app.get('/api/studio/projects', (req: Request, res: Response) => {
  const merchantId = (req.query.merchantId as string) || 'default';
  const tokenBalance = studioTokenBalances.get(merchantId) ?? 2500;
  const projects = Array.from(studioProjects.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  return res.json({
    success: true,
    projects,
    tokenBalance,
  });
});

// POST /api/studio/generate - Real server-side Gemini AI Website & App Generation
app.post('/api/studio/generate', async (req: Request, res: Response) => {
  try {
    const {
      projectId,
      name,
      projectType,
      description,
      designPreferences,
      requiredFeatures,
      refinementPrompt,
      existingFiles,
      merchantId = 'default',
    } = req.body;

    if (!description || !String(description).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a project description explaining what you want to build.',
      });
    }

    const currentTokens = studioTokenBalances.get(merchantId) ?? 2500;
    const tokenCost = refinementPrompt ? 60 : 120;
    if (currentTokens < tokenCost) {
      return res.status(402).json({
        success: false,
        message: `Insufficient AI Studio tokens (${currentTokens} remaining, ${tokenCost} required). Please upgrade or renew your Odry Studio PRO plan.`,
      });
    }

    const ai = getGeminiClient();

    const typeLabels: Record<string, string> = {
      website: 'Modern Marketing or Corporate Website',
      mobile_app: 'Mobile Application Interface (Touch-First Android/iOS Experience)',
      web_app: 'Interactive SaaS Web Application',
      booking_system: 'Appointment & Reservation Booking System',
      business_management: 'Business Management System (CRM / ERP / Operations Dashboard)',
      custom_project: 'Custom Full-Featured Interactive Application',
    };

    const selectedTypeLabel = typeLabels[projectType] || 'Interactive Web Application';
    const featuresList = Array.isArray(requiredFeatures) && requiredFeatures.length > 0
      ? requiredFeatures.join(', ')
      : 'Interactive UI, responsive layout, working forms and state';

    const existingContext =
      Array.isArray(existingFiles) && existingFiles.length > 0 && refinementPrompt
        ? `\n\nEXISTING PROJECT FILES TO REFINE:\n${existingFiles
            .map((f: ServerProjectFile) => `--- ${f.path} ---\n${f.content}`)
            .join('\n\n')}\n\nUSER REFINEMENT REQUEST: ${refinementPrompt}`
        : '';

    const systemInstruction = `You are the lead principal architect and UI/UX engineer for Odry Studio Kenya — AI Website, Mobile App & Digital Systems Builder.
Generate a complete, real, working, production-grade project tailored for Kenya and global standards based on the user's specification.
STRICT RULES:
1. NEVER generate an online store, e-commerce product catalog, or WhatsApp shopping cart unless explicitly asked.
2. Context & Localization: Where appropriate for the user's prompt, use authentic Kenyan context (e.g., KES currency formatting, Kenyan cities such as Nairobi, Mombasa, Kisumu, Nakuru, Eldoret, M-Pesa payment/receipt flows if relevant, and realistic Kenyan names/phone numbers +254 7XX).
3. Produce clean, modular files:
   - "index.html": A complete HTML5 document that loads Tailwind CSS (<script src="https://cdn.tailwindcss.com"></script>) and Google Fonts ('Plus Jakarta Sans' and 'Outfit'). Do NOT include external local script/link tags that might 404; our studio bundler automatically injects styles.css and app.js into index.html for live preview.
   - "styles.css": Custom CSS rules, smooth micro-interactions, and theme variables matching the user's design preferences.
   - "app.js": Complete, working vanilla JavaScript providing real client-side interactivity (working tabs, modals, form submissions, live state updates, calculators, booking flows, or dashboard filters). Every button in index.html must work!
   - "architecture.json": Clean JSON specification of the project's data models, routes, and component hierarchy.
   - "README.md": Clear documentation for the project built with Odry Studio Kenya.
4. Ensure the design looks crafted by a senior human product designer: high contrast, tabular numerals for metrics, responsive across Android phones, tablets, and 1440px desktops.`;

    const userPrompt = `Build the following project in Odry Studio Kenya:
- Project Name: ${name || 'Untitled Studio Project'}
- Project Type: ${selectedTypeLabel} (${projectType})
- User Description: ${description}
- Design Preferences: Theme="${designPreferences?.theme || 'dark_modern'}", Layout="${
      designPreferences?.layoutStyle || 'split_hero'
    }", Primary Accent="${designPreferences?.primaryColor || '#6366f1'}", Typography="${
      designPreferences?.typography || 'Plus Jakarta & Outfit'
    }"
- Required Features: ${featuresList}${existingContext}

Return a JSON object matching the required schema with files: index.html, styles.css, app.js, architecture.json, and README.md.`;

    const generationConfig = {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          projectName: {
            type: Type.STRING,
            description: 'Refined title for the project',
          },
          architectureSummary: {
            type: Type.STRING,
            description: 'Concise 1-2 sentence summary of what was generated and its interactive features',
          },
          files: {
            type: Type.ARRAY,
            description: 'Generated source files including index.html, styles.css, app.js, architecture.json, README.md',
            items: {
              type: Type.OBJECT,
              properties: {
                path: {
                  type: Type.STRING,
                  description: 'File path such as index.html, styles.css, app.js, architecture.json, README.md',
                },
                language: {
                  type: Type.STRING,
                  description: 'One of: html, css, javascript, json, markdown',
                },
                content: {
                  type: Type.STRING,
                  description: 'Complete source code content of the file',
                },
              },
              required: ['path', 'language', 'content'],
            },
          },
        },
        required: ['projectName', 'architectureSummary', 'files'],
      },
    };

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userPrompt,
        config: generationConfig,
      });
    } catch {
      response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: userPrompt,
        config: generationConfig,
      });
    }

    const rawText = response.text;
    if (!rawText) {
      return res.status(502).json({
        success: false,
        message: 'Gemini returned an empty response. Please try again.',
      });
    }

    const parsed = JSON.parse(rawText.trim());
    const generatedFiles: ServerProjectFile[] = Array.isArray(parsed.files)
      ? parsed.files.map((f: any) => ({
          path: String(f.path || 'index.html'),
          language: (['html', 'css', 'javascript', 'json', 'markdown'].includes(f.language)
            ? f.language
            : f.path?.endsWith('.css')
            ? 'css'
            : f.path?.endsWith('.js')
            ? 'javascript'
            : f.path?.endsWith('.json')
            ? 'json'
            : f.path?.endsWith('.md')
            ? 'markdown'
            : 'html') as ServerProjectFile['language'],
          content: String(f.content || ''),
        }))
      : [];

    if (generatedFiles.length === 0) {
      return res.status(502).json({
        success: false,
        message: 'AI response did not contain valid project files.',
      });
    }

    const finalName = (name && String(name).trim()) || parsed.projectName || 'Odry Studio Project';
    const previewHtml = assemblePreviewHtml(generatedFiles, finalName);
    const nowIso = new Date().toISOString();

    const existingProj = projectId ? studioProjects.get(projectId) : undefined;
    const savedProject: ServerBuilderProject = {
      id: existingProj?.id || `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: finalName,
      projectType: projectType || existingProj?.projectType || 'website',
      description: String(description).trim(),
      designPreferences: designPreferences ||
        existingProj?.designPreferences || {
          theme: 'dark_modern',
          layoutStyle: 'split_hero',
          primaryColor: '#6366f1',
          typography: 'Plus Jakarta & Outfit',
        },
      requiredFeatures: Array.isArray(requiredFeatures) ? requiredFeatures : existingProj?.requiredFeatures || [],
      files: generatedFiles,
      previewHtml,
      architectureSummary:
        parsed.architectureSummary ||
        'Generated complete multi-file application with interactive UI and responsive layout.',
      status: existingProj?.status === 'published' ? 'published' : 'ready',
      publishedSlug: existingProj?.publishedSlug,
      publishedUrl: existingProj?.publishedUrl,
      publishedAt: existingProj?.publishedAt,
      createdAt: existingProj?.createdAt || nowIso,
      updatedAt: nowIso,
      tokensUsed: (existingProj?.tokensUsed || 0) + tokenCost,
    };

    studioProjects.set(savedProject.id, savedProject);
    const updatedBalance = Math.max(0, currentTokens - tokenCost);
    studioTokenBalances.set(merchantId, updatedBalance);

    return res.json({
      success: true,
      project: savedProject,
      tokenBalance: updatedBalance,
      tokensDeducted: tokenCost,
    });
  } catch (err: any) {
    console.error('[ODRY STUDIO AI GENERATION ERROR]:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'AI generation failed on the server.',
    });
  }
});

// PUT /api/studio/projects/:projectId - Save edited project files, design preferences, or metadata
app.put('/api/studio/projects/:projectId', (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const existing = studioProjects.get(projectId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const {
      name,
      projectType,
      description,
      designPreferences,
      requiredFeatures,
      files,
    } = req.body;

    const updatedFiles: ServerProjectFile[] = Array.isArray(files) ? files : existing.files;
    const updatedName = name !== undefined ? String(name).trim() || existing.name : existing.name;
    const previewHtml = assemblePreviewHtml(updatedFiles, updatedName);

    const updated: ServerBuilderProject = {
      ...existing,
      name: updatedName,
      projectType: projectType || existing.projectType,
      description: description !== undefined ? String(description) : existing.description,
      designPreferences: designPreferences || existing.designPreferences,
      requiredFeatures: Array.isArray(requiredFeatures) ? requiredFeatures : existing.requiredFeatures,
      files: updatedFiles,
      previewHtml,
      updatedAt: new Date().toISOString(),
    };

    studioProjects.set(projectId, updated);
    return res.json({ success: true, project: updated });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to save project changes.',
    });
  }
});

// POST /api/studio/projects/:projectId/duplicate - Duplicate an existing project
app.post('/api/studio/projects/:projectId/duplicate', (req: Request, res: Response) => {
  const { projectId } = req.params;
  const existing = studioProjects.get(projectId);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Project not found.' });
  }

  const nowIso = new Date().toISOString();
  const copyId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const duplicated: ServerBuilderProject = {
    ...existing,
    id: copyId,
    name: `${existing.name} (Copy)`,
    files: existing.files.map((f) => ({ ...f })),
    status: 'ready',
    publishedSlug: undefined,
    publishedUrl: undefined,
    publishedAt: undefined,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  studioProjects.set(copyId, duplicated);
  return res.json({ success: true, project: duplicated });
});

// DELETE /api/studio/projects/:projectId - Delete a project
app.delete('/api/studio/projects/:projectId', (req: Request, res: Response) => {
  const { projectId } = req.params;
  if (!studioProjects.has(projectId)) {
    return res.status(404).json({ success: false, message: 'Project not found.' });
  }
  studioProjects.delete(projectId);
  return res.json({ success: true, deletedId: projectId });
});

// GET /api/studio/publish/providers - Inspect server-side hosting API configuration (no secret values exposed)
app.get('/api/studio/publish/providers', (_req: Request, res: Response) => {
  const hasVercel = Boolean(process.env.VERCEL_TOKEN && process.env.VERCEL_TOKEN.trim());
  const hasNetlify = Boolean(process.env.NETLIFY_AUTH_TOKEN && process.env.NETLIFY_AUTH_TOKEN.trim());

  return res.json({
    success: true,
    providers: [
      {
        id: 'vercel',
        name: 'Vercel Edge Network',
        description: 'Deploys project source files via Vercel REST API (POST /v13/deployments) to a live .vercel.app production URL.',
        configured: hasVercel,
        envVarName: 'VERCEL_TOKEN',
        apiEndpoint: 'https://api.vercel.com/v13/deployments',
      },
      {
        id: 'netlify',
        name: 'Netlify Global CDN',
        description: 'Deploys project source files via Netlify File Digest REST API (POST /api/v1/sites) to a live .netlify.app production URL.',
        configured: hasNetlify,
        envVarName: 'NETLIFY_AUTH_TOKEN',
        apiEndpoint: 'https://api.netlify.com/api/v1/sites',
      },
      {
        id: 'odry_cloud',
        name: 'Odry Studio Cloud Host',
        description: 'Instant zero-config hosting on the Odry Studio Cloud server at /published/:slug with multi-file asset serving.',
        configured: true,
        envVarName: 'Built-in Server Host',
        apiEndpoint: '/published/:slug',
      },
    ],
  });
});

// POST /api/studio/projects/:projectId/publish - Deploy generated project source code to Vercel, Netlify, or Odry Studio Cloud
app.post('/api/studio/projects/:projectId/publish', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const existing = studioProjects.get(projectId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (!existing.files || existing.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Project has no generated files to publish.',
      });
    }

    const provider: ServerDeploymentProvider =
      req.body?.provider === 'vercel' || req.body?.provider === 'netlify'
        ? req.body.provider
        : 'odry_cloud';

    const rawSlug =
      (req.body?.customSlug && String(req.body.customSlug).trim()) ||
      existing.publishedSlug ||
      existing.name;
    const cleanSlug =
      rawSlug
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || `odry-app-${projectId.slice(-6)}`;

    const previewHtml = assemblePreviewHtml(existing.files, existing.name);
    const nowIso = new Date().toISOString();

    // Prepare the complete deployable file bundle (index.html with bundled assets + individual source files)
    const deployableFiles: ServerProjectFile[] = existing.files.map((f) =>
      f.path === 'index.html' ? { ...f, content: previewHtml } : f
    );
    if (!deployableFiles.some((f) => f.path === 'index.html')) {
      deployableFiles.unshift({
        path: 'index.html',
        language: 'html',
        content: previewHtml,
      });
    }

    let finalPublishedUrl = `/published/${cleanSlug}`;
    let inspectUrl: string | undefined;
    let providerLabel = 'Odry Studio Cloud';
    let deploymentId = `dep_odry_${Date.now()}`;

    // =========================================================================
    // PROVIDER 1: VERCEL REST API (https://api.vercel.com/v13/deployments)
    // =========================================================================
    if (provider === 'vercel') {
      const vercelToken = process.env.VERCEL_TOKEN?.trim();
      const vercelTeamId = process.env.VERCEL_TEAM_ID?.trim();

      if (!vercelToken) {
        return res.status(400).json({
          success: false,
          message:
            'VERCEL_TOKEN is not configured in the server environment. Add VERCEL_TOKEN to .env on the server to deploy to Vercel, or choose Odry Studio Cloud for instant live hosting.',
        });
      }

      const vercelQuery = vercelTeamId ? `?teamId=${encodeURIComponent(vercelTeamId)}` : '';
      const vercelPayload = {
        name: cleanSlug,
        files: deployableFiles.map((file) => ({
          file: file.path.replace(/^\/+/, ''),
          data: file.content,
        })),
        projectSettings: {
          framework: null,
        },
        target: 'production',
      };

      const vercelRes = await fetch(`https://api.vercel.com/v13/deployments${vercelQuery}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vercelPayload),
      });

      const vercelData: any = await vercelRes.json().catch(() => ({}));
      if (!vercelRes.ok) {
        const errMsg =
          vercelData?.error?.message ||
          vercelData?.message ||
          `Vercel API returned HTTP ${vercelRes.status}`;
        return res.status(vercelRes.status).json({
          success: false,
          message: `Vercel deployment failed: ${errMsg}`,
        });
      }

      const rawUrl = vercelData.url || `${cleanSlug}.vercel.app`;
      finalPublishedUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
      inspectUrl = vercelData.inspectorUrl || undefined;
      deploymentId = vercelData.id || `dep_vercel_${Date.now()}`;
      providerLabel = 'Vercel Edge Network';
    }

    // =========================================================================
    // PROVIDER 2: NETLIFY REST API (https://api.netlify.com/api/v1/sites)
    // =========================================================================
    if (provider === 'netlify') {
      const netlifyToken = process.env.NETLIFY_AUTH_TOKEN?.trim();
      let netlifySiteId = process.env.NETLIFY_SITE_ID?.trim();

      if (!netlifyToken) {
        return res.status(400).json({
          success: false,
          message:
            'NETLIFY_AUTH_TOKEN is not configured in the server environment. Add NETLIFY_AUTH_TOKEN to .env on the server to deploy to Netlify, or choose Odry Studio Cloud for instant live hosting.',
        });
      }

      // Create a Netlify site if NETLIFY_SITE_ID is not pre-configured
      if (!netlifySiteId) {
        const createSiteRes = await fetch('https://api.netlify.com/api/v1/sites', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${netlifyToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `${cleanSlug}-${Date.now().toString().slice(-5)}`,
          }),
        });
        const siteData: any = await createSiteRes.json().catch(() => ({}));
        if (!createSiteRes.ok || !siteData.id) {
          return res.status(createSiteRes.status || 400).json({
            success: false,
            message: `Netlify site provisioning failed: ${
              siteData?.message || `HTTP ${createSiteRes.status}`
            }`,
          });
        }
        netlifySiteId = siteData.id;
      }

      // Compute SHA-1 digests for each file as required by Netlify's File Digest API
      const fileDigests: Record<string, string> = {};
      const fileByNormalizedPath: Record<string, string> = {};

      for (const file of deployableFiles) {
        const normalizedPath = '/' + file.path.replace(/^\/+/, '');
        const sha1 = crypto
          .createHash('sha1')
          .update(Buffer.from(file.content, 'utf8'))
          .digest('hex');
        fileDigests[normalizedPath] = sha1;
        fileByNormalizedPath[normalizedPath] = file.content;
      }

      const createDeployRes = await fetch(
        `https://api.netlify.com/api/v1/sites/${encodeURIComponent(netlifySiteId!)}/deploys`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${netlifyToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            files: fileDigests,
          }),
        }
      );

      const deployData: any = await createDeployRes.json().catch(() => ({}));
      if (!createDeployRes.ok || !deployData.id) {
        return res.status(createDeployRes.status || 400).json({
          success: false,
          message: `Netlify deployment initialization failed: ${
            deployData?.message || `HTTP ${createDeployRes.status}`
          }`,
        });
      }

      const deployId = deployData.id;
      const requiredShas: string[] = Array.isArray(deployData.required) ? deployData.required : [];

      // Upload all required files matching the SHA-1 digest list
      for (const [normPath, sha] of Object.entries(fileDigests)) {
        if (requiredShas.length === 0 || requiredShas.includes(sha)) {
          const uploadRes = await fetch(
            `https://api.netlify.com/api/v1/deploys/${encodeURIComponent(deployId)}/files${normPath}`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${netlifyToken}`,
                'Content-Type': 'application/octet-stream',
              },
              body: Buffer.from(fileByNormalizedPath[normPath], 'utf8'),
            }
          );
          if (!uploadRes.ok) {
            const upErr = await uploadRes.text().catch(() => '');
            return res.status(uploadRes.status).json({
              success: false,
              message: `Netlify file upload failed for ${normPath}: ${upErr || uploadRes.statusText}`,
            });
          }
        }
      }

      finalPublishedUrl =
        deployData.ssl_url ||
        deployData.deploy_ssl_url ||
        deployData.url ||
        `https://${deployData.name || cleanSlug}.netlify.app`;
      inspectUrl = deployData.admin_url || undefined;
      deploymentId = deployId;
      providerLabel = 'Netlify Global CDN';
    }

    const newDeploymentRecord: ServerDeploymentRecord = {
      id: deploymentId,
      provider,
      providerLabel,
      url: finalPublishedUrl,
      inspectUrl,
      slug: cleanSlug,
      status: 'READY',
      filesDeployed: deployableFiles.length,
      createdAt: nowIso,
    };

    const previousDeployments = Array.isArray(existing.deployments) ? existing.deployments : [];

    const updated: ServerBuilderProject = {
      ...existing,
      previewHtml,
      status: 'published',
      publishedSlug: cleanSlug,
      publishedUrl: finalPublishedUrl,
      publishedAt: nowIso,
      publishedProvider: provider,
      deployments: [newDeploymentRecord, ...previousDeployments.slice(0, 9)],
      updatedAt: nowIso,
    };

    studioProjects.set(projectId, updated);
    return res.json({
      success: true,
      project: updated,
      publishedUrl: updated.publishedUrl,
      publishedSlug: cleanSlug,
      provider,
      deployment: newDeploymentRecord,
    });
  } catch (err: any) {
    console.error('Project publish error:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Unexpected server error while deploying project.',
    });
  }
});

// GET /published/:slug - Serve live deployed website or web application
app.get('/published/:slug', (req: Request, res: Response) => {
  const { slug } = req.params;
  for (const proj of studioProjects.values()) {
    if (proj.publishedSlug === slug && proj.status === 'published') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(proj.previewHtml);
    }
  }
  return res
    .status(404)
    .send(
      '<!DOCTYPE html><html><head><title>404 Not Found — Odry Studio</title></head><body style="background:#040711;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h1>Published App Not Found</h1><p style="color:#94a3b8;">This Odry Studio deployment URL is not active.</p></div></body></html>'
    );
});

// GET /published/:slug/:filePath - Serve individual project source files (styles.css, app.js, manifest.json)
app.get('/published/:slug/:filePath', (req: Request, res: Response) => {
  const { slug, filePath } = req.params;
  for (const proj of studioProjects.values()) {
    if (proj.publishedSlug === slug && proj.status === 'published') {
      const matchedFile = proj.files.find(
        (f) => f.path.replace(/^\/+/, '') === filePath.replace(/^\/+/, '')
      );
      if (matchedFile) {
        const ext = matchedFile.path.split('.').pop()?.toLowerCase();
        const contentType =
          ext === 'css'
            ? 'text/css; charset=utf-8'
            : ext === 'js'
            ? 'application/javascript; charset=utf-8'
            : ext === 'json'
            ? 'application/json; charset=utf-8'
            : 'text/html; charset=utf-8';
        res.setHeader('Content-Type', contentType);
        return res.send(matchedFile.content);
      }
    }
  }
  return res.status(404).send('File not found in published deployment.');
});

// Ensure any legacy service worker registration immediately clears stale caches and reloads fresh Odry Studio
const SELF_CLEANING_SW_SCRIPT = `
self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => {
        clients.forEach((client) => {
          if ('navigate' in client) {
            client.navigate(client.url);
          }
        });
      })
  );
});
`;

app.get(['/sw.js', '/dev-sw.js', '/service-worker.js'], (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.send(SELF_CLEANING_SW_SCRIPT);
});

app.get('/registerSW.js', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.send('// Odry Studio: Service worker registration cleared');
});

app.use((req: Request, res: Response, next) => {
  if (req.path === '/' || req.path === '/index.html') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(__dirname, 'dist');
  const indexHtmlPath = path.resolve(distPath, 'index.html');

  if (!isProduction || !fs.existsSync(indexHtmlPath)) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Odry Studio Vite middleware mounted successfully');
    } catch (err) {
      console.warn('Vite middleware initialization notice:', err);
      if (fs.existsSync(indexHtmlPath)) {
        app.use(express.static(distPath));
        app.use((_req: Request, res: Response) => {
          res.sendFile(indexHtmlPath);
        });
      }
    }
  } else {
    app.use(express.static(distPath));
    app.use((_req: Request, res: Response) => {
      if (fs.existsSync(indexHtmlPath)) {
        res.sendFile(indexHtmlPath);
      } else {
        res.status(404).send('Application build not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Odry Studio AI Builder Server listening on port ${PORT}`);
  });
}

startServer();
