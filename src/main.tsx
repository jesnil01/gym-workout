import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Register service worker for PWA updates
if ('serviceWorker' in navigator) {
  // Register immediately, don't wait for load event
  navigator.serviceWorker.register('/gym-workout/sw.js', { updateViaCache: 'none' })
    .then((registration) => {
      console.log('Service Worker registered:', registration.scope);

      // Check for updates immediately and then periodically
      const checkForUpdates = () => {
        // Force update check - bypasses 24-hour browser cache
        registration.update().catch((err) => {
          console.log('Update check failed:', err);
        });
      };

      // Check immediately on every app start
      checkForUpdates();

      // Also check when page becomes visible (user switches back to app)
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          checkForUpdates();
        }
      });

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New service worker available, auto-update
                  console.log('New service worker available, updating...');
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  // Reload after a short delay to allow skipWaiting to complete
                  setTimeout(() => {
                    window.location.reload();
                  }, 100);
                } else {
                  // First time installation
                  console.log('Service worker installed for the first time');
                }
              }
            });
          }
        });

        // Listen for controller change (when new worker takes control)
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            console.log('Service worker controller changed, reloading...');
            window.location.reload();
          }
        });
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter basename="/gym-workout">
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
