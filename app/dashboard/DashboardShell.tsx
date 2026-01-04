// app/dashboard/DashboardShell.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import LogoutButton from "./LogoutButton";

type Props = { userName: string };

type UpdatePhase =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "installing"
  | "rebooting"
  | "done"
  | "none"
  | "error";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function DashboardShell({ userName }: Props) {
  return (
    <div style={styles.page}>
      <div style={styles.bgGlow} aria-hidden="true" />

      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logo}>SH</div>
          <div>
            <div style={styles.brandTitle}>Smart Home</div>
            <div style={styles.brandSub}>Dashboard</div>
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.userPill}>
            <span style={{ opacity: 0.8 }}>Signed in as</span>
            <span style={{ fontWeight: 700 }}>{userName}</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.grid}>
          <Card title="Overview" subtitle="System at a glance">
            <div style={styles.kpis}>
              <Kpi label="Rooms" value="4" />
              <Kpi label="Devices" value="18" />
              <Kpi label="Alerts" value="0" />
            </div>
            <Divider />
            <p style={styles.muted}>
              Hook this up to Home Assistant (or your bridge) and these tiles can
              become live.
            </p>
          </Card>

          <Card title="Rooms" subtitle="Quick controls (placeholder)">
            <div style={styles.roomGrid}>
              <Tile title="Living Room" meta="Lights • TV • Temp" />
              <Tile title="Kitchen" meta="Lights • Motion" />
              <Tile title="Bedroom" meta="Lights • Scene" />
              <Tile title="Garage" meta="Door • Temp" />
            </div>
          </Card>
        </section>

        {/* Cisco Switch Section */}
        <section style={{ marginTop: 18 }}>
          <CiscoSwitchCard />
        </section>
      </main>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <div style={styles.cardTitle}>{title}</div>
          {subtitle && <div style={styles.cardSub}>{subtitle}</div>}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.kpi}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={styles.kpiValue}>{value}</div>
    </div>
  );
}

function Tile({ title, meta }: { title: string; meta: string }) {
  return (
    <div style={styles.tile}>
      <div style={{ fontWeight: 800 }}>{title}</div>
      <div style={styles.tileMeta}>{meta}</div>
      <button style={styles.tileBtn} disabled>
        Coming soon
      </button>
    </div>
  );
}

function Divider() {
  return <div style={styles.divider} />;
}

/** =========================
 *  Cisco Switch Card (persisted)
 *  ========================= */
