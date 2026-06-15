import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/AppContext";
import { listTasksForDate, updateTask, type TaskDoc } from "@/lib/firestore";
import { todayISO } from "@/lib/scheduler";
import { ensurePermission, scheduleAlerts } from "@/lib/notifications";
import { getMotivation } from "@/lib/motivation";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sparkles, Clock } from "lucide-react";
import { playGlassBreak } from "@/lib/sfx";

function ProgressRing({ pct, done, total }: { pct: number; done: number; total: number }) {
  const size = 220;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.55 0.3 300)" />
            <stop offset="100%" stopColor="oklch(0.7 0.22 280)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke="url(#ringGrad)" strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(.34,1.56,.64,1)", filter: "drop-shadow(0 0 12px oklch(0.6 0.3 295 / 0.5))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold gradient-text">{pct}%</span>
        <span className="text-xs text-muted-foreground mt-1">{done}/{total}</span>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { t, user, profile, lang } = useApp();
  const [tasks, setTasks] = useState<TaskDoc[]>([]);

  const load = async () => {
    if (!user) return;
    const data = await listTasksForDate(user.uid, todayISO());
    setTasks(data);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  // Re-roll motivation when day's task count changes (and once on mount per name)
  const motivation = useMemo(
    () => getMotivation(lang, profile?.name || ""),
    [lang, profile?.name, tasks.length]
  );

  useEffect(() => {
    if (!tasks.length || !profile) return;
    ensurePermission().then((ok) => {
      if (!ok) return;
      scheduleAlerts(
        tasks.filter((x) => x.scheduled_start).map((x) => ({
          name: x.name, type: x.type, scheduled_start: x.scheduled_start!,
        })),
        profile.name || "",
        t
      );
    });
  }, [tasks, profile, t]);

  const toggle = async (task: TaskDoc) => {
    if (!user) return;
    const next = !task.completed;
    if (next) playGlassBreak();
    setTasks((cur) => cur.map((x) => (x.id === task.id ? { ...x, completed: next } : x)));
    await updateTask(user.uid, task.id, { completed: next });
  };

  const changeTime = async (task: TaskDoc, time: string) => {
    if (!user) return;
    const value = `${time}:00`;
    setTasks((cur) =>
      cur
        .map((x) => (x.id === task.id ? { ...x, scheduled_start: value } : x))
        .sort((a, b) => (a.scheduled_start ?? "").localeCompare(b.scheduled_start ?? ""))
    );
    await updateTask(user.uid, task.id, { scheduled_start: value });
  };

  const done = tasks.filter((x) => x.completed).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div className="px-5 pt-2 pb-24">
      <p className="text-sm text-muted-foreground">{t.welcomeBack},</p>
      <h2 className="text-2xl font-bold mb-6 gradient-text">{profile?.name || ""}</h2>

      <ProgressRing pct={pct} done={done} total={tasks.length} />

      <div className="mt-5 mx-auto max-w-sm rounded-2xl border border-border bg-card/60 backdrop-blur px-4 py-3 flex items-center gap-3 animate-glass-slide">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm font-medium">{motivation}</p>
      </div>

      <ul className="mt-8 space-y-2">
        {tasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{t.noTasksYet}</p>
        ) : (
          tasks.map((task) => (
            <li
              key={task.id}
              className={`flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-all ${task.completed ? "opacity-50 border-border" : "border-border"}`}
            >
              <Checkbox checked={task.completed} onCheckedChange={() => toggle(task)} className="h-5 w-5" />
              <div className="flex-1 min-w-0">
                <div className={`font-medium truncate ${task.completed ? "line-through" : ""}`}>{task.name}</div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {task.scheduled_start?.slice(0, 5) ?? "—"}
                  {task.type === "flexible" && <span className="ml-2 text-violet-400">· {t.flexible}</span>}
                </div>
              </div>
              {task.type === "flexible" && !task.completed && (
                <ChangeTime task={task} onChange={changeTime} t={t} />
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function ChangeTime({
  task, onChange, t,
}: {
  task: TaskDoc;
  onChange: (task: TaskDoc, time: string) => void;
  t: { changeTime: string; save: string };
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(task.scheduled_start?.slice(0, 5) ?? "09:00");
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs border-violet-500/40 text-violet-300 hover:bg-violet-500/10"
        >
          <Clock className="h-3.5 w-3.5" />
          {t.changeTime}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3 space-y-2">
        <Input type="time" value={value} onChange={(e) => setValue(e.target.value)} />
        <Button
          size="sm"
          className="w-full"
          onClick={() => { onChange(task, value); setOpen(false); }}
        >
          {t.save}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

