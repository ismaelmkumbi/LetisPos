// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { Suspense } from 'react';
import { CustomizerContextProvider } from './context/CustomizerContext';
import ReactDOM from 'react-dom/client';
import App from './App';
import Spinner from './views/spinner/Spinner';
import './utils/i18n';

// SmartPOS talks to a real backend (http://localhost:8080). The Modernize
// template ships MSW for mocking demo data — we disable it entirely because
// it intercepts *every* XHR and its passthrough fails on cross-origin calls
// to the gateway, producing "mockServiceWorker.js TypeError: Failed to fetch".
// To re-enable MSW for a specific demo, set VITE_ENABLE_MSW=1 before `npm run dev`.
async function bootstrap() {
  const enableMsw = import.meta.env.VITE_ENABLE_MSW === '1';
  if (enableMsw) {
    const { worker } = await import('./api/mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  } else if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
    // Actively tear down any previously-registered MSW worker so a stale
    // registration from an earlier session can't keep intercepting fetches.
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs
          .filter((r) => r.active?.scriptURL.includes('mockServiceWorker'))
          .map((r) => r.unregister()),
      );
    } catch {
      /* no-op — SW is best-effort */
    }
  }
}

bootstrap().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <CustomizerContextProvider>
      <Suspense fallback={<Spinner />}>
        <App />
      </Suspense>
    </CustomizerContextProvider>,
  );
});
