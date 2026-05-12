'use client';

import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/lib/context/AppContext';
import { MOCK_USERS } from '@/lib/mock-data/users';
import ChatWindow from '@/components/shared/ChatWindow';

export default function TherapistChatPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const { currentUser, getConversation } = useApp();
  const router = useRouter();

  if (!currentUser) return null;

  const patient = MOCK_USERS.find(u => u.id === patientId);
  if (!patient) return <div className="p-6 text-gray-400">환자를 찾을 수 없습니다.</div>;

  const messages = getConversation(currentUser.id, patient.id);

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
        <ChatWindow messages={messages} currentUser={currentUser} otherUser={patient} />
      </div>
    </div>
  );
}
