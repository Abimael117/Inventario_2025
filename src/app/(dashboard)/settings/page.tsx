
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

import AppHeader from '@/components/header';
import type { User } from '@/lib/types';
import SettingsClient from '@/components/users/settings-client';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const firestore = useFirestore();
  
  // Memoize the collection reference to prevent infinite re-renders
  const usersRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: users, isLoading } = useCollection<User>(usersRef);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title="Configuración" />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return <SettingsClient initialUsers={users || []} />;
}
