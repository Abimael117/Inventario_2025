"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { Loan, Product } from "@/lib/types";

const formSchema = z.object({
  productId: z.string({
    required_error: "Por favor, selecciona un producto.",
  }),
  requester: z.string().min(2, {
    message: "El nombre del solicitante debe tener al menos 2 caracteres.",
  }),
  loanDate: z.date({
    required_error: "Se requiere una fecha de préstamo.",
  }),
});

type AddLoanFormProps = {
  onSubmit: (data: Omit<Loan, 'id' | 'status' | 'productName'>, productName: string) => void;
  products: Product[];
};

export function AddLoanForm({ onSubmit, products }: AddLoanFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      requester: "",
      loanDate: new Date(),
    },
  });

  function handleFormSubmit(values: z.infer<typeof formSchema>) {
    const product = products.find(p => p.id === values.productId);
    if (!product) {
        console.error("No se encontró el producto con el ID:", values.productId);
        // Aquí podrías usar un toast para notificar al usuario.
        return;
    }

    onSubmit({
        productId: values.productId,
        requester: values.requester,
        loanDate: values.loanDate.toISOString(),
    }, product.name);
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Producto</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un producto" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {products.filter(p => p.quantity > 0).map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.quantity} disp.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="requester"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quién lo pide</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Equipo de Marketing" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="loanDate"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Qué día sale</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value ? (
                                format(field.value, "PPP", { locale: es })
                            ) : (
                                <span>Elige una fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                            locale={es}
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )}
        />
        <Button type="submit" className="w-full">Guardar Préstamo</Button>
      </form>
    </Form>
  );
}
