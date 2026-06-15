import { useApp } from "@/lib/AppContext";
import { Calendar, FileText, Blocks, History, Settings as SettingsIcon, Shield } from "lucide-react";

export type TabKey = "dashboard" | "notes" | "blockblast" | "history" | "settings" | "admin";

export function BottomNav({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  const { t, isAdmin } = useApp();
  const items: { key: TabKey; label: string; Icon: typeof Calendar }[] = [
    { key: "dashboard", label: t.dashboard, Icon: Calendar },
    { key: "notes", label: t.notes, Icon: FileText },
    { key: "blockblast", label: t.blockBlast, Icon: Blocks },
    { key: "history", label: t.history, Icon: History },
    { key: "settings", label: t.settings, Icon: SettingsIcon },
    ...(isAdmin ? [{ key: "admin" as TabKey, label: "Admin", Icon: Shield }] : []),
  ];
  const cols = items.length === 6 ? "grid-cols-6" : "grid-cols-5";
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 glass border-t pb-[env(safe-area-inset-bottom)]">
      <ul className={`grid ${cols}`}>
        {items.map(({ key, label, Icon }) => {
          const active = tab === key;
          const isGame = key === "blockblast";
          return (
            <li key={key}>
              <button
                onClick={() => onChange(key)}
                className={`flex w-full flex-col items-center gap-1 py-2.5 text-xs transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"} ${isGame && !active ? "text-violet-400" : ""}`}
              >
                <Icon className={`h-5 w-5 ${active ? "drop-shadow-[0_0_8px_var(--primary)]" : ""}`} />
                <span className="truncate">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
