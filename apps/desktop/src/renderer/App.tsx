import React, { useEffect } from 'react';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { useAuthStore } from './stores/authStore';

type Route = '/chat' | '/settings';

export default function App(): React.ReactElement {
  const { session, loading, initialized, initialize } = useAuthStore();
  const [route, setRoute] = React.useState<Route>('/chat');

  // Bootstrap auth on mount
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    initialize().then((unsub) => { cleanup = unsub; });
    return () => cleanup?.();
  }, [initialize]);

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

  // Not logged in → show login
  if (!session) {
    return <LoginPage />;
  }

  // Logged in → main app
  switch (route) {
    case '/chat':
      return <ChatPage onNavigate={setRoute} />;
    case '/settings':
      return <SettingsPage onNavigate={setRoute} />;
    default: {
      const _exhaustive: never = route;
      return <ChatPage onNavigate={setRoute} />;
    }
  }
}
