import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/AppContext";
import { listTasksBetween } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

type TaskRow = { date: string; name: string; completed: boolean; scheduled_start: string | null };
type DayStats = { total: number; done: number; tasks: TaskRow[] };

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function HistoryTab() {
  const { t, user, lang } = useApp();
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [byDay, setByDay] = useState<Record<string, DayStats>>({});
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    listTasksBetween(user.uid, ymd(start), ymd(end)).then((data) => {
      const map: Record<string, DayStats> = {};
      data.forEach((r) => {
        const cur = map[r.date] || { total: 0, done: 0, tasks: [] };
        cur.total++;
        if (r.completed) cur.done++;
        cur.tasks.push({ date: r.date, name: r.name, completed: r.completed, scheduled_start: r.scheduled_start });
        map[r.date] = cur;
      });
      Object.values(map).forEach((d) =>
        d.tasks.sort((a, b) => (a.scheduled_start ?? "").localeCompare(b.scheduled_start ?? ""))
      );
      setByDay(map);
    });
  }, [user, cursor]);

  const monthLabel = useMemo(
    () => cursor.toLocaleDateString(lang === "ar" ? "ar" : lang === "fr" ? "fr" : "en", { month: "long", year: "numeric" }),
    [cursor, lang]
  );

  const firstWeekday = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const todayKey = ymd(new Date());

  const sel = selected ? byDay[selected] : null;
  const weekdays = lang === "ar"
    ? ["أحد","إثن","ثلا","أرب","خمي","جمع","سبت"]
    : lang === "fr"
    ? ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"]
    : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  return (
    <div className="px-5 pt-2 pb-24">
      <h2 className="text-2xl font-bold mb-4">{t.history}</h2>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="font-semibold capitalize">{monthLabel}</span>
          <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-[10px] text-muted-foreground mb-1">
          {weekdays.map((w) => <div key={w} className="text-center">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const key = ymd(new Date(cursor.getFullYear(), cursor.getMonth(), d));
            const stat = byDay[key];
            const pct = stat ? Math.round((stat.done / stat.total) * 100) : 0;
            const isToday = key === todayKey;
            const isSelected = key === selected;
            return (
              <button
                key={i}
                onClick={() => stat && setSelected(key)}
                disabled={!stat}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm relative transition-all ${
                  isSelected ? "bg-primary text-primary-foreground glow-violet"
                  : stat ? "bg-secondary/40 hover:bg-secondary/70 cursor-pointer"
                  : "opacity-40"
                } ${isToday && !isSelected ? "ring-1 ring-primary/60" : ""}`}
              >
                <span>{d}</span>
                {stat && (
                  pct === 100
                    ? <Check className="h-3 w-3 absolute bottom-1 text-emerald-400" />
                    : <span className="h-1.5 w-1.5 rounded-full bg-primary absolute bottom-1.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {sel ? (
        <div className="mt-5 rounded-2xl border border-border bg-card p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="font-semibold">{selected}</span>
            <span className="gradient-text font-bold">{Math.round((sel.done / sel.total) * 100)}%</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{sel.done}/{sel.total} {t.completed}</p>
          <ul className="space-y-1.5">
            {sel.tasks.map((task, i) => (
              <li key={i} className="flex items-center gap-3 text-sm py-1.5 border-b border-border/40 last:border-0">
                <span className={`h-4 w-4 rounded-full grid place-items-center shrink-0 ${task.completed ? "bg-primary text-primary-foreground" : "border border-border"}`}>
                  {task.completed && <Check className="h-3 w-3" />}
                </span>
                <span className={`flex-1 truncate ${task.completed ? "" : "text-muted-foreground"}`}>{task.name}</span>
                {task.scheduled_start && <span className="text-xs text-muted-foreground tabular-nums">{task.scheduled_start.slice(0,5)}</span>}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-center text-muted-foreground text-sm mt-6">{t.noHistory}</p>
      )}
    </div>
  );
}
