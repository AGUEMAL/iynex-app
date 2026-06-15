import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

export type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  age: number | null;
  language: "en" | "ar" | "fr";
  theme: "dark" | "light";
  createdAt?: Timestamp;
};

export type TaskDoc = {
  id: string;
  date: string;
  name: string;
  type: "fixed" | "flexible";
  duration_minutes: number;
  start_time: string | null;
  scheduled_start: string | null;
  completed: boolean;
  createdAt?: Timestamp;
};

export type NoteDoc = {
  id: string;
  title: string;
  content: string;
  style: "pin" | "tape" | "clip" | "curl";
  color: "yellow" | "violet" | "pink" | "lime";
  createdAt?: Timestamp;
};

export type DailyPlan = {
  wake_time: string;
  sleep_time: string;
};

const mapId = <T,>(snap: QueryDocumentSnapshot<DocumentData>): T =>
  ({ id: snap.id, ...snap.data() }) as T;

// ---- Profile
export async function getProfile(uid: string): Promise<Profile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Profile) : null;
}
export async function ensureProfile(
  uid: string,
  email: string | null
): Promise<Profile> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const fresh: Omit<Profile, "id"> = {
      email,
      name: null,
      age: null,
      language: "en",
      theme: "dark",
      createdAt: serverTimestamp() as unknown as Timestamp,
    };
    await setDoc(ref, fresh);
    return { id: uid, ...fresh };
  }
  return { id: snap.id, ...snap.data() } as Profile;
}
export async function updateProfile(uid: string, patch: Partial<Profile>) {
  // setDoc + merge is resilient if the profile doc was never created
  // (e.g. ensureProfile race or rules error on first write).
  await setDoc(doc(db, "users", uid), patch as DocumentData, { merge: true });
}

// ---- Tasks (subcollection users/{uid}/tasks)
const tasksCol = (uid: string) => collection(db, "users", uid, "tasks");
export async function listTasksForDate(uid: string, date: string): Promise<TaskDoc[]> {
  const q = query(tasksCol(uid), where("date", "==", date));
  const snap = await getDocs(q);
  const arr = snap.docs.map((d) => mapId<TaskDoc>(d));
  arr.sort((a, b) => (a.scheduled_start ?? "").localeCompare(b.scheduled_start ?? ""));
  return arr;
}
export async function listTasksBetween(uid: string, start: string, end: string) {
  const q = query(tasksCol(uid), where("date", ">=", start), where("date", "<=", end));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapId<TaskDoc>(d));
}
export async function deleteTasksForDate(uid: string, date: string) {
  const q = query(tasksCol(uid), where("date", "==", date));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}
export async function createTask(uid: string, data: Omit<TaskDoc, "id">) {
  return addDoc(tasksCol(uid), { ...data, createdAt: serverTimestamp() });
}
export async function updateTask(uid: string, id: string, patch: Partial<TaskDoc>) {
  await updateDoc(doc(db, "users", uid, "tasks", id), patch as DocumentData);
}
export async function deleteTask(uid: string, id: string) {
  await deleteDoc(doc(db, "users", uid, "tasks", id));
}

// ---- Notes
const notesCol = (uid: string) => collection(db, "users", uid, "notes");
export async function listNotes(uid: string): Promise<NoteDoc[]> {
  const q = query(notesCol(uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapId<NoteDoc>(d));
}
export async function createNote(uid: string, data: Omit<NoteDoc, "id" | "createdAt">) {
  const ref = await addDoc(notesCol(uid), { ...data, createdAt: serverTimestamp() });
  const snap = await getDoc(ref);
  return { id: ref.id, ...snap.data() } as NoteDoc;
}
export async function updateNote(uid: string, id: string, patch: Partial<NoteDoc>) {
  await updateDoc(doc(db, "users", uid, "notes", id), patch as DocumentData);
}
export async function deleteNote(uid: string, id: string) {
  await deleteDoc(doc(db, "users", uid, "notes", id));
}

// ---- Daily plans (one per date)
export async function getDailyPlan(uid: string, date: string): Promise<DailyPlan | null> {
  const snap = await getDoc(doc(db, "users", uid, "dailyPlans", date));
  return snap.exists() ? (snap.data() as DailyPlan) : null;
}
export async function setDailyPlan(uid: string, date: string, plan: DailyPlan) {
  await setDoc(doc(db, "users", uid, "dailyPlans", date), plan);
}

// ---- Admin (only callable by admin per security rules)
export async function listAllUsers(): Promise<Profile[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Profile);
}
