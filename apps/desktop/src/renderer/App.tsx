import React, { useEffect, useRef, useState } from 'react';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { useAuthStore } from './stores/authStore';

type Route = '/chat' | '/settings';

export default function App(): React.ReactElement {
  const { session, loading, initialized, initialize } = useAuthStore();
  const [route, setRoute] = useState<Route>('/chat');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Bootstrap auth on mount
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    initialize().then((unsub) => { cleanup = unsub; });
    return () => cleanup?.();
  }, [initialize]);

  // Trigger entrance animation on every shortcut invoke
  useEffect(() => {
    if (!window.desktop?.onShortcutTriggered) return;
    const cleanup = window.desktop.onShortcutTriggered(() => {
      const el = wrapperRef.current;
      if (!el) return;
      // Remove animation class, force reflow, re-add — no remount needed
      el.classList.remove('cursi-enter');
      el.classList.add('cursi-hidden');
      // Two rAFs: first paints the hidden state, second starts the animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.classList.remove('cursi-hidden');
          el.classList.add('cursi-enter');
        });
      });
    });
    return cleanup;
  }, []);

  // Listen for navigation events from the main process (e.g. tray menu)
  useEffect(() => {
    console.log('[App] window.desktop available:', !!window.desktop);
    if (!window.desktop?.onNavigate) return;
    const unsubscribe = window.desktop.onNavigate((r) => {
      if (r === '/settings' || r === '/chat') {
        setRoute(r as Route);
      }
    });
    return unsubscribe;
  }, []);

  // Global Esc — hides the window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        void window.desktop?.hideWindow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Splash while auth is initializing
  if (!initialized || loading) {
    return (
      <div className="flex items-center justify-center bg-black/70 backdrop-blur-3xl rounded-2xl" style={{ height: 52 }}>
        <span className="w-3.5 h-3.5 border border-cursi-500/40 border-t-cursi-500 rounded-full animate-spin" />
      </div>
    );
  }

  let content: React.ReactElement;

  // Not logged in → show login
  if (!session) {
    content = <LoginPage />;
  } else {
    switch (route) {
      case '/chat':
        content = <ChatPage onNavigate={setRoute} />;
        break;
      case '/settings':
        content = <SettingsPage onNavigate={setRoute} />;
        break;
      default: {
        const _exhaustive: never = route;
        content = <ChatPage onNavigate={setRoute} />;
      }
    }
  }

  return (
    <div ref={wrapperRef} className="cursi-enter">
      {content}
    </div>
  );
}
