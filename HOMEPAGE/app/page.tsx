import DebugAvatar from "@/components/avatar/DebugAvatar";
import RaraApp from "@/components/RaraApp";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { debugAvatar } = await searchParams;
  return (
    <main className="page">
      <header className="topbar">
        <span className="logo">HARAKA ERFI</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, zIndex: 3 }}>
          <a
            href="/dashboard"
            style={{
              fontSize: 12,
              background: "var(--glass)",
              borderRadius: 99,
              padding: "6px 12px",
              color: "inherit",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Dashboard
          </a>
          <span className="badge" style={{ position: "static" }}>CPKB · BPOM · HALAL</span>
        </div>
      </header>
      {debugAvatar === "1" ? (
        <section className="stage">
          <div className="avatar-slot"><DebugAvatar /></div>
        </section>
      ) : (
        <RaraApp />
      )}
    </main>
  );
}
