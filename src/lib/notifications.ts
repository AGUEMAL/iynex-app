// Lightweight in-browser notifications + alarm sound
let scheduled: number[] = [];

export function clearScheduled() {
  scheduled.forEach((id) => clearTimeout(id));
  scheduled = [];
}

export async function ensurePermission() {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const r = await Notification.requestPermission();
  return r === "granted";
}

function notify(title: string, body: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/logo_light_text.png" });
    }
  } catch {}
}

function beep() {
  try {
    const Ctx =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const playTone = (delay: number, freq: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      o.type = "sine";
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0, ctx.currentTime + delay);
      g.gain.linearRampToValueAtTime(0.4, ctx.currentTime + delay + 0.05);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + 0.5);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + 0.55);
    };
    [0, 0.6, 1.2].forEach((d) => playTone(d, 880));
  } catch {}
}

export type ScheduleItem = {
  name: string;
  type: "fixed" | "flexible";
  scheduled_start: string; // HH:MM
};

export function scheduleAlerts(
  items: ScheduleItem[],
  userName: string,
  t: { fixedTaskWarn: string; fixedTaskAlarm: string; motivational: readonly string[] }
) {
  clearScheduled();
  const now = new Date();
  for (const it of items) {
    const [h, m] = it.scheduled_start.split(":").map(Number);
    const target = new Date(now);
    target.setHours(h, m, 0, 0);
    if (target.getTime() < now.getTime()) continue;
    const ms = target.getTime() - now.getTime();
    if (it.type === "fixed") {
      if (ms > 10 * 60 * 1000) {
        scheduled.push(window.setTimeout(() => notify(it.name, t.fixedTaskWarn), ms - 10 * 60 * 1000));
      }
      scheduled.push(
        window.setTimeout(() => {
          notify(it.name, t.fixedTaskAlarm);
          beep();
        }, ms)
      );
    } else {
      const phrase = t.motivational[Math.floor(Math.random() * t.motivational.length)];
      scheduled.push(
        window.setTimeout(() => notify(it.name, `${phrase} ${userName}!`), ms)
      );
    }
  }
}
