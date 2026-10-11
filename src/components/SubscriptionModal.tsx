import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Crown,
  Check,
  Copy,
  Clock,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStore } from '../context/StoreContext';
import {
  submitSubscriptionCode,
  activateFreeTrial,
  getSubscriptionStatus,
} from '../services/mpesaService';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  const { currentShop, refreshSubscriptionStatus, language } = useStore();

  const shortcode = '1703305'; // Till 1703305
  const planAmount = 299; // KES 299 monthly

  const [phone, setPhone] = useState(currentShop.phoneNumber || '07');
  const [mpesaCodeInput, setMpesaCodeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedTill, setCopiedTill] = useState(false);

  // Status tracking from backend
  const [backendStatus, setBackendStatus] = useState<
    'FREE' | 'TRIAL' | 'PRO' | 'PENDING_APPROVAL' | 'EXPIRED' | 'REJECTED'
  >('FREE');
  const [pendingCode, setPendingCode] = useState<string>('');
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [trialUsed, setTrialUsed] = useState<boolean>(!!currentShop.trialUsed);

  // Poll backend status while modal is open
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const checkStatus = async () => {
      try {
        const res = await getSubscriptionStatus(currentShop.id);
        if (res && res.success) {
          if (res.pendingRequest && res.pendingRequest.status === 'PENDING_APPROVAL') {
            setBackendStatus('PENDING_APPROVAL');
            setPendingCode(res.pendingRequest.mpesaCode);
          } else if (res.isPro) {
            setBackendStatus(res.subscription.plan === 'TRIAL' ? 'TRIAL' : 'PRO');
            setPendingCode(res.subscription.mpesaCode || '');
            setDaysRemaining(res.subscription.daysRemaining || 30);
          } else {
            setBackendStatus('FREE');
          }
          if (res.subscription.trialUsed !== undefined) {
            setTrialUsed(res.subscription.trialUsed);
          }
        }
      } catch {
        // ignore
      }
    };

    if (isOpen) {
      checkStatus();
      interval = setInterval(checkStatus, 4000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, currentShop.id]);

  if (!isOpen) return null;

  // Handle M-Pesa Code Verification Submission
  const handleSubmitMpesaCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanCode = mpesaCodeInput.trim().toUpperCase();
    if (cleanCode.length < 8) {
      setErrorMessage(
        language === 'sw'
          ? 'Tafadhali weka M-Pesa Code sahihi (angalau herufi na namba 8, k.m. SHG82JHK91).'
          : 'Please enter a valid M-Pesa Code (at least 8 alphanumeric characters).'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitSubscriptionCode({
        merchantId: currentShop.id,
        shopName: currentShop.name,
        phoneNumber: phone,
        mpesaCode: cleanCode,
        amount: planAmount,
      });

      if (res.success) {
        setBackendStatus('PENDING_APPROVAL');
        setPendingCode(cleanCode);
        setMpesaCodeInput('');
        refreshSubscriptionStatus();
      } else {
        setErrorMessage(res.message || 'Could not submit M-Pesa code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Server error while verifying code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle 3-Day Free Trial Activation
  const handleStartTrial = async () => {
    setErrorMessage('');
    setIsStartingTrial(true);
    try {
      const res = await activateFreeTrial({
        merchantId: currentShop.id,
        shopName: currentShop.name,
      });

      if (res.success) {
        setBackendStatus('TRIAL');
        setTrialUsed(true);
        setDaysRemaining(3);
        refreshSubscriptionStatus();
        try {
          confetti({ particleCount: 90, spread: 80, origin: { y: 0.5 } });
        } catch {
          // ignore
        }
      } else {
        setErrorMessage(res.message || 'Could not activate trial.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error activating trial.');
    } finally {
      setIsStartingTrial(false);
    }
  };

  const handleCopyTill = () => {
    navigator.clipboard.writeText(shortcode);
    setCopiedTill(true);
    setTimeout(() => setCopiedTill(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#070B19] text-slate-100 shadow-2xl overflow-hidden border border-indigo-500/30 my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0B1026] via-indigo-950 to-violet-950 p-6 text-white relative border-b border-indigo-500/20">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-950/50">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-white font-display">Odry Studio PRO</h3>
                <span className="text-xs font-mono text-violet-300">
                  · KES 299 / Month
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                AI Website, Mobile App &amp; Business Software Builder · Manual M-Pesa Till {shortcode}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* 1 DAY LEFT WARNING BANNER */}
          {backendStatus !== 'PENDING_APPROVAL' && daysRemaining <= 1 && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-950/30 p-4 flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-bold text-amber-200">
                  {daysRemaining === 1
                    ? language === 'sw'
                      ? 'Siku 1 Pekee Imebaki kwenye Odry Studio PRO'
                      : '1 Day Remaining on Your Odry Studio PRO Plan'
                    : language === 'sw'
                    ? 'Mpango wa Odry Studio PRO unahitaji kuhuishwa'
                    : 'Renew or Activate Your Odry Studio PRO Plan'}
                </p>
                <p className="text-slate-300 leading-relaxed">
                  {language === 'sw'
                    ? 'Lipa KES 299 pekee kwa M-Pesa Manual (Buy Goods Till 1703305 — Hakuna STK Push) kisha weka M-Pesa Confirmation Code hapa chini ili kuendelea kwa siku 30.'
                    : 'Pay KES 299 manually via M-Pesa Buy Goods Till 1703305 (No STK Push) and submit your M-Pesa Confirmation Code below for 30 days of full AI generation & deployment.'}
                </p>
              </div>
            </div>
          )}

          {/* STATE 1: ALREADY ACTIVE PRO OR TRIAL WITH > 1 DAY LEFT */}
          {(backendStatus === 'PRO' || backendStatus === 'TRIAL' || currentShop.isPro) &&
            daysRemaining > 1 &&
            backendStatus !== 'PENDING_APPROVAL' && (
              <div className="rounded-2xl border border-indigo-500/40 bg-indigo-950/20 p-6 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">
                    {backendStatus === 'TRIAL'
                      ? 'Odry Studio PRO 3-Day Trial Active'
                      : 'Odry Studio PRO Plan Active'}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {backendStatus === 'TRIAL'
                      ? `You have ${daysRemaining} days remaining on your trial. Renewal options (KES 299) automatically appear when 1 day is left.`
                      : `Your Odry Studio PRO subscription is verified and active for the next ${daysRemaining} days.`}
                  </p>
                </div>

                {pendingCode && (
                  <div className="bg-slate-900 rounded-xl p-2.5 text-xs font-mono font-semibold text-indigo-300 border border-slate-800">
                    Verified M-Pesa Receipt: {pendingCode}
                  </div>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-3 text-sm transition cursor-pointer"
                >
                  Continue Building in Odry Studio
                </button>
              </div>
            )}

          {/* STATE 2: PENDING ADMIN APPROVAL */}
          {backendStatus === 'PENDING_APPROVAL' && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Clock className="h-7 w-7" />
              </div>

              <div>
                <p className="text-xs font-mono text-amber-300 mb-1">
                  Awaiting Admin Verification
                </p>
                <h4 className="text-lg font-bold text-white">
                  KES 299 M-Pesa Code Submitted
                </h4>
                <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
                  We received your manual M-Pesa confirmation code for <strong>KES 299</strong> on Till {shortcode}. Once verified, your Odry Studio PRO plan and AI tokens will activate automatically.
                </p>
              </div>

              <div className="rounded-xl bg-slate-900 p-3 border border-slate-800 text-xs flex items-center justify-between font-mono font-bold text-slate-200">
                <span>M-Pesa Code:</span>
                <span className="text-sm text-violet-300">{pendingCode}</span>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-amber-300 font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Checking verification status...</span>
              </div>

              <button
                type="button"
                onClick={() => setBackendStatus('FREE')}
                className="text-xs text-slate-400 hover:text-white underline font-medium cursor-pointer"
              >
                Enter a different M-Pesa code
              </button>
            </div>
          )}

          {/* STATE 3: MANUAL M-PESA PAYMENT FORM (KES 299 MANUAL ONLY, NO STK PUSH) */}
          {backendStatus !== 'PENDING_APPROVAL' &&
            (daysRemaining <= 1 ||
              (!currentShop.isPro && backendStatus !== 'PRO' && backendStatus !== 'TRIAL')) && (
              <>
                {!trialUsed && (
                  <div className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-4 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                        <span>3-Day Free Odry Studio Trial Available</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Test AI app generation &amp; responsive workspace before paying KES 299.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isStartingTrial}
                      onClick={handleStartTrial}
                      className="rounded-xl bg-violet-600 hover:bg-violet-500 px-3.5 py-2 text-xs font-bold text-white shrink-0 transition cursor-pointer"
                    >
                      {isStartingTrial ? 'Activating...' : 'Start Free Trial'}
                    </button>
                  </div>
                )}

                {/* Manual Lipa na M-Pesa KES 299 Instructions */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-xs font-bold text-slate-200">
                      Manual M-Pesa Payment (No STK Push)
                    </span>
                    <span className="font-bold text-violet-300 text-sm font-mono tabular-nums">
                      KES 299 / Month
                    </span>
                  </div>

                  <ol className="space-y-2 text-xs text-slate-300 list-decimal list-inside">
                    <li>
                      Open M-Pesa on your phone ➔ <strong>Lipa na M-Pesa</strong>
                    </li>
                    <li>
                      Select <strong>Buy Goods and Services (Till Number)</strong>
                    </li>
                    <li className="flex items-center gap-2 flex-wrap">
                      <span>Enter Till Number:</span>
                      <button
                        type="button"
                        onClick={handleCopyTill}
                        className="inline-flex items-center gap-1.5 font-mono font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 rounded-lg transition cursor-pointer"
                        title="Copy Till Number"
                      >
                        <span>{shortcode}</span>
                        {copiedTill ? (
                          <Check className="h-3 w-3 text-emerald-300" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </li>
                    <li>
                      Enter Amount: <strong>KES 299</strong> (Manual only, no STK Push)
                    </li>
                    <li>
                      Enter your M-Pesa PIN and copy the <strong>M-Pesa Confirmation Code</strong> from the SMS.
                    </li>
                  </ol>
                </div>

                {/* Form: Verify M-Pesa Code */}
                <form onSubmit={handleSubmitMpesaCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      M-Pesa Confirmation Code (from SMS)
                    </label>
                    <input
                      type="text"
                      required
                      value={mpesaCodeInput}
                      onChange={(e) => setMpesaCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. SHG82JHK91"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-mono font-bold text-white tracking-wider focus:border-indigo-500 outline-none uppercase placeholder:normal-case placeholder:font-normal placeholder:tracking-normal"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Safaricom Phone Number Used
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0712345678"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-white focus:border-indigo-500 outline-none"
                    />
                  </div>

                  {errorMessage && (
                    <div className="rounded-xl bg-rose-950/60 border border-rose-500/40 p-3 text-xs text-rose-200 font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-3.5 text-sm shadow-lg shadow-indigo-950/60 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Submitting for Verification...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Verify KES 299 M-Pesa Code</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
        </div>
      </div>
    </div>
  );
};