function CiscoSwitchCard() {
  // Placeholder “device”
  const [model] = useState("Cisco Catalyst (placeholder)");
  const [serial] = useState("FOCXXXX0ABC (placeholder)");

  const [currentVersion, setCurrentVersion] = useState("16.12.5");
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  const [installedAtISO, setInstalledAtISO] = useState<string | null>(null);

  const [phase, setPhase] = useState<UpdatePhase>("idle");
  const [progress, setProgress] = useState(0);
  const [detail, setDetail] = useState("Ready.");

  const busy =
    phase === "checking" ||
    phase === "downloading" ||
    phase === "installing" ||
    phase === "rebooting";

  // Load persisted state (KV) on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/switch-state", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();

        const state = data?.state as
          | { installedVersion: string; installedAtISO: string }
          | null;

        if (state?.installedVersion) {
          setCurrentVersion(state.installedVersion);
          setInstalledAtISO(state.installedAtISO);
          setPhase("done");
          setDetail(`Previously updated to ${state.installedVersion}.`);
          setProgress(100);
        }
      } catch {
        // If KV isn’t configured yet, ignore.
      }
    })();
  }, []);

  const status = useMemo(() => {
    switch (phase) {
      case "idle":
        return { label: "Idle", tone: "neutral" as const };
      case "checking":
        return { label: "Checking…", tone: "info" as const };
      case "available":
        return { label: "Update available", tone: "warn" as const };
      case "downloading":
        return { label: "Downloading…", tone: "info" as const };
      case "installing":
        return { label: "Installing…", tone: "info" as const };
      case "rebooting":
        return { label: "Rebooting…", tone: "info" as const };
      case "done":
        return { label: "Up to date", tone: "ok" as const };
      case "none":
        return { label: "No update", tone: "ok" as const };
      case "error":
        return { label: "Error", tone: "bad" as const };
      default:
        return { label: "Idle", tone: "neutral" as const };
    }
  }, [phase]);

  const alreadyOnLatest = !!latestVersion && currentVersion === latestVersion;

  async function checkForUpdates() {
    try {
      setPhase("checking");
      setProgress(0);
      setDetail("Contacting update service…");
      await sleep(700);

      // Placeholder logic: pretend a newer version exists
      const pretendLatest = "17.9.4";
      setLatestVersion(pretendLatest);

      if (pretendLatest !== currentVersion) {
        setPhase("available");
        setDetail(`Update found: ${pretendLatest}`);
      } else {
        setPhase("none");
        setDetail("You’re already on the latest version.");
      }
    } catch {
      setPhase("error");
      setDetail("Update check failed. Try again.");
    }
  }

  async function runUpdate() {
    if (!latestVersion) return;

    try {
      // Download
      setPhase("downloading");
      setDetail(`Downloading ${latestVersion}…`);
      setProgress(0);

      for (let i = 0; i <= 55; i += 5) {
        setProgress(i);
        await sleep(160);
      }

      // Install
      setPhase("installing");
      setDetail("Installing update package…");
      for (let i = 55; i <= 90; i += 5) {
        setProgress(i);
        await sleep(220);
      }

      // Reboot
      setPhase("rebooting");
      setDetail("Rebooting switch (simulated)…");
      for (let i = 90; i <= 100; i += 2) {
        setProgress(clamp(i, 0, 100));
        await sleep(180);
      }

      // Persist + Done
      const now = new Date().toISOString();
      setCurrentVersion(latestVersion);
      setInstalledAtISO(now);
      setPhase("done");
      setDetail(`Updated successfully to ${latestVersion}.`);

      // Save to KV (Vercel KV)
      await fetch("/api/switch-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installedVersion: latestVersion,
          installedAtISO: now,
        }),
      });

      setProgress(100);
    } catch {
      setPhase("error");
      setDetail("Update failed mid-process. Try again.");
      setProgress(0);
    }
  }

  async function reset() {
    setPhase("idle");
    setProgress(0);
    setDetail("Ready.");
    setLatestVersion(null);
    // Note: reset does NOT clear KV intentionally.
    // If you want an admin "Clear lock" button, tell me and I’ll add a DELETE endpoint.
  }

  return (
    <div style={styles.card}>
      <div style={styles.cardHeaderRow}>
        <div>
          <div style={styles.cardTitle}>Network</div>
          <div style={styles.cardSub}>Cisco Switch (placeholder)</div>
        </div>

        <StatusPill tone={status.tone}>
          {busy && <Spinner />}
          <span>{status.label}</span>
        </StatusPill>
      </div>

      <Divider />

      <div style={styles.twoCol}>
        <div style={styles.infoBlock}>
          <div style={styles.infoLabel}>Device</div>
          <div style={styles.infoValue}>{model}</div>
        </div>

        <div style={styles.infoBlock}>
          <div style={styles.infoLabel}>Serial</div>
          <div style={styles.infoValue}>{serial}</div>
        </div>

        <div style={styles.infoBlock}>
          <div style={styles.infoLabel}>Current version</div>
          <div style={styles.infoValueMono}>{currentVersion}</div>
        </div>

        <div style={styles.infoBlock}>
          <div style={styles.infoLabel}>Latest version</div>
          <div style={styles.infoValueMono}>
            {latestVersion ? latestVersion : "—"}
          </div>
        </div>

        <div style={styles.infoBlock}>
          <div style={styles.infoLabel}>Last updated</div>
          <div style={styles.infoValueMono}>
            {installedAtISO ? new Date(installedAtISO).toLocaleString() : "—"}
          </div>
        </div>

        <div style={styles.infoBlock}>
          <div style={styles.infoLabel}>Update lock</div>
          <div style={styles.infoValueMono}>
            {installedAtISO ? "Locked after update" : "Not locked"}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={styles.progressWrap}>
          <div style={styles.progressTop}>
            <div style={styles.progressText}>{detail}</div>
            <div style={styles.progressPct}>{progress}%</div>
          </div>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div style={styles.actions}>
        <button
          onClick={checkForUpdates}
          disabled={busy}
          style={{
            ...styles.btn,
            ...styles.btnSecondary,
            opacity: busy ? 0.6 : 1,
          }}
        >
          Check for updates
        </button>

        <button
          onClick={runUpdate}
          disabled={busy || phase !== "available" || alreadyOnLatest || !!installedAtISO}
          style={{
            ...styles.btn,
            ...styles.btnPrimary,
            opacity:
              busy || phase !== "available" || alreadyOnLatest || !!installedAtISO
                ? 0.6
                : 1,
          }}
        >
          {!!installedAtISO
            ? "Update already installed"
            : alreadyOnLatest
            ? "Already updated"
            : "Run update"}
        </button>

        <button
          onClick={reset}
          disabled={busy}
          style={{ ...styles.btn, ...styles.btnGhost, opacity: busy ? 0.6 : 1 }}
        >
          Reset UI
        </button>
      </div>

      <div style={styles.miniNote}>
        This stores update state in Vercel KV. On Vercel you can’t reliably write
        to files at runtime, so KV (or Postgres) is the correct approach.
      </div>
    </div>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: "neutral" | "info" | "ok" | "warn" | "bad";
  children: React.ReactNode;
}) {
  const s =
    tone === "ok"
      ? styles.pillOk
      : tone === "warn"
      ? styles.pillWarn
      : tone === "bad"
      ? styles.pillBad
      : tone === "info"
      ? styles.pillInfo
      : styles.pillNeutral;

  return <div style={{ ...styles.pill, ...s }}>{children}</div>;
}

