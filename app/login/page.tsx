"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const callbackUrl = useMemo(
    () => searchParams.get("callbackUrl") || "/dashboard",
    [searchParams]
  );

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (!res || res.error) {
      setErr("Invalid username or password.");
      return;
    }

    router.push(callbackUrl);
  }

  const canSubmit = username.trim().length > 0 && password.length > 0 && !loading;

  return (
    <div style={styles.page}>
      <div style={styles.bgGlow} aria-hidden="true" />

      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>
            <span style={{ fontWeight: 800 }}>SH</span>
          </div>
          <div>
            <h1 style={styles.title}>Smart Home</h1>
            <p style={styles.subtitle}>Sign in to your dashboard</p>
          </div>
        </div>

        <form onSubmit={onSubmit} style={styles.form}>
          <label style={styles.label}>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="e.g. josh"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Password
            <div style={styles.passwordRow}>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                type={showPw ? "text" : "password"}
                style={{ ...styles.input, paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                style={styles.eyeBtn}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {err && (
            <div style={styles.errorBox} role="alert">
              <div style={styles.errorDot} />
              <span>{err}</span>
            </div>
          )}

          <button type="submit" disabled={!canSubmit} style={styles.primaryBtn}>
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div style={styles.footer}>
            <span style={{ opacity: 0.7 }}>Secure access</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span style={{ opacity: 0.7 }}>Vercel + NextAuth</span>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 20,
    background:
      "radial-gradient(1200px 800px at 20% 10%, rgba(99, 102, 241, 0.16), transparent 60%)," +
      "radial-gradient(1000px 700px at 90% 20%, rgba(16, 185, 129, 0.14), transparent 55%)," +
      "linear-gradient(180deg, #0b1020 0%, #070a12 100%)",
    color: "#e5e7eb",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
  },
  bgGlow: {
    position: "absolute",
    width: 700,
    height: 700,
    filter: "blur(60px)",
    opacity: 0.25,
    borderRadius: 999,
    background:
      "conic-gradient(from 180deg, rgba(99,102,241,.9), rgba(16,185,129,.85), rgba(236,72,153,.65), rgba(99,102,241,.9))",
    transform: "translateY(-120px)",
    pointerEvents: "none",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    position: "relative",
    borderRadius: 18,
    padding: 22,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.50)",
    backdropFilter: "blur(10px)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  title: {
    margin: 0,
    fontSize: 22,
    letterSpacing: 0.2,
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: 14,
    opacity: 0.75,
  },
  form: { display: "grid", gap: 14 },
  label: {
    display: "grid",
    gap: 8,
    fontSize: 13,
    color: "rgba(229,231,235,0.9)",
  },
  input: {
    width: "100%",
    borderRadius: 12,
    padding: "12px 12px",
    fontSize: 15,
    color: "#e5e7eb",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    outline: "none",
  },
  passwordRow: { position: "relative" },
  eyeBtn: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(229,231,235,0.9)",
    borderRadius: 10,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 12,
  },
  primaryBtn: {
    marginTop: 6,
    borderRadius: 12,
    padding: "12px 12px",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    border: "1px solid rgba(255,255,255,0.14)",
    background:
      "linear-gradient(135deg, rgba(99,102,241,0.9) 0%, rgba(16,185,129,0.85) 100%)",
    color: "#061018",
    opacity: 1,
    transition: "opacity 120ms ease",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(220, 38, 38, 0.12)",
    border: "1px solid rgba(220, 38, 38, 0.30)",
    color: "rgba(254, 226, 226, 0.95)",
    fontSize: 13,
  },
  errorDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "rgba(220, 38, 38, 0.85)",
  },
  footer: {
    marginTop: 6,
    display: "flex",
    justifyContent: "center",
    gap: 10,
    fontSize: 12,
    color: "rgba(229,231,235,0.75)",
  },
};
