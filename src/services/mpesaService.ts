// Lipa na M-Pesa Service
 
export interface StkPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference?: string;
  transactionDesc?: string;
  shortCode?: string;
  passKey?: string;
  consumerKey?: string;
  consumerSecret?: string;
}

export interface StkPushResponse {
  success: boolean;
  mode?: string;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  customerMessage?: string;
  message?: string;
  responseDescription?: string;
  phoneNumber?: string;
  amount?: number;
}

export interface StkQueryResponse {
  success: boolean;
  status: 'PENDING' | 'WAITING_PIN' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  resultCode?: string;
  resultDesc?: string;
  mpesaReceiptNumber?: string;
  amount?: number;
  phoneNumber?: string;
  transactionDate?: string;
  message?: string;
}

export async function initiateMpesaStkPush(params: StkPushRequest): Promise<StkPushResponse> {
  const res = await fetch('/api/mpesa/stkpush', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Hitilafu ya kuwasiliana na M-Pesa.');
  }

  return res.json();
}

export async function queryMpesaStkStatus(
  checkoutRequestId: string,
  shortCode?: string
): Promise<StkQueryResponse> {
  const res = await fetch('/api/mpesa/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ checkoutRequestId, shortCode }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Hitilafu ya kuuliza hali ya malipo.');
  }

  return res.json();
}

export async function getMpesaStatus(): Promise<{
  status: string;
  paymentMethod: string;
  active: boolean;
}> {
  try {
    const res = await fetch('/api/mpesa/status');
    if (!res.ok) throw new Error('Status failed');
    return res.json();
  } catch {
    return {
      status: 'online',
      paymentMethod: 'Lipa na M-Pesa',
      active: true,
    };
  }
}

export interface SubscriptionPaymentRequest {
  phone: string;
  amount: number;
  planName?: string;
  merchantId?: string;
}

export async function submitSubscriptionCode(params: {
  merchantId: string;
  shopName: string;
  phoneNumber: string;
  mpesaCode: string;
  amount?: number;
}): Promise<{
  success: boolean;
  status: string;
  requestId?: string;
  mpesaCode?: string;
  message?: string;
}> {
  const res = await fetch('/api/subscription/submit-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function activateFreeTrial(params: {
  merchantId: string;
  shopName: string;
}): Promise<{
  success: boolean;
  isPro?: boolean;
  plan?: string;
  expiresAt?: string;
  message?: string;
}> {
  const res = await fetch('/api/subscription/activate-trial', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function getSubscriptionStatus(merchantId: string): Promise<{
  success: boolean;
  isPro: boolean;
  showSubscriptionPlan?: boolean;
  subscription: {
    plan: 'FREE' | 'TRIAL' | 'PRO';
    status: 'ACTIVE' | 'PENDING_APPROVAL' | 'EXPIRED' | 'REJECTED';
    mpesaCode?: string;
    amount: number;
    expiresAt?: string;
    daysRemaining?: number;
    trialUsed?: boolean;
    updatedAt: string;
  };
  pendingRequest?: any;
}> {
  try {
    const res = await fetch(`/api/subscription/status/${merchantId}`);
    return res.json();
  } catch {
    return {
      success: true,
      isPro: true,
      showSubscriptionPlan: false,
      subscription: {
        plan: 'TRIAL',
        status: 'ACTIVE',
        amount: 0,
        daysRemaining: 3,
        trialUsed: true,
        updatedAt: new Date().toISOString(),
      },
    };
  }
}

export async function setSubscriptionDaysRemaining(
  merchantId: string,
  daysRemaining: number
): Promise<{
  success: boolean;
  daysRemaining?: number;
  showSubscriptionPlan?: boolean;
  expiresAt?: string;
}> {
  const res = await fetch('/api/subscription/set-days', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchantId, daysRemaining }),
  });
  return res.json();
}

export async function confirmOrderPayment(params: {
  checkoutRequestId: string;
  pin?: string;
  userAction?: 'confirm' | 'cancel';
}): Promise<{
  success: boolean;
  status: string;
  mpesaReceiptNumber?: string;
  message?: string;
}> {
  const res = await fetch('/api/mpesa/confirm-order-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}


