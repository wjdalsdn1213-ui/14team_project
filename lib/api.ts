import { User, ExerciseLog, Prescription, Difficulty } from '@/lib/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// --- Token / Session helpers ---

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('rehab_token');
}

export function saveToken(token: string): void {
  localStorage.setItem('rehab_token', token);
}

export function saveUser(user: User): void {
  localStorage.setItem('rehab_user', JSON.stringify(user));
}

export function loadSavedUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('rehab_user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem('rehab_token');
  localStorage.removeItem('rehab_user');
}

// --- Core fetcher ---

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// --- Raw API types (snake_case — FastAPI/Python convention) ---

interface RawUser {
  id: string;
  name: string;
  role: 'patient' | 'therapist';
  email: string;
  therapist_id?: string;
}

interface RawExercise {
  id: string;
  name: string;
  body_part: string;
  description: string;
  default_reps: number;
  default_sets: number;
}

interface RawLog {
  id: string;
  patient_id: string;
  exercise_id: string;
  date: string;
  actual_reps: number;
  actual_sets: number;
  pain_score: number;
  difficulty: string;
  memo?: string;
  exercise?: RawExercise;
}

interface RawPrescribedExercise {
  exercise_id: string;
  target_reps: number;
  target_sets: number;
  exercise?: RawExercise;
}

interface RawPrescription {
  id: string;
  patient_id: string;
  therapist_id: string;
  exercises: RawPrescribedExercise[];
  start_date: string;
  end_date?: string;
  notes?: string;
}

// --- Mappers: API → frontend types ---

function mapUser(u: RawUser): User {
  return {
    id: u.id,
    name: u.name,
    role: u.role,
    email: u.email,
    password: '',
    avatarInitials: u.name.slice(0, 2),
    therapistId: u.therapist_id,
  };
}

function mapLog(l: RawLog): ExerciseLog {
  return {
    id: l.id,
    patientId: l.patient_id,
    exerciseId: l.exercise_id,
    date: l.date,
    actualReps: l.actual_reps,
    actualSets: l.actual_sets,
    painScore: l.pain_score,
    difficulty: l.difficulty as Difficulty,
    memo: l.memo,
    exerciseName: l.exercise?.name,
    exerciseBodyPart: l.exercise?.body_part,
  };
}

function mapPrescription(p: RawPrescription): Prescription {
  return {
    id: p.id,
    patientId: p.patient_id,
    therapistId: p.therapist_id,
    exercises: p.exercises.map(e => ({
      exerciseId: e.exercise_id,
      targetReps: e.target_reps,
      targetSets: e.target_sets,
      exerciseName: e.exercise?.name,
      exerciseBodyPart: e.exercise?.body_part,
      exerciseDescription: e.exercise?.description,
    })),
    startDate: p.start_date,
    endDate: p.end_date,
    notes: p.notes,
  };
}

// --- Auth ---

export async function apiLogin(
  email: string,
  password: string,
): Promise<{ token: string; user: User }> {
  // OAuth2 password flow: form-urlencoded with `username` field
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  const data = await res.json() as { access_token: string; token_type: string; user: RawUser };
  return { token: data.access_token, user: mapUser(data.user) };
}

export async function apiRegister(payload: {
  email: string;
  password: string;
  name: string;
  role: string;
}): Promise<{ token: string; user: User }> {
  const data = await request<{ access_token: string; token_type: string; user: RawUser }>(
    '/auth/register',
    { method: 'POST', body: JSON.stringify(payload) },
  );
  return { token: data.access_token, user: mapUser(data.user) };
}

// --- Users ---

export async function apiFetchPatients(): Promise<User[]> {
  const data = await request<RawUser[]>('/users/patients');
  return data.map(mapUser);
}

// --- Logs ---

// Patient: own logs
export async function apiFetchMyLogs(): Promise<ExerciseLog[]> {
  const data = await request<RawLog[]>('/logs/my');
  return data.map(mapLog);
}

// Therapist: specific patient's logs
export async function apiFetchPatientLogs(patientId: string): Promise<ExerciseLog[]> {
  const data = await request<RawLog[]>(`/logs/patient/${patientId}`);
  return data.map(mapLog);
}

export async function apiCreateLog(log: Omit<ExerciseLog, 'id'>): Promise<ExerciseLog> {
  const raw = await request<RawLog>('/logs/', {
    method: 'POST',
    body: JSON.stringify({
      patient_id: log.patientId,
      exercise_id: log.exerciseId,
      date: log.date,
      actual_reps: log.actualReps,
      actual_sets: log.actualSets,
      pain_score: log.painScore,
      difficulty: log.difficulty,
      memo: log.memo,
    }),
  });
  return mapLog(raw);
}

// --- Prescriptions ---

// Patient: own prescription
export async function apiFetchMyPrescription(): Promise<Prescription | undefined> {
  try {
    const data = await request<RawPrescription>('/prescriptions/my');
    return mapPrescription(data);
  } catch {
    return undefined;
  }
}

// Therapist: specific patient's prescription
export async function apiFetchPatientPrescription(patientId: string): Promise<Prescription | undefined> {
  try {
    const data = await request<RawPrescription>(`/prescriptions/patient/${patientId}`);
    return mapPrescription(data);
  } catch {
    return undefined;
  }
}

// --- AI Summary ---

export async function apiFetchAISummary(patientId: string): Promise<string> {
  const data = await request<{ summary: string }>(`/ai/summary?patient_id=${patientId}`);
  return data.summary;
}

// --- Messages ---

interface RawMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  timestamp: string;
  is_read: boolean;
}

function mapMessage(m: RawMessage): import('@/lib/types').Message {
  return {
    id: m.id,
    senderId: m.sender_id,
    receiverId: m.receiver_id,
    content: m.content,
    timestamp: m.timestamp,
    read: m.is_read,
  };
}

interface RawConversation {
  user: RawUser;
  last_message: RawMessage | null;
  unread_count: number;
}

export interface ConversationSummary {
  partnerId: string;
  lastMessageContent: string | null;
  lastMessageTimestamp: string | null;
  unreadCount: number;
}

export async function apiFetchConversations(): Promise<ConversationSummary[]> {
  const data = await request<RawConversation[]>('/messages/conversations');
  return data.map(c => ({
    partnerId: c.user.id,
    lastMessageContent: c.last_message?.content ?? null,
    lastMessageTimestamp: c.last_message?.timestamp ?? null,
    unreadCount: c.unread_count,
  }));
}

export async function apiFetchUser(userId: string): Promise<User> {
  const data = await request<RawUser>(`/users/${userId}`);
  return mapUser(data);
}

export async function apiFetchConversation(partnerId: string): Promise<import('@/lib/types').Message[]> {
  const data = await request<RawMessage[]>(`/messages/${partnerId}`);
  return data.map(mapMessage);
}

export async function apiSendMessage(
  receiverId: string,
  content: string,
): Promise<import('@/lib/types').Message> {
  const raw = await request<RawMessage>('/messages/', {
    method: 'POST',
    body: JSON.stringify({ receiver_id: receiverId, content }),
  });
  return mapMessage(raw);
}
