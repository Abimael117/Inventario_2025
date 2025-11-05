"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Settings, ArrowRightLeft, Check } from "lucide-react";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import React from 'react';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type User = {
  id: number;
  name: string;
  role: string;
  avatar: string;
  initials: string;
};

const users: User[] = [
    { id: 1, name: 'Admin User', role: 'Administrador', avatar: 'https://picsum.photos/seed/avatar1/40/40', initials: 'AU' },
    { id: 2, name: 'Maria Garcia', role: 'Usuario', avatar: 'https://picsum.photos/seed/avatar2/40/40', initials: 'MG' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = React.useState<User>(users[0]);

  const isAdmin = currentUser.role === 'Administrador';

  return (
    <FirebaseClientProvider>
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
              {isAdmin && (
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
              )}
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
              {isAdmin && (
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
              )}
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-3 px-2 py-1 rounded-md hover:bg-sidebar-accent cursor-pointer">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={currentUser.avatar} alt={currentUser.name} data-ai-hint="person avatar" />
                        <AvatarFallback>{currentUser.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col truncate">
                        <span className="text-sm font-semibold">{currentUser.name}</span>
                        <span className="text-xs text-muted-foreground">{currentUser.role}</span>
                      </div>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
                    <DropdownMenuLabel>Cambiar de Usuario</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {users.map((user) => (
                         <DropdownMenuItem key={user.id} onSelect={() => setCurrentUser(user)}>
                             <Avatar className="h-6 w-6 mr-2">
                                 <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person avatar" />
                                 <AvatarFallback>{user.initials}</AvatarFallback>
                             </Avatar>
                             <span>{user.name}</span>
                             {currentUser.id === user.id && <Check className="ml-auto h-4 w-4" />}
                         </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="print-hide">
          {children}
        </SidebarInset>
      </SidebarProvider>
    </FirebaseClientProvider>
  );
}
