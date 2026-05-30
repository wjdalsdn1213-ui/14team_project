'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { getPatientStats } from '@/lib/utils/stats';
import { apiFetchConversations, ConversationSummary } from '@/lib/api';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export default function TherapistChatListPage() {
  const { currentUser, getTherapistPatients, getPatientLogs, getPatientPrescription } = useApp();
  const [convMap, setConvMap] = useState<Map<string, ConversationSummary>>(new Map());

  useEffect(() => {
    apiFetchConversations()
      .then(list => {
        const map = new Map(list.map(c => [c.partnerId, c]));
        setConvMap(map);
      })
      .catch(() => {});
  }, []);

  if (!currentUser) return null;

  const patients = getTherapistPatients(currentUser.id);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">채팅</h1>
        <p className="text-slate-500 mt-1">채팅할 환자를 선택하세요</p>
      </div>

      <div className="space-y-3">
        {patients.map(patient => {
          const logs = getPatientLogs(patient.id);
          const prescription = getPatientPrescription(patient.id);
          const stats = getPatientStats(logs, prescription);
          const conv = convMap.get(patient.id);
          const unread = conv?.unreadCount ?? 0;

          const attnVariant =
            stats.attentionLevel === 'critical' ? 'critical' as const
            : stats.attentionLevel === 'warning' ? 'warning' as const
            : 'normal' as const;

          return (
            <Link key={patient.id} href={`/therapist/chat/${patient.id}`}>
              <Card hover className="p-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                      {patient.avatarInitials}
                    </div>
                    {unread > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-sm">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{patient.name}</span>
                        <Badge variant={attnVariant} dot>통증 {stats.avgPainScore}</Badge>
                      </div>
                      {conv?.lastMessageTimestamp && (
                        <span className="text-xs text-slate-400">
                          {new Date(conv.lastMessageTimestamp).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    {conv?.lastMessageContent ? (
                      <p className={`text-sm truncate ${unread > 0 ? 'text-slate-800 font-semibold' : 'text-slate-500'}`}>
                        {conv.lastMessageContent}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-300">메시지 없음</p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
