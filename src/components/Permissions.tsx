import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Smartphone, ShieldCheck } from "lucide-react";
import { useApp } from "@/lib/AppContext";

type NotifState = "granted" | "denied" | "default" | "unsupported";

function getNotifState(): NotifState {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission as NotifState;
}

const SCREEN_KEY = "iynex_screen_time_optin";

export function Permissions() {
  const { lang } = useApp();
  const [notif, setNotif] = useState<NotifState>("default");
  const [screen, setScreen] = useState<boolean>(false);

  useEffect(() => {
    setNotif(getNotifState());
    setScreen(localStorage.getItem(SCREEN_KEY) === "1");
  }, []);

  const requestNotif = async () => {
    if (typeof Notification === "undefined") return;
    const r = await Notification.requestPermission();
    setNotif(r as NotifState);
    if (r === "granted") {
      try {
        new Notification("IyNex", {
          body:
            lang === "ar"
              ? "تم تفعيل الإشعارات بنجاح."
              : lang === "fr"
                ? "Notifications activées avec succès."
                : "Notifications enabled successfully.",
          icon: "/logo_light_text.png",
        });
      } catch {
        /* ignore */
      }
    }
  };

  const toggleScreen = () => {
    const next = !screen;
    setScreen(next);
    localStorage.setItem(SCREEN_KEY, next ? "1" : "0");
  };

  const labels = {
    en: {
      title: "Permissions",
      notif: "Push notifications",
      notifDesc: "Bedtime, upcoming tasks and daily summary.",
      notifOn: "Enabled",
      notifOff: "Enable",
      notifDenied: "Blocked — enable in browser settings",
      notifUnsupported: "Not supported on this device",
      screen: "Screen time tracking",
      screenDesc: "Tracks active session time on this device.",
      on: "On",
      off: "Off",
    },
    ar: {
      title: "الأذونات",
      notif: "الإشعارات",
      notifDesc: "النوم، المهام القادمة والملخص اليومي.",
      notifOn: "مفعّلة",
      notifOff: "تفعيل",
      notifDenied: "محظورة — فعّلها من إعدادات المتصفح",
      notifUnsupported: "غير مدعومة على هذا الجهاز",
      screen: "تتبّع وقت الشاشة",
      screenDesc: "يتتبّع وقت الجلسة النشطة على هذا الجهاز.",
      on: "مفعّل",
      off: "متوقف",
    },
    fr: {
      title: "Autorisations",
      notif: "Notifications push",
      notifDesc: "Coucher, tâches à venir et résumé quotidien.",
      notifOn: "Activées",
      notifOff: "Activer",
      notifDenied: "Bloquées — activez-les dans le navigateur",
      notifUnsupported: "Non prise en charge",
      screen: "Suivi du temps d'écran",
      screenDesc: "Suit le temps de session actif sur cet appareil.",
      on: "Activé",
      off: "Désactivé",
    },
  }[lang];

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{labels.title}</p>
      </div>

      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {notif === "granted" ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium">{labels.notif}</p>
          <p className="text-xs text-muted-foreground">{labels.notifDesc}</p>
        </div>
        {notif === "granted" ? (
          <span className="text-xs px-3 py-1.5 rounded-full bg-primary/15 text-primary font-medium">
            {labels.notifOn}
          </span>
        ) : notif === "denied" ? (
          <span className="text-xs px-3 py-1.5 rounded-full bg-destructive/15 text-destructive">
            {labels.notifDenied}
          </span>
        ) : notif === "unsupported" ? (
          <span className="text-xs text-muted-foreground">{labels.notifUnsupported}</span>
        ) : (
          <Button size="sm" onClick={requestNotif} className="glow-violet">
            {labels.notifOff}
          </Button>
        )}
      </div>

      <div className="flex items-start gap-3">
        <Smartphone className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium">{labels.screen}</p>
          <p className="text-xs text-muted-foreground">{labels.screenDesc}</p>
        </div>
        <Button
          size="sm"
          variant={screen ? "default" : "outline"}
          onClick={toggleScreen}
          className={screen ? "glow-violet" : ""}
        >
          {screen ? labels.on : labels.off}
        </Button>
      </div>
    </section>
  );
}
