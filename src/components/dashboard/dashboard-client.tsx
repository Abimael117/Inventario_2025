
"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { AlertTriangle, Package, Warehouse, Loader2, ArrowRightLeft } from "lucide-react";
import { collection } from 'firebase/firestore';
import { useMemo } from "react";

import type { Loan, Product } from "@/lib/types";
import { useCollection, useFirestore } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig
} from "@/components/ui/chart";


const chartConfig = {
  quantity: {
    label: "Cantidad",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function DashboardClient() {
  const firestore = useFirestore();

  const productsRef = useMemo(() => (firestore ? collection(firestore, 'products') : null), [firestore]);
  const loansRef = useMemo(() => (firestore ? collection(firestore, 'loans') : null), [firestore]);
  
  const { data: inventoryData, isLoading: isLoadingProducts } = useCollection<Product>(productsRef);
  const { data: loansData, isLoading: isLoadingLoans } = useCollection<Loan>(loansRef);

  const totalProducts = inventoryData?.length ?? 0;
  const totalStock = inventoryData?.reduce((sum, p) => sum + p.quantity, 0) ?? 0;
  const lowStockItems = useMemo(() => inventoryData?.filter(
    (p) => p.quantity <= p.reorderPoint && p.quantity > 0
  ) ?? [], [inventoryData]);
  const outOfStockItems = useMemo(() => inventoryData?.filter(p => p.quantity === 0) ?? [], [inventoryData]);
  const activeLoans = useMemo(() => loansData?.filter(l => l.status === 'Prestado') ?? [], [loansData]);

  const chartData = useMemo(() => inventoryData?.map(p => ({ name: p.name, quantity: p.quantity })) ?? [], [inventoryData]);

  if (isLoadingProducts || isLoadingLoans) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Productos Totales</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalProducts}</div>
          <p className="text-xs text-muted-foreground">Artículos únicos en inventario</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Stock Total</CardTitle>
          <Warehouse className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStock.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Unidades totales de todos los productos</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alertas de Stock</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{lowStockItems.length + outOfStockItems.length}</div>
          <p className="text-xs text-muted-foreground">{lowStockItems.length} con stock bajo, {outOfStockItems.length} agotados</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Préstamos Activos</CardTitle>
          <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeLoans.length}</div>
          <p className="text-xs text-muted-foreground">Productos actualmente en préstamo</p>
        </CardContent>
      </Card>
      
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Niveles de Inventario</CardTitle>
          <CardDescription>Cantidad de stock actual por producto.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} tickMargin={10} angle={-45} textAnchor="end" height={80} interval={0} tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}/>
                <YAxis />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="quantity" fill="var(--color-quantity)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Artículos con Stock Bajo</CardTitle>
          <CardDescription>Productos que necesitan ser reordenados.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStockItems.length > 0 || outOfStockItems.length > 0 ? (
                <>
                  {outOfStockItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right text-destructive font-bold">{item.quantity}</TableCell>
                    </TableRow>
                  ))}
                  {lowStockItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right text-amber-600 font-bold">{item.quantity}</TableCell>
                    </TableRow>
                  ))}
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                    Todos los niveles de stock están bien.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
