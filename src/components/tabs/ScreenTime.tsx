import { useEffect, useState } from "react";
import { useApp } from "@/lib/AppContext";
import { Smartphone, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "ikronos_session_today";
const OPT_KEY = "iynex_screen_time_optin";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function ScreenTime() {
  const { t, lang } = useApp();
  const [seconds, setSeconds] = useState(0);
  const [optedIn, setOptedIn] = useState<boolean>(
    typeof window !== "undefined" && localStorage.getItem(OPT_KEY) === "1"
  );

  useEffect(() => {
    if (!optedIn) return;
    const stored = JSON.parse(localStorage.getItem(KEY) || "{}");
    const tk = todayKey();
    const start = Date.now();
    const baseline = stored.day === tk ? stored.seconds || 0 : 0;
    setSeconds(baseline);

    const tick = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const elapsed = baseline + Math.floor((Date.now() - start) / 1000);
      setSeconds(elapsed);
      localStorage.setItem(KEY, JSON.stringify({ day: tk, seconds: elapsed }));
    }, 1000);
    return () => window.clearInterval(tick);
  }, [optedIn]);

  const enable = () => {
    localStorage.setItem(OPT_KEY, "1");
    setOptedIn(true);
  };

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  const askLabel =
    lang === "ar"
      ? "فعّل تتبّع وقت الشاشة"
      : lang === "fr"
        ? "Activer le suivi du temps d'écran"
        : "Enable screen time tracking";
  const askDesc =
    lang === "ar"
      ? "يتم التتبع محليًا على هذا الجهاز فقط."
      : lang === "fr"
        ? "Suivi local uniquement sur cet appareil."
        : "Tracked locally on this device only.";

  return (
    <div className="px-5 pt-2 pb-24">
      <h2 className="text-2xl font-bold mb-5">{t.screenTime}</h2>

      {!optedIn ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-4">
          <ShieldOff className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="font-medium">{askLabel}</p>
          <p className="text-xs text-muted-foreground">{askDesc}</p>
          <Button onClick={enable} className="glow-violet">{askLabel}</Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 text-center mb-4 glow-violet">
          <Smartphone className="h-8 w-8 mx-auto mb-3 text-primary" />
          <p className="text-sm text-muted-foreground mb-1">{t.sessionToday}</p>
          <p className="text-4xl font-bold gradient-text">
            {h}
            {t.hour} {String(m).padStart(2, "0")}
            {t.minute}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-dashed border-border bg-card/50 p-4 mt-4">
        <p className="text-sm font-medium mb-1">{t.screenTimeSoon}</p>
        <p className="text-xs text-muted-foreground">{t.screenTimeBlurb}</p>
      </div>
    </div>
  );
}