function Spinner() {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        borderRadius: 999,
        border: "2px solid rgba(255,255,255,0.25)",
        borderTopColor: "rgba(255,255,255,0.9)",
        display: "inline-block",
        animation: "spin 0.9s linear infinite",
      }}
    />
  );
}

/** =========================
 *  Styles (matches login vibe)
 *  ========================= */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 18,
    background:
      "radial-gradient(1200px 800px at 20% 10%, rgba(99, 102, 241, 0.16), transparent 60%)," +
      "radial-gradient(1000px 700px at 90% 20%, rgba(16, 185, 129, 0.14), transparent 55%)," +
      "linear-gradient(180deg, #0b1020 0%, #070a12 100%)",
    color: "#e5e7eb",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
  },
  bgGlow: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    opacity: 0.12,
    background:
      "radial-gradient(600px 400px at 20% 0%, rgba(99,102,241,.7), transparent 60%)," +
      "radial-gradient(700px 450px at 90% 10%, rgba(16,185,129,.65), transparent 55%)",
  },
  header: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: 14,
    borderRadius: 18,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
    backdropFilter: "blur(10px)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  brandTitle: { fontWeight: 900, letterSpacing: 0.2 },
  brandSub: { fontSize: 12, opacity: 0.7, marginTop: 2 },
  headerRight: { display: "flex", alignItems: "center", gap: 10 },
  userPill: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    fontSize: 13,
  },

  main: { maxWidth: 1100, margin: "14px auto 0", paddingBottom: 22 },
  grid: {
    display: "grid",
    gridTemplateColumns: "1.15fr 1fr",
    gap: 14,
  },

  card: {
    borderRadius: 18,
    padding: 18,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
    backdropFilter: "blur(10px)",
  },
  cardHeader: { marginBottom: 12 },
  cardHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: 900, letterSpacing: 0.2 },
  cardSub: { marginTop: 4, fontSize: 13, opacity: 0.75 },

  kpis: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
  },
  kpi: {
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  kpiLabel: { fontSize: 12, opacity: 0.75 },
  kpiValue: { fontSize: 22, fontWeight: 900, marginTop: 6 },

  muted: { margin: 0, fontSize: 13, opacity: 0.75, lineHeight: 1.5 },

  roomGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 10,
  },
  tile: {
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
    display: "grid",
    gap: 8,
  },
  tileMeta: { fontSize: 12, opacity: 0.7 },
  tileBtn: {
    borderRadius: 12,
    padding: "10px 10px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(229,231,235,0.8)",
    cursor: "not-allowed",
    fontWeight: 700,
  },

  divider: {
    height: 1,
    background: "rgba(255,255,255,0.10)",
    margin: "12px 0",
  },

  twoCol: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  infoBlock: {
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  infoLabel: { fontSize: 12, opacity: 0.7 },
  infoValue: { marginTop: 6, fontSize: 14, fontWeight: 800 },
  infoValueMono: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: 900,
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },

  progressWrap: {
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  progressTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },
  progressText: { fontSize: 13, opacity: 0.85 },
  progressPct: {
    fontSize: 12,
    opacity: 0.75,
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  progressBar: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 10,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    background:
      "linear-gradient(135deg, rgba(99,102,241,0.95) 0%, rgba(16,185,129,0.9) 100%)",
    transition: "width 180ms ease",
  },

  actions: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 },
  btn: {
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 800,
    cursor: "pointer",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  btnSecondary: {
    background: "rgba(255,255,255,0.06)",
    color: "rgba(229,231,235,0.9)",
  },
  btnPrimary: {
    background:
      "linear-gradient(135deg, rgba(99,102,241,0.95) 0%, rgba(16,185,129,0.9) 100%)",
    color: "#061018",
  },
  btnGhost: {
    background: "transparent",
    color: "rgba(229,231,235,0.85)",
  },

  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
  },
  pillNeutral: { color: "rgba(229,231,235,0.85)" },
  pillInfo: {
    color: "rgba(219, 234, 254, 0.95)",
    background: "rgba(59, 130, 246, 0.14)",
    border: "1px solid rgba(59, 130, 246, 0.25)",
  },
  pillOk: {
    color: "rgba(209, 250, 229, 0.95)",
    background: "rgba(16, 185, 129, 0.14)",
    border: "1px solid rgba(16, 185, 129, 0.25)",
  },
  pillWarn: {
    color: "rgba(254, 243, 199, 0.95)",
    background: "rgba(245, 158, 11, 0.14)",
    border: "1px solid rgba(245, 158, 11, 0.25)",
  },
  pillBad: {
    color: "rgba(254, 226, 226, 0.95)",
    background: "rgba(220, 38, 38, 0.14)",
    border: "1px solid rgba(220, 38, 38, 0.25)",
  },

  miniNote: { marginTop: 10, fontSize: 12, opacity: 0.7, lineHeight: 1.5 },
};
