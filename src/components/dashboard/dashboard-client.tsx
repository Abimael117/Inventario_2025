"use client";

import { useState, useTransition } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { AlertTriangle, Bot, Loader2, Package, Warehouse } from "lucide-react";

import type { Product, StockLog } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { generateStockLevelSummary } from "@/ai/flows/generate-stock-level-summary";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig
} from "@/components/ui/chart";

type DashboardClientProps = {
  inventoryData: Product[];
  recentChanges: StockLog[];
};

const chartConfig = {
  quantity: {
    label: "Quantity",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function DashboardClient({
  inventoryData,
  recentChanges,
}: DashboardClientProps) {
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState("");
  const { toast } = useToast();

  const totalProducts = inventoryData.length;
  const totalStock = inventoryData.reduce((sum, p) => sum + p.quantity, 0);
  const lowStockItems = inventoryData.filter(
    (p) => p.quantity <= p.reorderPoint
  );

  const handleGenerateSummary = () => {
    startTransition(async () => {
      try {
        const result = await generateStockLevelSummary({
          inventoryData: JSON.stringify(inventoryData),
          recentChangesLog: JSON.stringify(recentChanges),
        });
        setSummary(result.summary);
      } catch (error) {
        console.error("Failed to generate summary:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to generate AI summary. Please try again.",
        });
      }
    });
  };

  const chartData = inventoryData.map(p => ({ name: p.name, quantity: p.quantity }));

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalProducts}</div>
          <p className="text-xs text-muted-foreground">Unique items in inventory</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
          <Warehouse className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStock.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Total units across all products</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{lowStockItems.length}</div>
          <p className="text-xs text-muted-foreground">Items needing re-order</p>
        </CardContent>
      </Card>
      
      <Card className="lg:col-span-3">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <CardTitle>AI-Powered Summary</CardTitle>
          </div>
          <CardDescription>
            Get an automated analysis of your inventory status and recent activities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary ? (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed">{summary}</p>
              <Button variant="outline" size="sm" onClick={() => setSummary("")}>
                Generate New Summary
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border-2 border-dashed bg-muted/50 p-8 text-center">
              <p className="text-sm text-muted-foreground">Click the button to generate an inventory analysis using AI.</p>
              <Button onClick={handleGenerateSummary} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Summary"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Inventory Levels</CardTitle>
          <CardDescription>Current stock quantity per product.</CardDescription>
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
          <CardTitle>Low Stock Items</CardTitle>
          <CardDescription>These products are at or below their reorder point.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStockItems.length > 0 ? lowStockItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right text-destructive font-bold">{item.quantity}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                    All stock levels are healthy.
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
