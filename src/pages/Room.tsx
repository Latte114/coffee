// src/pages/Room.tsx
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

/* =========================
   Helpers & Types
========================= */

type Role = "host" | "guest";
const todayISO = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10);

const pruneUndefined = <T,>(obj: T): T =>
  JSON.parse(JSON.stringify(obj, (_k, v) => (v === undefined ? null : v)));

export type Sample = {
  id: string;
  roomId: string;
  code: string;
  roast: "NA" | "Light" | "Medium" | "Medium-Dark" | "Dark";
  sessionDate: string;
  createdByUid: string;
  updatedAt?: any;
};

export type EvalScores = {
  fragrance: number;
  flavor: number;
  aftertaste: number;
  acidity: number;
  body: number;
  sweetness: number;
  balance: number;
  cleanCup: number;
  uniformity: number;
  mouthfeel: number;
};

export type EvalDescriptors = {
  fragranceDry: string[];
  fragranceCrust: string[];
  fragranceBreak: string[];
  flavorNotes: string[];
};

export type EvalAttributes = {
  acidityType: "" | "dry" | "sweet";
  mainTastes?: string[];
  mouthfeelProps?: string[];
};

export type AffectiveScores = {
  fragrance: number | null;
  flavor: number | null;
  aftertaste: number | null;
  acidity: number | null;
  sweetness: number | null;
  mouthfeel: number | null;
  overall: number | null;
};

export type Evaluation = {
  id: string;
  roomId: string;
  sampleId: string;
  evaluatorName: string;
  evaluatorUid?: string | null;

  // Part 1
  scores: EvalScores;
  descriptors: EvalDescriptors;
  attributes: EvalAttributes;

  // Part 2
  affective?: AffectiveScores;

  // Notes
  notesAroma?: string;
  notesFlavor?: string;
  notesGeneral?: string;

  // legacy
  notes?: string;
  defects?: string;
  updatedAt?: any;
};

// defaults
const defaultScores: EvalScores = {
  fragrance: 0,
  flavor: 0,
  aftertaste: 0,
  acidity: 0,
  body: 0,
  sweetness: 0,
  balance: 0,
  cleanCup: 0,
  uniformity: 0,
  mouthfeel: 0,
};
const defaultDescriptors: EvalDescriptors = {
  fragranceDry: [],
  fragranceCrust: [],
  fragranceBreak: [],
  flavorNotes: [],
};
const defaultAttributes: EvalAttributes = {
  acidityType: "",
  mainTastes: [],
  mouthfeelProps: [],
};
const defaultAffective: AffectiveScores = {
  fragrance: null,
  flavor: null,
  aftertaste: null,
  acidity: null,
  sweetness: null,
  mouthfeel: null,
  overall: null,
};

// Radar order + max
const RADAR_ORDER: (keyof EvalScores)[] = [
  "fragrance",
  "flavor",
  "acidity",
  "mouthfeel",
  "aftertaste",
  "sweetness",
];
const MAX_SCORE = 15;

function calcDescriptiveAvg(s: Partial<EvalScores> | undefined): number {
  if (!s) return 0;
  const arr = RADAR_ORDER.map((k) => Number(s[k] ?? 0));
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.round(avg * 100) / 100;
}
function calcDescriptiveTotal100(s: Partial<EvalScores> | undefined): number {
  const avg = calcDescriptiveAvg(s);
  return Math.round((avg / MAX_SCORE) * 100);
}
function calcAffectiveAvg(a?: AffectiveScores | null): number | null {
  if (!a) return null;
  const keys: (keyof AffectiveScores)[] = [
    "fragrance",
    "flavor",
    "aftertaste",
    "acidity",
    "sweetness",
    "mouthfeel",
  ];
  const vals = keys
    .map((k) => a[k])
    .filter((n): n is number => typeof n === "number");
  if (vals.length === 0) return null;
  const avg = vals.reduce((p, c) => p + c, 0) / vals.length;
  return Math.round(avg * 100) / 100;
}

const ROASTS: Sample["roast"][] = [
  "NA",
  "Light",
  "Medium",
  "Medium-Dark",
  "Dark",
];

/* =========================
   Theme + CSS
========================= */

