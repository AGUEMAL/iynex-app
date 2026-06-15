import type { Lang } from "./i18n";

const PHRASES: Record<Lang, string[]> = {
  en: [
    "Great work, {name}!",
    "One step closer, {name}.",
    "{name}, momentum is yours.",
    "Keep that fire alive, {name}.",
    "Discipline > motivation, {name}.",
    "Make today count, {name}.",
    "{name}, your future self thanks you.",
    "Small wins compound, {name}.",
    "Show up, {name}. That's the secret.",
    "Stay sharp, {name}.",
  ],
  ar: [
    "أحسنت يا {name}!",
    "خطوة أقرب يا {name}.",
    "الزخم لك يا {name}.",
    "حافظ على شغفك يا {name}.",
    "الانضباط يصنع الفرق يا {name}.",
    "اجعل يومك مهماً يا {name}.",
    "{name}، أنت في الطريق الصحيح.",
    "الانتصارات الصغيرة تُراكم يا {name}.",
    "استمر يا {name}، السر في المثابرة.",
    "ابقَ يقظاً يا {name}.",
  ],
  fr: [
    "Excellent travail, {name} !",
    "Un pas de plus, {name}.",
    "{name}, l'élan est à toi.",
    "Garde la flamme, {name}.",
    "Discipline avant motivation, {name}.",
    "Rends ce jour utile, {name}.",
    "{name}, ton futur te remerciera.",
    "Les petites victoires comptent, {name}.",
    "Reste présent, {name}.",
    "Concentration totale, {name}.",
  ],
};

const STORAGE_KEY = "iynex_motiv_recent";

export function getMotivation(lang: Lang, name: string): string {
  const pool = PHRASES[lang] || PHRASES.en;
  let recent: number[] = [];
  try {
    recent = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    recent = [];
  }
  const available = pool.map((_, i) => i).filter((i) => !recent.includes(i));
  const choices = available.length ? available : pool.map((_, i) => i);
  const idx = choices[Math.floor(Math.random() * choices.length)];
  recent = [idx, ...recent].slice(0, Math.min(5, pool.length - 1));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
  } catch {
    /* ignore */
  }
  return pool[idx].replace("{name}", name || "");
}
