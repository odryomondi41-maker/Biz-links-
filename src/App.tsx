import React, { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/Header';
import { OdryStudioBuilder } from './components/OdryStudioBuilder';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AdminPortalModal } from './components/AdminPortalModal';
import { GmailPortalModal } from './components/GmailPortalModal';
import { BuilderProject, StudioViewMode } from './types';
import { fetchStudioProjects } from './services/studioService';
import { Sparkles } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentShop } = useStore();

  const [studioView, setStudioView] = useState<StudioViewMode>('dashboard');
  const [projects, setProjects] = useState<BuilderProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number>(250);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(true);

  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);
  const [isGmailModalOpen, setIsGmailModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoadingProjects(true);
    fetchStudioProjects(currentShop.id)
      .then((res) => {
        if (!mounted) return;
        if (Array.isArray(res.projects)) {
          setProjects(res.projects);
          if (res.projects.length > 0) {
            setActiveProjectId((prev) => prev || res.projects[0].id);
          }
        }
        if (typeof res.tokenBalance === 'number') {
          setTokenBalance(res.tokenBalance);
        }
      })
      .catch(() => {
        // Fallback if offline
      })
      .finally(() => {
        if (mounted) setIsLoadingProjects(false);
      });

    return () => {
      mounted = false;
    };
  }, [currentShop.id]);

  const publishedCount = projects.filter(
    (p) => p.status === 'published' && Boolean(p.publishedUrl)
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#040711] text-slate-100">
      {/* Odry Studio Top Navigation */}
      <Header
        studioView={studioView}
        onSelectStudioView={setStudioView}
        tokenBalance={tokenBalance}
        projectCount={projects.length}
        publishedCount={publishedCount}
        onStartNewProject={() => setStudioView('dashboard')}
        onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
        onOpenAdminPortal={() => setIsAdminPortalOpen(true)}
        onOpenGmailModal={() => setIsGmailModalOpen(true)}
      />

      {/* Main Odry Studio Platform (Landing Page, Dashboard, AI Workspace, Projects & Deployments) */}
      <main className="flex-1">
        <OdryStudioBuilder
          studioView={studioView}
          onSelectStudioView={setStudioView}
          projects={projects}
          setProjects={setProjects}
          activeProjectId={activeProjectId}
          setActiveProjectId={setActiveProjectId}
          tokenBalance={tokenBalance}
          setTokenBalance={setTokenBalance}
          isLoadingProjects={isLoadingProjects}
          onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
        />
      </main>

      {/* Preserved Shared Account, Subscription, Admin & Workspace Modals */}
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
      />
      <AdminPortalModal
        isOpen={isAdminPortalOpen}
        onClose={() => setIsAdminPortalOpen(false)}
      />
      <GmailPortalModal
        isOpen={isGmailModalOpen}
        onClose={() => setIsGmailModalOpen(false)}
      />
      <OfflineIndicator />

      {/* Quiet Studio Footer */}
      <footer className="mt-auto border-t border-indigo-500/15 bg-[#03050C] py-6 text-slate-400">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-white font-display">
                Odry Studio
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">
                AI Website, Mobile App &amp; Business Software Builder
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-slate-400">
              <button
                type="button"
                onClick={() => setStudioView('home')}
                className="hover:text-white transition cursor-pointer"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => setStudioView('dashboard')}
                className="hover:text-white transition cursor-pointer"
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => setStudioView('workspace')}
                className="hover:text-white transition cursor-pointer"
              >
                AI Workspace
              </button>
              <button
                type="button"
                onClick={() => setStudioView('projects')}
                className="hover:text-white transition cursor-pointer"
              >
                Projects
              </button>
              <button
                type="button"
                onClick={() => setStudioView('published')}
                className="hover:text-white transition cursor-pointer"
              >
                Published
              </button>
            </div>

            <p className="text-slate-500 text-[11px]">
              © {new Date().getFullYear()} Odry Studio. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
