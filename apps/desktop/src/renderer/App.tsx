import React, { useEffect, useState } from 'react';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';

type Route = '/chat' | '/settings';

export default function App(): React.ReactElement {
  const [route, setRoute] = useState<Route>('/chat');

  // Listen for navigation events from the main process (e.g. tray menu)
  useEffect(() => {
    const cleanup = window.desktop.onNavigate((r) => {
      if (r === '/settings' || r === '/chat') {
        setRoute(r as Route);
      }
    });
    return cleanup;
  }, []);

  // Global Esc handler — hides the window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.desktop.hideWindow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
