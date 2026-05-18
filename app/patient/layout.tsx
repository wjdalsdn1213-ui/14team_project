'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context/AppContext';
import Sidebar from '@/components/shared/Sidebar';

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!currentUser) router.replace('/');
    else if (currentUser.role !== 'patient') router.replace('/therapist/dashboard');
  }, [currentUser, isLoading, router]);

  if (isLoading || !currentUser || currentUser.role !== 'patient') return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-60 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}
