
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Loader2, PlusCircle, Download, Trash2 } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { seedProducts, deleteAllProductsAndData } from '@/app/actions';
import { useRouter } from "next/navigation";

import InventoryClient from "@/components/inventory/inventory-client";
import AppHeader from '@/components/header';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function InventoryPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isSeeding, startSeedingTransition] = useTransition();
  const [isDeleting, startDeletingTransition] = useTransition();
  const [hasSeedingBeenAttempted, setHasSeedingBeenAttempted] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const productsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'products');
  }, [firestore]);

  const { data: products, isLoading } = useCollection<Product>(productsRef);
  
  useEffect(() => {
    if (!isLoading && products?.length === 0 && !hasSeedingBeenAttempted) {
        setHasSeedingBeenAttempted(true);
        startSeedingTransition(async () => {
            toast({
                title: "Base de Datos Vacía",
                description: "Migrando productos iniciales a la base de datos...",
            });
            const result = await seedProducts();
            if (result.success && (result.count ?? 0) > 0) {
                toast({
                    title: "Migración Completa",
                    description: `${result.count} productos han sido añadidos. Los datos aparecerán en breve.`,
                });
            } else if (result.error) {
                toast({
                    variant: "destructive",
                    title: "Error en Migración",
                    description: result.error,
                });
            } else if (result.count === 0) {
                 toast({
                    title: "Base de Datos ya Poblada",
                    description: "No se encontraron nuevos productos para migrar o el archivo está vacío.",
                });
            }
        });
    }
  }, [products, isLoading, hasSeedingBeenAttempted, toast]);

    const handleDownloadCsv = () => {
    if (!products) return;
    const headers = ["ID", "Nombre", "Categoría", "Cantidad", "Ubicación", "PuntoDeReorden"];
    const csvRows = [
      headers.join(","),
      ...products.map(p => 
        [p.id, `"${p.name}"`, p.category, p.quantity, `"${p.location}"`, p.reorderPoint].join(",")
      )
    ];
    const csvString = csvRows.join("\n");
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "stockwise_inventario.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "Descarga Iniciada",
        description: "Tu archivo CSV de inventario se está descargando.",
      });
    }
  };

  const confirmDeleteAll = () => {
    startDeletingTransition(async () => {
      const result = await deleteAllProductsAndData();
      if (result.success) {
        toast({
          title: "Limpieza Completa",
          description: "Todos los productos, préstamos y movimientos han sido eliminados.",
        });
        setHasSeedingBeenAttempted(false); // Allow seeding again
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Error al Eliminar",
          description: result.error || "No se pudieron eliminar todos los datos.",
        });
      }
      setIsDeleteAllConfirmOpen(false);
    });
  };

  const isLoadingData = isLoading || isSeeding;

  if (isLoadingData) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title="Inventario" />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">{isSeeding ? 'Migrando datos iniciales...' : 'Cargando inventario...'}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-1 flex-col">
        <AppHeader
          title="Inventario"
          search={{
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            placeholder: "Buscar por nombre, ID, categoría...",
          }}
        >
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleDownloadCsv} disabled={!products || products.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Descargar CSV
            </Button>
            <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Añadir Producto
            </Button>
             <Button
              size="sm"
              variant="destructive"
              onClick={() => setIsDeleteAllConfirmOpen(true)}
              disabled={!products || products.length === 0 || isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {isDeleting ? 'Eliminando...' : 'Eliminar Todo'}
            </Button>
          </div>
        </AppHeader>
        <InventoryClient data={products || []} searchQuery={searchQuery} onAddProductClick={() => setIsAddDialogOpen(true)} isAddDialogOpen={isAddDialogOpen} setIsAddDialogOpen={setIsAddDialogOpen} />
      </div>

      <AlertDialog open={isDeleteAllConfirmOpen} onOpenChange={setIsDeleteAllConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente TODOS los productos, préstamos y movimientos de la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAll} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isDeleting ? 'Eliminando...' : 'Sí, eliminar todo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
