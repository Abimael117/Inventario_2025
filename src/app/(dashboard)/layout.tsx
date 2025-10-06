"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Home, Package, Settings, ArrowRightLeft } from "lucide-react";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Icons } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Icons.logo className="size-6 text-primary" />
            <h1 className="text-xl font-semibold">StockWise</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/"}
                tooltip="Panel"
              >
                <Link href="/">
                  <Home />
                  <span>Panel</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/inventory")}
                tooltip="Inventario"
              >
                <Link href="/inventory">
                  <Package />
                  <span>Inventario</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/loans")}
                    tooltip="Préstamos"
                >
                    <Link href="/loans">
                        <ArrowRightLeft />
                        <span>Préstamos</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/reports")}
                tooltip="Informes"
                disabled
              >
                <Link href="#">
                  <BarChart2 />
                  <span>Informes</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/settings")}
                tooltip="Configuración"
                disabled
              >
                <Link href="#">
                  <Settings />
                  <span>Configuración</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <div className="flex items-center gap-3 px-2 py-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="https://picsum.photos/seed/avatar/40/40" alt="Usuario" data-ai-hint="person avatar" />
                  <AvatarFallback>AU</AvatarFallback>
                </Avatar>
                <div className="flex flex-col truncate">
                  <span className="text-sm font-semibold">Usuario Admin</span>
                  <span className="text-xs text-muted-foreground">admin@stockwise.com</span>
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
