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
      <div style={styles.bg} aria-hidden="true" />

      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.brandMark}>
            <div style={styles.brandDot} />
          </div>
          <div>
            <div style={styles.brandTitle}>Network Control</div>
            <div style={styles.brandSub}>Cisco Switch Dashboard</div>
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.userChip}>
            <span style={{ opacity: 0.65 }}>User</span>
            <span style={{ fontWeight: 800 }}>{userName}</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main style={styles.main}>
        <CiscoSwitchHero />
      </main>
    </div>
  );
}

/** =========================
 *  Switch-only dashboard
 *  ========================= */
function CiscoSwitchHero() {
  // Placeholder device identity
  const [friendlyName] = useState("Core Switch");
  const [model] = useState("Cisco Catalyst (placeholder)");
  const [mgmtIp] = useState("192.168.1.2 (placeholder)");
  const [serial] = useState("FOCXXXX0ABC (placeholder)");

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

  // Load persisted KV state
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
          setDetail(`Installed ${state.installedVersion} previously.`);
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
  const locked = !!installedAtISO; // once updated, lock updates

  async function checkForUpdates() {
    try {
      setPhase("checking");
      setProgress(0);
      setDetail("Contacting update service…");
      await sleep(700);

      // Placeholder latest version
      const pretendLatest = "17.9.4";
      setLatestVersion(pretendLatest);

      if (pretendLatest !== currentVersion) {
        setPhase("available");
        setDetail(`Update found: ${pretendLatest}`);
      } else {
        setPhase("none");
        setDetail("Already on the latest version.");
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
        await sleep(160);
      }

      setPhase("installing");
      setDetail("Installing update package…");
      for (let i = 55; i <= 90; i += 5) {
        setProgress(i);
        await sleep(220);
      }

      setPhase("rebooting");
      setDetail("Rebooting switch (simulated)…");
      for (let i = 90; i <= 100; i += 2) {
        setProgress(clamp(i, 0, 100));
        await sleep(180);
      }

      const now = new Date().toISOString();
      setCurrentVersion(latestVersion);
      setInstalledAtISO(now);
      setPhase("done");
      setDetail(`Updated successfully to ${latestVersion}.`);
      setProgress(100);

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
      setDetail("Update failed mid-process. Try again.");
      setProgress(0);
    }
  }

  function resetUI() {
    setPhase("idle");
    setProgress(0);
    setDetail("Ready.");
    setLatestVersion(null);
  }

  return (
    <div style={styles.hero}>
      <div style={styles.heroTop}>
        <div style={styles.heroLeft}>
          <div style={styles.heroTitleRow}>
            <div style={styles.deviceIcon}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                style={{ opacity: 0.9 }}
              >
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

            <div>
              <div style={styles.heroTitle}>{friendlyName}</div>
              <div style={styles.heroSubtitle}>
                {model} • Management {mgmtIp}
              </div>
            </div>
          </div>

          <div style={styles.metaGrid}>
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

        <div style={styles.heroRight}>
          <StatusPill tone={status.tone}>
            {busy && <Spinner />}
            <span>{status.label}</span>
          </StatusPill>

          <div style={styles.actionStack}>
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
              disabled={busy || phase !== "available" || alreadyOnLatest || locked}
              style={{
                ...styles.btn,
                ...styles.btnPrimary,
                opacity:
                  busy || phase !== "available" || alreadyOnLatest || locked
                    ? 0.6
                    : 1,
              }}
            >
              {locked
                ? "Update locked"
                : alreadyOnLatest
                ? "Already updated"
                : "Run update"}
            </button>

            <button
              onClick={resetUI}
              disabled={busy}
              style={{
                ...styles.btn,
                ...styles.btnGhost,
                opacity: busy ? 0.6 : 1,
              }}
            >
              Reset UI
            </button>
          </div>
        </div>
      </div>

      <div style={styles.heroBottom}>
        <div style={styles.progressPanel}>
          <div style={styles.progressTop}>
            <div style={styles.progressText}>{detail}</div>
            <div style={styles.progressPct}>{progress}%</div>
          </div>

          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>

          <div style={styles.hintRow}>
            <HintDot tone={status.tone} />
            <span style={{ opacity: 0.75 }}>
              This is a UI simulation. Next step: connect to real switch data
              through an API/bridge.
            </span>
          </div>
        </div>

        <div style={styles.sidePanel}>
          <div style={styles.sideTitle}>Update Policy</div>
          <div style={styles.sideText}>
            Once an update is installed, the dashboard locks further updates to
            prevent accidental re-runs. Use an admin reset endpoint later if you
            want to unlock.
          </div>

          <div style={styles.policyRow}>
            <div style={styles.policyItem}>
              <div style={styles.policyLabel}>Lock Status</div>
              <div style={styles.policyValue}>{locked ? "Locked" : "Unlocked"}</div>
            </div>
            <div style={styles.policyItem}>
              <div style={styles.policyLabel}>Source</div>
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

function HintDot({ tone }: { tone: "neutral" | "info" | "ok" | "warn" | "bad" }) {
  const bg =
    tone === "ok"
      ? "rgba(16,185,129,0.85)"
      : tone === "warn"
      ? "rgba(245,158,11,0.9)"
      : tone === "bad"
      ? "rgba(220,38,38,0.9)"
      : tone === "info"
      ? "rgba(59,130,246,0.9)"
      : "rgba(255,255,255,0.55)";

  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: 999,
        background: bg,
        boxShadow: "0 0 0 4px rgba(255,255,255,0.06)",
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
    padding: 18,
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
  brandMark: {
    width: 40,
    height: 40,
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

  main: { maxWidth: 1100, margin: "14px auto 0", paddingBottom: 22 },

  hero: {
    borderRadius: 22,
    padding: 18,
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

  heroLeft: {},
  heroRight: {
    display: "grid",
    gap: 12,
    justifyItems: "end",
  },

  heroTitleRow: { display: "flex", gap: 12, alignItems: "center" },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  heroTitle: { fontSize: 22, fontWeight: 950, letterSpacing: 0.2 },
  heroSubtitle: { marginTop: 4, fontSize: 13, opacity: 0.75 },

  metaGrid: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },
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
  },

  actionStack: {
    width: "100%",
    display: "grid",
    gap: 10,
  },

  btn: {
    width: 260,
    borderRadius: 14,
    padding: "12px 12px",
    fontWeight: 900,
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
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
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

  heroBottom: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "1.25fr 0.75fr",
    gap: 14,
    alignItems: "start",
  },

  progressPanel: {
    padding: 14,
    borderRadius: 18,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  progressTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },
  progressText: { fontSize: 13, opacity: 0.9 },
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

  hintRow: {
    marginTop: 12,
    display: "flex",
    gap: 10,
    alignItems: "center",
    fontSize: 12,
  },

  sidePanel: {
    padding: 14,
    borderRadius: 18,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  sideTitle: { fontWeight: 950, letterSpacing: 0.2 },
  sideText: { marginTop: 8, fontSize: 12, opacity: 0.75, lineHeight: 1.5 },

  policyRow: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  policyItem: {
    padding: 12,
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  policyLabel: { fontSize: 12, opacity: 0.7 },
  policyValue: { marginTop: 6, fontWeight: 950 },

  // small unused but safe
  card: {},
};

