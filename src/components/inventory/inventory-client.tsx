"use client";

import { useState } from "react";
import { Download, Edit, MoreHorizontal, PlusCircle, Trash2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function InventoryClient({ data }: { data: Product[] }) {
  const [products, setProducts] = useState<Product[]>(data);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const { toast } = useToast();

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      // This is a mock implementation. In a real app, you would make an API call.
      setProducts(products.filter((p) => p.id !== productToDelete.id));
      toast({
        title: "Success",
        description: `Product "${productToDelete.name}" has been deleted.`,
      });
      setProductToDelete(null);
    }
    setIsDeleteDialogOpen(false);
  };

  const handleDownloadCsv = () => {
    const headers = ["ID", "Name", "SKU", "Category", "Quantity", "Location", "ReorderPoint"];
    const csvRows = [
      headers.join(","),
      ...products.map(p => 
        [p.id, `"${p.name}"`, p.sku, p.category, p.quantity, `"${p.location}"`, p.reorderPoint].join(",")
      )
    ];
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "stockwise_inventory.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "Download Started",
        description: "Your inventory CSV file is being downloaded.",
      });
    }
  };


  return (
    <>
      <AppHeader title="Inventory">
        <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleDownloadCsv}>
                <Download className="h-4 w-4 mr-2" />
                Download CSV
            </Button>
            <Button size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Product
            </Button>
        </div>
      </AppHeader>
      <main className="flex-1 p-4 md:p-6">
        <Card>
            <CardHeader>
                <CardTitle>All Products</CardTitle>
                <CardDescription>Manage your products and their stock levels.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Product Name</TableHead>
                            <TableHead className="hidden md:table-cell">SKU</TableHead>
                            <TableHead className="hidden lg:table-cell">Category</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="hidden md:table-cell">Location</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>
                            <span className="sr-only">Actions</span>
                            </TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {products.map((product) => (
                            <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="hidden md:table-cell">{product.sku}</TableCell>
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
                                    ? "In Stock"
                                    : product.quantity > 0
                                    ? "Low Stock"
                                    : "Out of Stock"}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                    onSelect={() => handleDeleteClick(product)}
                                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                    >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              product "{productToDelete?.name}" from your inventory data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
