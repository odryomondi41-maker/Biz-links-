import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  LogOut,
  RefreshCw,
  Copy,
  Check,
  Layers,
  DollarSign,
  Search,
} from 'lucide-react';
import {
  adminLogin,
  adminLogout,
  getAdminToken,
  adminGetSubscriptions,
  adminApproveSubscription,
  adminRejectSubscription,
  adminGetStats,
} from '../services/adminService';
import { SubscriptionRequestItem } from '../types';
import { useStore } from '../context/StoreContext';

interface AdminPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPortalModal: React.FC<AdminPortalModalProps> = ({ isOpen, onClose }) => {
  const { shops, refreshSubscriptionStatus } = useStore();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getAdminToken());
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<'approvals' | 'shops'>('approvals');
  const [requests, setRequests] = useState<SubscriptionRequestItem[]>([]);
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingApprovals: 0,
    approvedSubscriptions: 0,
    totalRevenueKes: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const [subData, statsData] = await Promise.all([
        adminGetSubscriptions(),
        adminGetStats(),
      ]);
      if (subData.success) {
        setRequests(subData.requests);
      }
      if (statsData.success) {
        setStats(statsData.stats);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchData();
    }
  }, [isOpen, isAuthenticated]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!passwordInput.trim()) {
      setLoginError('Please enter the admin password.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await adminLogin(passwordInput.trim());
      if (res.success) {
        setIsAuthenticated(true);
        setPasswordInput('');
        fetchData();
      } else {
        setLoginError(res.message || 'Invalid admin password.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Server error.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await adminLogout();
    setIsAuthenticated(false);
    setPasswordInput('');
    setRequests([]);
  };

  const handleApprove = async (requestId: string, shopName: string) => {
    setActionMessage(null);
    const res = await adminApproveSubscription(requestId, 30);
    if (res.success) {
      setActionMessage({
        type: 'success',
        text: `Approved KES 299 subscription for ${shopName}. Odry Studio PRO is now active.`,
      });
      fetchData();
      refreshSubscriptionStatus();
    } else {
      setActionMessage({ type: 'error', text: res.message });
    }
  };

  const handleReject = async (requestId: string, shopName: string) => {
    setActionMessage(null);
    const res = await adminRejectSubscription(
      requestId,
      'M-Pesa Code not verified on Till 1703305'
    );
    if (res.success) {
      setActionMessage({ type: 'success', text: `Rejected request for ${shopName}.` });
      fetchData();
      refreshSubscriptionStatus();
    } else {
      setActionMessage({ type: 'error', text: res.message });
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredRequests = requests.filter((r) => {
    if (filterStatus === 'PENDING' && r.status !== 'PENDING_APPROVAL') return false;
    if (filterStatus === 'APPROVED' && r.status !== 'APPROVED') return false;
    if (filterStatus === 'REJECTED' && r.status !== 'REJECTED') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.shopName.toLowerCase().includes(q) ||
        r.mpesaCode.toLowerCase().includes(q) ||
        r.phoneNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl bg-[#070B19] text-slate-100 shadow-2xl overflow-hidden border border-indigo-500/30 my-8">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#0B1026] via-indigo-950 to-violet-950 p-5 text-white flex items-center justify-between border-b border-indigo-500/20">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white font-display">
                  Odry Studio — Admin Console
                </h3>
                <span className="text-xs font-mono text-violet-300">· Super Admin</span>
              </div>
              <p className="text-xs text-slate-300">
                M-Pesa Till 1703305 Verification &amp; Studio Workspace Accounts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <>
                <button
                  onClick={fetchData}
                  disabled={isLoading}
                  title="Refresh Data"
                  className="rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="rounded-xl p-2 text-rose-300 hover:bg-rose-950/40 hover:text-white transition flex items-center gap-1 text-xs cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Not Authenticated: Password Screen */}
        {!isAuthenticated ? (
          <div className="p-8 sm:p-12 max-w-md mx-auto text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400">
              <Lock className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-bold text-white font-display">Admin Authentication</h4>
              <p className="text-xs text-slate-400">
                Enter your administrator password to manage Odry Studio PRO subscriptions and accounts.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter Admin Password..."
                  autoFocus
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-medium text-white focus:border-indigo-500 outline-none text-center tracking-widest"
                />
                {loginError && (
                  <p className="text-xs text-rose-400 font-semibold mt-2">{loginError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-3 text-sm shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {isLoggingIn ? 'Authenticating...' : 'Unlock Admin Console'}
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Dashboard View */
          <div className="p-6 space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-1">
                <div className="flex items-center justify-between text-amber-400">
                  <span className="text-xs font-medium text-slate-400">Pending Approvals</span>
                  <Clock className="h-4 w-4" />
                </div>
                <div className="text-2xl font-bold text-white font-mono tabular-nums">
                  {stats.pendingApprovals}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-1">
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="text-xs font-medium text-slate-400">Approved Plans</span>
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="text-2xl font-bold text-white font-mono tabular-nums">
                  {stats.approvedSubscriptions}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-1">
                <div className="flex items-center justify-between text-violet-400">
                  <span className="text-xs font-medium text-slate-400">PRO Revenue</span>
                  <DollarSign className="h-4 w-4" />
                </div>
                <div className="text-2xl font-bold text-white font-mono tabular-nums">
                  KES {stats.totalRevenueKes.toLocaleString()}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-1">
                <div className="flex items-center justify-between text-indigo-400">
                  <span className="text-xs font-medium text-slate-400">Studio Workspaces</span>
                  <Layers className="h-4 w-4" />
                </div>
                <div className="text-2xl font-bold text-white font-mono tabular-nums">
                  {shops.length}
                </div>
              </div>
            </div>

            {/* Action Feedback Banner */}
            {actionMessage && (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                  actionMessage.type === 'success'
                    ? 'bg-emerald-950/60 text-emerald-200 border border-emerald-500/40'
                    : 'bg-rose-950/60 text-rose-200 border border-rose-500/40'
                }`}
              >
                <span>{actionMessage.text}</span>
                <button
                  onClick={() => setActionMessage(null)}
                  className="rounded-lg p-1 hover:bg-white/10 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('approvals')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'approvals'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>M-Pesa Code Approvals ({stats.pendingApprovals})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('shops')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'shops'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  <span>Studio Accounts ({shops.length})</span>
                </button>
              </div>

              {/* Search & Filter */}
              {activeTab === 'approvals' && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search account or code..."
                      className="rounded-xl border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-white focus:border-indigo-500 outline-none w-44"
                    />
                  </div>

                  <select
                    value={filterStatus}
                    onChange={(e: any) => setFilterStatus(e.target.value)}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending ({stats.pendingApprovals})</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              )}
            </div>

            {/* TAB 1: M-PESA APPROVALS LIST */}
            {activeTab === 'approvals' && (
              <div className="space-y-3">
                {filteredRequests.length === 0 ? (
                  <div className="text-center py-12 border border-slate-800 bg-slate-900/40 rounded-2xl p-6">
                    <Clock className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-200">No subscription requests found.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      When users submit a KES 299 M-Pesa confirmation code, it will appear here for approval.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRequests.map((req) => (
                      <div
                        key={req.id}
                        className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="font-bold text-sm text-white">{req.shopName}</span>
                            <span className="text-slate-500">·</span>
                            <span className="font-mono text-slate-400">{req.phoneNumber}</span>
                            <span className="text-slate-500">·</span>
                            <span
                              className={
                                req.status === 'PENDING_APPROVAL'
                                  ? 'text-amber-400 font-semibold'
                                  : req.status === 'APPROVED'
                                  ? 'text-emerald-400 font-semibold'
                                  : 'text-rose-400 font-semibold'
                              }
                            >
                              {req.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                              <span className="text-slate-400">M-Pesa Code:</span>
                              <span className="font-mono font-bold text-violet-300">
                                {req.mpesaCode}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(req.mpesaCode)}
                                className="ml-1 text-slate-400 hover:text-white transition cursor-pointer"
                              >
                                {copiedCode === req.mpesaCode ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                            <span className="font-mono font-semibold text-white">
                              KES {req.amount}
                            </span>
                            <span className="text-slate-500">
                              {new Date(req.submittedAt).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {req.status === 'PENDING_APPROVAL' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(req.id, req.shopName)}
                                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 text-xs transition cursor-pointer"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(req.id, req.shopName)}
                                className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 font-bold px-3 py-2 text-xs transition cursor-pointer"
                              >
                                <XCircle className="h-4 w-4" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: STUDIO ACCOUNTS */}
            {activeTab === 'shops' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {shops.map((shop) => (
                  <div
                    key={shop.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <h5 className="font-bold text-sm text-white truncate">{shop.name}</h5>
                        <span className="text-slate-500">·</span>
                        <span className={shop.isPro ? 'text-violet-400 font-semibold' : 'text-slate-400'}>
                          {shop.isPro ? (shop.proPlan === 'TRIAL' ? 'Trial' : 'PRO') : 'Free'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {shop.location} · {shop.phoneNumber}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {!shop.isPro ? (
                        <button
                          type="button"
                          onClick={async () => {
                            const demoReqId = `admin_grant_${Date.now()}`;
                            await adminApproveSubscription(demoReqId, 30);
                            setActionMessage({
                              type: 'success',
                              text: `Activated Odry Studio PRO for ${shop.name} (30 days).`,
                            });
                            fetchData();
                            refreshSubscriptionStatus();
                          }}
                          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                        >
                          + Grant PRO
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
