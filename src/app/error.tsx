"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <main className="app-shell error-shell">
      <section className="card state-card">
        <AlertTriangle size={28} />
        <div>
          <p className="eyebrow">App error</p>
          <h1>Khong tai duoc man hinh</h1>
          <p>{error.digest ? `Ma loi: ${error.digest}` : "Hay thu tai lai. Neu loi lap lai, kiem tra /api/health va log server."}</p>
        </div>
        <button className="primary-button training-bg" onClick={reset}>
          <RotateCcw size={18} /> Thu lai
        </button>
      </section>
    </main>
  );
}

function reportClientError(error: Error & { digest?: string }) {
  fetch("/api/client-errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: error.message || "App error",
      digest: error.digest,
      stack: error.stack,
      path: window.location.pathname,
      userAgent: navigator.userAgent
    })
  }).catch(() => undefined);
}
