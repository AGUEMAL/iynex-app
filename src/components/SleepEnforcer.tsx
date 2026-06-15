import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/AppContext";
import { getDailyPlan } from "@/lib/firestore";
import { todayISO } from "@/lib/scheduler";
import { Button } from "@/components/ui/button";
import { Moon } from "lucide-react";

function notify(title: string, body: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/logo_light_text.png" });
    }
  } catch {
    /* ignore */
  }
}

function chime() {
  try {
    const Ctx =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [440, 660, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = "sine";
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.35;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.05);
      g.gain.linearRampToValueAtTime(0, t + 0.4);
      o.start(t);
      o.stop(t + 0.45);
    });
  } catch {
    /* ignore */
  }
}

export function SleepEnforcer() {
  const { user, profile, t } = useApp();
  const [active, setActive] = useState(false);
  const [sleepHM, setSleepHM] = useState<string | null>(null);
  const triggerRef = useRef<number | null>(null);
  const loopRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    getDailyPlan(user.uid, todayISO()).then((plan) => {
      if (plan?.sleep_time) setSleepHM(plan.sleep_time.slice(0, 5));
    });
  }, [user]);

  useEffect(() => {
    const cleanup = () => {
      if (triggerRef.current) window.clearTimeout(triggerRef.current);
      if (loopRef.current) window.clearInterval(loopRef.current);
      triggerRef.current = null;
      loopRef.current = null;
    };
    cleanup();
    if (!sleepHM || !profile?.name) return;
    const stopKey = `iynex_sleep_stop_${todayISO()}`;
    if (localStorage.getItem(stopKey) === "1") return;

    const [h, m] = sleepHM.split(":").map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    const ms = target.getTime() - Date.now();

    const startLoop = () => {
      if (localStorage.getItem(stopKey) === "1") return;
      setActive(true);
      const ping = () => {
        notify(`${profile.name}, ${t.bedtimeNow}`, t.bedtime);
        chime();
      };
      ping();
      loopRef.current = window.setInterval(ping, 5 * 60 * 1000);
    };

    if (ms <= 0 && ms > -8 * 60 * 60 * 1000) startLoop();
    else if (ms > 0) triggerRef.current = window.setTimeout(startLoop, ms);
    return cleanup;
  }, [sleepHM, profile?.name, t.bedtime, t.bedtimeNow]);

  if (!active) return null;
  const stop = () => {
    localStorage.setItem(`iynex_sleep_stop_${todayISO()}`, "1");
    if (loopRef.current) window.clearInterval(loopRef.current);
    loopRef.current = null;
    setActive(false);
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-6 night-bg">
      <div className="glass-strong rounded-3xl p-7 max-w-sm text-center space-y-5 animate-glass-slide">
        <div className="mx-auto w-20 h-20 moon" />
        <h2 className="text-2xl font-bold">{profile?.name}, {t.bedtimeNow}</h2>
        <p className="text-sm text-muted-foreground">{t.bedtime}</p>
        <Button onClick={stop} className="w-full h-12 glow-violet">
          <Moon className="h-4 w-4 mr-2" /> {t.goingToBed}
        </Button>
      </div>
    </div>
  );
}
