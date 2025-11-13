
"use client";

import { Edit, MoreHorizontal, Trash2, MinusCircle, PlusCircle, Loader2, FileSpreadsheet, XCircle } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddProductForm } from "./add-product-form";
import { EditProductForm } from "./edit-product-form";
import { AdjustStockForm } from "./adjust-stock-form";

interface InventoryClientProps {
  data: Product[];
  isPending: boolean;
  isAddDialogOpen: boolean;
  setIsAddDialogOpen: (isOpen: boolean) => void;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (isOpen: boolean) => void;
  isEditDialogOpen: boolean;
  setIsEditDialogOpen: (isOpen: boolean) => void;
  isAdjustDialogOpen: boolean;
  setIsAdjustDialogOpen: (isOpen: boolean) => void;
  productToDelete: Product | null;
  productToEdit: Product | null;
  productToAdjust: Product | null;
  onAddProduct: (newProductData: Product) => void;
  onEditProduct: (editedProductData: Partial<Omit<Product, 'id'>>) => void;
  onAdjustStock: (adjustmentData: { quantity: number; reason: string }) => void;
  onConfirmDelete: () => void;
  onEditClick: (product: Product) => void;
  onDeleteClick: (product: Product) => void;
  onAdjustClick: (product: Product) => void;
  categories: string[];
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
}

export default function InventoryClient({
  data,
  isPending,
  isAddDialogOpen,
  setIsAddDialogOpen,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  isEditDialogOpen,
  setIsEditDialogOpen,
  isAdjustDialogOpen,
  setIsAdjustDialogOpen,
  productToDelete,
  productToEdit,
  productToAdjust,
  onAddProduct,
  onEditProduct,
  onAdjustStock,
  onConfirmDelete,
  onEditClick,
  onDeleteClick,
  onAdjustClick,
  categories,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
}: InventoryClientProps) {

  return (
    <>
      <main className="flex-1 p-4 md:p-6">
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Todos los Productos</CardTitle>
                        <CardDescription>Gestiona tus productos y sus niveles de stock.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value === "all" ? "" : value)}>
                          <SelectTrigger className="w-auto md:w-[180px]">
                            <SelectValue placeholder="Categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas las categorías</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
                          <SelectTrigger className="w-auto md:w-[150px]">
                            <SelectValue placeholder="Estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="En Stock">En Stock</SelectItem>
                            <SelectItem value="Stock Bajo">Stock Bajo</SelectItem>
                            <SelectItem value="Agotado">Agotado</SelectItem>
                          </SelectContent>
                        </Select>
                         <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Añadir Producto
                        </Button>
                    </div>
                </div>
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
                        {data.length > 0 ? data.map((product) => (
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
                                className={
                                    product.quantity > product.reorderPoint
                                    ? "border-green-600/50 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                    : product.quantity > 0
                                    ? "border-amber-600/50 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                                    : "border-red-600/50 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
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
                                    <DropdownMenuItem onSelect={() => onAdjustClick(product)}>
                                      <MinusCircle className="mr-2 h-4 w-4" /> Ajustar Stock
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => onEditClick(product)}>
                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                    onSelect={() => onDeleteClick(product)}
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
                              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <XCircle className="h-8 w-8" />
                                <p className="font-semibold">No se encontraron productos</p>
                                <p className="text-sm">Intenta ajustar o limpiar los filtros de búsqueda, categoría o estado.</p>
                                {(categoryFilter || statusFilter) && (
                                   <Button size="sm" variant="outline" onClick={() => { setCategoryFilter(''); setStatusFilter(''); }}>
                                      Limpiar filtros
                                    </Button>
                                )}
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
          <AddProductForm onSubmit={onAddProduct} isPending={isPending} />
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
          <EditProductForm onSubmit={onEditProduct} product={productToEdit} isPending={isPending} />
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
          <AdjustStockForm onSubmit={onAdjustStock} product={productToAdjust} isPending={isPending} />
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
            <AlertDialogAction onClick={onConfirmDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
