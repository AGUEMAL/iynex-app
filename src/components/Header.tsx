import { useApp } from "@/lib/AppContext";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Header() {
  const { theme, setTheme, lang, setLang } = useApp();
  const logo = theme === "dark" ? "/logo_light_text.png" : "/logo_dark_text.png";
  return (
    <header className="flex items-center justify-between px-4 pt-4 pb-3 sticky top-0 z-20 glass">
      <div className="flex items-center gap-2">
        <img src={logo} alt="IyNex" className="h-9 w-9 rounded-lg glow-violet" />
        <span className="font-bold tracking-[0.18em] gradient-text brand-footer text-sm">IYNEX</span>
      </div>
      <div className="flex items-center gap-2">
        <Select value={lang} onValueChange={(v) => setLang(v as "en" | "ar" | "fr")}>
          <SelectTrigger className="h-9 w-[78px] bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">EN</SelectItem>
            <SelectItem value="ar">AR</SelectItem>
            <SelectItem value="fr">FR</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="bg-card border border-border h-9 w-9"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
