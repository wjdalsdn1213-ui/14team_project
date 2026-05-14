'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/lib/context/AppContext';
import { Message } from '@/lib/types';
import { apiFetchConversation, apiSendMessage } from '@/lib/api';
import ChatWindow from '@/components/shared/ChatWindow';

export default function TherapistChatPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const { currentUser, users } = useApp();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);

  const patient = users.find(u => u.id === patientId);

  useEffect(() => {
    if (!patient) return;
    apiFetchConversation(patient.id).then(setMessages).catch(() => {});
  }, [patient?.id]);

  if (!currentUser) return null;
  if (!patient) return <div className="p-6 text-gray-400">환자를 찾을 수 없습니다.</div>;

  const handleSend = async (content: string) => {
    const msg = await apiSendMessage(patient.id, content);
    setMessages(prev =>
      [...prev, msg].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    );
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 border-b border-gray-100 bg-white flex items-center gap-3 md:px-8">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-2xl">‹</button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{patient.name}</h1>
          <p className="text-sm text-gray-400">환자</p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatWindow messages={messages} currentUser={currentUser} otherUser={patient} onSend={handleSend} />
      </div>
    </div>
  );
}
