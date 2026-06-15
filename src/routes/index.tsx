import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/AppContext";
import { listTasksForDate } from "@/lib/firestore";
import { todayISO, yesterdayISO } from "@/lib/scheduler";
import { AuthScreen } from "@/components/AuthScreen";
import { ProfileSetup } from "@/components/ProfileSetup";
import { SetupWizard } from "@/components/SetupWizard";
import { RecapScreen } from "@/components/RecapScreen";
import { MorningRecap } from "@/components/MorningRecap";
import { Header } from "@/components/Header";
import { BottomNav, type TabKey } from "@/components/BottomNav";
import { Dashboard } from "@/components/tabs/Dashboard";
import { Notes } from "@/components/tabs/Notes";
import { BlockBlast } from "@/components/tabs/BlockBlast";
import { HistoryTab } from "@/components/tabs/History";
import { Settings } from "@/components/tabs/Settings";
import { AdminTab } from "@/components/tabs/Admin";
import { Splash } from "@/components/Splash";
import { SleepEnforcer } from "@/components/SleepEnforcer";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/")({ component: Index });

type Stage = "loading" | "recap" | "setup" | "morning" | "app";

function Index() {
  const { user, loading, profile } = useApp();
  const [stage, setStage] = useState<Stage>("loading");
  const [tab, setTab] = useState<TabKey>("dashboard");

  useEffect(() => {
    if (loading || !user || !profile?.name) return;
    (async () => {
      const date = todayISO();
      const today = await listTasksForDate(user.uid, date);
      if (today.length === 0) {
        const yest = await listTasksForDate(user.uid, yesterdayISO());
        setStage(yest.length > 0 ? "recap" : "setup");
        return;
      }
      // Daily one-time check-in: show MorningRecap the first time the app
      // is opened each day. Tracked via localStorage "last session date".
      const doneKey = `iynex_morning_${user.uid}`;
      const lastDate = typeof window !== "undefined" ? localStorage.getItem(doneKey) : null;
      if (lastDate !== date) {
        setStage("morning");
        return;
      }
      setStage("app");
    })();
  }, [loading, user, profile?.name]);

  if (loading)
    return (
      <>
        <Splash />
        <div className="min-h-screen grid place-items-center text-muted-foreground">…</div>
      </>
    );

  return (
    <>
      <Splash />
      {!user ? (
        <AuthScreen />
      ) : !profile?.name ? (
        <ProfileSetup />
      ) : stage === "recap" ? (
        <RecapScreen onContinue={() => setStage("setup")} />
      ) : stage === "setup" ? (
        <SetupWizard onDone={() => setStage("app")} />
      ) : stage === "morning" ? (
        <MorningRecap onDone={() => setStage("app")} />
      ) : (
        <div className="min-h-screen flex flex-col">
          <Header />
          <main key={tab} className="animate-glass-slide flex-1">
            {tab === "dashboard" && <Dashboard />}
            {tab === "notes" && <Notes />}
            {tab === "blockblast" && <BlockBlast />}
            {tab === "history" && <HistoryTab />}
            {tab === "settings" && <Settings />}
            {tab === "admin" && <AdminTab />}
          </main>
          <Footer />
          <BottomNav tab={tab} onChange={setTab} />
          <SleepEnforcer />
        </div>
      )}
    </>
  );
}

