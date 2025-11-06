'use server'
import LoansClient from "@/components/loans/loans-client";
import type { Loan, Product } from '@/lib/types';
import { promises as fs } from 'fs';
import path from 'path';

async function getLoans(): Promise<Loan[]> {
    const filePath = path.join(process.cwd(), 'src', 'lib', 'loans.json');
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data).loans || [];
    } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
        console.error("Error reading loans", e);
        return [];
    }
}

async function getProducts(): Promise<Product[]> {
    const filePath = path.join(process.cwd(), 'src', 'lib', 'products.json');
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data).products || [];
    } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
        console.error("Error reading products", e);
        return [];
    }
}

export default async function LoansPage() {
    const loansData = await getLoans();
    const productsData = await getProducts();

  return (
    <div className="flex flex-1 flex-col">
        <LoansClient loans={loansData || []} products={productsData || []} />
    </div>
  );
}
