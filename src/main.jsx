import React, { Suspense, lazy, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import { ToastProvider } from "./components/ui/Toast.tsx";
import { initializeSettings } from "./stores/settingsStore";
import i18n from "./i18n";
import "./index.css";

let root = null;
const FloatingApp = lazy(() => import("./App.jsx"));
const NotypeSettingsWindow = lazy(() => import("./components/NotypeSettingsWindow.tsx"));

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc,_#eef2ff_55%,_#f8fafc)] flex items-center justify-center">
      <div className="rounded-2xl border border-white/70 bg-white/80 px-6 py-4 text-sm font-medium text-slate-600 shadow-sm backdrop-blur">
        Loading NOTYPE…
      </div>
    </div>
  );
}

function AppRouter() {
  const [isReady, setIsReady] = useState(false);
  const isSettingsWindow =
    window.location.pathname.includes("settings") || window.location.search.includes("settings=1");

  useEffect(() => {
    let cancelled = false;

    initializeSettings()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setIsReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isReady) {
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      {isSettingsWindow ? <NotypeSettingsWindow /> : <FloatingApp />}
    </Suspense>
  );
}

function mountApp() {
  if (!root) {
    root = ReactDOM.createRoot(document.getElementById("root"));
  }

  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <I18nextProvider i18n={i18n}>
          <ToastProvider>
            <AppRouter />
          </ToastProvider>
        </I18nextProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}

mountApp();

if (import.meta.hot) {
  import.meta.hot.accept();
}
