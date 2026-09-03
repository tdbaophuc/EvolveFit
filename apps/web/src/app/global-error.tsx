"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message || "Lỗi nghiêm trọng",
        digest: error.digest,
        stack: error.stack,
        path: window.location.pathname,
        userAgent: navigator.userAgent
      })
    }).catch(() => undefined);
  }, [error]);

  return (
    <html lang="vi">
      <body>
        <main className="app-shell error-shell">
          <section className="card state-card">
            <AlertTriangle size={28} />
            <div>
              <p className="eyebrow">Lỗi nghiêm trọng</p>
              <h1>Ứng dụng đang gặp lỗi</h1>
              <p>{error.digest ? `Mã lỗi: ${error.digest}` : "Kiểm tra log server và endpoint /api/health để khoanh vùng nguyên nhân."}</p>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
