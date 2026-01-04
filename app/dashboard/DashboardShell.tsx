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

function isSmallScreen() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 900px)").matches;
}

export default function DashboardShell({ userName }: Props) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.bg} aria-hidden="true" />

      <header
        style={{
          ...styles.header,
          ...(compact ? styles.headerCompact : null),
        }}
      >
        <div style={styles.brand}>
          <div style={styles.brandMark}>
            <div style={styles.brandDot} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={styles.brandTitle}>Network Control</div>
            <div style={styles.brandSub}>Switch Management</div>
          </div>
        </div>

        <div style={{ ...styles.headerRight, ...(compact ? styles.headerRightCompact : null) }}>
          <div style={styles.userChip}>
            <span style={{ opacity: 0.65 }}>User</span>
            <span style={{ fontWeight: 800, whiteSpace: "nowrap" }}>{userName}</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main style={styles.main}>
        <CiscoSwitchHero compact={compact} />
      </main>
    </div>
  );
}

/** =========================
 *  Switch-only dashboard
 *  ========================= */
function CiscoSwitchHero({ compact }: { compact: boolean }) {
  // Device identity (set these to real values later)
  const [friendlyName] = useState("Core Switch");
  const [model] = useState("Cisco Catalyst");
  const [mgmtIp] = useState("192.168.1.2");
  const [serial] = useState("FOCXXXX0ABC");

  // Versioning
  const [currentVersion, setCurrentVersion] = useState("16.12.5");
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [installedAtISO, setInstalledAtISO] = useState<string | null>(null);

  // Update UX state
  const [phase, setPhase] = useState<UpdatePhase>("idle");
  const [progress, setProgress] = useState(0);
  const [detail, setDetail] = useState("Ready.");

  const busy =
    phase === "checking" ||
    phase === "downloading" ||
    phase === "installing" ||
    phase === "rebooting";

  // Load persisted state from KV on mount
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
          setDetail("Up to date.");
          setProgress(100);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const status = useMemo(() => {
    switch (phase) {
      case "idle":
        return { label: "Ready", tone: "neutral" as const };
      case "checking":
        return { label: "Checking", tone: "info" as const };
      case "available":
        return { label: "Update Available", tone: "warn" as const };
      case "downloading":
        return { label: "Downloading", tone: "info" as const };
      case "installing":
        return { label: "Installing", tone: "info" as const };
      case "rebooting":
        return { label: "Rebooting", tone: "info" as const };
      case "done":
        return { label: "Up to Date", tone: "ok" as const };
      case "none":
        return { label: "No Update", tone: "ok" as const };
      case "error":
        return { label: "Error", tone: "bad" as const };
      default:
        return { label: "Ready", tone: "neutral" as const };
    }
  }, [phase]);

  const alreadyOnLatest = !!latestVersion && currentVersion === latestVersion;
  const locked = !!installedAtISO;

  async function checkForUpdates() {
    try {
      setPhase("checking");
      setProgress(0);
      setDetail("Querying update service…");
      await sleep(650);

      // Placeholder latest version — replace with real check later
      const pretendLatest = "17.9.4";
      setLatestVersion(pretendLatest);

      if (pretendLatest !== currentVersion) {
        setPhase("available");
        setDetail(`Update available: ${pretendLatest}`);
      } else {
        setPhase("none");
        setDetail("No updates available.");
      }
    } catch {
      setPhase("error");
      setDetail("Update check failed. Try again.");
    }
  }

  async function runUpdate() {
    if (!latestVersion) return;

    try {
      setPhase("downloading");
      setDetail(`Downloading ${latestVersion}…`);
      setProgress(0);

      for (let i = 0; i <= 55; i += 5) {
        setProgress(i);
        await sleep(150);
      }

      setPhase("installing");
      setDetail("Installing update package…");
      for (let i = 55; i <= 90; i += 5) {
        setProgress(i);
        await sleep(210);
      }

      setPhase("rebooting");
      setDetail("Rebooting switch…");
      for (let i = 90; i <= 100; i += 2) {
        setProgress(clamp(i, 0, 100));
        await sleep(170);
      }

      const now = new Date().toISOString();
      setCurrentVersion(latestVersion);
      setInstalledAtISO(now);
      setPhase("done");
      setDetail("Up to date.");
      setProgress(100);

      // Persist to KV
      await fetch("/api/switch-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installedVersion: latestVersion,
          installedAtISO: now,
        }),
      });
    } catch {
      setPhase("error");
      setDetail("Update failed. Try again.");
      setProgress(0);
    }
  }

  function resetUI() {
    setPhase("idle");
    setProgress(0);
    setDetail("Ready.");
    setLatestVersion(null);
  }

  async function resetUpdateLock() {
    try {
      const res = await fetch("/api/switch-state", { method: "DELETE" });
      if (!res.ok) throw new Error("reset failed");

      setInstalledAtISO(null);
      setLatestVersion(null);
      setPhase("idle");
      setProgress(0);
      setDetail("Ready.");
    } catch {
      setPhase("error");
      setDetail("Reset failed. Make sure you are signed in.");
    }
  }

  return (
    <div style={styles.hero}>
      {/* Top block */}
      <div
        style={{
          ...styles.heroTop,
          ...(compact ? styles.heroTopCompact : null),
        }}
      >
        <div style={styles.heroLeft}>
          <div style={styles.heroTitleRow}>
            <div style={styles.deviceIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.9 }}>
                <path
                  d="M4 7.5h16M6.5 10.5h2M6.5 13.5h2M6.5 16.5h2M10.5 10.5h2M10.5 13.5h2M10.5 16.5h2M14.5 10.5h2M14.5 13.5h2M14.5 16.5h2"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <path
                  d="M4.5 6.2c0-1 .8-1.7 1.7-1.7h11.6c1 0 1.7.8 1.7 1.7v11.6c0 1-.8 1.7-1.7 1.7H6.2c-1 0-1.7-.8-1.7-1.7V6.2Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
              </svg>
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={styles.heroTitle}>{friendlyName}</div>
              <div style={styles.heroSubtitle}>
                {model} • Mgmt {mgmtIp}
              </div>
            </div>
          </div>

          <div
            style={{
              ...styles.metaGrid,
              ...(compact ? styles.metaGridCompact : null),
            }}
          >
            <Meta label="Serial" value={serial} mono />
            <Meta label="Current Version" value={currentVersion} mono />
            <Meta label="Latest Version" value={latestVersion ?? "—"} mono />
            <Meta
              label="Last Updated"
              value={installedAtISO ? new Date(installedAtISO).toLocaleString() : "—"}
              mono
            />
          </div>
        </div>

        <div style={{ ...styles.heroRight, ...(compact ? styles.heroRightCompact : null) }}>
          <StatusPill tone={status.tone}>
            {busy && <Spinner />}
            <span>{status.label}</span>
          </StatusPill>

          <div style={{ ...styles.actionStack, ...(compact ? styles.actionStackCompact : null) }}>
            <button
              onClick={checkForUpdates}
              disabled={busy}
              style={{
                ...styles.btn,
                ...styles.btnSecondary,
                ...(compact ? styles.btnCompact : null),
                opacity: busy ? 0.6 : 1,
              }}
            >
              Check for updates
            </button>

            <button
              onClick={runUpdate}
              disabled={busy || phase !== "available" || alreadyOnLatest || locked}
              style={{
                ...styles.btn,
                ...styles.btnPrimary,
                ...(compact ? styles.btnCompact : null),
                opacity: busy || phase !== "available" || alreadyOnLatest || locked ? 0.6 : 1,
              }}
            >
              {locked ? "Update locked" : alreadyOnLatest ? "Already updated" : "Run update"}
            </button>

            {locked && (
              <button
                onClick={resetUpdateLock}
                disabled={busy}
                style={{
                  ...styles.btn,
                  ...styles.btnDanger,
                  ...(compact ? styles.btnCompact : null),
                  opacity: busy ? 0.6 : 1,
                }}
              >
                Reset update lock
              </button>
            )}

            <button
              onClick={resetUI}
              disabled={busy}
              style={{
                ...styles.btn,
                ...styles.btnGhost,
                ...(compact ? styles.btnCompact : null),
                opacity: busy ? 0.6 : 1,
              }}
            >
              Reset UI
            </button>
          </div>
        </div>
      </div>

      {/* Bottom block */}
      <div
        style={{
          ...styles.heroBottom,
          ...(compact ? styles.heroBottomCompact : null),
        }}
      >
        <div style={styles.progressPanel}>
          <div style={styles.progressTop}>
            <div style={styles.progressText}>{detail}</div>
            <div style={styles.progressPct}>{progress}%</div>
          </div>

          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
        </div>

        <div style={styles.sidePanel}>
          <div style={styles.sideTitle}>Update Policy</div>
          <div style={styles.sideText}>
            Updates lock after installation to prevent accidental re-runs. Use “Reset update lock” when you
            need to perform another update.
          </div>

          <div style={styles.policyRow}>
            <div style={styles.policyItem}>
              <div style={styles.policyLabel}>Lock Status</div>
              <div style={styles.policyValue}>{locked ? "Locked" : "Unlocked"}</div>
            </div>
            <div style={styles.policyItem}>
              <div style={styles.policyLabel}>State Store</div>
              <div style={styles.policyValue}>Vercel KV</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div style={styles.metaCard}>
      <div style={styles.metaLabel}>{label}</div>
      <div style={mono ? styles.metaValueMono : styles.metaValue}>{value}</div>
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
 *  Styles
 *  ========================= */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 14,
    background:
      "radial-gradient(1200px 800px at 20% 10%, rgba(99, 102, 241, 0.16), transparent 60%)," +
      "radial-gradient(1000px 700px at 90% 20%, rgba(16, 185, 129, 0.14), transparent 55%)," +
      "linear-gradient(180deg, #0b1020 0%, #070a12 100%)",
    color: "#e5e7eb",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
  },
  bg: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    opacity: 0.14,
    background:
      "radial-gradient(700px 450px at 15% 0%, rgba(99,102,241,.65), transparent 60%)," +
      "radial-gradient(800px 500px at 90% 10%, rgba(16,185,129,.55), transparent 55%)",
  },

  header: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: 12,
    borderRadius: 18,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
    backdropFilter: "blur(10px)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  headerCompact: { padding: 10, borderRadius: 16, flexWrap: "wrap" },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background:
      "linear-gradient(135deg, rgba(99,102,241,0.95) 0%, rgba(16,185,129,0.9) 100%)",
    boxShadow: "0 0 0 6px rgba(255,255,255,0.06)",
  },
  brandTitle: { fontWeight: 900, letterSpacing: 0.2 },
  brandSub: { fontSize: 12, opacity: 0.7, marginTop: 2 },

  headerRight: { display: "flex", alignItems: "center", gap: 10 },
  headerRightCompact: { width: "100%", justifyContent: "space-between" },
  userChip: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    fontSize: 13,
  },

  main: { maxWidth: 1100, margin: "12px auto 0", paddingBottom: 20 },

  hero: {
    borderRadius: 22,
    padding: 14,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 22px 70px rgba(0,0,0,0.45)",
    backdropFilter: "blur(10px)",
  },

  heroTop: {
    display: "grid",
    gridTemplateColumns: "1.5fr 0.8fr",
    gap: 14,
    alignItems: "start",
  },
  heroTopCompact: { gridTemplateColumns: "1fr", gap: 12 },

  heroLeft: {},
  heroRight: { display: "grid", gap: 12, justifyItems: "end" },
  heroRightCompact: { justifyItems: "stretch" },

  heroTitleRow: { display: "flex", gap: 12, alignItems: "center" },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    flex: "0 0 auto",
  },
  heroTitle: { fontSize: 20, fontWeight: 950, letterSpacing: 0.2 },
  heroSubtitle: { marginTop: 4, fontSize: 13, opacity: 0.75, overflowWrap: "anywhere" },

  metaGrid: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },
  metaGridCompact: { gridTemplateColumns: "1fr" },
  metaCard: {
    padding: 12,
    borderRadius: 16,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  metaLabel: { fontSize: 12, opacity: 0.7 },
  metaValue: { marginTop: 6, fontSize: 14, fontWeight: 850 },
  metaValueMono: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: 950,
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    overflowWrap: "anywhere",
  },

  actionStack: { width: "100%", display: "grid", gap: 10 },
  actionStackCompact: { gap: 8 },

  btn: {
    width: 260,
    borderRadius: 14,
    padding: "12px 12px",
    fontWeight: 900,
    cursor: "pointer",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  btnCompact: { width: "100%" },
  btnSecondary: { background: "rgba(255,255,255,0.06)", color: "rgba(229,231,235,0.9)" },
  btnPrimary: {
    background:
      "linear-gradient(135deg, rgba(99,102,241,0.95) 0%, rgba(16,185,129,0.9) 100%)",
    color: "#061018",
  },
  btnGhost: { background: "transparent", color: "rgba(229,231,235,0.85)" },
  btnDanger: {
    background: "rgba(220, 38, 38, 0.16)",
    color: "rgba(254, 226, 226, 0.95)",
    border: "1px solid rgba(220, 38, 38, 0.35)",
  },

  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    justifySelf: "end",
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

  heroBottom: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "1.25fr 0.75fr",
    gap: 14,
    alignItems: "start",
  },
  heroBottomCompact: { gridTemplateColumns: "1fr", gap: 12 },

  progressPanel: {
    padding: 14,
    borderRadius: 18,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  progressTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" },
  progressText: { fontSize: 13, opacity: 0.9, overflowWrap: "anywhere" },
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

  sidePanel: {
    padding: 14,
    borderRadius: 18,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  sideTitle: { fontWeight: 950, letterSpacing: 0.2 },
  sideText: { marginTop: 8, fontSize: 12, opacity: 0.75, lineHeight: 1.5 },

  policyRow: { marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  policyItem: {
    padding: 12,
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  policyLabel: { fontSize: 12, opacity: 0.7 },
  policyValue: { marginTop: 6, fontWeight: 950 },
};
