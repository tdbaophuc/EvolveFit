export default function Loading() {
  return (
    <main className="app-shell">
      <section className="content">
        <div className="stack">
          <section className="card state-card">
            <div className="skeleton-line wide" />
            <div className="skeleton-ring" />
            <div className="skeleton-grid">
              <span />
              <span />
              <span />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
