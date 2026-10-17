import Link from "next/link";
import { Home } from "lucide-react";

const text = {
  title: "Không tìm thấy trang",
  body: "Đường dẫn này không tồn tại hoặc đã được đổi.",
  home: "Về Hôm nay"
};

export default function NotFound() {
  return (
    <main className="app-shell error-shell">
      <section className="card state-card">
        <Home size={28} />
        <div>
          <p className="eyebrow">404</p>
          <h1>{text.title}</h1>
          <p>{text.body}</p>
        </div>
        <Link className="primary-button training-bg link-button" href="/">
          {text.home}
        </Link>
      </section>
    </main>
  );
}
