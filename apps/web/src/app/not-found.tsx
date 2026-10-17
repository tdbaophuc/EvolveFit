import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="app-shell error-shell">
      <section className="card state-card">
        <Home size={28} />
        <div>
          <p className="eyebrow">404</p>
          <h1>Không tìm thấy trang</h1>
          <p>Đường dẫn này không tồn tại hoặc đã được đổi.</p>
        </div>
        <Link className="primary-button training-bg link-button" href="/">
          Về Hôm nay
        </Link>
      </section>
    </main>
  );
}
