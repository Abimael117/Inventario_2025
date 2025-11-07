'use server';
import DashboardClient from "@/components/dashboard/dashboard-client";
import AppHeader from "@/components/header";

export default async function DashboardPage() {

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Panel" />
      <main className="flex-1 p-4 md:p-6 print-hide">
        <DashboardClient />
      </main>
    </div>
  );
}
