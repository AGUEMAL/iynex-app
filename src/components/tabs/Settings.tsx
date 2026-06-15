import { useApp } from "@/lib/AppContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Instagram, LogOut, Music2 } from "lucide-react";
import { Permissions } from "@/components/Permissions";

export function Settings() {
  const { t, profile, lang, setLang, theme, setTheme, signOut } = useApp();
  return (
    <div className="px-5 pt-2 pb-24 space-y-6">
      <h2 className="text-2xl font-bold">{t.settings}</h2>

      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t.profile}</p>
        <p className="text-lg font-semibold">{profile?.name || "—"}</p>
        <p className="text-sm text-muted-foreground">
          {t.yourAge}: {profile?.age ?? "—"}
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span>{t.language}</span>
          <Select value={lang} onValueChange={(v) => setLang(v as "en" | "ar" | "fr")}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ar">العربية</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <span>{t.theme}</span>
          <Select value={theme} onValueChange={(v) => setTheme(v as "dark" | "light")}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">{t.dark}</SelectItem>
              <SelectItem value="light">{t.light}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <Permissions />

      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t.credits}</p>
        <p className="text-lg font-semibold gradient-text">
          {lang === "ar" ? "إياد أقمال" : "Iyad Aguemal"}
        </p>
        <p className="text-xs text-muted-foreground mb-3">{t.developer}</p>
        <div className="flex gap-2">
          <a
            href="https://instagram.com/iyad.agm"
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm hover:border-primary"
          >
            <Instagram className="h-4 w-4" /> @iyad.agm
          </a>
          <a
            href="https://tiktok.com/@iyyad.agm"
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm hover:border-primary"
          >
            <Music2 className="h-4 w-4" /> @iyyad.agm
          </a>
        </div>
      </section>

      <Button variant="outline" onClick={signOut} className="w-full">
        <LogOut className="h-4 w-4 mr-2" /> {t.signOut}
      </Button>

      <footer className="text-center pt-4 pb-2">
        <p className="brand-footer text-xs gradient-text">{t.builtBy}</p>
        <div className="flex justify-center gap-3 mt-2 text-[11px] text-muted-foreground">
          <a href="https://instagram.com/iyad.agm" target="_blank" rel="noreferrer" className="hover:text-primary">@iyad.agm</a>
          <span>·</span>
          <a href="https://tiktok.com/@iyyad.agm" target="_blank" rel="noreferrer" className="hover:text-primary">@iyyad.agm</a>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">IyNex · v1.0</p>
      </footer>
    </div>
  );
}
