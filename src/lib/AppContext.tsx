import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { auth, isAdminEmail } from "./firebase";
import { ensureProfile, getProfile, updateProfile, type Profile } from "./firestore";
import { dict, type Lang, type Dict } from "./i18n";

type Theme = "dark" | "light";

type Ctx = {
  user: User | null;
  loading: boolean;
  profile: Profile | null;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  t: Dict;
  signOut: () => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lang, setLangState] = useState<Lang>(
    (typeof window !== "undefined" && (localStorage.getItem("lang") as Lang)) || "en"
  );
  const [theme, setThemeState] = useState<Theme>(
    (typeof window !== "undefined" && (localStorage.getItem("theme") as Theme)) || "dark"
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const p = await ensureProfile(u.uid, u.email);
          setProfile(p);
          if (p.language) {
            setLangState(p.language);
            localStorage.setItem("lang", p.language);
          }
          if (p.theme) {
            setThemeState(p.theme);
            localStorage.setItem("theme", p.theme);
          }
        } catch (e) {
          console.error("[profile] load failed", e);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const refreshProfile = async () => {
    if (!user) return;
    const p = await getProfile(user.uid);
    if (p) setProfile(p);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    // Layout is intentionally locked LTR for all languages to keep UI stable.
    root.setAttribute("dir", "ltr");
    root.setAttribute("lang", lang);
    localStorage.setItem("theme", theme);
    localStorage.setItem("lang", lang);
  }, [theme, lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (user) updateProfile(user.uid, { language: l }).catch(() => {});
  };
  const setTheme = (th: Theme) => {
    setThemeState(th);
    if (user) updateProfile(user.uid, { theme: th }).catch(() => {});
  };

  return (
    <AppCtx.Provider
      value={{
        user,
        loading,
        profile,
        isAdmin: isAdminEmail(user?.email),
        refreshProfile,
        lang,
        setLang,
        theme,
        setTheme,
        t: dict[lang],
        signOut: async () => {
          await fbSignOut(auth);
        },
      }}
    >
      {children}
    </AppCtx.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("AppProvider missing");
  return ctx;
};
