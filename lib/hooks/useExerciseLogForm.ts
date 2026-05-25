'use client';

import { useCallback, useMemo, useState } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { MOCK_EXERCISES } from '@/lib/mock-data/exercises';
import { APP_TODAY } from '@/lib/constants/date';
import { Difficulty, ExerciseLog, PrescribedExercise } from '@/lib/types';

export type AvailableExercise = (typeof MOCK_EXERCISES)[0] & {
  prescribed: PrescribedExercise;
};

export function useExerciseLogForm(patientId: string) {
  const { addLog, getPatientPrescription } = useApp();

  const [selectedExId, setSelectedExId] = useState('');
  const [reps, setReps] = useState(10);
  const [sets, setSets] = useState(3);
  const [painScore, setPainScore] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);

  const availableExercises = useMemo(() => {
    const prescribedExercises = getPatientPrescription(patientId)?.exercises ?? [];
    return prescribedExercises
      .map(pe => {
        const ex = MOCK_EXERCISES.find(e => e.id === pe.exerciseId);
        return ex ? { ...ex, prescribed: pe } : null;
      })
      .filter(Boolean) as AvailableExercise[];
  }, [patientId, getPatientPrescription]);

  const selectExercise = useCallback(
    (exerciseId: string) => {
      const ex = availableExercises.find(e => e.id === exerciseId);
      if (!ex) return;
      setSelectedExId(exerciseId);
      setReps(ex.prescribed.targetReps);
      setSets(ex.prescribed.targetSets);
    },
    [availableExercises],
  );

  const resetForm = useCallback(() => {
    setSelectedExId('');
    setReps(10);
    setSets(3);
    setPainScore(0);
    setDifficulty('medium');
    setMemo('');
  }, []);

  const buildLog = useCallback((): ExerciseLog | null => {
    if (!selectedExId) return null;
    return {
      id: `log-${Date.now()}`,
      patientId,
      exerciseId: selectedExId,
      date: APP_TODAY,
      actualReps: reps,
      actualSets: sets,
      painScore,
      difficulty,
      memo: memo.trim() || undefined,
    };
  }, [selectedExId, patientId, reps, sets, painScore, difficulty, memo]);

  const submitLog = useCallback(async (): Promise<boolean> => {
    const log = buildLog();
    if (!log) return false;
    setLoading(true);
    try {
      await addLog(log);
      resetForm();
      return true;
    } finally {
      setLoading(false);
    }
  }, [buildLog, addLog, resetForm]);

  const selectedEx = availableExercises.find(e => e.id === selectedExId);

  const isComplete =
    !!selectedExId &&
    reps >= 1 &&
    sets >= 1 &&
    painScore >= 0 &&
    painScore <= 10;

  return {
    availableExercises,
    selectedExId,
    selectedEx,
    reps,
    sets,
    painScore,
    difficulty,
    memo,
    loading,
    isComplete,
    setReps,
    setSets,
    setPainScore,
    setDifficulty,
    setMemo,
    selectExercise,
    resetForm,
    submitLog,
  };
}
