'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { Message } from '@/lib/types';
import { apiFetchConversation, apiSendMessage } from '@/lib/api';
import ChatWindow from '@/components/shared/ChatWindow';

export default function PatientChatPage() {
  const { currentUser, users, loading } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);

  const therapist = currentUser ? users.find(u => u.id === currentUser.therapistId) : undefined;

  useEffect(() => {
    if (!therapist) return;
    apiFetchConversation(therapist.id).then(setMessages).catch(() => {});
  }, [therapist?.id]);

  if (!currentUser || currentUser.role !== 'patient') return null;
  if (loading) return <div className="p-8 text-center text-slate-400">로딩 중...</div>;

  if (!therapist)
    return (
      <div className="p-8 text-center text-slate-400">담당 치료사가 배정되지 않았습니다.</div>
    );

  const handleSend = async (content: string) => {
    const msg = await apiSendMessage(therapist.id, content);
    setMessages(prev =>
      [...prev, msg].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    );
  };

  return (
    <div className="h-screen md:h-screen flex flex-col">
      <div className="px-8 py-5 border-b border-slate-100 bg-white">
        <h1 className="text-xl font-bold text-slate-900">치료사 채팅</h1>
        <p className="text-sm text-slate-400 mt-0.5">담당 치료사 {therapist.name}님과 대화하세요</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatWindow messages={messages} currentUser={currentUser} otherUser={therapist} onSend={handleSend} />
      </div>
    </div>
  );
}
