'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, ExerciseLog, Prescription, Message, PatientProfile, TherapistComment, PrescribedExercise } from '@/lib/types';
import { MOCK_USERS, MOCK_ACCOUNTS } from '@/lib/mock-data/users';
import { MOCK_LOGS } from '@/lib/mock-data/logs';
import { MOCK_PRESCRIPTIONS } from '@/lib/mock-data/prescriptions';
import { MOCK_MESSAGES } from '@/lib/mock-data/messages';
import { MOCK_PROFILES, MOCK_COMMENTS } from '@/lib/mock-data/profiles';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  logs: ExerciseLog[];
  prescriptions: Prescription[];
  messages: Message[];
  profiles: PatientProfile[];
  comments: TherapistComment[];
  login: (email: string, password: string) => boolean;
  logout: () => void;
  addLog: (log: ExerciseLog) => void;
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
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<ExerciseLog[]>(MOCK_LOGS);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(MOCK_PRESCRIPTIONS);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [comments, setComments] = useState<TherapistComment[]>(MOCK_COMMENTS);

  const login = useCallback((email: string, password: string): boolean => {
    const account = MOCK_ACCOUNTS.find(a => a.email === email && a.password === password);
    if (!account) return false;
    const user = MOCK_USERS.find(u => u.id === account.userId);
    if (!user) return false;
    setCurrentUser(user);
    return true;
  }, []);

  const logout = useCallback(() => setCurrentUser(null), []);

  const addLog = useCallback((log: ExerciseLog) => {
    setLogs(prev => [...prev, log]);
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

  const getTherapistPatients = useCallback((therapistId: string) => {
    return MOCK_USERS.filter(u => u.role === 'patient' && u.therapistId === therapistId);
  }, []);

  return (
    <AppContext.Provider value={{
      currentUser,
      users: MOCK_USERS,
      logs,
      prescriptions,
      messages,
      profiles: MOCK_PROFILES,
      comments,
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
