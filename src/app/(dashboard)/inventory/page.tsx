'use client'
import InventoryClient from "@/components/inventory/inventory-client";
import { useCollection, firestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Loader2 } from "lucide-react";

export default function InventoryPage() {
    const productsQuery = useMemoFirebase(() => collection(firestore, 'products'), []);
    const { data: inventoryData, isLoading: isLoadingProducts } = useCollection(productsQuery);

    if (isLoadingProducts) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

  return (
    <div className="flex flex-1 flex-col">
        <InventoryClient data={inventoryData || []} />
    </div>
  );
}
