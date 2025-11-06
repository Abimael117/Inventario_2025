
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Product } from "@/lib/types";

const formSchema = z.object({
  quantity: z.coerce
    .number()
    .int()
    .gt(0, "La cantidad debe ser mayor que cero."),
  reason: z.string().min(3, {
    message: "La razón debe tener al menos 3 caracteres.",
  }),
});

type AdjustStockFormProps = {
  product: Product | null;
  onSubmit: (data: { quantity: number; reason: string }) => void;
  isPending: boolean;
};

export function AdjustStockForm({ product, onSubmit, isPending }: AdjustStockFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      reason: "",
    },
  });

  function handleFormSubmit(values: z.infer<typeof formSchema>) {
    if (product && values.quantity > product.quantity) {
      form.setError("quantity", {
        type: "manual",
        message: `No puedes descontar más de las ${product.quantity} unidades existentes.`,
      });
      return;
    }
    onSubmit(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="space-y-1 rounded-md bg-muted/50 p-3">
            <p className="text-sm font-medium">Producto: {product?.name}</p>
            <p className="text-sm text-muted-foreground">Cantidad actual: {product?.quantity}</p>
        </div>
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cantidad a Descontar</FormLabel>
              <FormControl>
                <Input type="number" min="1" max={product?.quantity} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Razón del Ajuste</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ej: Uso para evento de la comunidad, material dañado durante el transporte, etc."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Proporciona un motivo claro para este ajuste de stock.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? "Descontando..." : "Confirmar Descuento"}
        </Button>
      </form>
    </Form>
  );
}
