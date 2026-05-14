'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  User, ExerciseLog, Prescription, Message, PatientProfile,
  TherapistComment, PrescribedExercise,
} from '@/lib/types';
import { MOCK_PROFILES, MOCK_COMMENTS } from '@/lib/mock-data/profiles';
import {
  apiLogin, apiFetchPatients, apiCreateLog,
  apiFetchMyLogs, apiFetchPatientLogs,
  apiFetchMyPrescription, apiFetchPatientPrescription,
  apiFetchAISummary, apiFetchUser,
  saveToken, saveUser, loadSavedUser, clearSession,
} from '@/lib/api';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  logs: ExerciseLog[];
  prescriptions: Prescription[];
  messages: Message[];
  profiles: PatientProfile[];
  comments: TherapistComment[];
  loading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => void;
  addLog: (log: ExerciseLog) => Promise<void>;
  addPrescription: (presc: Prescription) => void;
  addExercisesToPrescription: (prescriptionId: string, exercises: PrescribedExercise[]) => void;
  sendMessage: (msg: Message) => void;
  addComment: (comment: TherapistComment) => void;
  getPatientLogs: (patientId: string) => ExerciseLog[];
  getPatientPrescription: (patientId: string) => Prescription | undefined;
  getPatientProfile: (patientId: string) => PatientProfile | undefined;
  getPatientComments: (patientId: string) => TherapistComment[];
  getConversation: (userId1: string, userId2: string) => Message[];
  getTherapistPatients: (therapistId: string) => User[];
  getAISummary: (patientId: string) => Promise<string>;
}

const AppContext = createContext<AppContextType | null>(null);

async function loadDataForUser(
  user: User,
  setUsers: React.Dispatch<React.SetStateAction<User[]>>,
  setLogs: React.Dispatch<React.SetStateAction<ExerciseLog[]>>,
  setPrescriptions: React.Dispatch<React.SetStateAction<Prescription[]>>,
): Promise<void> {
  if (user.role === 'patient') {
    const [logs, presc] = await Promise.all([
      apiFetchMyLogs(),
      apiFetchMyPrescription(),
    ]);
    setLogs(logs);
    setPrescriptions(presc ? [presc] : []);
    if (user.therapistId) {
      try {
        const therapist = await apiFetchUser(user.therapistId);
        setUsers([therapist]);
      } catch {}
    }
  } else {
    // Therapist: load patients, then their logs + prescriptions in parallel
    const patients = await apiFetchPatients();
    setUsers(patients);
    const [logsArrays, prescs] = await Promise.all([
      Promise.all(patients.map(p => apiFetchPatientLogs(p.id))),
      Promise.all(patients.map(p => apiFetchPatientPrescription(p.id))),
    ]);
    setLogs(logsArrays.flat());
    setPrescriptions(prescs.filter((p): p is Prescription => !!p));
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [comments, setComments] = useState<TherapistComment[]>(MOCK_COMMENTS);
  const [loading, setLoading] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedUser = loadSavedUser();
    if (!savedUser) return;
    setCurrentUser(savedUser);
    setLoading(true);
    loadDataForUser(savedUser, setUsers, setLogs, setPrescriptions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User | null> => {
    try {
      const { token, user } = await apiLogin(email, password);
      saveToken(token);
      saveUser(user);
      setCurrentUser(user);
      setLoading(true);
      await loadDataForUser(user, setUsers, setLogs, setPrescriptions);
      return user;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setCurrentUser(null);
    setUsers([]);
    setLogs([]);
    setPrescriptions([]);
  }, []);

  const addLog = useCallback(async (log: ExerciseLog): Promise<void> => {
    try {
      const { id: _clientId, ...rest } = log;
      const saved = await apiCreateLog(rest);
      setLogs(prev => [...prev, saved]);
    } catch {
      // Optimistic fallback if API call fails
      setLogs(prev => [...prev, log]);
    }
  }, []);

  const addPrescription = useCallback((presc: Prescription) => {
    setPrescriptions(prev => [...prev, presc]);
  }, []);

  const addExercisesToPrescription = useCallback((prescriptionId: string, exercises: PrescribedExercise[]) => {
    setPrescriptions(prev => prev.map(p => {
      if (p.id !== prescriptionId) return p;
      const existing = new Set(p.exercises.map(e => e.exerciseId));
      const toAdd = exercises.filter(e => !existing.has(e.exerciseId));
      return { ...p, exercises: [...p.exercises, ...toAdd] };
    }));
  }, []);

  const sendMessage = useCallback((msg: Message) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  const addComment = useCallback((comment: TherapistComment) => {
    setComments(prev => [...prev, comment]);
  }, []);

  const getPatientLogs = useCallback((patientId: string) => {
    return logs.filter(l => l.patientId === patientId);
  }, [logs]);

  const getPatientPrescription = useCallback((patientId: string) => {
    return prescriptions.find(p => p.patientId === patientId);
  }, [prescriptions]);

  const getPatientProfile = useCallback((patientId: string) => {
    return MOCK_PROFILES.find(p => p.patientId === patientId);
  }, []);

  const getPatientComments = useCallback((patientId: string) => {
    return comments
      .filter(c => c.patientId === patientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [comments]);

  const getConversation = useCallback((userId1: string, userId2: string) => {
    return messages
      .filter(m =>
        (m.senderId === userId1 && m.receiverId === userId2) ||
        (m.senderId === userId2 && m.receiverId === userId1)
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages]);

  const getTherapistPatients = useCallback((_therapistId: string) => {
    return users.filter(u => u.role === 'patient');
  }, [users]);

  const getAISummary = useCallback((patientId: string): Promise<string> => {
    return apiFetchAISummary(patientId);
  }, []);

  return (
    <AppContext.Provider value={{
      currentUser,
      users,
      logs,
      prescriptions,
      messages,
      profiles: MOCK_PROFILES,
      comments,
      loading,
      login,
      logout,
      addLog,
      addPrescription,
      addExercisesToPrescription,
      sendMessage,
      addComment,
      getPatientLogs,
      getPatientPrescription,
      getPatientProfile,
      getPatientComments,
      getConversation,
      getTherapistPatients,
      getAISummary,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
