import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, ArrowRight } from 'lucide-react';

export const VersionUpdateModal: React.FC = () => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    // Initialize window.__APP_VERSION__ with the build constant if not already set
    if (typeof window !== 'undefined' && !(window as any).__APP_VERSION__ && typeof __APP_VERSION__ !== 'undefined') {
      (window as any).__APP_VERSION__ = __APP_VERSION__;
    }

    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        if (!res.ok) return;
        const data = await res.json();

        // Get running version: prefer window.__APP_VERSION__ (allows dynamic console testing), fallback to build constant
        const currentVersion = 
          (typeof window !== 'undefined' && (window as any).__APP_VERSION__) || 
          (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : null);

        console.log('[VersionChecker] Check:', { currentVersion, latestVersion: data?.version });

        if (data?.version && currentVersion && data.version !== currentVersion) {
          // If cashier is actively ringing up items in the cart, do not interrupt
          try {
            const rawCart = localStorage.getItem('pos_cart');
            const cartItems = rawCart ? JSON.parse(rawCart) : [];
            if (Array.isArray(cartItems) && cartItems.length > 0) {
              console.log('[VersionChecker] Update available, but cart is not empty. Deferring.');
              return;
            }
          } catch (e) {}

          setHasUpdate(true);
        }
      } catch (err) {
        // Offline or network error - ignore silently
      }
    };

    // Expose test helpers on window for easy local testing in DevTools
    if (typeof window !== 'undefined') {
      (window as any).__triggerUpdateCheck = checkVersion;
      (window as any).__simulateUpdateModal = () => setHasUpdate(true);
    }

    // 1. Initial check after 3s of app startup
    const initialTimer = setTimeout(checkVersion, 3000);

    // 2. Periodic check every 2 minutes
    const interval = setInterval(checkVersion, 2 * 60 * 1000);

    // 3. Check when the tab becomes active/visible
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', checkVersion);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', checkVersion);
    };
  }, []);

  const handleUpdate = async () => {
    setIsReloading(true);
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch (e) {
      console.warn('Error clearing service worker cache:', e);
    }
    // Hard refresh the page to load new bundle
    window.location.reload();
  };

  if (!hasUpdate) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div 
        className="w-full max-w-md bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle background glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-5 shadow-inner">
          <Sparkles className="w-8 h-8 animate-pulse" />
        </div>

        {/* Content */}
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
          Update Available
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6 leading-relaxed">
          A new version of the POS system has been deployed. Please click below to refresh and apply the latest improvements and fixes.
        </p>

        {/* Action Button (No close button allowed) */}
        <button
          onClick={handleUpdate}
          disabled={isReloading}
          className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
        >
          {isReloading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Applying Updates...</span>
            </>
          ) : (
            <>
              <span>Click to Update</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
