import { products, stockLogs } from "@/lib/data";
import DashboardClient from "@/components/dashboard/dashboard-client";
import AppHeader from "@/components/header";

export default async function DashboardPage() {
  // In a real app, you would fetch this data from an API or database
  const inventoryData = products;
  const recentChanges = stockLogs;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Dashboard" />
      <main className="flex-1 p-4 md:p-6">
        <DashboardClient
          inventoryData={inventoryData}
          recentChanges={recentChanges}
        />
      </main>
    </div>
  );
}
