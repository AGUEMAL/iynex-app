import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/AppContext";
import { RotateCcw, Trophy } from "lucide-react";
import { audio } from "@/lib/sfx";

const SIZE = 8;
type Cell = string | null;
type Shape = { cells: [number, number][]; color: string };

const PALETTE = [
  "bg-violet-500", "bg-fuchsia-500", "bg-sky-500",
  "bg-emerald-500", "bg-amber-500", "bg-rose-500",
];

const SHAPES_RAW: [number, number][][] = [
  [[0,0]],
  [[0,0],[0,1]],
  [[0,0],[1,0]],
  [[0,0],[0,1],[0,2]],
  [[0,0],[1,0],[2,0]],
  [[0,0],[0,1],[1,0],[1,1]],
  [[0,0],[0,1],[0,2],[1,0]],
  [[0,0],[1,0],[1,1],[1,2]],
  [[0,0],[0,1],[1,1],[1,2]],
  [[0,0],[1,0],[2,0],[2,1]],
  [[0,0],[0,1],[0,2],[1,2]],
  [[0,0],[0,1],[0,2],[0,3]],
];

const BEST_KEY = "iynex_blockblast_best";

/**
 * Progressive difficulty: as score climbs, weight the shape pool toward
 * larger, harder pieces. Level scales smoothly from 0 → 6.
 */
function levelFromScore(score: number) {
  return Math.min(6, Math.floor(score / 350));
}
function randShape(score = 0): Shape {
  const level = levelFromScore(score);
  // Bias index: at level 0 mostly small shapes; at level 6 mostly large.
  // Use a power curve over [0, SHAPES_RAW.length).
  const bias = 1 + level * 0.45; // 1.0 → 3.7
  const u = Math.random();
  const skewed = Math.pow(u, 1 / bias); // skew toward 1 as bias grows
  const idx = Math.min(SHAPES_RAW.length - 1, Math.floor(skewed * SHAPES_RAW.length));
  // Reduce palette diversity as level rises (fewer colors → harder to clear lines)
  const paletteSize = Math.max(3, PALETTE.length - Math.floor(level / 2));
  return {
    cells: SHAPES_RAW[idx],
    color: PALETTE[Math.floor(Math.random() * paletteSize)],
  };
}
function emptyBoard(): Cell[][] {
  return Array.from({ length: SIZE }, () => Array<Cell>(SIZE).fill(null));
}
function canPlace(board: Cell[][], shape: Shape, r: number, c: number) {
  return shape.cells.every(([dr, dc]) => {
    const rr = r + dr, cc = c + dc;
    return rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[rr][cc] === null;
  });
}
function place(board: Cell[][], shape: Shape, r: number, c: number) {
  const next = board.map((row) => row.slice());
  shape.cells.forEach(([dr, dc]) => { next[r + dr][c + dc] = shape.color; });
  const fullRows: number[] = [];
  const fullCols: number[] = [];
  for (let i = 0; i < SIZE; i++) {
    if (next[i].every((v) => v !== null)) fullRows.push(i);
    if (next.every((row) => row[i] !== null)) fullCols.push(i);
  }
  const clearedCells: { r: number; c: number; color: string }[] = [];
  fullRows.forEach((i) => {
    for (let j = 0; j < SIZE; j++) {
      if (next[i][j]) clearedCells.push({ r: i, c: j, color: next[i][j]! });
      next[i][j] = null;
    }
  });
  fullCols.forEach((j) => {
    for (let i = 0; i < SIZE; i++) {
      if (next[i][j]) clearedCells.push({ r: i, c: j, color: next[i][j]! });
      next[i][j] = null;
    }
  });
  return { board: next, cleared: fullRows.length + fullCols.length, clearedCells };
}

