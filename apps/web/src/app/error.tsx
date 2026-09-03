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
          <p className="eyebrow">Lỗi ứng dụng</p>
          <h1>Không tải được màn hình</h1>
          <p>{error.digest ? `Mã lỗi: ${error.digest}` : "Hãy thử tải lại. Nếu lỗi lặp lại, kiểm tra /api/health và log server."}</p>
        </div>
        <button className="primary-button training-bg" onClick={reset}>
          <RotateCcw size={18} /> Thử lại
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
      message: error.message || "Lỗi ứng dụng",
      digest: error.digest,
      stack: error.stack,
      path: window.location.pathname,
      userAgent: navigator.userAgent
    })
  }).catch(() => undefined);
}
