import { SubscriptionRequestItem } from '../types';

let adminTokenCache: string | null = null;

export function getAdminToken(): string | null {
  if (adminTokenCache) return adminTokenCache;
  if (typeof window !== 'undefined') {
    adminTokenCache = sessionStorage.getItem('odrystudio_admin_token');
  }
  return adminTokenCache;
}

export function setAdminToken(token: string | null) {
  adminTokenCache = token;
  if (typeof window !== 'undefined') {
    if (token) {
      sessionStorage.setItem('odrystudio_admin_token', token);
    } else {
      sessionStorage.removeItem('odrystudio_admin_token');
    }
  }
}

export async function adminLogin(password: string): Promise<{
  success: boolean;
  token?: string;
  message?: string;
}> {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      setAdminToken(data.token);
      return { success: true, token: data.token, message: data.message };
    }
    return { success: false, message: data.message || 'Nenosiri sio sahihi' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Hitilafu ya seva' };
  }
}

export async function adminLogout(): Promise<void> {
  const token = getAdminToken();
  if (token) {
    fetch('/api/admin/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => {});
  }
  setAdminToken(null);
}

export async function adminGetSubscriptions(): Promise<{
  success: boolean;
  requests: SubscriptionRequestItem[];
}> {
  const token = getAdminToken();
  if (!token) return { success: false, requests: [] };

  try {
    const res = await fetch('/api/admin/subscriptions', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    return { success: res.ok && data.success, requests: data.requests || [] };
  } catch {
    return { success: false, requests: [] };
  }
}

export async function adminApproveSubscription(
  requestId: string,
  days: number = 30
): Promise<{ success: boolean; message: string }> {
  const token = getAdminToken();
  if (!token) return { success: false, message: 'Hakuna idhini ya Admin' };

  try {
    const res = await fetch('/api/admin/subscriptions/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ requestId, days }),
    });
    const data = await res.json();
    return { success: res.ok && data.success, message: data.message };
  } catch (err: any) {
    return { success: false, message: err.message || 'Hitilafu' };
  }
}

export async function adminRejectSubscription(
  requestId: string,
  reason: string = 'Code haijathibitishwa kwenye Till'
): Promise<{ success: boolean; message: string }> {
  const token = getAdminToken();
  if (!token) return { success: false, message: 'Hakuna idhini ya Admin' };

  try {
    const res = await fetch('/api/admin/subscriptions/reject', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ requestId, reason }),
    });
    const data = await res.json();
    return { success: res.ok && data.success, message: data.message };
  } catch (err: any) {
    return { success: false, message: err.message || 'Hitilafu' };
  }
}

export async function adminGetStats(): Promise<{
  success: boolean;
  stats: {
    totalRequests: number;
    pendingApprovals: number;
    approvedSubscriptions: number;
    totalRevenueKes: number;
  };
}> {
  const token = getAdminToken();
  if (!token) {
    return {
      success: false,
      stats: { totalRequests: 0, pendingApprovals: 0, approvedSubscriptions: 0, totalRevenueKes: 0 },
    };
  }

  try {
    const res = await fetch('/api/admin/stats', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    return {
      success: res.ok && data.success,
      stats: data.stats || { totalRequests: 0, pendingApprovals: 0, approvedSubscriptions: 0, totalRevenueKes: 0 },
    };
  } catch {
    return {
      success: false,
      stats: { totalRequests: 0, pendingApprovals: 0, approvedSubscriptions: 0, totalRevenueKes: 0 },
    };
  }
}
