'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Message, User } from '@/lib/types';

interface ChatWindowProps {
  messages: Message[];
  currentUser: User;
  otherUser: User;
  onSend: (content: string) => void;
}

function tsToMs(ts: string): number {
  return new Date(ts).getTime();
}

export default function ChatWindow({ messages, currentUser, otherUser, onSend }: ChatWindowProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () => [...messages].sort((a, b) => tsToMs(a.timestamp) - tsToMs(b.timestamp)),
    [messages],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [sorted.length]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const groupedMessages = useMemo(
    () => sorted.reduce<{ date: string; msgs: Message[] }[]>((acc, msg) => {
      const date = msg.timestamp.split('T')[0];
      const last = acc[acc.length - 1];
      if (last && last.date === date) last.msgs.push(msg);
      else acc.push({ date, msgs: [msg] });
      return acc;
    }, []),
    [sorted],
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-slate-100">
        <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
          {otherUser.avatarInitials}
        </div>
        <div>
          <p className="font-bold text-sm text-slate-900">{otherUser.name}</p>
          <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            온라인
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {sorted.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-400 text-sm">아직 메시지가 없습니다.</p>
            <p className="text-slate-300 text-xs mt-1">첫 메시지를 보내보세요!</p>
          </div>
        )}
        {groupedMessages.map(({ date, msgs }) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">
                {new Date(date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <div className="space-y-3">
              {msgs.map(msg => {
                const isMine = msg.senderId === currentUser.id;
                return (
                  <div key={msg.id} className={`flex items-end gap-2.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                    {!isMine && (
                      <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                        {otherUser.avatarInitials}
                      </div>
                    )}
                    <div className={`max-w-[68%] group`}>
                      <div
                        className={`px-4 py-3 text-sm leading-relaxed ${
                          isMine
                            ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm shadow-sm shadow-blue-200'
                            : 'bg-white text-slate-800 rounded-2xl rounded-bl-sm card-shadow border border-slate-100'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <p className={`text-xs text-slate-300 mt-1 ${isMine ? 'text-right' : ''}`}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-4 bg-white border-t border-slate-100">
        <div className="flex items-end gap-3 bg-slate-50 rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-blue-400 focus-within:bg-white transition-all">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            rows={1}
            className="flex-1 bg-transparent resize-none text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none max-h-28"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-xl flex-shrink-0 disabled:opacity-30 hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-slate-300 text-center mt-2">Enter로 전송, Shift+Enter로 줄바꿈</p>
      </div>
    </div>
  );
}
