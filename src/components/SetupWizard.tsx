import { useState } from "react";
import { useApp } from "@/lib/AppContext";
import { setDailyPlan, deleteTasksForDate, createTask } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayISO, buildSchedule, type RawTask } from "@/lib/scheduler";
import { Trash2, Plus, Moon, Pin, Shuffle, Sun } from "lucide-react";
import { toast } from "sonner";

type Step = "sleep" | "fixed" | "flexible";

export function SetupWizard({ onDone }: { onDone: () => void }) {
  const { t, user } = useApp();
  const [step, setStep] = useState<Step>("sleep");
  const [wake, setWake] = useState("07:00");
  const [sleep, setSleep] = useState("23:00");
  const [fixed, setFixed] = useState<RawTask[]>([]);
  const [flex, setFlex] = useState<RawTask[]>([]);
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const date = todayISO();
      await setDailyPlan(user.uid, date, { wake_time: wake, sleep_time: sleep });
      await deleteTasksForDate(user.uid, date);
      const all = [...fixed, ...flex];
      const scheduled = buildSchedule(wake, sleep, all);
      await Promise.all(
        scheduled.map((s) =>
          createTask(user.uid, {
            date,
            name: s.name,
            type: s.type,
            start_time: s.type === "fixed" ? (s.start_time ?? null) : null,
            duration_minutes: s.duration_minutes,
            scheduled_start: s.scheduled_start,
            completed: false,
          })
        )
      );
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-5 pt-8 pb-24">
      <Stepper step={step} />
      <h2 className="text-2xl font-bold mt-4 mb-1">{t.setupYourDay}</h2>
      <p className="text-sm text-muted-foreground mb-6">
        {step === "sleep" ? t.sleepCycle : step === "fixed" ? t.fixedTasks : t.flexibleTasks}
      </p>

      <div key={step} className="animate-glass-slide">
        {step === "sleep" && (
          <div className="space-y-6 max-w-md">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-amber-300">
                <Sun className="h-4 w-4" /> {t.wakeTime}
              </Label>
              <div className="time-field time-field-sun">
                <Sun className="time-field-icon h-5 w-5" />
                <Input type="time" value={wake} onChange={(e) => setWake(e.target.value)} className="h-14 text-lg bg-transparent border-0 focus-visible:ring-0 ps-12" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-primary">
                <Moon className="h-4 w-4" /> {t.sleepTime}
              </Label>
              <div className="time-field time-field-moon">
                <Moon className="time-field-icon h-5 w-5" />
                <Input type="time" value={sleep} onChange={(e) => setSleep(e.target.value)} className="h-14 text-lg bg-transparent border-0 focus-visible:ring-0 ps-12" />
              </div>
            </div>
          </div>
        )}

        {step === "fixed" && <TaskList tasks={fixed} setTasks={setFixed} requireStart />}
        {step === "flexible" && <TaskList tasks={flex} setTasks={setFlex} />}
      </div>

      <div className="mt-auto flex gap-3 pt-8">
        {step !== "sleep" && (
          <Button variant="outline" onClick={() => setStep(step === "flexible" ? "fixed" : "sleep")} className="flex-1">
            {t.back}
          </Button>
        )}
        {step !== "flexible" ? (
          <Button onClick={() => setStep(step === "sleep" ? "fixed" : "flexible")} className="flex-1 glow-violet">
            {t.next}
          </Button>
        ) : (
          <Button onClick={finish} disabled={busy} className="flex-1 glow-violet">
            {t.finish}
          </Button>
        )}
      </div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { key: Step; Icon: typeof Moon }[] = [
    { key: "sleep", Icon: Moon },
    { key: "fixed", Icon: Pin },
    { key: "flexible", Icon: Shuffle },
  ];
  const idx = steps.findIndex((s) => s.key === step);
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2 flex-1">
          <div className={`h-9 w-9 rounded-full grid place-items-center border ${i <= idx ? "bg-primary text-primary-foreground border-primary glow-violet" : "border-border text-muted-foreground"}`}>
            <s.Icon className="h-4 w-4" />
          </div>
          {i < steps.length - 1 && <div className={`h-0.5 flex-1 ${i < idx ? "bg-primary" : "bg-border"}`} />}
        </div>
      ))}
    </div>
  );
}

function TaskList({ tasks, setTasks, requireStart }: { tasks: RawTask[]; setTasks: (t: RawTask[]) => void; requireStart?: boolean }) {
  const { t } = useApp();
  const [name, setName] = useState("");
  const [start, setStart] = useState("09:00");
  const [hrs, setHrs] = useState("0");
  const [mins, setMins] = useState("30");

  const add = () => {
    if (!name.trim()) return;
    const dur = Number(hrs) * 60 + Number(mins);
    if (dur <= 0) return;
    setTasks([...tasks, { name: name.trim(), type: requireStart ? "fixed" : "flexible", start_time: requireStart ? start : null, duration_minutes: dur }]);
    setName(""); setHrs("0"); setMins("30");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <Input placeholder={t.taskName} value={name} onChange={(e) => setName(e.target.value)} />
        {requireStart && (
          <div className="space-y-1.5">
            <Label className="text-xs">{t.startTime}</Label>
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t.hours}</Label>
            <Input type="number" min={0} max={12} value={hrs} onChange={(e) => setHrs(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t.minutes}</Label>
            <Input type="number" min={0} max={59} value={mins} onChange={(e) => setMins(e.target.value)} />
          </div>
        </div>
        <Button onClick={add} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-1" /> {t.addTask}
        </Button>
      </div>

      <ul className="space-y-2">
        {tasks.map((task, i) => (
          <li key={i} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
            <div className="flex flex-col">
              <span className="font-medium">{task.name}</span>
              <span className="text-xs text-muted-foreground">
                {task.start_time ? `${task.start_time} · ` : ""}
                {Math.floor(task.duration_minutes / 60)}h {task.duration_minutes % 60}m
              </span>
            </div>
            <button onClick={() => setTasks(tasks.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive p-1">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
