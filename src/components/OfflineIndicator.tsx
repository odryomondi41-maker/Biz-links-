import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useStore } from '../context/StoreContext';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { language } = useStore();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xl">
      <WifiOff className="h-4 w-4" />
      <span>
        {language === 'sw'
          ? 'Hauko hewani (Offline) — Odry Studio Kenya inatumia miradi iliyohifadhiwa.'
          : 'Offline Mode — Odry Studio Kenya is running your cached local projects.'}
      </span>
    </div>
  );
};
