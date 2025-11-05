'use client'
import InventoryClient from "@/components/inventory/inventory-client";
import { Loader2 } from "lucide-react";

export default function InventoryPage() {
    // NOTE: Firebase logic has been removed to restore functionality.
    const inventoryData = [];
    const isLoadingProducts = false;


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
