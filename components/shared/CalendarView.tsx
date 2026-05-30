'use client';

import { useState } from 'react';
import { ExerciseLog } from '@/lib/types';
import { MOCK_EXERCISES } from '@/lib/mock-data/exercises';

interface CalendarViewProps {
  logs: ExerciseLog[];
  onSelectDate?: (date: string, logs: ExerciseLog[]) => void;
  hideDetail?: boolean;
}

export default function CalendarView({ logs, onSelectDate, hideDetail = false }: CalendarViewProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const getDateStr = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const getLogsForDate = (day: number) => logs.filter(l => l.date === getDateStr(day));

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const handleSelect = (day: number) => {
    const dateStr = getDateStr(day);
    setSelectedDate(dateStr);
    onSelectDate?.(dateStr, getLogsForDate(day));
  };

  const selectedLogs = selectedDate ? logs.filter(l => l.date === selectedDate) : [];

  return (
    <div>
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors font-bold">‹</button>
        <span className="font-bold text-slate-900">{viewYear}년 {viewMonth + 1}월</span>
        <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors font-bold">›</button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <div key={d} className={`text-center text-xs font-semibold py-2 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = getDateStr(day);
          const dayLogs = getLogsForDate(day);
          const hasLogs = dayLogs.length > 0;
          const isToday = dateStr === today.toISOString().split('T')[0];
          const isSelected = dateStr === selectedDate;
          const avgPain = hasLogs ? dayLogs.reduce((s, l) => s + l.painScore, 0) / dayLogs.length : 0;
          const dotColor = avgPain <= 3 ? 'bg-emerald-400' : avgPain <= 6 ? 'bg-amber-400' : 'bg-red-400';

          return (
            <button
              key={day}
              onClick={() => handleSelect(day)}
              className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : isToday
                  ? 'bg-blue-50 text-blue-700 font-bold ring-2 ring-blue-200'
                  : hasLogs
                  ? 'hover:bg-slate-50 text-slate-700'
                  : 'text-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="text-xs font-semibold">{day}</span>
              {hasLogs && (
                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white' : dotColor}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* 선택 날짜 기록 — hideDetail이면 팝업을 부모에서 처리 */}
      {!hideDetail && selectedDate && (
        <div className="mt-5 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-slate-800">{selectedDate}</p>
            <span className="text-xs text-slate-400">{selectedLogs.length}건</span>
          </div>
          {selectedLogs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">이 날은 기록이 없어요</p>
          ) : (
            <div className="space-y-2">
              {selectedLogs.map(log => {
                const ex = MOCK_EXERCISES.find(e => e.id === log.exerciseId);
                const painColor =
                  log.painScore <= 3 ? 'text-emerald-600 bg-emerald-50'
                  : log.painScore <= 6 ? 'text-amber-600 bg-amber-50'
                  : 'text-red-600 bg-red-50';
                return (
                  <div key={log.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 text-sm">
                    <span className="font-semibold text-slate-800">{ex?.name ?? log.exerciseId}</span>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{log.actualSets}×{log.actualReps}</span>
                      <span className={`px-2 py-0.5 rounded-lg font-semibold ${painColor}`}>통증 {log.painScore}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
