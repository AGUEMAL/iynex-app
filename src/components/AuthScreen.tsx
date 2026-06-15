import { useState } from "react";
import { useApp } from "@/lib/AppContext";
import { auth } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";

export function AuthScreen() {
  const { t, theme } = useApp();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const logo = theme === "dark" ? "/logo_light_text.png" : "/logo_dark_text.png";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      if (mode === "in") {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      const msg = (err as { code?: string; message?: string }).message || "Auth error";
      toast.error(msg.replace("Firebase: ", ""));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <img src={logo} alt="IyNex" className="h-20 w-20 rounded-2xl glow-violet mb-6 animate-splash-pulse" />
        <h1 className="text-3xl font-bold mb-1 gradient-text">{t.appName}</h1>
        <p className="text-muted-foreground mb-8 text-sm">{t.welcomeBack}</p>
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <div className="space-y-1.5">
            <Label>{t.email}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <Label>{t.password}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground glow-violet">
            {busy ? "…" : mode === "in" ? t.signIn : t.signUp}
          </Button>
          <button
            type="button"
            onClick={() => setMode(mode === "in" ? "up" : "in")}
            className="text-sm text-muted-foreground w-full text-center hover:text-foreground"
          >
            {mode === "in" ? t.noAccount : t.haveAccount}
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
