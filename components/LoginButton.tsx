"use client";

import { useEffect, useRef, useState } from "react";
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useAlbumStore } from "@/store/albumStore";
import { useUIStore } from "@/store/uiStore";
import { getFlockifyUsername } from "@/data/uidToUsername";

interface Props { albumIds: string[] }

function firebaseErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code: string }).code;
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found")
      return "Invalid email or password.";
    if (code === "auth/too-many-requests") return "Too many attempts — try again later.";
    if (code === "auth/invalid-email") return "Invalid email address.";
  }
  return "Sign in failed. Try again.";
}

export function LoginButton({ albumIds }: Props) {
  const { user, loading } = useAuth();
  const [open, setOpen]               = useState(false);
  const [mode, setMode]               = useState<"signin" | "reset">("signin");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [error, setError]             = useState("");
  const [resetSent, setResetSent]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [syncing, setSyncing]         = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const loadVotes     = useAlbumStore((s) => s.loadVotes);
  const loadFavorited = useAlbumStore((s) => s.loadFavorited);
  const signInModalOpen  = useUIStore((s) => s.signInModalOpen);
  const closeSignInModal = useUIStore((s) => s.closeSignInModal);

  useEffect(() => {
    if (signInModalOpen && !user) openModal();
    if (signInModalOpen) closeSignInModal();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signInModalOpen]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      setOpen(false);
      setEmail(""); setPassword("");
      // Sync votes + favorites for this user
      setSyncing(true);
      try {
        const uid = cred.user.uid;
        const [votesRes, collectionRes] = await Promise.all([
          fetch("/api/my-votes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: uid, albumIds }),
          }),
          fetch(`/api/collection?userId=${encodeURIComponent(uid)}`),
        ]);
        const votesData = await votesRes.json();
        if (votesData.votes) loadVotes(votesData.votes);
        const collectionData = await collectionRes.json();
        if (Array.isArray(collectionData.saved)) loadFavorited(collectionData.saved);
      } catch { /* silent */ }
      setSyncing(false);
    } catch (err) {
      setError(firebaseErrorMessage(err));
    }
    setSubmitting(false);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err) {
      if (typeof err === "object" && err !== null && "code" in err) {
        const code = (err as { code: string }).code;
        if (code === "auth/user-not-found" || code === "auth/invalid-email")
          setError("No account found with that email.");
        else setError("Couldn't send reset email — try again.");
      } else setError("Couldn't send reset email — try again.");
    }
    setSubmitting(false);
  }

  function openModal() {
    setMode("signin"); setError(""); setResetSent(false);
    setOpen(true); setTimeout(() => emailRef.current?.focus(), 50);
  }

  async function handleSignOut() {
    await signOut(auth);
    setOpen(false);
  }

  if (loading) return <div className="w-6 h-6 rounded-full bg-zinc-800 animate-pulse" />;

  const displayName = (user ? getFlockifyUsername(user.uid) : null) || user?.displayName || user?.email?.split("@")[0] || "";
  const initial = displayName ? displayName[0].toUpperCase() : null;

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-1.5 cursor-pointer group"
        aria-label={user ? `Signed in as ${displayName}` : "Sign in"}
        title={user ? displayName : "Sign in to vote"}
      >
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
          initial
            ? "bg-amber-400 text-black group-hover:bg-amber-300"
            : "bg-zinc-700 text-zinc-400 group-hover:bg-zinc-600"
        }`}>
          {initial ?? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          )}
        </div>
        {syncing && <span className="text-zinc-600 text-[10px]">syncing…</span>}
      </button>

      {/* Sign-in / reset modal */}
      {open && !user && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 w-full max-w-sm mx-4 shadow-2xl">
            {mode === "signin" ? (
              <>
                <h3 className="text-white font-semibold text-base mb-1">Sign in to Flockify</h3>
                <p className="text-zinc-500 text-sm mb-4">Use your original Flockify email and password.</p>
                <form onSubmit={handleSignIn} className="space-y-3">
                  <input
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    autoComplete="email"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="current-password"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
                  />
                  {error && <p className="text-red-400 text-xs">{error}</p>}
                  <button
                    type="button"
                    onClick={() => { setMode("reset"); setError(""); setResetSent(false); }}
                    className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors cursor-pointer"
                  >Forgot password?</button>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 border border-zinc-700 hover:border-zinc-500 rounded text-sm text-zinc-400 cursor-pointer transition-colors">Cancel</button>
                    <button type="submit" disabled={submitting || !email || !password} className="flex-1 py-2 bg-white hover:bg-zinc-200 text-black font-semibold rounded text-sm cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed">{submitting ? "Signing in…" : "Sign in"}</button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h3 className="text-white font-semibold text-base mb-1">Reset password</h3>
                <p className="text-zinc-500 text-sm mb-4">We&apos;ll send a reset link to your email.</p>
                {resetSent ? (
                  <>
                    <p className="text-green-400 text-sm mb-4">Check your inbox — reset email sent to <span className="text-white">{email}</span>.</p>
                    <button onClick={() => { setMode("signin"); setResetSent(false); }} className="w-full py-2 border border-zinc-700 hover:border-zinc-500 rounded text-sm text-zinc-400 cursor-pointer transition-colors">Back to sign in</button>
                  </>
                ) : (
                  <form onSubmit={handleReset} className="space-y-3">
                    <input
                      ref={emailRef}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      autoComplete="email"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
                    />
                    {error && <p className="text-red-400 text-xs">{error}</p>}
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => { setMode("signin"); setError(""); }} className="flex-1 py-2 border border-zinc-700 hover:border-zinc-500 rounded text-sm text-zinc-400 cursor-pointer transition-colors">Back</button>
                      <button type="submit" disabled={submitting || !email} className="flex-1 py-2 bg-white hover:bg-zinc-200 text-black font-semibold rounded text-sm cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed">{submitting ? "Sending…" : "Send reset email"}</button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Profile / sign-out modal */}
      {open && user && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-black font-bold text-base">
                {initial}
              </div>
              <div>
                <p className="text-white font-semibold">{displayName}</p>
                <p className="text-zinc-500 text-xs">{user.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2 border border-zinc-700 hover:border-zinc-500 rounded text-sm text-zinc-400 cursor-pointer transition-colors"
              >Close</button>
              <button
                onClick={handleSignOut}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-sm cursor-pointer transition-colors"
              >Sign out</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
