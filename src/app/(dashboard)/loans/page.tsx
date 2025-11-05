'use client'
import LoansClient from "@/components/loans/loans-client";
import { Loader2 } from "lucide-react";

export default function LoansPage() {
    // NOTE: Firebase logic has been removed to restore functionality.
    const loansData = [];
    const productsData = [];
    const loansLoading = false;
    const productsLoading = false;

  if (loansLoading || productsLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
        <LoansClient loans={loansData || []} products={productsData || []} />
    </div>
  );
}
