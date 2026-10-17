import Link from "next/link";
import { Home } from "lucide-react";

const text = {
  title: "Kh\u00f4ng t\u00ecm th\u1ea5y trang",
  body: "\u0110\u01b0\u1eddng d\u1eabn n\u00e0y kh\u00f4ng t\u1ed3n t\u1ea1i ho\u1eb7c \u0111\u00e3 \u0111\u01b0\u1ee3c \u0111\u1ed5i.",
  home: "V\u1ec1 H\u00f4m nay"
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
