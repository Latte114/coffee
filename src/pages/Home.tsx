// src/pages/Home.tsx
import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  setDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";

/* ============ Types ============ */
type Room = {
  id: string;
  title: string;
  hostUid: string;
  hostName?: string;
  createdAt?: any;
};

/* ============ Theme Hook ============ */
const useTheme = () => {
  const [theme, setTheme] = useState<"light" | "dark">(
    (localStorage.getItem("cva.theme") as any) || "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("cva.theme", theme);
  }, [theme]);

  // inject theme css only once
  useEffect(() => {
    const styleId = "cva-theme-style";
    if (document.getElementById(styleId)) return;
    const css = `
      :root{
        --bg:#0f1116;--panel:#171a21;--text:#eaecef;--muted:#a0a7b3;--border:#2a2f3a;
        --accent:#f6c445;--danger:#ef4444;--tab-active:rgba(255,255,255,.06);
        --shadow:0 10px 24px rgba(0,0,0,.25);
      }
      :root[data-theme="light"]{
        --bg:#fafafa;--panel:#ffffff;--text:#111827;--muted:#6b7280;--border:#e5e7eb;
        --accent:#f4b400;--danger:#e11d48;--tab-active:rgba(0,0,0,.05);
        --shadow:0 10px 20px rgba(0,0,0,.08);
      }

      /* Layout */
      html,body{background:var(--bg);color:var(--text);transition:background .25s,color .25s;}
      .container{max-width:1120px;margin:0 auto;padding:0 22px;}
      .section{
        background:var(--panel);
        border:1px solid var(--border);
        border-radius:18px;
        padding:20px; /* more breathing room */
        box-shadow: var(--shadow);
      }

      /* Inputs / Selects / Buttons */
      .input{
        width:100%;
        border:1px solid var(--border);
        background:rgba(255,255,255,0.02);
        color:var(--text);
        padding:12px 14px;
        border-radius:12px;
        outline:0;
        transition: box-shadow .15s, border-color .15s, background .15s;
      }
      .input:focus{ box-shadow:0 0 0 3px color-mix(in oklab,var(--accent) 30%, transparent); border-color: color-mix(in oklab,var(--accent) 55%, var(--border)); }

      /* ✅ Dark-mode native dropdown fix + consistent list colors */
      select.input{
        appearance: none;
        background-image: linear-gradient(45deg, transparent 50%, var(--muted) 50%),
                          linear-gradient(135deg, var(--muted) 50%, transparent 50%),
                          linear-gradient(to right, transparent, transparent);
        background-position: calc(100% - 18px) calc(50% - 3px),
                             calc(100% - 12px) calc(50% - 3px),
                             100% 0;
        background-size: 6px 6px, 6px 6px, 2.4em 100%;
        background-repeat: no-repeat;
        color-scheme: dark light; /* hint to browsers */
      }
      select.input option{
        background: var(--panel);
        color: var(--text);
      }

      .pill,.pill--solid,.btn{
        border-radius:9999px;
        padding:10px 14px;
        border:1px solid var(--border);
        background:transparent;
        color:var(--text);
        transition: transform .08s ease, background .15s ease, border-color .15s ease, opacity .15s ease;
      }
      .pill:hover,.btn:hover{ background:var(--tab-active); }
      .pill:active,.btn:active{ transform: translateY(1px); }
      .pill--solid{
        background:var(--accent); color:#1a1a1a; border-color:var(--accent); font-weight:700;
      }
      .pill--solid:disabled{ opacity:.5; cursor:not-allowed; }

      .btn-danger{
        background:var(--danger); color:#fff; border-color:var(--danger);
      }

      /* Brand */
      .app-logo{display:block;height:36px}
      .logo-light{display:none;}
      :root[data-theme="light"] .logo-light{display:block;}
      :root[data-theme="light"] .logo-dark{display:none;}

      /* Toast */
      .toast-container{position:fixed;bottom:22px;right:22px;display:flex;flex-direction:column;gap:10px;z-index:9999;}
      .toast{padding:12px 16px;border-radius:12px;font-weight:500;min-width:220px;max-width:340px;
        color:var(--text);border:1px solid var(--border);background:var(--panel);box-shadow:var(--shadow);
        animation:fadeIn .25s ease;}
      .toast.success{border-color:var(--accent);}
      .toast.error{border-color:var(--danger);color:var(--danger);}
      .toast.info{opacity:.9;}
      @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

      /* ------- My Rooms cards ------- */
      .rooms-grid{display:grid;grid-template-columns:repeat(1,minmax(0,1fr));gap:14px;}
      @media (min-width: 720px){ .rooms-grid{grid-template-columns:repeat(2,minmax(0,1fr));} }
      @media (min-width: 1024px){ .rooms-grid{grid-template-columns:repeat(2,minmax(0,1fr));} }

      .room-card{
        display:flex;align-items:center;justify-content:space-between;gap:16px;
        padding:16px 18px;border:1px solid var(--border);border-radius:16px;background: color-mix(in oklab, var(--panel) 90%, #000 10%);
        transition: background .15s, transform .08s, border-color .15s;
      }
      .room-card:hover{ background: color-mix(in oklab,var(--panel) 80%, #000 20%); border-color: color-mix(in oklab,var(--border) 60%, var(--accent) 40%); }
      .room-title{font-weight:700;letter-spacing:.2px}
      .room-id{opacity:.7;font-size:12px;margin-top:4px}

      /* Utility spacing for sections */
      .section + .section{ margin-top: 18px; }
    `;
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = css;
    document.head.appendChild(style);
  }, []);

  return { theme, setTheme };
};

