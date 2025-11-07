
'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { seedLoans } from '@/app/actions';

import LoansClient from "@/components/loans/loans-client";
import type { Loan, Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function LoansPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();
  const [isSeeding, startSeedingTransition] = useTransition();
  const [hasSeedingBeenAttempted, setHasSeedingBeenAttempted] = useState(false);

  const loansRef = useMemoFirebase(() => firestore ? collection(firestore, 'loans') : null, [firestore]);
  const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);

  const { data: loans, isLoading: isLoadingLoans } = useCollection<Loan>(loansRef);
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsRef);

  useEffect(() => {
    if (!isLoadingLoans && loans?.length === 0 && !hasSeedingBeenAttempted) {
        setHasSeedingBeenAttempted(true);
        startSeedingTransition(async () => {
            toast({
                title: "Base de Datos Vacía",
                description: "Migrando préstamos iniciales a la base de datos...",
            });
            const result = await seedLoans();
            if (result.success && (result.count ?? 0) > 0) {
                toast({
                    title: "Migración Completa",
                    description: `${result.count} préstamos han sido añadidos. Los datos aparecerán en breve.`,
                });
            } else if (result.error) {
                toast({
                    variant: "destructive",
                    title: "Error en Migración",
                    description: result.error,
                });
            }
        });
    }
  }, [loans, isLoadingLoans, hasSeedingBeenAttempted, toast]);
  
  if (isLoadingLoans || isLoadingProducts || isSeeding) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <p className="text-muted-foreground mt-2">{isSeeding ? 'Migrando datos iniciales...' : 'Cargando datos...'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
        <LoansClient loans={loans || []} products={products || []} />
    </div>
  );
}
