'use client';

import { useEffect, useState } from 'react';

// Extend the Window interface for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAProvider() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // ── Register service worker ──────────────────────────────────────────────
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.error('SW registration failed:', err));
    }

    // ── Check if already installed ───────────────────────────────────────────
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone === true);

    if (isStandalone) return; // already installed — don't show banner

    // ── Check if user already dismissed the banner ────────────────────────────
    const wasDismissed = sessionStorage.getItem('pwa-banner-dismissed');
    if (wasDismissed) return;

    // ── Detect iOS (Safari doesn't fire beforeinstallprompt) ─────────────────
    const ua = navigator.userAgent;
    const iosDevice = /iphone|ipad|ipod/i.test(ua) && !/crios/i.test(ua);
    const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);

    if (iosDevice) {
      setIsIOS(true);
      if (isMobile) setShowBanner(true);
      return;
    }

    // ── Android / Chrome / Edge: listen for beforeinstallprompt ──────────────
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      if (isMobile) setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    sessionStorage.setItem('pwa-banner-dismissed', '1');
    setDismissed(true);
    setShowBanner(false);
  };

  if (!showBanner || dismissed) return null;

  // ── Banner UI ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'linear-gradient(135deg, #1e1e35 0%, #0f0f1a 100%)',
        borderTop: '1px solid rgba(99,102,241,0.4)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 -4px 24px rgba(99,102,241,0.2)',
      }}
    >
      {/* App icon */}
      <img
        src="/dmoney-favicon.ico"
        alt="dMoney"
        style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, objectFit: 'cover' }}
      />

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9', lineHeight: 1.3 }}>
          Install dMoney
        </div>
        {isIOS ? (
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3, lineHeight: 1.5 }}>
            Tap <strong style={{ color: '#818cf8' }}>Share</strong> then{' '}
            <strong style={{ color: '#818cf8' }}>Add to Home Screen</strong>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>
            Add to your home screen for quick access
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            color: '#94a3b8',
            fontSize: 13,
            fontWeight: 600,
            padding: '6px 12px',
            cursor: 'pointer',
          }}
        >
          Not now
        </button>

        {/* Install (only on Android/Chrome — iOS uses native share sheet) */}
        {!isIOS && (
          <button
            onClick={handleInstall}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              padding: '6px 16px',
              cursor: 'pointer',
              boxShadow: '0 0 16px rgba(99,102,241,0.5)',
            }}
          >
            Install
          </button>
        )}
      </div>
    </div>
  );
}
