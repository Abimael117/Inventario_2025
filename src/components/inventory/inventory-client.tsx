"use client";

import { useState, useMemo } from "react";
import { Download, Edit, MoreHorizontal, PlusCircle, Trash2 } from "lucide-react";
import { collection, doc } from "firebase/firestore";

import type { Product } from "@/lib/types";
import AppHeader from "@/components/header";
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
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useFirebase } from "@/firebase";

export default function InventoryClient({ data }: { data: Product[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const handleEditClick = (product: Product) => {
    setProductToEdit(product);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete && firestore) {
      const productRef = doc(firestore, "products", productToDelete.id);
      deleteDocumentNonBlocking(productRef);
      toast({
        title: "Éxito",
        description: `El producto "${productToDelete.name}" ha sido eliminado.`,
      });
      setProductToDelete(null);
    }
    setIsDeleteDialogOpen(false);
  };
  
  const handleAddProduct = (newProductData: Omit<Product, 'id'>) => {
    if (firestore) {
      const productsCollection = collection(firestore, "products");
      addDocumentNonBlocking(productsCollection, newProductData);
      toast({
        title: "Éxito",
        description: `El producto "${newProductData.name}" ha sido añadido.`,
      });
      setIsAddDialogOpen(false);
    }
  };

  const handleEditProduct = (editedProductData: Omit<Product, 'id'>) => {
    if (firestore && productToEdit) {
      const productRef = doc(firestore, "products", productToEdit.id);
      setDocumentNonBlocking(productRef, editedProductData, { merge: true });
      toast({
        title: "Éxito",
        description: `El producto "${editedProductData.name}" ha sido actualizado.`,
      });
      setIsEditDialogOpen(false);
      setProductToEdit(null);
    }
  };

  const filteredData = useMemo(() => {
    if (!data) return [];
    const lowercasedQuery = searchQuery.toLowerCase();
    if (!lowercasedQuery) {
      return data;
    }
    return data.filter(
      (product) =>
        product.name.toLowerCase().includes(lowercasedQuery) ||
        product.sku.toLowerCase().includes(lowercasedQuery) ||
        product.category.toLowerCase().includes(lowercasedQuery)
    );
  }, [data, searchQuery]);


  const handleDownloadCsv = () => {
    const headers = ["ID", "Nombre", "SKU", "Categoría", "Cantidad", "Ubicación", "PuntoDeReorden"];
    const csvRows = [
      headers.join(","),
      ...filteredData.map(p => 
        [p.id, `"${p.name}"`, p.sku, p.category, p.quantity, `"${p.location}"`, p.reorderPoint].join(",")
      )
    ];
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
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

  return (
    <>
      <AppHeader 
        title="Inventario"
        search={{
          value: searchQuery,
          onChange: (e) => setSearchQuery(e.target.value),
          placeholder: "Buscar por nombre, SKU, categoría..."
        }}
      >
        <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleDownloadCsv}>
                <Download className="h-4 w-4 mr-2" />
                Descargar CSV
            </Button>
            <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Añadir Producto
            </Button>
        </div>
      </AppHeader>
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
                            <TableHead className="hidden md:table-cell">SKU</TableHead>
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
                        {filteredData.map((product) => (
                            <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="hidden md:table-cell">{product.sku}</TableCell>
                            <TableCell className="hidden lg:table-cell">{product.category}</TableCell>
                            <TableCell className="text-right">{product.quantity}</TableCell>
                            <TableCell className="hidden md-table-cell">{product.location}</TableCell>
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
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => handleEditClick(product)}>
                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                    </DropdownMenuItem>
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
                        ))}
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
          <AddProductForm onSubmit={handleAddProduct} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Producto</DialogTitle>
            <DialogDescription>
              Modifica los detalles del producto. Haz clic en guardar cuando hayas terminado.
            </DialogDescription>
          </DialogHeader>
          <EditProductForm onSubmit={handleEditProduct} product={productToEdit} />
        </DialogContent>
      </Dialog>


      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutely seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el
              producto "{productToDelete?.name}" de tus datos de inventario.
            </dialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
