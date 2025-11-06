'use server';
import DashboardClient from "@/components/dashboard/dashboard-client";
import AppHeader from "@/components/header";
import type { Product, Loan } from '@/lib/types';
import { promises as fs } from 'fs';
import path from 'path';

async function getProducts(): Promise<Product[]> {
  const filePath = path.join(process.cwd(), 'src', 'lib', 'products.json');
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(data);
    return jsonData.products || [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    console.error('Error reading or parsing products.json:', error);
    return [];
  }
}

async function getLoans(): Promise<Loan[]> {
  const filePath = path.join(process.cwd(), 'src', 'lib', 'loans.json');
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(data);
    return jsonData.loans || [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    console.error('Error reading or parsing loans.json:', error);
    return [];
  }
}


export default async function DashboardPage() {
  const inventoryData = await getProducts();
  const recentChanges = await getLoans();

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Panel" />
      <main className="flex-1 p-4 md:p-6 print-hide">
        <DashboardClient
          inventoryData={inventoryData}
          recentChanges={recentChanges}
        />
      </main>
    </div>
  );
}