const useTheme = () => {
  const [theme, setTheme] = useState<"light" | "dark">(
    (localStorage.getItem("cva.theme") as any) || "dark"
  );
  useEffect(() => {
    localStorage.setItem("cva.theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  return { theme, setTheme };
};

const injectOnce = (() => {
  let done = false;
  return () => {
    if (done) return;
    done = true;
    const css = `
html,body{background:var(--bg);color:var(--text)}
.container{max-width:1200px;margin:0 auto;padding:0 18px}
.section{background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:16px}
.input{width:100%;border:1px solid var(--border);background:transparent;color:var(--text);padding:10px 12px;border-radius:12px}
.select-easy{height:46px;padding:8px 12px;font-size:16px;line-height:1.4}
.btn,.btn-danger,.pill,.pill--solid,.btn-mini{border-radius:9999px;padding:10px 14px;border:1px solid var(--border);background:transparent;color:var(--text)}
.btn:hover{background:var(--tab-active)} .btn-mini{padding:4px 10px}
.btn-danger{color:#fff;background:var(--danger);border-color:var(--danger)}
.pill{padding:10px 16px} .pill--solid{background:var(--accent);color:#1a1a1a;border-color:color-mix(in oklab,var(--accent) 50%, var(--border));font-weight:700}
.samples-grid{display:grid;gap:12px}
.sample-card{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px;border:1px solid var(--border);border-radius:16px}
.sample-actions{display:flex;gap:8px}
.home-link{opacity:.8}.slash{opacity:.5;margin-left:6px}
.chip{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border);padding:8px 12px;border-radius:9999px;cursor:pointer;user-select:none;transition:background .12s,border-color .12s}
.chip:hover{background:var(--tab-active)} .chip input{pointer-events:none}
.note-plain textarea{background:transparent;border:1px solid var(--border);outline:0;width:100%;color:var(--text);padding:12px 14px;line-height:28px;min-height:84px;border-radius:12px;resize:vertical}
.ninebox{display:grid;grid-auto-flow:column;gap:10px}
.ninebox button{width:36px;height:36px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--text)}
.ninebox button[aria-pressed="true"]{background:var(--text);color:var(--bg);border-color:var(--text)}
.brand-fixed{position:fixed;top:14px;right:14px;opacity:.75}
.app-logo{height:28px}.logo-light{display:none}
:root[data-theme="light"] .logo-dark{display:none}
:root[data-theme="light"] .logo-light{display:block}

/* --- explicit spacing between Part 1 & Part 2 --- */
.sheet-wrap{display:flex;flex-direction:column;gap:24px;}
@media (min-width:1024px){
  .sheet-wrap{flex-direction:row;gap:72px;} /* <— เพิ่มช่องว่างชัดเจน */
}
/* right column width clamp */
.part2-panel{min-width:0;width:100%;max-width:520px;margin-left:auto;}
`;
    const el = document.createElement("style");
    el.innerHTML = css;
    document.head.appendChild(el);
  };
})();

/* =========================
   Small UI Bits
========================= */

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section">
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 14 }}
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium" style={{ opacity: 0.8 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function SelectEasy(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { full?: boolean }
) {
  const { className, full, ...rest } = props;
  return (
    <select
      {...rest}
      className={`input select-easy ${full ? "w-full" : ""} ${className || ""}`}
    />
  );
}

/* =========================
   Page
========================= */

