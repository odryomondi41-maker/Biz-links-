import React, { useState, useRef } from 'react';
import {
  Globe,
  Crown,
  Mail,
  Coins,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { StudioViewMode } from '../types';

export interface StudioHeaderProps {
  studioView: StudioViewMode;
  onSelectStudioView: (view: StudioViewMode) => void;
  tokenBalance: number;
  projectCount: number;
  publishedCount: number;
  onStartNewProject: () => void;
  onOpenSubscriptionModal?: () => void;
  onOpenAdminPortal?: () => void;
  onOpenGmailModal?: () => void;
}

export const Header: React.FC<StudioHeaderProps> = ({
  studioView,
  onSelectStudioView,
  tokenBalance,
  projectCount,
  publishedCount,
  onStartNewProject,
  onOpenSubscriptionModal,
  onOpenAdminPortal,
  onOpenGmailModal,
}) => {
  const {
    language,
    setLanguage,
    currentShop,
    showSubscriptionPlan,
    subscriptionDaysRemaining,
  } = useStore();

  const [logoTapCount, setLogoTapCount] = useState(0);
  const lastTapRef = useRef<number>(0);

  const handleLogoTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current > 3000) {
      setLogoTapCount(1);
    } else {
      const nextCount = logoTapCount + 1;
      setLogoTapCount(nextCount);
      if (nextCount >= 5) {
        setLogoTapCount(0);
        if (onOpenAdminPortal) {
          onOpenAdminPortal();
          return;
        }
      }
    }
    lastTapRef.current = now;
    onSelectStudioView('home');
  };

  const toggleLanguage = () => {
    const next = language === 'sw' ? 'en' : 'sw';
    setLanguage(next);
    try {
      localStorage.setItem('odrystudio_lang', next);
    } catch {
      // ignore
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#040711]/90 backdrop-blur-xl text-slate-100 border-b border-indigo-500/15">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Odry Studio Brand Identity (Tap 5 times to open Admin Console) */}
          <button
            type="button"
            onClick={handleLogoTap}
            className="flex items-center gap-3 cursor-pointer select-none whitespace-nowrap shrink-0 text-left group"
            title="Odry Studio — AI Website, Mobile App & Business Software Builder"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 text-white font-extrabold text-sm tracking-tight shadow-md shadow-indigo-950/60 group-hover:from-violet-500 group-hover:to-blue-500 transition">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-none font-display">
                Odry Studio
              </span>
              <span className="text-[11px] font-medium text-indigo-300/90 mt-0.5">
                AI Website &amp; App Builder
              </span>
            </div>
          </button>

          {/* Zone 2: Clean Typography Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm">
            <button
              type="button"
              onClick={() => onSelectStudioView('home')}
              className={`whitespace-nowrap shrink-0 py-1 font-medium transition border-b-2 cursor-pointer ${
                studioView === 'home'
                  ? 'border-violet-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {language === 'sw' ? 'Nyumbani' : 'Home'}
            </button>

            <button
              type="button"
              onClick={() => onSelectStudioView('dashboard')}
              className={`whitespace-nowrap shrink-0 py-1 font-medium transition border-b-2 cursor-pointer ${
                studioView === 'dashboard'
                  ? 'border-violet-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {language === 'sw' ? 'Dashibodi' : 'Dashboard'}
            </button>

            <button
              type="button"
              onClick={() => onSelectStudioView('workspace')}
              className={`whitespace-nowrap shrink-0 py-1 font-medium transition border-b-2 cursor-pointer ${
                studioView === 'workspace'
                  ? 'border-violet-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {language === 'sw' ? 'Sehemu ya Kazi' : 'Workspace'}
            </button>

            <button
              type="button"
              onClick={() => onSelectStudioView('projects')}
              className={`whitespace-nowrap shrink-0 py-1 font-medium transition border-b-2 cursor-pointer ${
                studioView === 'projects'
                  ? 'border-violet-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {language === 'sw' ? `Miradi (${projectCount})` : `Projects (${projectCount})`}
            </button>

            <button
              type="button"
              onClick={() => onSelectStudioView('published')}
              className={`whitespace-nowrap shrink-0 py-1 font-medium transition border-b-2 cursor-pointer ${
                studioView === 'published'
                  ? 'border-violet-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {language === 'sw' ? `Zilizochapishwa (${publishedCount})` : `Published (${publishedCount})`}
            </button>
          </nav>

          {/* Zone 3: Usage Balance, Subscription & Create New Project CTA */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Usage Balance Display */}
            <button
              type="button"
              onClick={onOpenSubscriptionModal}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-indigo-500/20 bg-[#0A0F24] hover:border-indigo-500/40 px-3 py-1.5 text-xs font-mono font-semibold text-slate-200 tabular-nums transition cursor-pointer"
              title="Usage Balance & Subscription Information"
            >
              <Coins className="h-3.5 w-3.5 text-violet-400" />
              <span>{tokenBalance.toLocaleString()} tokens</span>
            </button>

            {/* Subscription Plan Button: Appears when <= 1 day is left (KES 299 Manual Only, No STK Push) */}
            {showSubscriptionPlan && (
              <button
                type="button"
                onClick={onOpenSubscriptionModal}
                className="hidden lg:flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                title="Renew Odry Studio PRO (KES 299 Manual M-Pesa)"
              >
                <Crown className="h-3.5 w-3.5" />
                <span>
                  {currentShop.proStatus === 'PENDING_APPROVAL'
                    ? 'Pending Approval · KES 299'
                    : `${subscriptionDaysRemaining}d Left · KES 299`}
                </span>
              </button>
            )}

            {/* Google Workspace / Gmail Integration */}
            <button
              type="button"
              onClick={onOpenGmailModal}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#0A0F24] hover:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition cursor-pointer"
              title="Google Workspace Mail"
            >
              <Mail className="h-3.5 w-3.5 text-indigo-400" />
              <span className="hidden xl:inline">Mail</span>
            </button>

            {/* Language Toggle */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1 rounded-xl border border-slate-800 bg-[#0A0F24] px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-900 transition cursor-pointer"
              title="Switch Language (EN / SW)"
            >
              <Globe className="h-3.5 w-3.5 text-violet-400" />
              <span className="uppercase">{language}</span>
            </button>

            {/* Primary CTA: Create New Project */}
            <button
              type="button"
              onClick={onStartNewProject}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white px-3.5 py-2 text-xs font-bold shadow-md shadow-indigo-950/60 transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>{language === 'sw' ? 'Mradi Mpya' : 'Create New Project'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Subnav for Android & Small Screens */}
        <div className="flex md:hidden items-center justify-between border-t border-slate-800/80 py-2 overflow-x-auto no-scrollbar gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSelectStudioView('home')}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition ${
                studioView === 'home'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'sw' ? 'Nyumbani' : 'Home'}
            </button>
            <button
              type="button"
              onClick={() => onSelectStudioView('dashboard')}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition ${
                studioView === 'dashboard'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'sw' ? 'Dashibodi' : 'Dashboard'}
            </button>
            <button
              type="button"
              onClick={() => onSelectStudioView('workspace')}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition ${
                studioView === 'workspace'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'sw' ? 'Kazi' : 'Workspace'}
            </button>
            <button
              type="button"
              onClick={() => onSelectStudioView('projects')}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition ${
                studioView === 'projects'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'sw' ? `Miradi (${projectCount})` : `Projects (${projectCount})`}
            </button>
            <button
              type="button"
              onClick={() => onSelectStudioView('published')}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition ${
                studioView === 'published'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'sw' ? 'Live' : `Published (${publishedCount})`}
            </button>
          </div>
          <button
            type="button"
            onClick={onOpenSubscriptionModal}
            className="flex items-center gap-1 font-mono text-[11px] font-semibold text-violet-300 shrink-0 px-2 py-1 rounded-lg bg-[#0A0F24] border border-indigo-500/20"
          >
            <Coins className="h-3 w-3" />
            <span>{tokenBalance}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
