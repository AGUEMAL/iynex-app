import { useEffect, useState } from "react";

export function Splash() {
  const [hide, setHide] = useState(false);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t1 = window.setTimeout(() => setHide(true), 1400);
    const t2 = window.setTimeout(() => setGone(true), 2100);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);
  if (gone) return null;
  return (
    <div
      className={`fixed inset-0 z-[100] grid place-items-center bg-black ${hide ? "animate-fade-out" : ""}`}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="rounded-3xl p-1 animate-splash-pulse">
          <img
            src="/logo_light_text.png"
            alt="IyNex"
            className="h-28 w-28 rounded-2xl"
          />
        </div>
        <h1 className="text-4xl font-bold tracking-[0.2em] gradient-text brand-footer">
          IYNEX
        </h1>
      </div>
    </div>
  );
}