export default function Room({ roomId }: { roomId: string }) {
  injectOnce();
  const { theme, setTheme } = useTheme();

  const displayName = localStorage.getItem("cva.displayName") || "Guest";
  const [role, setRole] = useState<Role>(
    (localStorage.getItem("cva.role") as Role) || "guest"
  );

  // auth
  const [authUid, setAuthUid] = useState<string | null>(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) setAuthUid(u.uid);
        else {
          const res = await signInAnonymously(auth);
          setAuthUid(res.user.uid);
        }
      } catch (e) {
        console.error("auth error", e);
        setAuthUid(null);
        alert("ไม่สามารถเข้าสู่ระบบแบบ Guest ได้ กรุณารีเฟรชหรือลองใหม่");
      }
    });
    return () => unsub();
  }, []);

  // room/host
  const [hostUid, setHostUid] = useState<string | null>(null);
  const [roomExists, setRoomExists] = useState(true);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await getDoc(doc(db, "rooms", roomId));
        if (!alive) return;
        if (!r.exists()) {
          setRoomExists(false);
          setHostUid(null);
          return;
        }
        setHostUid((r.data() as any).hostUid ?? null);
        setRoomExists(true);
      } catch {
        if (alive) setRoomExists(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [roomId]);

  // If signed-in user is the room's host, force role=host locally
  useEffect(() => {
    if (authUid && hostUid && authUid === hostUid) {
      setRole("host");
      localStorage.setItem("cva.role", "host");
    }
  }, [authUid, hostUid]);

  // You are the real host iff your auth UID matches the room's host UID
  const isRealHost = !!authUid && authUid === hostUid;

  // data
  const [samples, setSamples] = useState<Sample[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // tabs + URL sync
  const [tab, setTab] = useState<"samples" | "summary">(() => {
    const url = new URL(window.location.href);
    const t = url.searchParams.get("tab");
    return t === "summary" ? "summary" : "samples";
  });
  function switchTab(next: "samples" | "summary") {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    history.replaceState({}, "", url.toString());
  }

  // open card in Summary
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
  const qy = query(collection(db, "samples"), where("roomId", "==", roomId));
  const unsub = onSnapshot(qy, (snap) => {
    const list: Sample[] = [];
    snap.forEach((d) => list.push(d.data() as Sample));
    list.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));

    setSamples(list);

    // ✅ Only auto-select when nothing is selected (use functional updaters to avoid stale state)
    setActiveId((prev) => prev ?? (list[0]?.id ?? null));
    setOpenId((prev) => prev ?? (list[0]?.id ?? null));
  });
  return () => unsub();
}, [roomId]);


  const active = useMemo(
    () => samples.find((s) => s.id === activeId) || null,
    [samples, activeId]
  );

  // my evaluation
  const myEvalId = active ? `${active.id}__${displayName}` : null;
  const [myEval, setMyEval] = useState<Evaluation | null>(null);
  useEffect(() => {
    if (!myEvalId) return setMyEval(null);
    const ref = doc(db, "evaluations", myEvalId);
    const unsub = onSnapshot(ref, (d) => {
      setMyEval((d.exists() ? (d.data() as Evaluation) : null) ?? null);
    });
    return () => unsub();
  }, [myEvalId]);

  // all evals
  const [allEvals, setAllEvals] = useState<Evaluation[]>([]);
  useEffect(() => {
    const qy = query(
      collection(db, "evaluations"),
      where("roomId", "==", roomId)
    );
    const unsub = onSnapshot(qy, (snap) => {
      const list: Evaluation[] = [];
      snap.forEach((d) => list.push(d.data() as Evaluation));
      setAllEvals(list);
    });
    return () => unsub();
  }, [roomId]);

  /* ---------- host ops ---------- */

  async function createSample() {
    if (!isRealHost) return;
    const s: Sample = {
      id: uid(),
      roomId,
      code: "",
      roast: "NA",
      sessionDate: todayISO(),
      createdByUid: hostUid!,
      updatedAt: serverTimestamp(),
    } as any;
    await setDoc(doc(db, "samples", s.id), s);
    setActiveId(s.id);
  }

  async function cloneSample(sampleId: string) {
    if (!isRealHost) return;
    const src = samples.find((s) => s.id === sampleId);
    if (!src) return;
    const s: Sample = {
      ...src,
      id: uid(),
      updatedAt: serverTimestamp(),
    } as any;
    await setDoc(doc(db, "samples", s.id), s);
    setActiveId(s.id);
  }

  async function removeSample(sampleId: string) {
    if (!isRealHost) return;
    if (!confirm("Delete this sample?")) return;
    await deleteDoc(doc(db, "samples", sampleId));
    if (activeId === sampleId) {
      const rest = samples.filter((x) => x.id !== sampleId);
      setActiveId(rest[0]?.id ?? null);
    }
  }

  async function updateSample(patch: Partial<Sample>) {
    if (!isRealHost || !active) return;
    const next = pruneUndefined({
      ...active,
      ...patch,
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, "samples", active.id), next, { merge: true });
  }

  /* ---------- evaluator save ---------- */

  type EvalPatch = Partial<{
    scores: Partial<EvalScores>;
    descriptors: Partial<EvalDescriptors>;
    attributes: Partial<EvalAttributes>;
    affective: Partial<AffectiveScores>;
    notesAroma: string;
    notesFlavor: string;
    notesGeneral: string;
    notes: string;
    defects: string;
  }>;

  async function saveMyEval(patch: EvalPatch) {
    if (!active) return;
    const writerUid = authUid ?? auth.currentUser?.uid ?? null;
    if (!writerUid) {
      alert("กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล");
      return;
    }
    const myEvalIdLocal = `${active.id}__${displayName}`;
    const base: Evaluation = myEval ?? {
      id: myEvalIdLocal,
      roomId,
      sampleId: active.id,
      evaluatorName: displayName,
      evaluatorUid: writerUid,
      scores: { ...defaultScores },
      descriptors: { ...defaultDescriptors },
      attributes: { ...defaultAttributes },
      affective: { ...defaultAffective },
      notesAroma: "",
      notesFlavor: "",
      notesGeneral: "",
      notes: "",
      defects: "",
    };

    const merged: Evaluation = pruneUndefined({
      ...base,
      evaluatorUid: writerUid,
      scores: { ...base.scores, ...(patch.scores || {}) },
      descriptors: { ...base.descriptors, ...(patch.descriptors || {}) },
      attributes: { ...base.attributes, ...(patch.attributes || {}) },
      affective: {
        ...(base.affective || defaultAffective),
        ...(patch.affective || {}),
      },
      ...(patch.notesAroma !== undefined
        ? { notesAroma: patch.notesAroma }
        : {}),
      ...(patch.notesFlavor !== undefined
        ? { notesFlavor: patch.notesFlavor }
        : {}),
      ...(patch.notesGeneral !== undefined
        ? { notesGeneral: patch.notesGeneral }
        : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      ...(patch.defects !== undefined ? { defects: patch.defects } : {}),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, "evaluations", myEvalIdLocal), merged, {
      merge: true,
    });
  }

  /* ---------- host summary ---------- */

  const bySample: Record<
    string,
    {
      sample: Sample;
      evals: Evaluation[];
      averages: Partial<EvalScores>;
      affectiveAvg: number | null;
    }
  > = useMemo(() => {
    const map: Record<string, { sample: Sample; evals: Evaluation[] }> = {};
    samples.forEach((s) => (map[s.id] = { sample: s, evals: [] }));
    allEvals.forEach((ev) => {
      if (!map[ev.sampleId]) return;
      map[ev.sampleId].evals.push(ev);
    });

    const result: Record<
      string,
      {
        sample: Sample;
        evals: Evaluation[];
        averages: Partial<EvalScores>;
        affectiveAvg: number | null;
      }
    > = {};
    const keys = Object.keys(defaultScores) as (keyof EvalScores)[];
    Object.values(map).forEach(({ sample, evals }) => {
      const acc: Partial<EvalScores> = {};
      keys.forEach((k) => {
        const arr = evals.map((e) => e.scores?.[k] ?? 0);
        const mean =
          arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
        acc[k] = Math.round(mean * 100) / 100;
      });
      const affAvg =
        evals.length === 0
          ? null
          : calcAffectiveAvg(
              evals.map((e) => e.affective).filter(Boolean).slice(-1)[0] ||
                undefined
            );
      result[sample.id] = {
        sample,
        evals,
        averages: acc,
        affectiveAvg: affAvg,
      };
    });
    return result;
  }, [samples, allEvals]);

  /* ---------- render ---------- */

  if (!roomExists) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="section" style={{ maxWidth: 520 }}>
          <div className="text-lg font-semibold mb-1">Room not found</div>
          <p className="text-sm" style={{ opacity: 0.75 }}>
            Room ID <b>{roomId}</b> does not exist.
          </p>
          <div className="mt-4">
            <button className="btn" onClick={() => (location.hash = "#")}>
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const descriptiveAvg = calcDescriptiveAvg(myEval?.scores);
  const descriptiveTotal = calcDescriptiveTotal100(myEval?.scores);
  const affectiveAvg = calcAffectiveAvg(myEval?.affective);

  async function manualSave() {
    await saveMyEval({});
    alert("Saved to Firestore.");
  }

  return (
    <div>
      <header
        className="sticky top-0 z-10"
        style={{ backdropFilter: "blur(6px)" }}
      >
        <div
          className="container"
          style={{ paddingTop: 14, paddingBottom: 14 }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <a href="#/" className="home-link" title="Back to Home">
                Home<span className="slash"> /</span>
              </a>
              <h1 className="font-bold">Room: {roomId}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title="Toggle light/dark"
              >
                {theme === "dark" ? "🌙" : "☀️"}
              </button>
              <span
                className="text-xs px-2 py-1 rounded-full border"
                style={{ opacity: 0.8 }}
              >
                {isRealHost ? "HOST" : role.toUpperCase()}
              </span>
              <span className="text-sm" style={{ opacity: 0.8 }}>
                You: <b>{displayName}</b>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Fixed top-right brand */}
      <a href="#/" className="brand-fixed" title="Home">
        <img src="/logo-dark.png" alt="CVA" className="app-logo logo-dark" />
        <img src="/logo-light.png" alt="CVA" className="app-logo logo-light" />
      </a>

      <main className="container" style={{ paddingTop: 20, paddingBottom: 60 }}>
        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          <button
            type="button"
            className="pill"
            style={
              tab === "samples"
                ? { boxShadow: "0 0 0 9999px var(--tab-active) inset" }
                : {}
            }
            onClick={(e) => {
              e.preventDefault();
              switchTab("samples");
            }}
          >
            Evaluate
          </button>
          <button
            type="button"
            className="pill"
            style={
              tab === "summary"
                ? { boxShadow: "0 0 0 9999px var(--tab-active) inset" }
                : {}
            }
            onClick={(e) => {
              e.preventDefault();
              switchTab("summary");
            }}
          >
            Room Summary
          </button>
        </div>

        {tab === "samples" ? (
          <div className="grid md:grid-cols-12 gap-6">
            {/* Sidebar */}
            <aside className="md:col-span-4 lg:col-span-3">
              <Section
                title="Samples"
                right={
                  <div className="flex items-center gap-3">
                    <span className="text-sm" style={{ opacity: 0.7 }}>
                      {samples.length}
                    </span>
                    {isRealHost && (
                      <button className="pill--solid" onClick={createSample}>
                        + New Sample
                      </button>
                    )}
                  </div>
                }
              >
                <div className="samples-grid">
                  {samples.map((s) => (
                    <div
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveId(s.id)}
                      onKeyDown={(e) =>
                        (e.key === "Enter" || e.key === " ") &&
                        setActiveId(s.id)
                      }
                      className="sample-card"
                      style={{
                        outline:
                          activeId === s.id ? "3px solid var(--ring)" : "none",
                      }}
                    >
                      <div>
                        <div className="font-semibold text-base leading-5">
                          {s.code || "(no code)"}{" "}
                          <span className="text-xs" style={{ opacity: 0.6 }}>
                            • {s.roast}
                          </span>
                        </div>
                        <div className="text-xs" style={{ opacity: 0.6 }}>
                          {s.sessionDate}
                        </div>
                      </div>

                      <div className="sample-actions">
                        {isRealHost ? (
                          <>
                            <button
                              type="button"
                              className="btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                cloneSample(s.id);
                              }}
                            >
                              Clone
                            </button>
                            <button
                              type="button"
                              className="btn-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSample(s.id);
                              }}
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveId(s.id);
                            }}
                          >
                            Fill this sample
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </aside>

            {/* Form */}
            <section className="md:col-span-8 lg:col-span-9">
              {!active ? (
                <div className="section">No sample selected.</div>
              ) : (
                <>
                  <Section title="Sample Information (Host)">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Labeled label="Sample Code">
                        <input
                          className="input"
                          value={active.code}
                          onChange={(e) =>
                            updateSample({ code: e.target.value })
                          }
                          disabled={!isRealHost}
                        />
                      </Labeled>

                      <Labeled label="Roast Level">
                        <SelectEasy
                          full
                          value={active.roast}
                          onChange={(e) =>
                            updateSample({
                              roast: e.target.value as Sample["roast"],
                            })
                          }
                          disabled={!isRealHost}
                        >
                          {ROASTS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </SelectEasy>
                      </Labeled>

                      <Labeled label="Session Date">
                        <input
                          type="date"
                          className="input"
                          value={active.sessionDate}
                          onChange={(e) =>
                            updateSample({ sessionDate: e.target.value })
                          }
                          disabled={!isRealHost}
                        />
                      </Labeled>
                    </div>
                    {!isRealHost && (
                      <p
                        className="text-xs"
                        style={{ opacity: 0.6, marginTop: 8 }}
                      >
                        * Only the Host can edit the fields above.
                      </p>
                    )}
                  </Section>

                  <Section
                    title="SCA Combined Form"
                    right={
                      <span className="text-sm">Evaluator: {displayName}</span>
                    }
                  >
                    <SCASheet
                      scores={myEval?.scores ?? defaultScores}
                      affective={myEval?.affective ?? defaultAffective}
                      descriptors={myEval?.descriptors ?? defaultDescriptors}
                      attributes={myEval?.attributes ?? defaultAttributes}
                      notesAroma={myEval?.notesAroma ?? ""}
                      notesFlavor={myEval?.notesFlavor ?? ""}
                      notesGeneral={myEval?.notesGeneral ?? ""}
                      onChangeScore={(k, v) =>
                        saveMyEval({ scores: { [k]: v } })
                      }
                      onChangeAffective={(k, v) =>
                        saveMyEval({ affective: { [k]: v } })
                      }
                      onToggleDescriptor={(field, value) => {
                        const curr = new Set([
                          ...(myEval?.descriptors?.[field] ?? []),
                        ]);
                        if (curr.has(value)) curr.delete(value);
                        else curr.add(value);
                        saveMyEval({
                          descriptors: { [field]: Array.from(curr) },
                        });
                      }}
                      onChangeAttribute={(field, value) =>
                        saveMyEval({ attributes: { [field]: value } })
                      }
                      onChangeNotesAroma={(t) => saveMyEval({ notesAroma: t })}
                      onChangeNotesFlavor={(t) =>
                        saveMyEval({ notesFlavor: t })
                      }
                      onChangeNotesGeneral={(t) =>
                        saveMyEval({ notesGeneral: t })
                      }
                    />
                  </Section>

                  {/* ===== Summary block under SCASheet ===== */}
                  <div className="mt-4 grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-8">
                      <RadarPersonalCard
                        title="My Sensory Snapshot"
                        scores={myEval?.scores}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <div className="section">
                        <div
                          className="text-sm font-semibold mb-2"
                          style={{ color: "var(--accent)" }}
                        >
                          Summary (Auto)
                        </div>
                        <div className="text-sm grid grid-cols-2 gap-y-2 mb-3">
                          <div>Descriptive Avg</div>
                          <div className="text-right">
                            {descriptiveAvg.toFixed(2)} / {MAX_SCORE}
                          </div>
                          <div>Total</div>
                          <div className="text-right">
                            {descriptiveTotal} / 100
                          </div>
                          <div>Affective Avg</div>
                          <div className="text-right">
                            {affectiveAvg ? affectiveAvg.toFixed(2) : "-"} / 9
                          </div>
                        </div>
                        <button
                          className="pill--solid w-full"
                          onClick={manualSave}
                        >
                          💾 Save to Firestore
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        ) : !isRealHost ? (
          <Section title="Summary">
            <div style={{ opacity: 0.8 }}>
              Only the Host of this room can view the summary — please sign in
              as the Host who created the room.
            </div>
          </Section>
        ) : (
          <Section title="Per-sample Summary (averages across all evaluators)">
            <div className="grid gap-4">
              {samples.length === 0 && (
                <div style={{ opacity: 0.6 }}>No samples yet.</div>
              )}

              {samples.map((s) => {
                const pack = bySample[s.id];
                const scoresFromAverage = RADAR_ORDER.reduce((acc, k) => {
                  (acc as any)[k] = pack?.averages?.[k] ?? 0;
                  return acc;
                }, {} as Partial<EvalScores>);

                return (
                  <div
                    className="section"
                    key={s.id}
                    style={{ marginBottom: 0 }}
                  >
                    <div
                      role="button"
                      className="flex items-center justify-between"
                      onClick={() => setOpenId(openId === s.id ? null : s.id)}
                      style={{ marginBottom: 10 }}
                    >
                      <div className="font-semibold">
                        {s.code || "(no code)"} • {s.roast} • {s.sessionDate}
                      </div>
                      <div className="text-sm" style={{ opacity: 0.7 }}>
                        Evaluations: {pack?.evals.length ?? 0}
                      </div>
                    </div>

                    {openId === s.id && (
                      <RadarSummaryCard
                        title="Room Summary (Average of all evaluators)"
                        scores={scoresFromAverage}
                        affectiveAvg={pack?.affectiveAvg ?? null}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}
      </main>
    </div>
  );
}

/* =========================
   Radar – Host Summary Card
========================= */
function RadarSummaryCard({
  title,
  scores,
  affectiveAvg,
}: {
  title: string;
  scores: Partial<EvalScores> | undefined;
  affectiveAvg: number | null;
}) {
  const data = RADAR_ORDER.map((k) => ({
    metric:
      k === "fragrance" ? "Fr/Aroma" : k.charAt(0).toUpperCase() + k.slice(1),
    value: Number(scores?.[k] ?? 0),
  }));

  const total = calcDescriptiveTotal100(scores);

  return (
    <div className="section" style={{ marginBottom: 0 }}>
      <div className="flex items-center justify-between">
        <div
          className="text-base font-semibold"
          style={{ color: "var(--accent)" }}
        >
          {title}
        </div>
        <div className="text-sm">
          <span className="mr-1">Total</span>
          <span className="text-xl font-bold">{total}</span>
          <span className="ml-1" style={{ opacity: 0.6 }}>
            / 100
          </span>
        </div>
      </div>

      <div className="mt-3 grid md:grid-cols-2 gap-4">
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              data={data}
              outerRadius="72%"
              margin={{ top: 18, right: 28, bottom: 18, left: 28 }}
            >
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis domain={[0, MAX_SCORE]} tickCount={4} />
              <Radar
                name="Score"
                dataKey="value"
                stroke="var(--accent)"
                fill="var(--accent)"
                fillOpacity={0.28}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Metric</th>
                <th className="text-right">Avg (0–15)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.metric}>
                  <td>{row.metric}</td>
                  <td className="text-right">{Math.round(row.value)}</td>
                </tr>
              ))}
              <tr>
                <td className="font-semibold">Overall (/ 100)</td>
                <td className="text-right font-semibold">{total}</td>
              </tr>
              <tr>
                <td className="font-semibold">Affective Avg (/ 9)</td>
                <td className="text-right font-semibold">
                  {affectiveAvg ?? "-"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =========================
   ScoreInput (0–15)
========================= */
const ScoreInput = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) => {
  const clampMax = (n: number) => Math.max(0, Math.min(MAX_SCORE, n));
  const toInt = (n: number) => Math.round(n);
  const [draft, setDraft] = useState<string>(
    Number.isFinite(value) ? String(Math.round(value)) : "0"
  );

  useEffect(() => {
    const asNum = Number.parseInt(draft, 10);
    if (!Number.isFinite(asNum) || asNum !== Math.round(value)) {
      setDraft(Number.isFinite(value) ? String(Math.round(value)) : "0");
    }
  }, [value]);

  const apply = (n: number) => {
    const c = clampMax(toInt(n));
    onChange(c);
    setDraft(String(c));
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="btn-mini"
        onClick={() => apply((Number.parseInt(draft, 10) || 0) - 1)}
        aria-label="decrease"
      >
        –
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_SCORE}
        step={1}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = Number.parseInt(e.target.value, 10);
          if (Number.isFinite(n)) onChange(clampMax(toInt(n)));
        }}
        onBlur={(e) => {
          const n = Number.parseInt(e.target.value, 10);
          apply(Number.isFinite(n) ? n : 0);
        }}
        className="input w-28 text-center"
        aria-label={`score (0-${MAX_SCORE}, integer)`}
      />
      <button
        type="button"
        className="btn-mini"
        onClick={() => apply((Number.parseInt(draft, 10) || 0) + 1)}
        aria-label="increase"
      >
        +
      </button>
    </div>
  );
};

/* =========================
   NineBox (1–9)
========================= */
function NineBox({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="ninebox" role="group" aria-label="affective 1-9">
      {Array.from({ length: 9 }).map((_, i) => {
        const n = i + 1;
        const pressed = value === n;
        return (
          <button
            key={n}
            type="button"
            aria-pressed={pressed}
            aria-label={`select ${n}`}
            onClick={() => onChange(pressed ? null : n)}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

/* =========================
   Limited Chips
========================= */
function LimitedChips({
  title,
  options,
  selected,
  limit,
  onChange,
}: {
  title: string;
  options: string[];
  selected: string[];
  limit: number;
  onChange: (next: string[]) => void;
}) {
  const set = new Set(selected);
  const toggle = (opt: string) => {
    const next = new Set(set);
    if (next.has(opt)) next.delete(opt);
    else {
      if (next.size >= limit) return;
      next.add(opt);
    }
    onChange(Array.from(next));
  };

  return (
    <div className="section" style={{ marginBottom: 0 }}>
      {title ? <div className="text-sm font-medium mb-3">{title}</div> : null}
      <div className="flex flex-wrap gap-3">
        {options.map((opt) => (
          <label
            key={opt}
            className="chip"
            style={{
              background: set.has(opt) ? "rgba(255,211,61,.15)" : undefined,
              borderColor: set.has(opt) ? "#efc72f" : undefined,
            }}
          >
            <input
              type="checkbox"
              checked={set.has(opt)}
              onChange={() => toggle(opt)}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
      <div className="text-xs mt-2" style={{ opacity: 0.6 }}>
        {set.size}/{limit} selected
      </div>
    </div>
  );
}

/* =========================
   Note (lined)
========================= */
function NotePlain({
  label,
  value,
  onChange,
  minRows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  minRows?: number;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    const h = setTimeout(() => onChange(local), 400);
    return () => clearTimeout(h);
  }, [local, onChange]);

  return (
    <div>
      <div className="font-medium mb-2" style={{ color: "var(--accent)" }}>
        {label}
      </div>
      <div className="note-plain">
        <textarea
          rows={minRows}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder="พิมพ์โน้ตที่นี่..."
        />
      </div>
    </div>
  );
}

/* =========================
   Radar – Personal
========================= */
function RadarPersonalCard({
  title,
  scores,
}: {
  title: string;
  scores?: Partial<EvalScores>;
}) {
  const data = RADAR_ORDER.map((k) => ({
    metric:
      k === "fragrance" ? "Fr/Aroma" : k.charAt(0).toUpperCase() + k.slice(1),
    value: Number(scores?.[k] ?? 0),
  }));

  return (
    <div className="section">
      <div className="font-semibold mb-3" style={{ color: "var(--accent)" }}>
        {title}
      </div>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            data={data}
            outerRadius="72%"
            margin={{ top: 18, right: 28, bottom: 18, left: 28 }}
          >
            <PolarGrid />
            <PolarAngleAxis dataKey="metric" />
            <PolarRadiusAxis domain={[0, MAX_SCORE]} tickCount={4} />
            <Radar
              name="Score"
              dataKey="value"
              stroke="var(--accent)"
              fill="var(--accent)"
              fillOpacity={0.25}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* =========================
   Impression of Quality (Legend)
========================= */
function ImpressionLegend() {
  const items = [
    "Extremely Low",
    "Very Low",
    "Moderately Low",
    "Slightly Low",
    "Neither High nor Low",
    "Slightly High",
    "Moderately High",
    "Very High",
    "Extremely High",
  ];
  return (
    <div className="section" style={{ marginBottom: 16 }}>
      <div
        className="text-xs font-semibold uppercase tracking-wide mb-3"
        style={{ opacity: 0.7 }}
      >
        Impression of Quality
      </div>
      <div className="quality-legend">
        {items.map((t, i) => (
          <div key={t} className="flex items-center gap-2">
            <span
              className="inline-grid place-items-center"
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                border: "1px solid var(--border)",
                fontSize: 12,
                lineHeight: 1,
              }}
            >
              {i + 1}
            </span>
            <span>{t.toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================
   SCASheet – Part1 left / Part2 right
========================= */
function SCASheet({
  scores,
  affective,
  descriptors,
  attributes,
  notesAroma,
  notesFlavor,
  notesGeneral,
  onChangeScore,
  onChangeAffective,
  onToggleDescriptor,
  onChangeAttribute,
  onChangeNotesAroma,
  onChangeNotesFlavor,
  onChangeNotesGeneral,
}: {
  scores: EvalScores;
  affective: AffectiveScores;
  descriptors: EvalDescriptors;
  attributes: EvalAttributes;
  notesAroma: string;
  notesFlavor: string;
  notesGeneral: string;
  onChangeScore: (key: keyof EvalScores, val: number) => void;
  onChangeAffective: (key: keyof AffectiveScores, val: number | null) => void;
  onToggleDescriptor: (field: keyof EvalDescriptors, value: string) => void;
  onChangeAttribute: <K extends keyof EvalAttributes>(
    field: K,
    value: EvalAttributes[K]
  ) => void;
  onChangeNotesAroma: (t: string) => void;
  onChangeNotesFlavor: (t: string) => void;
  onChangeNotesGeneral: (t: string) => void;
}): JSX.Element {
  const BANK: Record<string, string[]> = {
    Floral: ["Jasmine", "Rose", "Hibiscus", "Tea-like"],
    Fruity: [
      "Berry",
      "Citrus",
      "Stone fruit",
      "Tropical",
      "Apple",
      "Grape",
      "Banana",
    ],
    Sweet: ["Honey", "Caramel", "Brown sugar", "Molasses", "Vanilla"],
    Nuts: ["Almond", "Hazelnut", "Peanut", "Walnut"],
    Spice: ["Cinnamon", "Clove", "Cardamom", "Pepper"],
    Cocoa: ["Cocoa", "Dark chocolate", "Milk chocolate"],
    Other: ["Fermented", "Winey", "Boozy", "Herbal"],
  };

  const MAIN_TASTES = ["Salty", "Sour", "Sweet", "Bitter", "Umami"];
  const MOUTHFEEL_LIST = [
    "Rough",
    "Oily",
    "Smooth",
    "Mouth-drying",
    "Metallic",
  ];

  const Chip = ({
    checked,
    onToggle,
    label,
  }: {
    checked: boolean;
    onToggle: () => void;
    label: string;
  }) => (
    <label
      className="chip"
      style={{
        background: checked ? "rgba(255,211,61,.15)" : undefined,
        borderColor: checked ? "#efc72f" : undefined,
      }}
    >
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <span>{label}</span>
    </label>
  );

  const BoxList = ({
    field,
    maxSelect,
  }: {
    field: keyof EvalDescriptors;
    maxSelect: number;
  }) => {
    const selected = new Set(descriptors?.[field] ?? []);
    const toggle = (label: string) => {
      const next = new Set(selected);
      if (next.has(label)) next.delete(label);
      else {
        if (next.size >= maxSelect) return;
        next.add(label);
      }
      onToggleDescriptor(field, label);
    };

    return (
      <div className="mt-4 space-y-4">
        {Object.entries(BANK).map(([group, items]) => (
          <div key={group} className="mb-2">
            <div
              className="text-xs uppercase tracking-wide mb-3"
              style={{ color: "var(--accent)" }}
            >
              {group}
            </div>
            <div className="flex flex-wrap gap-3">
              {items.map((label) => (
                <Chip
                  key={label}
                  label={label}
                  checked={selected.has(label)}
                  onToggle={() => toggle(label)}
                />
              ))}
            </div>
          </div>
        ))}
        <div className="text-xs" style={{ opacity: 0.6 }}>
          {selected.size}/{maxSelect} selected
        </div>
      </div>
    );
  };

  const highlightStyle = (active: boolean): React.CSSProperties => ({
    color: active ? "var(--accent)" : "inherit",
    fontWeight: active ? 800 : 500,
    opacity: active ? 1 : 0.6,
  });

  const IntensityBlock = ({
    title,
    scoreKey,
  }: {
    title: string;
    scoreKey: keyof EvalScores;
  }) => {
    const v = Number(scores?.[scoreKey] ?? 0);
    const lowOn = v <= 5;
    const medOn = v > 5 && v <= 10;
    const highOn = v > 10;

    return (
      <div className="section" style={{ marginBottom: 0 }}>
        <div className="flex items-center justify-between">
          <div className="font-semibold">{title} — Intensity (0–15)</div>
          <div className="text-xs flex items-center gap-2">
            <span style={highlightStyle(lowOn)}>LOW</span>
            <span style={{ opacity: 0.4 }}>—</span>
            <span style={highlightStyle(medOn)}>MEDIUM</span>
            <span style={{ opacity: 0.4 }}>—</span>
            <span style={highlightStyle(highOn)}>HIGH</span>
          </div>
        </div>
        <div className="mt-3">
          <ScoreInput value={v} onChange={(n) => onChangeScore(scoreKey, n)} />
        </div>
      </div>
    );
  };

  /* ---- layout wrapper with explicit gap via .sheet-wrap ---- */
  return (
    <div className="sheet-wrap">
      {/* LEFT — Part 1 */}
      <div className="min-w-0" style={{ flex: "1 1 auto" }}>
        <div className="section">
          <div
            className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ opacity: 0.7 }}
          >
            Part 1: Sensory Descriptive Assessment
          </div>

          {/* Aroma */}
          <IntensityBlock title="Fragrance / Aroma" scoreKey="fragrance" />
          <div className="grid md:grid-cols-2 gap-8 mt-6">
            <div>
              <div className="mb-2">
                <div
                  className="text-sm font-medium"
                  style={{ color: "var(--accent)" }}
                >
                  Aroma Descriptors (max 5)
                </div>
              </div>
              <BoxList field="fragranceDry" maxSelect={5} />
            </div>
            <NotePlain
              label="Notes (Aroma)"
              value={notesAroma ?? ""}
              onChange={onChangeNotesAroma}
            />
          </div>

          {/* Flavor + Aftertaste */}
          <div className="mt-10 grid gap-8">
            <IntensityBlock title="Flavor" scoreKey="flavor" />
            <IntensityBlock title="Aftertaste" scoreKey="aftertaste" />
            <div className="grid md:grid-cols-2 gap-8">
              {/* LEFT */}
              <div>
                <div className="mb-2">
                  <div
                    className="text-sm font-medium"
                    style={{ color: "var(--accent)" }}
                  >
                    Flavor Descriptors (max 5)
                  </div>
                </div>
                <BoxList field="flavorNotes" maxSelect={5} />
              </div>

              {/* RIGHT: Main Tastes on top + Notes below */}
              <div className="grid gap-6">
                <div className="section" style={{ marginBottom: 0 }}>
                  <div className="text-sm font-medium mb-2">
                    Main Tastes (select up to 2)
                  </div>
                  <LimitedChips
                    title=""
                    options={MAIN_TASTES}
                    selected={attributes?.mainTastes ?? []}
                    limit={2}
                    onChange={(next) => onChangeAttribute("mainTastes", next)}
                  />
                </div>

                <NotePlain
                  label="Notes (Flavor)"
                  value={notesFlavor ?? ""}
                  onChange={onChangeNotesFlavor}
                />
              </div>
            </div>
          </div>

          {/* Acidity / Attributes */}
          <div className="mt-10 grid gap-8">
            <IntensityBlock title="Acidity" scoreKey="acidity" />

            <div className="grid md:grid-cols-2 gap-8">
              <div className="section" style={{ marginBottom: 0 }}>
                <div className="text-sm font-medium mb-3">
                  Acidity Type (Select one)
                </div>
                <SelectEasy
                  full
                  value={attributes?.acidityType ?? ""}
                  onChange={(e) =>
                    onChangeAttribute(
                      "acidityType",
                      e.target.value as "dry" | "sweet" | ""
                    )
                  }
                >
                  <option value="">—</option>
                  <option value="dry">
                    DRY ACIDITY (cherry, grassy, tart)
                  </option>
                  <option value="sweet">
                    SWEET ACIDITY (juicy, fruit-like, bright)
                  </option>
                </SelectEasy>
              </div>
            </div>

            {/* Sweetness + Mouthfeel Intensity + Mouthfeel chips */}
            <IntensityBlock title="Sweetness" scoreKey="sweetness" />
            <IntensityBlock
              title="Mouthfeel (Intensity)"
              scoreKey="mouthfeel"
            />
            <div className="section" style={{ marginTop: 10, marginBottom: 0 }}>
              <div className="text-sm font-medium mb-2">
                Mouthfeel (select up to 2)
              </div>
              <LimitedChips
                title=""
                options={MOUTHFEEL_LIST}
                selected={attributes?.mouthfeelProps ?? []}
                limit={2}
                onChange={(next) => onChangeAttribute("mouthfeelProps", next)}
              />
            </div>
          </div>

          {/* General Notes */}
          <div className="mt-10">
            <NotePlain
              label="Notes (General)"
              value={notesGeneral ?? ""}
              onChange={onChangeNotesGeneral}
            />
          </div>
        </div>
      </div>

      {/* RIGHT — Part 2 */}
      <div className="part2-panel">
        <ImpressionLegend />
        <div className="section">
          <div
            className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ opacity: 0.7 }}
          >
            Part 2: Affective Assessment
          </div>

          <AffectiveRow
            label="Fragrance / Aroma"
            value={affective?.fragrance ?? null}
            onChange={(n) => onChangeAffective("fragrance", n)}
          />
          <AffectiveRow
            label="Flavor"
            value={affective?.flavor ?? null}
            onChange={(n) => onChangeAffective("flavor", n)}
          />
          <AffectiveRow
            label="Aftertaste"
            value={affective?.aftertaste ?? null}
            onChange={(n) => onChangeAffective("aftertaste", n)}
          />
          <AffectiveRow
            label="Acidity"
            value={affective?.acidity ?? null}
            onChange={(n) => onChangeAffective("acidity", n)}
          />
          <AffectiveRow
            label="Sweetness"
            value={affective?.sweetness ?? null}
            onChange={(n) => onChangeAffective("sweetness", n)}
          />
          <AffectiveRow
            label="Mouthfeel"
            value={affective?.mouthfeel ?? null}
            onChange={(n) => onChangeAffective("mouthfeel", n)}
          />

          <div className="h-px my-6" style={{ background: "var(--border)" }} />

          <AffectiveRow
            label="Overall"
            value={affective?.overall ?? null}
            onChange={(n) => onChangeAffective("overall", n)}
          />
        </div>
      </div>
    </div>
  );
}

/* Affective single row */
function AffectiveRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="text-sm">{label}</div>
      <div className="flex items-center gap-3">
        <NineBox value={value} onChange={onChange} />
        <span
          className="text-xs px-2 py-1 rounded-md"
          style={{
            border: "1px solid var(--border)",
            opacity: 0.85,
            minWidth: 34,
            textAlign: "center",
            fontWeight: 700,
          }}
        >
          {value ?? "–"}
        </span>
      </div>
    </div>
  );
}

