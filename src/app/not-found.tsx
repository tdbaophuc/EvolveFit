import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="app-shell error-shell">
      <section className="card state-card">
        <Home size={28} />
        <div>
          <p className="eyebrow">404</p>
          <h1>Khong tim thay trang</h1>
          <p>Duong dan nay khong ton tai hoac da duoc doi.</p>
        </div>
        <Link className="primary-button training-bg link-button" href="/">
          Ve Today
        </Link>
      </section>
    </main>
  );
}
