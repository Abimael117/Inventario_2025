'use client';

import DashboardClient from "@/components/dashboard/dashboard-client";
import AppHeader from "@/components/header";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  // NOTE: Firebase logic has been removed to restore functionality.
  const inventoryData = [];
  const recentChanges = [];
  const productsLoading = false;
  const loansLoading = false;

  if (productsLoading || loansLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title="Panel" />
        <main className="flex-1 p-4 md:p-6 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Panel" />
      <main className="flex-1 p-4 md:p-6 print-hide">
        <DashboardClient
          inventoryData={inventoryData || []}
          recentChanges={recentChanges || []}
        />
      </main>
    </div>
  );
}
