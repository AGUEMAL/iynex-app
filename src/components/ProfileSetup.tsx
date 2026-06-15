import { useState } from "react";
import { useApp } from "@/lib/AppContext";
import { updateProfile } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";

export function ProfileSetup() {
  const { t, user, refreshProfile } = useApp();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Not signed in");
      return;
    }
    setBusy(true);
    // Hard timeout so the UI can never freeze indefinitely on a hung Firestore call.
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Firestore request timed out")), 12000)
    );
    try {
      await Promise.race([
        updateProfile(user.uid, {
          name: name.trim(),
          age: Number(age) || null,
          email: user.email ?? null,
        }),
        timeout,
      ]);
      await refreshProfile();
      toast.success("Profile saved");
      // index.tsx routing reacts to profile.name being set and moves to setup/app.
    } catch (err) {
      const msg = (err as { message?: string }).message || "Could not save profile";
      // eslint-disable-next-line no-console
      console.error("[ProfileSetup] save failed:", err);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <h1 className="text-2xl font-bold mb-2 gradient-text">{t.profile}</h1>
        <p className="text-muted-foreground mb-6 text-sm">{t.continue}</p>
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <div className="space-y-1.5">
            <Label>{t.yourName}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
          </div>
          <div className="space-y-1.5">
            <Label>{t.yourAge}</Label>
            <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} required min={1} max={120} />
          </div>
          <Button type="submit" disabled={busy} className="w-full h-11 glow-violet">
            {busy ? "…" : t.continue}
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
