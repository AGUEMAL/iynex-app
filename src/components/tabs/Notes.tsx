import { useEffect, useState } from "react";
import { useApp } from "@/lib/AppContext";
import {
  listNotes, createNote, updateNote, deleteNote, type NoteDoc,
} from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { playGlassBreak } from "@/lib/sfx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type NoteStyle = NoteDoc["style"];
type NoteColor = NoteDoc["color"];

const STYLES: NoteStyle[] = ["pin", "tape", "clip", "curl"];
const COLORS: NoteColor[] = ["yellow", "violet", "pink", "lime"];

function stickHaptic() {
  try {
    if (navigator.vibrate) navigator.vibrate([15, 25, 10]);
    const Ctx =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 1400;
    o.type = "triangle";
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    o.start();
    o.stop(ctx.currentTime + 0.13);
  } catch {
    /* ignore */
  }
}

export function Notes() {
  const { t, user } = useApp();
  const [notes, setNotes] = useState<NoteDoc[]>([]);
  const [editing, setEditing] = useState<NoteDoc | null>(null);

  useEffect(() => {
    if (!user) return;
    listNotes(user.uid).then(setNotes);
  }, [user]);

  const create = async () => {
    if (!user) return;
    const style = STYLES[Math.floor(Math.random() * STYLES.length)];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const n = await createNote(user.uid, { title: "", content: "", style, color });
    stickHaptic();
    setNotes((cur) => [n, ...cur]);
    setEditing(n);
  };

  const save = async (n: NoteDoc) => {
    if (!user) return;
    await updateNote(user.uid, n.id, { title: n.title, content: n.content, style: n.style, color: n.color });
    setNotes((cur) => cur.map((x) => (x.id === n.id ? n : x)));
  };

  const remove = async (id: string) => {
    if (!user) return;
    playGlassBreak();
    await deleteNote(user.uid, id);
    setNotes((cur) => cur.filter((x) => x.id !== id));
    setEditing(null);
  };

  return (
    <div className="px-5 pt-2 pb-28">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl font-bold">{t.notes}</h2>
        <Button onClick={create} size="sm" className="glow-violet">
          <Plus className="h-4 w-4 mr-1" /> {t.addNote}
        </Button>
      </div>

      {notes.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">{t.noNotes}</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 pt-4">
          {notes.map((n, i) => (
            <StickyCard key={n.id} note={n} rotate={(i % 2 === 0 ? -1 : 1) * (1 + (i % 3))} onClick={() => setEditing(n)} />
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="glass-strong border-border max-w-md">
          <DialogHeader>
            <DialogTitle>{t.notes}</DialogTitle>
            <DialogDescription className="sr-only">{t.noteBody}</DialogDescription>
          </DialogHeader>
          {editing && (
            <NoteEditor
              note={editing}
              onChange={(n) => { setEditing(n); save(n); }}
              onDelete={() => remove(editing.id)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StickyCard({ note, rotate, onClick }: { note: NoteDoc; rotate: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ["--rot" as never]: `${rotate}deg` }}
      className={`sticky-note sticky-${note.color} text-left min-h-[150px] flex flex-col`}
    >
      {note.style === "pin" && <span className="pin-deco" />}
      {note.style === "tape" && <span className="tape-deco" />}
      {note.style === "clip" && <span className="clip-deco" />}
      {note.style === "curl" && <span className="curl-corner" />}
      <p className="font-bold text-sm mb-1 line-clamp-1">{note.title || "—"}</p>
      <p className="text-xs whitespace-pre-wrap line-clamp-6 opacity-90">{note.content}</p>
    </button>
  );
}

function NoteEditor({ note, onChange, onDelete }: { note: NoteDoc; onChange: (n: NoteDoc) => void; onDelete: () => void }) {
  const { t } = useApp();
  return (
    <div className="space-y-4">
      <Input placeholder={t.noteTitle} value={note.title} onChange={(e) => onChange({ ...note, title: e.target.value })} />
      <Textarea placeholder={t.noteBody} value={note.content} onChange={(e) => onChange({ ...note, content: e.target.value })} className="min-h-[140px]" />
      <div>
        <p className="text-xs text-muted-foreground mb-2">{t.noteStyle}</p>
        <div className="grid grid-cols-4 gap-2">
          {STYLES.map((s) => (
            <button key={s} onClick={() => onChange({ ...note, style: s })} className={`rounded-lg border py-2 text-xs capitalize ${note.style === s ? "border-primary bg-primary/20" : "border-border"}`}>
              {s === "pin" ? t.pinStyle : s === "tape" ? t.tapeStyle : s === "clip" ? t.clipStyle : t.curlStyle}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">{t.noteColor}</p>
        <div className="flex gap-3">
          {COLORS.map((c) => (
            <button key={c} onClick={() => onChange({ ...note, color: c })} className={`h-9 w-9 rounded-full sticky-${c} ring-2 ${note.color === c ? "ring-primary" : "ring-transparent"}`} aria-label={c} />
          ))}
        </div>
      </div>
      <Button variant="outline" onClick={onDelete} className="w-full text-destructive">
        <Trash2 className="h-4 w-4 mr-2" /> {t.delete}
      </Button>
    </div>
  );
}
