
'use client';

import { useCollection, useFirestore } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, runTransaction, getDoc, getDocs, query, where } from 'firebase/firestore';
import { Loader2, PlusCircle } from 'lucide-react';
import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import InventoryClient from "@/components/inventory/inventory-client";
import AppHeader from '@/components/header';
import type { Product, StockMovement, Notification } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError, errorEmitter } from '@/firebase';

export default function InventoryPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToAdjust, setProductToAdjust] = useState<Product | null>(null);

  const productsRef = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'products');
  }, [firestore]);

  const { data: products, isLoading } = useCollection<Product>(productsRef);

  const uniqueCategories = useMemo(() => {
    if (!products) return [];
    const categories = new Set(products.map(p => p.category));
    return Array.from(categories);
  }, [products]);

  const filteredData = useMemo(() => {
    if (!products) return [];
    const lowercasedQuery = searchQuery.toLowerCase();
    
    return products.filter((product) => {
      // Category filter
      const categoryMatch = categoryFilter ? product.category === categoryFilter : true;
      if (!categoryMatch) return false;

      // Status filter
      const getStatus = (p: Product) => {
        if (p.quantity === 0) return "Agotado";
        if (p.quantity > 0 && p.quantity <= p.reorderPoint) return "Stock Bajo";
        return "En Stock";
      };
      const statusMatch = statusFilter ? getStatus(product) === statusFilter : true;
      if (!statusMatch) return false;
      
      // Search query filter
      if (!lowercasedQuery) return true;
      const nameMatch = product.name?.toLowerCase().includes(lowercasedQuery) ?? false;
      const idMatch = product.id?.toLowerCase().includes(lowercasedQuery) ?? false;
      const categorySearchMatch = product.category?.toLowerCase().includes(lowercasedQuery) ?? false;
      
      return nameMatch || idMatch || categorySearchMatch;
    });
  }, [products, searchQuery, categoryFilter, statusFilter]);


  const handleEditClick = (product: Product) => {
    setProductToEdit(product);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };
  
  const handleAdjustClick = (product: Product) => {
    setProductToAdjust(product);
    setIsAdjustDialogOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete && firestore) {
      startTransition(async () => {
        const loansQuery = query(collection(firestore, 'loans'), where('productId', '==', productToDelete.id), where('status', '==', 'Prestado'));
        const activeLoansSnapshot = await getDocs(loansQuery);
        
        if (!activeLoansSnapshot.empty) {
            toast({
                variant: "destructive",
                title: "Error al Eliminar",
                description: `No se puede eliminar. Hay ${activeLoansSnapshot.size} préstamo(s) activo(s) para este producto.`,
            });
            setIsDeleteDialogOpen(false);
            setProductToDelete(null);
            return;
        }

        const productRef = doc(firestore, 'products', productToDelete.id);
        deleteDoc(productRef)
          .then(() => {
            toast({
                title: "Producto Eliminado",
                description: `El producto "${productToDelete.name}" ha sido eliminado.`,
            });
          })
          .catch(async (serverError) => {
              const permissionError = new FirestorePermissionError({
                  path: productRef.path,
                  operation: 'delete',
              });
              errorEmitter.emit('permission-error', permissionError);
          })
          .finally(() => {
            setIsDeleteDialogOpen(false);
            setProductToDelete(null);
          });
      });
    }
  };
  
  const handleAddProduct = (newProductData: Product) => {
     if (!firestore) return;
    startTransition(async () => {
      const productRef = doc(firestore, 'products', newProductData.id);
      const docSnap = await getDoc(productRef);
      if (docSnap.exists()) {
          toast({
              variant: "destructive",
              title: "Error al Guardar",
              description: 'Este ID de producto ya existe. Por favor, utiliza uno único.',
          });
          return;
      }

      setDoc(productRef, newProductData)
        .then(() => {
          toast({
            title: "Producto Añadido",
            description: `El producto "${newProductData.name}" ha sido guardado.`,
          });
          setIsAddDialogOpen(false);
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: productRef.path,
                operation: 'create',
                requestResourceData: newProductData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    });
  };

  const handleEditProduct = (editedProductData: Partial<Omit<Product, 'id'>>) => {
    if (productToEdit && firestore) {
      startTransition(() => {
        const productRef = doc(firestore, 'products', productToEdit.id);
        setDoc(productRef, editedProductData, { merge: true })
          .then(() => {
              toast({
                  title: "Producto Actualizado",
                  description: `El producto ha sido actualizado.`,
              });
              setIsEditDialogOpen(false);
              setProductToEdit(null);
          })
          .catch(async (serverError) => {
              const permissionError = new FirestorePermissionError({
                  path: productRef.path,
                  operation: 'update',
                  requestResourceData: editedProductData,
              });
              errorEmitter.emit('permission-error', permissionError);
          });
      });
    }
  };

  const handleAdjustStock = (adjustmentData: { quantity: number, reason: string }) => {
    if (productToAdjust && firestore) {
      startTransition(() => {
        const productRef = doc(firestore, 'products', productToAdjust.id);
        
        runTransaction(firestore, async (transaction) => {
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists()) {
                throw new Error("No se encontró el producto.");
            }

            const currentQuantity = productDoc.data().quantity;
            const quantityToAdjust = adjustmentData.quantity;

            if (quantityToAdjust > currentQuantity) {
                throw new Error(`Stock insuficiente. Solo hay ${currentQuantity} unidades.`);
            }

            const newQuantity = currentQuantity - quantityToAdjust;
            transaction.update(productRef, { quantity: newQuantity });

            const movementRef = doc(collection(firestore, `movements`));
            const newMovement: StockMovement = {
                id: movementRef.id,
                productId: productToAdjust.id,
                productName: productToAdjust.name,
                quantity: quantityToAdjust,
                type: 'ajuste',
                reason: adjustmentData.reason,
                date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD
            };
            transaction.set(movementRef, newMovement);

            const notificationRef = doc(collection(firestore, 'notifications'));
            const newNotification: Notification = {
              id: notificationRef.id,
              type: 'ajuste',
              title: `Ajuste en: ${productToAdjust.name}`,
              description: `Se descontaron ${quantityToAdjust} unidades. Razón: ${adjustmentData.reason}.`,
              createdAt: new Date().toISOString(),
              isRead: false,
            };
            transaction.set(notificationRef, newNotification);
            
            return newQuantity;
        })
        .then((newQuantity) => {
            toast({
                title: "Stock Ajustado",
                description: `Se descontaron ${adjustmentData.quantity} unidades de "${productToAdjust.name}". Stock restante: ${newQuantity}.`,
            });
            setIsAdjustDialogOpen(false);
            setProductToAdjust(null);
        })
        .catch(async (error: any) => {
             if (error.code) { // Firestore specific error
                const permissionError = new FirestorePermissionError({
                    path: productRef.path,
                    operation: 'write', // transaction is a write operation
                    requestResourceData: { 
                      quantity: (productToAdjust.quantity || 0) - adjustmentData.quantity, 
                      reason: adjustmentData.reason 
                    }
                });
                errorEmitter.emit('permission-error', permissionError);
            } else { // Generic JS error
                toast({
                  variant: "destructive",
                  title: "Error al Ajustar",
                  description: error.message || "No se pudo ajustar el stock.",
                });
            }
        });
      });
    }
  };
  
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        title="Inventario"
        search={{
          value: searchQuery,
          onChange: (e) => setSearchQuery(e.target.value),
          placeholder: "Buscar por nombre, ID, categoría...",
        }}
      />
        {isLoading ? (
          <main className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Cargando inventario...</p>
            </div>
          </main>
        ) : (
          <InventoryClient
            data={filteredData}
            isPending={isPending}
            isAddDialogOpen={isAddDialogOpen}
            setIsAddDialogOpen={setIsAddDialogOpen}
            isDeleteDialogOpen={isDeleteDialogOpen}
            setIsDeleteDialogOpen={setIsDeleteDialogOpen}
            isEditDialogOpen={isEditDialogOpen}
            setIsEditDialogOpen={setIsEditDialogOpen}
            isAdjustDialogOpen={isAdjustDialogOpen}
            setIsAdjustDialogOpen={setIsAdjustDialogOpen}
            productToDelete={productToDelete}
            productToEdit={productToEdit}
            productToAdjust={productToAdjust}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onAdjustStock={handleAdjustStock}
            onConfirmDelete={confirmDelete}
            onEditClick={handleEditClick}
            onDeleteClick={handleDeleteClick}
            onAdjustClick={handleAdjustClick}
            categories={uniqueCategories}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
        )}
    </div>
  );
}

    
