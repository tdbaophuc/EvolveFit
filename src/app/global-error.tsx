"use client";

import { AlertTriangle } from "lucide-react";
import "./globals.css";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="vi">
      <body>
        <main className="app-shell error-shell">
          <section className="card state-card">
            <AlertTriangle size={28} />
            <div>
              <p className="eyebrow">Critical error</p>
              <h1>Ung dung dang gap loi</h1>
              <p>{error.digest ? `Ma loi: ${error.digest}` : "Kiem tra log server va endpoint /api/health de khoanh vung nguyen nhan."}</p>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
