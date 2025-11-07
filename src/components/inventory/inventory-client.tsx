
"use client";

import { useState, useMemo, useTransition } from "react";
import { Edit, MoreHorizontal, Trash2, MinusCircle, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddProductForm } from "./add-product-form";
import { EditProductForm } from "./edit-product-form";
import { AdjustStockForm } from "./adjust-stock-form";
import { saveProduct, updateProduct, deleteProduct, adjustStock } from "@/app/actions";

export default function InventoryClient({ data, searchQuery, onAddProductClick, isAddDialogOpen, setIsAddDialogOpen }: { data: Product[], searchQuery: string, onAddProductClick: () => void, isAddDialogOpen: boolean, setIsAddDialogOpen: (isOpen: boolean) => void; }) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToAdjust, setProductToAdjust] = useState<Product | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

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
    if (productToDelete) {
      startTransition(async () => {
        const result = await deleteProduct(productToDelete.id);
        if (result?.success) {
          toast({
            title: "Producto Eliminado",
            description: `El producto "${productToDelete.name}" ha sido eliminado.`,
          });
          router.refresh();
        } else if (result) {
          toast({
            variant: "destructive",
            title: "Error al Eliminar",
            description: result.error || "No se pudo eliminar el producto.",
          });
        }
        setIsDeleteDialogOpen(false);
        setProductToDelete(null);
      });
    }
  };
  
  const handleAddProduct = (newProductData: Product) => {
    startTransition(async () => {
      const result = await saveProduct(newProductData);
      if (result?.success) {
        toast({
          title: "Producto Añadido",
          description: `El producto "${newProductData.name}" ha sido guardado.`,
        });
        setIsAddDialogOpen(false);
        router.refresh();
      } else if (result) {
        toast({
          variant: "destructive",
          title: "Error al Guardar",
          description: result.error || "No se pudo guardar el producto.",
        });
      }
    });
  };

  const handleEditProduct = (editedProductData: Partial<Omit<Product, 'id'>>) => {
    if (productToEdit) {
      startTransition(async () => {
        const result = await updateProduct(productToEdit.id, editedProductData);
        if (result?.success && result.data) {
          toast({
            title: "Producto Actualizado",
            description: `El producto "${result.data.name}" ha sido actualizado.`,
          });
          setIsEditDialogOpen(false);
          setProductToEdit(null);
          router.refresh();
        } else if (result) {
          toast({
            variant: "destructive",
            title: "Error al Actualizar",
            description: result.error || "No se pudo actualizar el producto.",
          });
        }
      });
    }
  };

  const handleAdjustStock = (adjustmentData: { quantity: number, reason: string }) => {
    if (productToAdjust) {
      startTransition(async () => {
        const result = await adjustStock(productToAdjust.id, adjustmentData);
        if (result?.success) {
          toast({
            title: "Stock Ajustado",
            description: `Se descontaron ${adjustmentData.quantity} unidades de "${productToAdjust.name}".`,
          });
          setIsAdjustDialogOpen(false);
          setProductToAdjust(null);
          router.refresh();
        } else if (result) {
          toast({
            variant: "destructive",
            title: "Error al Ajustar",
            description: result.error || "No se pudo ajustar el stock.",
          });
        }
      });
    }
  };

  const filteredData = useMemo(() => {
    if (!data) return [];
    const lowercasedQuery = searchQuery.toLowerCase();
    if (!lowercasedQuery) {
      return data;
    }
    return data.filter((product) => {
      const nameMatch = product.name?.toLowerCase().includes(lowercasedQuery) ?? false;
      const idMatch = product.id?.toLowerCase().includes(lowercasedQuery) ?? false;
      const categoryMatch = product.category?.toLowerCase().includes(lowercasedQuery) ?? false;
      return nameMatch || idMatch || categoryMatch;
    });
  }, [data, searchQuery]);


  return (
    <>
      <main className="flex-1 p-4 md:p-6">
        <Card>
            <CardHeader>
                <CardTitle>Todos los Productos</CardTitle>
                <CardDescription>Gestiona tus productos y sus niveles de stock.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Nombre del Producto</TableHead>
                            <TableHead className="hidden md:table-cell">ID</TableHead>
                            <TableHead className="hidden lg:table-cell">Categoría</TableHead>
                            <TableHead className="text-right">Cantidad</TableHead>
                            <TableHead className="hidden md:table-cell">Ubicación</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>
                            <span className="sr-only">Acciones</span>
                            </TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredData.length > 0 ? filteredData.map((product) => (
                            <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="hidden md:table-cell">{product.id}</TableCell>
                            <TableCell className="hidden lg:table-cell">{product.category}</TableCell>
                            <TableCell className="text-right">{product.quantity}</TableCell>
                            <TableCell className="hidden md:table-cell">{product.location}</TableCell>
                            <TableCell>
                                <Badge
                                variant={
                                    product.quantity > product.reorderPoint
                                    ? "secondary"
                                    : product.quantity > 0
                                    ? "destructive"
                                    : "outline"
                                }
                                >
                                {product.quantity > product.reorderPoint
                                    ? "En Stock"
                                    : product.quantity > 0
                                    ? "Stock Bajo"
                                    : "Agotado"}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Alternar menú</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                    <DropdownMenuItem onSelect={() => handleAdjustClick(product)}>
                                      <MinusCircle className="mr-2 h-4 w-4" /> Ajustar Stock
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleEditClick(product)}>
                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                    onSelect={() => handleDeleteClick(product)}
                                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                    >
                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <p>No se encontraron productos.</p>
                                <Button size="sm" variant="outline" onClick={onAddProductClick}>
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  Añadir el primero
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      </main>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Añadir Nuevo Producto</DialogTitle>
            <DialogDescription>
              Rellena los detalles del nuevo producto. Haz clic en guardar cuando hayas terminado.
            </DialogDescription>
          </DialogHeader>
          <AddProductForm onSubmit={handleAddProduct} isPending={isPending} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Producto</DialogTitle>
            <DialogDescription>
              Modifica los detalles del producto. El ID no se puede cambiar.
            </DialogDescription>
          </DialogHeader>
          <EditProductForm onSubmit={handleEditProduct} product={productToEdit} isPending={isPending} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ajustar Stock de "{productToAdjust?.name}"</DialogTitle>
            <DialogDescription>
              Descuenta unidades del inventario por uso interno, daño, etc. Esta acción quedará registrada.
            </DialogDescription>
          </DialogHeader>
          <AdjustStockForm onSubmit={handleAdjustStock} product={productToAdjust} isPending={isPending} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutely seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el
              producto "{productToDelete?.name}" de tus datos de inventario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
