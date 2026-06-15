// Deterministic scheduler: pack flexible tasks into gaps between fixed tasks,
// constrained by wake/sleep window.
export type RawTask = {
  id?: string;
  name: string;
  type: "fixed" | "flexible";
  start_time?: string | null; // "HH:MM"
  duration_minutes: number;
};

export type Scheduled = RawTask & { scheduled_start: string };

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const fromMin = (m: number) => {
  m = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

export function buildSchedule(
  wake: string,
  sleep: string,
  tasks: RawTask[],
  opts: { randomize?: boolean } = { randomize: true }
): Scheduled[] {
  const wakeM = toMin(wake);
  let sleepM = toMin(sleep);
  if (sleepM <= wakeM) sleepM += 1440;

  const fixed = tasks
    .filter((t) => t.type === "fixed" && t.start_time)
    .map((t) => {
      let s = toMin(t.start_time!);
      if (s < wakeM) s += 1440;
      return { ...t, _start: s };
    })
    .sort((a, b) => a._start - b._start);

  const flexible = tasks.filter((t) => t.type === "flexible");

  // Build gaps between fixed tasks within the wake/sleep window
  const gaps: Array<[number, number]> = [];
  let cursor = wakeM;
  for (const f of fixed) {
    if (f._start > cursor) gaps.push([cursor, f._start]);
    cursor = Math.max(cursor, f._start + f.duration_minutes);
  }
  if (cursor < sleepM) gaps.push([cursor, sleepM]);

  // Randomize order so the daily routine feels fresh; place each task at a
  // randomized offset within a fitting gap so flexible items spread out.
  const order = opts.randomize
    ? [...flexible].sort(() => Math.random() - 0.5)
    : [...flexible].sort((a, b) => b.duration_minutes - a.duration_minutes);

  const placedFlex: Scheduled[] = [];
  for (const f of order) {
    const fitting = gaps
      .map((g, i) => ({ i, s: g[0], e: g[1], slack: g[1] - g[0] - f.duration_minutes }))
      .filter((g) => g.slack >= 0);
    if (!fitting.length) continue;
    const pick = opts.randomize
      ? fitting[Math.floor(Math.random() * fitting.length)]
      : fitting[0];
    const offset = opts.randomize ? Math.floor(Math.random() * (pick.slack + 1)) : 0;
    const start = pick.s + offset;
    placedFlex.push({ ...f, scheduled_start: fromMin(start) });
    const before: [number, number] = [pick.s, start];
    const after: [number, number] = [start + f.duration_minutes, pick.e];
    gaps.splice(pick.i, 1, ...[before, after].filter(([s, e]) => e - s > 0));
  }

  const result: Scheduled[] = [
    ...fixed.map((f) => ({ ...f, scheduled_start: fromMin(f._start), _start: undefined as never })),
    ...placedFlex,
  ];
  return result.sort((a, b) => toMin(a.scheduled_start) - toMin(b.scheduled_start));
}

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const yesterdayISO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
