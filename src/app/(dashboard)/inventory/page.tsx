
import InventoryClient from "@/components/inventory/inventory-client";
import { promises as fs } from 'fs';
import path from 'path';
import type { Product } from '@/lib/types';

async function getProducts(): Promise<Product[]> {
  const filePath = path.join(process.cwd(), 'src', 'lib', 'products.json');
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(data);
    return jsonData.products || [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // If the file doesn't exist, return an empty array.
      return [];
    }
    console.error('Error reading or parsing products.json:', error);
    return [];
  }
}

export default async function InventoryPage() {
  const products = await getProducts();

  return (
    <div className="flex flex-1 flex-col">
        <InventoryClient data={products} />
    </div>
  );
}
