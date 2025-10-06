import { products } from "@/lib/data";
import InventoryClient from "@/components/inventory/inventory-client";

export default async function InventoryPage() {
  // In a real app, this data would be fetched from a database
  const inventoryData = products;

  return (
    <div className="flex flex-1 flex-col">
        <InventoryClient data={inventoryData} />
    </div>
  );
}