// --- Zen SFX (routed through shared global limiter in src/lib/sfx) ---
function playShatter() {
  const a = audio(); if (!a) return;
  const { ctx, master } = a;
  const now = ctx.currentTime;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 2600; lp.Q.value = 0.5;
  lp.connect(master);
  // Soft wood click body
  const o = ctx.createOscillator(); o.type = "sine";
  o.frequency.setValueAtTime(620, now);
  o.frequency.exponentialRampToValueAtTime(240, now + 0.18);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.45, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
  o.connect(g).connect(lp);
  o.start(now); o.stop(now + 0.26);
  // Gentle high tap (low gain) — no harsh sparkle
  const o2 = ctx.createOscillator(); o2.type = "triangle";
  o2.frequency.setValueAtTime(1320, now + 0.01);
  o2.frequency.exponentialRampToValueAtTime(880, now + 0.22);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.0001, now + 0.01);
  g2.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
  g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
  o2.connect(g2).connect(lp);
  o2.start(now + 0.01); o2.stop(now + 0.3);
}
function playChime() {
  const a = audio(); if (!a) return;
  const { ctx, master } = a;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 2800;
  lp.connect(master);
  const notes = [523, 659, 784, 988]; // soft major arpeggio (C E G B)
  notes.forEach((f, i) => {
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f;
    const g = ctx.createGain();
    const t = ctx.currentTime + i * 0.09;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.14, t + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.55);
    o.connect(g).connect(lp);
    o.start(t); o.stop(t + 0.6);
  });
}
function playWhoosh() {
  const a = audio(); if (!a) return;
  const { ctx, master } = a;
  const o = ctx.createOscillator(); o.type = "sine";
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter(); f.type = "lowpass";
  const t = ctx.currentTime;
  o.frequency.setValueAtTime(560, t);
  o.frequency.exponentialRampToValueAtTime(140, t + 0.28);
  f.frequency.setValueAtTime(1400, t);
  f.frequency.exponentialRampToValueAtTime(320, t + 0.28);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.16, t + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0008, t + 0.32);
  o.connect(f).connect(g).connect(master);
  o.start(t); o.stop(t + 0.34);
}

type Particle = { id: number; x: number; y: number; color: string; dx: number; dy: number };
type Float = { id: number; x: number; y: number; text: string };

