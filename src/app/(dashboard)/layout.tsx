
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Package, Settings, ArrowRightLeft, LogOut, Loader2, ShieldAlert } from "lucide-react";
import React, { useEffect, useState } from 'react';

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
import { Button } from "@/components/ui/button";

type UserSession = {
  name: string;
  username: string;
  role: 'admin' | 'user';
  permissions: string[];
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const sessionData = sessionStorage.getItem('user-session');
      if (sessionData) {
        const parsedSession: UserSession = JSON.parse(sessionData);
        setSession(parsedSession);

        // Check for access
        const currentRoute = pathname.split('/')[1] || 'dashboard';
        const routePermissionMap: { [key: string]: string } = {
          '': 'dashboard',
          'dashboard': 'dashboard',
          'inventory': 'inventory',
          'loans': 'loans',
          'settings': 'settings'
        };
        
        const requiredPermission = routePermissionMap[currentRoute];

        if (requiredPermission && (parsedSession.permissions?.includes(requiredPermission) || parsedSession.role === 'admin')) {
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      } else {
        router.replace('/login');
      }
    } catch (e) {
      console.error("Failed to parse user session", e);
      router.replace('/login');
    }
  }, [router, pathname]);

  const handleLogout = () => {
    sessionStorage.removeItem('user-session');
    router.replace('/login');
  };

  const getInitials = (name: string) => {
    if (!name) return '';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  if (!isClient || !session) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const canView = (permission: string) => {
    return session.role === 'admin' || session.permissions?.includes(permission);
  }

  const userRoleDisplay = session.role === 'admin' ? 'Administrador' : 'Usuario';

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
            {canView('dashboard') && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/dashboard"}
                  tooltip="Panel"
                >
                  <Link href="/dashboard">
                    <Home />
                    <span>Panel</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {canView('inventory') && (
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
            )}
            {canView('loans') && (
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
            {session.role === 'admin' && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/settings")}
                  tooltip="Configuración"
                >
                  <Link href="/settings">
                    <Settings />
                    <span>Configuración</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-3 px-2 py-1 rounded-md hover:bg-sidebar-accent cursor-pointer">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://picsum.photos/seed/${session.username}/40/40`} alt={session.name} data-ai-hint="person avatar" />
                      <AvatarFallback>{getInitials(session.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col truncate">
                      <span className="text-sm font-semibold">{session.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">{userRoleDisplay}</span>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
                  <DropdownMenuLabel>{session.username}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
                     <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="print-hide">
        {!hasAccess ? (
            <div className="flex h-full flex-col items-center justify-center bg-background p-4">
                <ShieldAlert className="h-16 w-16 text-destructive" />
                <h2 className="mt-4 text-2xl font-bold">Acceso Denegado</h2>
                <p className="mt-2 text-muted-foreground">No tienes permiso para ver esta página.</p>
                <Button onClick={() => router.back()} className="mt-6">Volver</Button>
            </div>
        ) : children}
      </SidebarInset>
    </SidebarProvider>
  );
}
