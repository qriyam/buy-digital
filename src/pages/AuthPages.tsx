import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { live } from "../lib/supabase";

const field = "mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-sm";
function Shell({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {!live && <p className="card mt-4 p-3 text-sm text-mute">Backend not configured: sign-in is disabled until Supabase keys are set.</p>}
      {note && <p className="mt-2 text-sm text-mute">{note}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}
function useForm(run: () => Promise<string | null>, done?: string) {
  const [err, setErr] = useState<string | null>(null), [ok, setOk] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => { e.preventDefault(); if (busy) return; setBusy(true); setErr(null); const r = await run(); setBusy(false); r ? setErr(r) : setOk(done ?? ""); };
  return { err, ok, busy, submit };
}
const Msg = ({ err, ok }: { err: string | null; ok: string | null }) => <>{err && <p role="alert" className="mt-3 text-sm text-brand">{err}</p>}{ok && <p className="mt-3 text-sm text-ok">{ok}</p>}</>;

export function Login() {
  const { signIn, google } = useAuth(); const go = useNavigate();
  const [email, setE] = useState(""), [pw, setP] = useState("");
  const f = useForm(async () => { const r = await signIn(email, pw); if (!r) go("/account"); return r; });
  return (
    <Shell title="Log in">
      <form onSubmit={f.submit}>
        <label className="text-sm font-medium">Email<input type="email" required value={email} onChange={(e) => setE(e.target.value)} className={field} autoComplete="email" /></label>
        <label className="mt-3 block text-sm font-medium">Password<input type="password" required value={pw} onChange={(e) => setP(e.target.value)} className={field} autoComplete="current-password" /></label>
        <Msg err={f.err} ok={null} />
        <button className="btn btn-primary mt-5 w-full" disabled={f.busy || !live}>Log in</button>
      </form>
      <button className="btn btn-ghost mt-3 w-full" disabled={!live} onClick={() => google()}>Continue with Google</button>
      <p className="mt-5 text-sm text-mute"><Link to="/forgot-password" className="text-brand">Forgot password?</Link> · <Link to="/register" className="text-brand">Create account</Link></p>
    </Shell>
  );
}
export function Register() {
  const { signUp } = useAuth();
  const [name, setN] = useState(""), [email, setE] = useState(""), [pw, setP] = useState(""), [pw2, setP2] = useState("");
  const f = useForm(async () => pw !== pw2 ? "Passwords do not match." : pw.length < 8 ? "Use at least 8 characters." : signUp(name.trim(), email, pw), "Check your email to verify your account, then log in.");
  return (
    <Shell title="Create account">
      <form onSubmit={f.submit}>
        <label className="text-sm font-medium">Full name<input required value={name} onChange={(e) => setN(e.target.value)} className={field} autoComplete="name" /></label>
        <label className="mt-3 block text-sm font-medium">Email<input type="email" required value={email} onChange={(e) => setE(e.target.value)} className={field} autoComplete="email" /></label>
        <label className="mt-3 block text-sm font-medium">Password<input type="password" required minLength={8} value={pw} onChange={(e) => setP(e.target.value)} className={field} autoComplete="new-password" /></label>
        <label className="mt-3 block text-sm font-medium">Confirm password<input type="password" required value={pw2} onChange={(e) => setP2(e.target.value)} className={field} autoComplete="new-password" /></label>
        <Msg err={f.err} ok={f.ok} />
        <button className="btn btn-primary mt-5 w-full" disabled={f.busy || !live}>Sign up</button>
      </form>
      <p className="mt-5 text-sm text-mute">Already registered? <Link to="/login" className="text-brand">Log in</Link></p>
    </Shell>
  );
}
export function Forgot() {
  const { reset } = useAuth(); const [email, setE] = useState("");
  const f = useForm(() => reset(email), "If that email has an account, a reset link is on its way.");
  return (
    <Shell title="Forgot password">
      <form onSubmit={f.submit}>
        <label className="text-sm font-medium">Email<input type="email" required value={email} onChange={(e) => setE(e.target.value)} className={field} /></label>
        <Msg err={f.err} ok={f.ok} />
        <button className="btn btn-primary mt-5 w-full" disabled={f.busy || !live}>Send reset link</button>
      </form>
    </Shell>
  );
}
export function ResetPassword() {
  const { setPassword } = useAuth(); const [pw, setP] = useState("");
  const f = useForm(() => pw.length < 8 ? Promise.resolve("Use at least 8 characters.") : setPassword(pw), "Password updated.");
  return (
    <Shell title="Set a new password">
      <form onSubmit={f.submit}>
        <label className="text-sm font-medium">New password<input type="password" required minLength={8} value={pw} onChange={(e) => setP(e.target.value)} className={field} autoComplete="new-password" /></label>
        <Msg err={f.err} ok={f.ok} />
        <button className="btn btn-primary mt-5 w-full" disabled={f.busy || !live}>Update password</button>
      </form>
    </Shell>
  );
}
