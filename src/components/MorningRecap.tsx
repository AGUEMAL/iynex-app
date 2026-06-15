import { useEffect, useState } from "react";
import { useApp } from "@/lib/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sun, Moon, Clock, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  getDailyPlan,
  setDailyPlan,
  listTasksForDate,
  updateTask,
  type TaskDoc,
} from "@/lib/firestore";
import { buildSchedule, todayISO, type RawTask } from "@/lib/scheduler";

type SnoozeMap = Record<string, boolean>;

export function MorningRecap({ onDone }: { onDone: () => void }) {
  const { t, user, profile } = useApp();
  const [wake, setWake] = useState("07:00");
  const [sleep, setSleep] = useState("23:00");
  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [snooze, setSnooze] = useState<SnoozeMap>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    const date = todayISO();
    (async () => {
      const [plan, ts] = await Promise.all([
        getDailyPlan(user.uid, date),
        listTasksForDate(user.uid, date),
      ]);
      if (plan) { setWake(plan.wake_time); setSleep(plan.sleep_time); }
      setTasks(ts.filter((x) => !x.completed));
    })();
  }, [user]);

  const toggleSnooze = (id: string) =>
    setSnooze((s) => ({ ...s, [id]: !s[id] }));

  const finalize = async (alsoRefresh: boolean) => {
    if (!user) return;
    setBusy(true);
    try {
      const date = todayISO();
      await setDailyPlan(user.uid, date, { wake_time: wake, sleep_time: sleep });

      let working: TaskDoc[] = tasks;

      if (alsoRefresh) {
        const raw: RawTask[] = working.map((x) => ({
          id: x.id, name: x.name, type: x.type,
          start_time: x.start_time, duration_minutes: x.duration_minutes,
        }));
        const scheduled = buildSchedule(wake, sleep, raw, { randomize: true });
        const byId = new Map(scheduled.map((s) => [s.id!, s.scheduled_start]));
        await Promise.all(
          working.map((x) => {
            const next = byId.get(x.id);
            if (next && next !== x.scheduled_start) {
              return updateTask(user.uid, x.id, { scheduled_start: next });
            }
            return Promise.resolve();
          })
        );
        working = working.map((x) => ({
          ...x, scheduled_start: byId.get(x.id) ?? x.scheduled_start,
        }));
      }

      // Apply snoozes (+30 min on scheduled_start)
      await Promise.all(
        Object.entries(snooze)
          .filter(([, v]) => v)
          .map(([id]) => {
            const tk = working.find((x) => x.id === id);
            if (!tk?.scheduled_start) return Promise.resolve();
            const [h, m] = tk.scheduled_start.split(":").map(Number);
            const total = (h * 60 + m + 30) % 1440;
            const next = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
            return updateTask(user.uid, id, { scheduled_start: next });
          })
      );

      localStorage.setItem(`iynex_morning_${user.uid}`, date);
      toast.success(t.saved);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-5 pt-8 pb-10">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold">{t.morningCheckin}{profile?.name ? `, ${profile.name}` : ""}</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">{t.morningCheckinBlurb}</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-amber-300 text-xs"><Sun className="h-3 w-3" />{t.wakeTime}</Label>
          <Input type="time" value={wake} onChange={(e) => setWake(e.target.value)} className="h-12" />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-primary text-xs"><Moon className="h-3 w-3" />{t.sleepTime}</Label>
          <Input type="time" value={sleep} onChange={(e) => setSleep(e.target.value)} className="h-12" />
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">{t.taskRefresher}</h3>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>

      <ul className="space-y-2 mb-6 flex-1">
        {tasks.length === 0 ? (
          <li className="text-center text-muted-foreground py-6 text-sm">{t.noTasksYet}</li>
        ) : tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{task.name}</div>
              <div className="text-xs text-muted-foreground">{task.scheduled_start ?? "—"}</div>
            </div>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox checked={!!snooze[task.id]} onCheckedChange={() => toggleSnooze(task.id)} />
              <span>{t.snooze}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => finalize(true)} disabled={busy} className="flex-1">
          <RefreshCw className="h-4 w-4 mr-1" /> {t.refreshSchedule}
        </Button>
        <Button onClick={() => finalize(false)} disabled={busy} className="flex-1 glow-violet">
          {t.confirm}
        </Button>
      </div>
    </div>
  );
}
