
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import AppHeader from '@/components/header';
import SettingsClient from '@/components/users/settings-client';
import type { User } from '@/lib/types';

export default function SettingsPage() {
  const firestore = useFirestore();

  const usersCollectionRef = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: rawUsers, isLoading: isLoadingUsers } = useCollection<User>(usersCollectionRef);

  // Deduplicate and sort users
  const users = useMemo(() => {
    if (!rawUsers) return [];
    const uniqueUsersMap = new Map<string, User>();
    for (const user of rawUsers) {
      if (user && user.uid) {
        uniqueUsersMap.set(user.uid, user);
      }
    }
    return Array.from(uniqueUsersMap.values()).sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (b.role === 'admin' && a.role !== 'admin') return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [rawUsers]);

  if (isLoadingUsers && !rawUsers) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title="Configuración" />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando usuarios...</p>
          </div>
        </main>
      </div>
    );
  }

  return <SettingsClient users={users} isLoading={isLoadingUsers} />;
}
