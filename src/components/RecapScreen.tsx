import { useEffect, useState } from "react";
import { useApp } from "@/lib/AppContext";
import { listTasksForDate, updateTask, deleteTask, type TaskDoc } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { yesterdayISO, todayISO } from "@/lib/scheduler";
import { Progress } from "@/components/ui/progress";
import { Check, X } from "lucide-react";

export function RecapScreen({ onContinue }: { onContinue: () => void }) {
  const { t, user } = useApp();
  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const yISO = yesterdayISO();

  useEffect(() => {
    if (!user) return;
    listTasksForDate(user.uid, yISO).then(setTasks);
  }, [user, yISO]);

  const done = tasks.filter((x) => x.completed);
  const undone = tasks.filter((x) => !x.completed);
  const pct = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;

  const reschedule = async (id: string) => {
    if (!user) return;
    await updateTask(user.uid, id, { date: todayISO(), completed: false });
    setTasks((cur) => cur.filter((x) => x.id !== id));
  };
  const drop = async (id: string) => {
    if (!user) return;
    await deleteTask(user.uid, id);
    setTasks((cur) => cur.filter((x) => x.id !== id));
  };

  return (
    <div className="min-h-screen px-5 pt-6 pb-24">
      <h2 className="text-2xl font-bold mb-1">{t.yesterdayRecap}</h2>
      <p className="text-sm text-muted-foreground mb-5">{yISO}</p>
      <div className="rounded-2xl border border-border bg-card p-5 mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm text-muted-foreground">{t.completion}</span>
          <span className="text-3xl font-bold gradient-text">{pct}%</span>
        </div>
        <Progress value={pct} />
        <div className="flex justify-between text-xs text-muted-foreground mt-3">
          <span>{done.length} {t.completed}</span>
          <span>{undone.length} {t.uncompleted}</span>
        </div>
      </div>

      {undone.length > 0 && (
        <>
          <h3 className="text-sm font-semibold mb-2">{t.uncompleted}</h3>
          <ul className="space-y-2 mb-6">
            {undone.map((task) => (
              <li key={task.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
                <span className="truncate">{task.name}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => reschedule(task.id)}>{t.reschedule}</Button>
                  <Button size="sm" variant="ghost" onClick={() => drop(task.id)}><X className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {done.length > 0 && (
        <>
          <h3 className="text-sm font-semibold mb-2">{t.completed}</h3>
          <ul className="space-y-2 mb-6">
            {done.map((task) => (
              <li key={task.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
                <Check className="h-4 w-4 text-primary" />
                <span className="truncate">{task.name}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <Button onClick={onContinue} className="w-full h-11 glow-violet">{t.startToday}</Button>
    </div>
  );
}