/* ============ Toast Hook ============ */
function useToast() {
  const [toasts, setToasts] = useState<
    { id: number; msg: string; type: "success" | "error" | "info" }[]
  >([]);

  function showToast(msg: string, type: "success" | "error" | "info" = "info") {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }

  const ToastContainer = () => (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );

  return { showToast, ToastContainer };
}

/* ============ Component ============ */
export default function Home() {
  const { theme, setTheme } = useTheme();
  const { showToast, ToastContainer } = useToast();

  const [uid, setUid] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("(Unnamed)");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /* ---------- Auth ---------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u ? u.uid : null);
      setDisplayName(u?.displayName || "(Unnamed)");
      if (u) showToast(`👋 Welcome ${u.displayName || "Host"}`, "success");
    });
    return () => unsub();
  }, []);

  /* ---------- Load rooms ---------- */
  useEffect(() => {
    if (!uid) {
      setRooms([]);
      return;
    }
    setLoadingRooms(true);
    setErr(null);

    const q = query(collection(db, "rooms"), where("hostUid", "==", uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Room[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        list.sort(
          (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
        );
        setRooms(list);
        setLoadingRooms(false);
      },
      (e) => {
        console.error(e);
        setErr(e.message || "Error loading rooms");
        setLoadingRooms(false);
        showToast("⚠️ Firestore connection lost", "error");
      }
    );
    return () => unsub();
  }, [uid]);

  /* ---------- Auth Actions ---------- */
  async function googleLogin() {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      showToast("✅ Signed in successfully", "success");
    } catch (e: any) {
      showToast(e.message || "Sign in failed", "error");
    }
  }

  async function logout() {
    await signOut(auth);
    showToast("👋 Signed out", "info");
  }

  /* ---------- Room Actions ---------- */
  async function createRoom() {
    if (!uid) {
      showToast("Please sign in before creating a room.", "error");
      return;
    }
    const id = Math.floor(100000 + Math.random() * 900000).toString();

    await setDoc(doc(db, "rooms", id), {
      title: newTitle.trim() || `Room ${id}`,
      hostUid: uid,
      hostName: displayName,
      createdAt: serverTimestamp(),
    });

    setNewTitle("");
    showToast("☕ Room created successfully!", "success");
    location.hash = `#/room/${id}`;
  }

  async function removeRoom(id: string) {
    if (!uid) return;
    if (!confirm("Delete this room?")) return;
    await deleteDoc(doc(db, "rooms", id));
    showToast("🗑️ Room deleted", "info");
  }

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-10 border-b border-[var(--border)]"
        style={{ backdropFilter: "blur(6px)" }}
      >
        <div className="container flex items-center justify-between py-4">
          <a href="#/" className="flex items-center gap-3">
            <img src="/logo-dark.png" alt="logo-dark" className="app-logo logo-dark" />
            <img src="/logo-light.png" alt="logo-light" className="app-logo logo-light" />
          </a>
          <button
            className="btn"
            onClick={() => {
              setTheme(theme === "dark" ? "light" : "dark");
              showToast(`Switched to ${theme === "dark" ? "Light" : "Dark"} mode`, "info");
            }}
          >
            {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>
      </header>

      <main className="container py-10">
        {/* Auth */}
        <section className="section mb-8">
          {uid ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                Signed in as: <b>{displayName}</b>
              </div>
              <button className="pill" onClick={logout}>
                Sign out
              </button>
            </div>
          ) : (
            <div className="text-center">
              <button className="pill--solid" onClick={googleLogin}>
                ☕ Sign in with Google (Host)
              </button>
            </div>
          )}
        </section>

        {/* Create Room */}
        <section className="section mb-8">
          <h2 className="text-lg font-semibold mb-4">Create a New Room</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              className="input flex-1"
              placeholder="Room title (optional)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              disabled={!uid}
            />
            <button className="pill--solid" onClick={createRoom} disabled={!uid}>
              + Create Room
            </button>
          </div>
          {!uid && (
            <p className="text-xs" style={{ opacity: 0.7, marginTop: 8 }}>
              * You must sign in with Google to create a room.
            </p>
          )}
        </section>

        {/* My Rooms */}
        <section className="section mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">My Rooms</h2>
            {loadingRooms && <span className="text-sm" style={{ opacity: 0.7 }}>Loading…</span>}
          </div>
          {err && <div style={{ color: "var(--danger)", marginBottom: 8 }}>{err}</div>}
          {rooms.length === 0 ? (
            <div style={{ opacity: 0.7, fontStyle: "italic" }}>No rooms yet.</div>
          ) : (
            <div className="rooms-grid">
              {rooms.map((r) => (
                <div key={r.id} className="room-card">
                  <div>
                    <div className="room-title">{r.title || "(Untitled room)"}</div>
                    <div className="room-id">ID: {r.id}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="pill"
                      onClick={() => (location.hash = `#/room/${r.id}`)}
                      title="Open room"
                    >
                      Open
                    </button>
                    <button
                      className="pill btn-danger"
                      onClick={() => removeRoom(r.id)}
                      title="Delete room"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Join Room */}
        <section className="section">
          <h2 className="text-lg font-semibold mb-4">Join a Room</h2>
          <JoinBox />
        </section>
      </main>

      <ToastContainer />
    </div>
  );
}

/* ============ Join Box ============ */
function JoinBox() {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [role, setRole] = useState<"guest" | "host">("guest");

  function enter() {
    localStorage.setItem("cva.displayName", name.trim() || "Guest");
    localStorage.setItem("cva.role", role);
    if (!roomId.trim()) return;
    location.hash = `#/room/${roomId.trim()}`;
  }

  return (
    <div className="flex flex-col md:flex-row gap-3">
      <input
        className="input flex-1"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="input flex-1"
        placeholder="Room ID (e.g. 123456)"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />
      <select
        className="input w-[140px]"
        value={role}
        onChange={(e) => setRole(e.target.value as any)}
      >
        <option value="guest">Guest</option>
        <option value="host">Host</option>
      </select>
      <button className="pill--solid" onClick={enter}>
        Enter
      </button>
    </div>
  );
}
