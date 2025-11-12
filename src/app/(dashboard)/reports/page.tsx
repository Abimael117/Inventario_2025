
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

import ReportsClient from '@/components/reports/reports-client';
import AppHeader from '@/components/header';
import type { Product, Loan } from '@/lib/types';


export default function ReportsPage() {
  const firestore = useFirestore();

  const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const loansRef = useMemoFirebase(() => firestore ? collection(firestore, 'loans') : null, [firestore]);
  
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsRef);
  const { data: loans, isLoading: isLoadingLoans } = useCollection<Loan>(loansRef);

  const isLoading = isLoadingProducts || isLoadingLoans;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Reportes" />
      <main className="flex-1 p-4 md:p-6">
        {isLoading ? (
            <div className="flex flex-1 items-center justify-center pt-24">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Cargando datos para el reporte...</p>
                </div>
            </div>
        ) : (
            <ReportsClient
              products={products || []}
              loans={loans || []}
            />
        )}
      </main>
    </div>
  );
}
