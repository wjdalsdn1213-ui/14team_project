'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ExerciseLog,
  Message,
  PatientProfile,
  Prescription,
  PrescribedExercise,
  TherapistComment,
  User,
} from '@/lib/types';

interface BootstrapPayload {
  currentUser: User | null;
  users: User[];
  logs: ExerciseLog[];
  prescriptions: Prescription[];
  messages: Message[];
  profiles: PatientProfile[];
  comments: TherapistComment[];
}

interface AppContextType extends BootstrapPayload {
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  refreshData: () => Promise<void>;
  addLog: (log: ExerciseLog) => Promise<void>;
  addPrescription: (presc: Prescription) => Promise<void>;
  addExercisesToPrescription: (prescriptionId: string, exercises: PrescribedExercise[]) => Promise<void>;
  sendMessage: (msg: Message) => Promise<void>;
  addComment: (comment: TherapistComment) => Promise<void>;
  getPatientLogs: (patientId: string) => ExerciseLog[];
  getPatientPrescription: (patientId: string) => Prescription | undefined;
  getPatientProfile: (patientId: string) => PatientProfile | undefined;
  getPatientComments: (patientId: string) => TherapistComment[];
  getConversation: (userId1: string, userId2: string) => Message[];
  getTherapistPatients: (therapistId: string) => User[];
}

const emptyState: BootstrapPayload = {
  currentUser: null,
  users: [],
  logs: [],
  prescriptions: [],
  messages: [],
  profiles: [],
  comments: [],
};

const AppContext = createContext<AppContextType | null>(null);

async function readJson(response: Response) {
  const data = await response.json().catch(() => null);
  return data;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BootstrapPayload>(emptyState);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = useCallback(async () => {
    const response = await fetch('/api/bootstrap', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      setState(emptyState);
      throw new Error('Failed to load app data');
    }

    const data = (await readJson(response)) as BootstrapPayload;
    setState({
      currentUser: data.currentUser,
      users: data.users ?? [],
      logs: data.logs ?? [],
      prescriptions: data.prescriptions ?? [],
      messages: data.messages ?? [],
      profiles: data.profiles ?? [],
      comments: data.comments ?? [],
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        await refreshData();
      } catch {
        if (!cancelled) {
          setState(emptyState);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [refreshData]);

  const login = useCallback(async (email: string, password: string): Promise<User | null> => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        return null;
      }

      await refreshData();
      const currentUserResponse = await fetch('/api/bootstrap', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (!currentUserResponse.ok) {
        return null;
      }

      const data = (await readJson(currentUserResponse)) as BootstrapPayload;
      return data.currentUser;
    } catch {
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [refreshData]);

  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setState(emptyState);
      setIsLoading(false);
    }
  }, []);

  const addLog = useCallback(async (log: ExerciseLog) => {
    const response = await fetch('/api/patient/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        exerciseId: log.exerciseId,
        prescriptionId: undefined,
        logDate: log.date,
        actualReps: log.actualReps,
        actualSets: log.actualSets,
        painScore: log.painScore,
        difficulty: log.difficulty,
        memo: log.memo,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create log');
    }

    const data = await readJson(response);
    const created = data?.log;

    if (!created) {
      await refreshData();
      return;
    }

    setState(prev => ({
      ...prev,
      logs: [
        {
          id: created.id,
          patientId: created.patient_id,
          exerciseId: created.exercise_id,
          date: created.log_date,
          actualReps: created.actual_reps,
          actualSets: created.actual_sets,
          painScore: created.pain_score,
          difficulty: created.difficulty,
          memo: created.memo ?? undefined,
        },
        ...prev.logs,
      ],
    }));
  }, [refreshData]);

  const addPrescription = useCallback(async (presc: Prescription) => {
    const response = await fetch('/api/prescriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        patientId: presc.patientId,
        startDate: presc.startDate,
        endDate: presc.endDate,
        notes: presc.notes,
        exercises: presc.exercises,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create prescription');
    }

    await refreshData();
  }, [refreshData]);

  const addExercisesToPrescription = useCallback(async (prescriptionId: string, exercises: PrescribedExercise[]) => {
    const response = await fetch(`/api/prescriptions/${prescriptionId}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ exercises }),
    });

    if (!response.ok) {
      throw new Error('Failed to add prescription exercises');
    }

    await refreshData();
  }, [refreshData]);

  const sendMessage = useCallback(async (msg: Message) => {
    const response = await fetch(`/api/chat/conversations/${msg.receiverId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content: msg.content }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const data = await readJson(response);
    const created = data?.message;

    if (!created) {
      await refreshData();
      return;
    }

    setState(prev => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          id: created.id,
          senderId: created.sender_id,
          receiverId: created.receiver_id,
          content: created.content,
          timestamp: created.sent_at,
          read: Boolean(created.read_at),
        },
      ],
    }));
  }, [refreshData]);

  const addComment = useCallback(async (comment: TherapistComment) => {
    const response = await fetch(`/api/therapist/patients/${comment.patientId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content: comment.content }),
    });

    if (!response.ok) {
      throw new Error('Failed to add comment');
    }

    const data = await readJson(response);
    const created = data?.comment;

    if (!created) {
      await refreshData();
      return;
    }

    setState(prev => ({
      ...prev,
      comments: [
        {
          id: created.id,
          patientId: created.patient_id,
          therapistId: created.therapist_id,
          content: created.content,
          createdAt: created.created_at,
        },
        ...prev.comments,
      ],
    }));
  }, [refreshData]);

  const getPatientLogs = useCallback((patientId: string) => {
    return state.logs.filter(l => l.patientId === patientId);
  }, [state.logs]);

  const getPatientPrescription = useCallback((patientId: string) => {
    return state.prescriptions.find(p => p.patientId === patientId);
  }, [state.prescriptions]);

  const getPatientProfile = useCallback((patientId: string) => {
    return state.profiles.find(p => p.patientId === patientId);
  }, [state.profiles]);

  const getPatientComments = useCallback((patientId: string) => {
    return state.comments
      .filter(c => c.patientId === patientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.comments]);

  const getConversation = useCallback((userId1: string, userId2: string) => {
    return state.messages
      .filter(m =>
        (m.senderId === userId1 && m.receiverId === userId2) ||
        (m.senderId === userId2 && m.receiverId === userId1)
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [state.messages]);

  const getTherapistPatients = useCallback((therapistId: string) => {
    return state.users.filter(u => u.role === 'patient' && u.therapistId === therapistId);
  }, [state.users]);

  const value = useMemo<AppContextType>(() => ({
    ...state,
    isLoading,
    login,
    logout,
    refreshData,
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
  }), [
    state,
    isLoading,
    login,
    logout,
    refreshData,
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
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
