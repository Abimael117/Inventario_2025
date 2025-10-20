'use client';

import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import DashboardClient from "@/components/dashboard/dashboard-client";
import AppHeader from "@/components/header";
import { collection } from "firebase/firestore";

export default function DashboardPage() {
  const { firestore, isUserLoading } = useFirebase();

  const productsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: inventoryData, isLoading: productsLoading } = useCollection(productsQuery);

  const loansQuery = useMemoFirebase(() => firestore ? collection(firestore, 'loans') : null, [firestore]);
  const { data: recentChanges, isLoading: loansLoading } = useCollection(loansQuery);


  if (productsLoading || loansLoading || isUserLoading) {
    return (
        <div className="flex flex-1 flex-col">
            <AppHeader title="Panel" />
            <main className="flex-1 p-4 md:p-6">
                <div>Cargando...</div>
            </main>
        </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Panel" />
      <main className="flex-1 p-4 md:p-6 print-hide">
        <DashboardClient
          inventoryData={inventoryData || []}
          recentChanges={recentChanges || []}
        />
      </main>
    </div>
  );
}
