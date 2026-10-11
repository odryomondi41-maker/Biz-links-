import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle, Apple } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useStore } from '../context/StoreContext';

export const PWAInstallButton: React.FC<{ variant?: 'header' | 'banner' | 'card' }> = ({
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { language } = useStore();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 4000);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setShowIOSGuide(true);
    }
  };

  const labelText =
    language === 'sw' ? 'Sakinisha Odry Studio' : 'Install Odry Studio';
  const subText =
    language === 'sw'
      ? 'Fungua Odry Studio haraka kwenye simu au kompyuta yako na ujenge apps na websites!'
      : 'Launch Odry Studio directly from your home screen to build & preview apps and websites!';

  if (variant === 'banner') {
    return (
      <>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 p-4 text-white shadow-md border border-indigo-700/50">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md text-indigo-300">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">
                  {labelText}
                </h4>
                <p className="text-xs text-indigo-100/90 max-w-md">
                  {subText}
                </p>
              </div>
            </div>

            <button
              onClick={handleInstallClick}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-400 transition active:scale-95"
            >
              <Download className="h-4 w-4" />
              <span>{language === 'sw' ? 'Install Sasa' : 'Install Now'}</span>
            </button>
          </div>
        </div>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-gray-900">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Apple className="h-5 w-5 text-gray-800" />
                  <h3 className="font-bold text-lg text-gray-900">
                    {language === 'sw'
                      ? 'Jinsi ya Kusakinisha Odry Studio'
                      : 'How to Install Odry Studio'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-3 rounded-xl bg-indigo-50 p-3 text-indigo-900">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-xs text-white">
                    1
                  </span>
                  <p>
                    {language === 'sw'
                      ? 'Bonyeza kitufe cha "Share" au vitone vitatu (⋮) kwenye browser yako.'
                      : 'Tap the Share icon (or three dots menu) in your browser.'}
                  </p>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-indigo-50 p-3 text-indigo-900">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-xs text-white">
                    2
                  </span>
                  <p>
                    {language === 'sw'
                      ? 'Shuka chini kisha bonyeza "Add to Home Screen" (Weka kwenye Screen Kuu).'
                      : 'Scroll down and tap "Add to Home Screen".'}
                  </p>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-indigo-50 p-3 text-indigo-900">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-xs text-white">
                    3
                  </span>
                  <p>
                    {language === 'sw'
                      ? 'Kamilisha kwa kubonyeza "Add". Icon ya Odry Studio itaonekana kwenye simu yako!'
                      : 'Tap "Add" in the top right. Odry Studio will be ready on your home screen!'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
              >
                {language === 'sw' ? 'Nimeelewa (Sawa)' : 'Got it, thanks!'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition active:scale-95"
        title={labelText}
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{labelText}</span>
        <span className="sm:hidden">Install</span>
      </button>

      {installSuccess && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2.5 shadow-lg text-sm font-medium animate-in slide-in-from-top-4">
          <CheckCircle className="h-4 w-4" />
          <span>
            {language === 'sw' ? 'Odry Studio imesakinishwa!' : 'Odry Studio installed!'}
          </span>
        </div>
      )}

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-lg text-gray-900">
                  {language === 'sw' ? 'Sakinisha Odry Studio' : 'Install Odry Studio'}
                </h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-xs text-white">
                  1
                </span>
                <p>
                  {language === 'sw'
                    ? 'Kwenye browser ya simu yako (Safari au Chrome), bonyeza Share au Menu (⋮).'
                    : 'In Safari or Chrome, tap the Share icon or menu button (⋮).'}
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-xs text-white">
                  2
                </span>
                <p>
                  {language === 'sw'
                    ? 'Chagua chaguo la "Add to Home Screen" (Weka kwenye Skrini Kuu).'
                    : 'Select "Add to Home Screen".'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              {language === 'sw' ? 'Sawa' : 'Dismiss'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
