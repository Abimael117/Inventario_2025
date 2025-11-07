
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Loader2, PlusCircle, Download, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import InventoryClient from "@/components/inventory/inventory-client";
import AppHeader from '@/components/header';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { deleteAllData } from '@/app/actions';
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);


  const productsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'products');
  }, [firestore]);

  const { data: products, isLoading } = useCollection<Product>(productsRef);

  const confirmDeleteAll = () => {
    startTransition(async () => {
        const result = await deleteAllData();
        if (result.success) {
            toast({
                title: "Datos Eliminados",
                description: "Se han borrado todos los productos, préstamos y movimientos.",
            });
            router.refresh();
        } else {
            toast({
                variant: "destructive",
                title: "Error al Eliminar",
                description: result.error || "No se pudo completar la operación.",
            });
        }
        setIsDeleteAllDialogOpen(false);
    });
  };

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

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title="Inventario" />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando inventario...</p>
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
            <Button variant="destructive" size="sm" onClick={() => setIsDeleteAllDialogOpen(true)} disabled={isPending || !products || products.length === 0}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Todo
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadCsv} disabled={!products || products.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Descargar CSV
            </Button>
            <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Añadir Producto
            </Button>
          </div>
        </AppHeader>
        <InventoryClient data={products || []} searchQuery={searchQuery} onAddProductClick={() => setIsAddDialogOpen(true)} isAddDialogOpen={isAddDialogOpen} setIsAddDialogOpen={setIsAddDialogOpen} />
      </div>

       <AlertDialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible y eliminará permanentemente TODOS los productos, préstamos y movimientos registrados en la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAll} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sí, eliminar todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