export function BlockBlast() {
  const { t } = useApp();
  const [board, setBoard] = useState<Cell[][]>(emptyBoard);
  const [tray, setTray] = useState<Shape[]>(() => [randShape(), randShape(), randShape()]);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem(BEST_KEY) || 0);
  });
  const [over, setOver] = useState(false);
  const [cellSize, setCellSize] = useState(40);
  const [resetAnim, setResetAnim] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [floats, setFloats] = useState<Float[]>([]);
  const lastMilestone = useRef(0);
  const pid = useRef(0);

  const [drag, setDrag] = useState<{
    trayIdx: number;
    x: number; y: number;
    anchorDr: number; anchorDc: number;
  } | null>(null);
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      // grid has p-2 (8px) padding and gap-1 (4px) between cells
      const pad = 8;
      const gap = 4;
      const inner = rect.width - pad * 2 - gap * (SIZE - 1);
      setCellSize(inner / SIZE + gap);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (tray.every((s) => s.cells.length === 0)) {
      setTray([randShape(score), randShape(score), randShape(score)]);
    }
  }, [tray, score]);

  useEffect(() => {
    if (score > best) {
      setBest(score);
      try { localStorage.setItem(BEST_KEY, String(score)); } catch {}
    }
    const milestone = Math.floor(score / 1000);
    if (milestone > lastMilestone.current && score > 0) {
      lastMilestone.current = milestone;
      playChime();
      const el = boardRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const id = ++pid.current;
        setFloats((f) => [...f, { id, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, text: "+1000" }]);
        setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1400);
      }
    }
  }, [score, best]);

  const noMoves = useMemo(() => {
    for (const s of tray) {
      if (s.cells.length === 0) continue;
      for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++)
          if (canPlace(board, s, r, c)) return false;
    }
    return tray.some((s) => s.cells.length > 0);
  }, [board, tray]);

  useEffect(() => { setOver(noMoves); }, [noMoves]);

  const reset = () => {
    playWhoosh();
    setResetAnim(true);
    setTimeout(() => {
      setBoard(emptyBoard());
      setTray([randShape(0), randShape(0), randShape(0)]);
      setScore(0);
      lastMilestone.current = 0;
      setOver(false);
      setDrag(null);
      setHover(null);
      setParticles([]);
      setTimeout(() => setResetAnim(false), 50);
    }, 280);
  };

  // Lift above finger so the user can see the target
  const LIFT_CELLS = 1.5;

  const computeHover = (x: number, y: number, anchorDr: number, anchorDc: number) => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    const cx = x - rect.left - pad;
    const cy = y - rect.top - pad - cellSize * LIFT_CELLS;
    const c = Math.floor(cx / cellSize) - anchorDc;
    const r = Math.floor(cy / cellSize) - anchorDr;
    return { r, c };
  };

  const onPointerDownTray = (e: React.PointerEvent, idx: number) => {
    const shape = tray[idx];
    if (!shape || shape.cells.length === 0 || over) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const [ar, ac] = shape.cells[0];
    setDrag({ trayIdx: idx, x: e.clientX, y: e.clientY, anchorDr: ar, anchorDc: ac });
    setHover(computeHover(e.clientX, e.clientY, ar, ac));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    setDrag({ ...drag, x: e.clientX, y: e.clientY });
    setHover(computeHover(e.clientX, e.clientY, drag.anchorDr, drag.anchorDc));
  };

  const spawnShatter = (cells: { r: number; c: number; color: string }[]) => {
    const el = boardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    const newP: Particle[] = [];
    cells.forEach(({ r, c, color }) => {
      const cx = rect.left + pad + c * cellSize + cellSize / 2;
      const cy = rect.top + pad + r * cellSize + cellSize / 2;
      for (let i = 0; i < 5; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 30 + Math.random() * 60;
        newP.push({
          id: ++pid.current,
          x: cx, y: cy, color,
          dx: Math.cos(ang) * spd,
          dy: Math.sin(ang) * spd - 20,
        });
      }
    });
    setParticles((p) => [...p, ...newP]);
    const ids = new Set(newP.map((p) => p.id));
    setTimeout(() => setParticles((p) => p.filter((x) => !ids.has(x.id))), 700);
  };

  const onPointerUp = () => {
    if (!drag) return;
    const shape = tray[drag.trayIdx];
    if (shape && hover && canPlace(board, shape, hover.r, hover.c)) {
      const { board: nb, cleared, clearedCells } = place(board, shape, hover.r, hover.c);
      setBoard(nb);
      setScore((s) => s + shape.cells.length + cleared * 10);
      setTray(tray.map((s, i) => (i === drag.trayIdx ? { cells: [], color: s.color } : s)));
      if (clearedCells.length > 0) {
        playShatter();
        spawnShatter(clearedCells);
      }
    }
    setDrag(null);
    setHover(null);
  };

  const dragShape = drag ? tray[drag.trayIdx] : null;
  const previewValid = !!(dragShape && hover && canPlace(board, dragShape, hover.r, hover.c));

  return (
    <div
      className="px-5 pt-2 pb-28 select-none touch-none"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border glass-strong px-3 py-2 mb-4">
        <button
          onClick={reset}
          aria-label={t.restart}
          className="h-11 w-11 grid place-items-center rounded-xl bg-primary text-primary-foreground glow-violet active:scale-95 transition"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
        <div className="text-center min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.score}</div>
          <div className="text-2xl font-extrabold tabular-nums gradient-text leading-tight">{score}</div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            <Trophy className="h-3 w-3" /> Best
          </div>
          <div className="text-lg font-bold tabular-nums">{best}</div>
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground mb-2">{t.focusedFun}</div>

      <div
        ref={boardRef}
        className={`grid gap-1 p-2 rounded-lg border border-border bg-card/60 backdrop-blur mx-auto transition-all duration-300 ${resetAnim ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
        style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))`, maxWidth: 380 }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            let preview = false;
            let previewColor = "";
            let invalid = false;
            if (dragShape && hover) {
              const match = dragShape.cells.find(([dr, dc]) => hover.r + dr === r && hover.c + dc === c);
              if (match) {
                preview = true;
                previewColor = dragShape.color;
                invalid = !previewValid;
              }
            }
            const bg = cell
              ? cell
              : preview
                ? (invalid ? "bg-destructive/40" : `${previewColor} opacity-60 ring-2 ring-white/40`)
                : "bg-muted/40";
            return (
              <div
                key={`${r}-${c}`}
                className={`aspect-square rounded-md ${bg} ${cell ? "shadow-inner" : ""}`}
              />
            );
          })
        )}
      </div>

      <div className="mt-5">
        <div className="grid grid-cols-3 gap-3">
          {tray.map((s, i) => {
            const rows = Math.max(1, ...s.cells.map(([r]) => r + 1));
            const cols = Math.max(1, ...s.cells.map(([, c]) => c + 1));
            const grid = Array.from({ length: rows }, () => Array(cols).fill(false));
            s.cells.forEach(([r, c]) => { grid[r][c] = true; });
            const empty = s.cells.length === 0;
            const dragging = drag?.trayIdx === i;
            return (
              <div
                key={i}
                onPointerDown={(e) => onPointerDownTray(e, i)}
                className={`rounded-xl border p-3 grid place-items-center min-h-[88px] transition-all cursor-grab active:cursor-grabbing ${empty ? "opacity-30 border-dashed border-border" : "border-border bg-card hover:bg-card/80"} ${dragging ? "opacity-30" : ""}`}
              >
                {!empty && (
                  <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${cols}, 16px)` }}>
                    {grid.flatMap((row, ri) =>
                      row.map((on, ci) => (
                        <div key={`${ri}-${ci}`} className={`w-4 h-4 rounded-md ${on ? s.color : "bg-transparent"}`} />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating ghost: cells sized to match grid for perfect alignment */}
      {drag && dragShape && (() => {
        const rows = Math.max(1, ...dragShape.cells.map(([r]) => r + 1));
        const cols = Math.max(1, ...dragShape.cells.map(([, c]) => c + 1));
        const g = Array.from({ length: rows }, () => Array(cols).fill(false));
        dragShape.cells.forEach(([r, c]) => { g[r][c] = true; });
        const inner = cellSize - 4; // subtract gap
        // Position so the anchor cell center aligns with (x, y - lift)
        const liftPx = cellSize * LIFT_CELLS;
        const left = drag.x - (drag.anchorDc * cellSize + inner / 2);
        const top = drag.y - liftPx - (drag.anchorDr * cellSize + inner / 2);
        return (
          <div
            className="pointer-events-none fixed z-50"
            style={{ left, top }}
          >
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, ${inner}px)` }}>
              {g.flatMap((row, ri) =>
                row.map((on, ci) => (
                  <div
                    key={`${ri}-${ci}`}
                    className={`rounded-md ${on ? `${dragShape.color} shadow-lg` : "bg-transparent"}`}
                    style={{ width: inner, height: inner }}
                  />
                ))
              )}
            </div>
          </div>
        );
      })()}

      {/* Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className={`pointer-events-none fixed z-40 rounded-md ${p.color} bb-particle`}
          style={{
            left: p.x, top: p.y, width: 8, height: 8,
            ["--dx" as any]: `${p.dx}px`,
            ["--dy" as any]: `${p.dy}px`,
          }}
        />
      ))}

      {/* Score milestone floats */}
      {floats.map((f) => (
        <div
          key={f.id}
          className="pointer-events-none fixed z-50 bb-float font-extrabold text-3xl gradient-text"
          style={{ left: f.x, top: f.y, textShadow: "0 0 24px rgba(168,85,247,0.8)" }}
        >
          {f.text}
        </div>
      ))}

      {over && (
        <div className="mt-5 rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-sm mb-2">No moves left — nice flow!</p>
          <button onClick={reset} className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary text-primary-foreground glow-violet">
            <RotateCcw className="h-4 w-4" /> {t.restart}
          </button>
        </div>
      )}
    </div>
  );
}
