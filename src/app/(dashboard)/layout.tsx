

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Package, Settings, ArrowRightLeft, LogOut, Loader2, ShieldAlert, FileText } from "lucide-react";
import React, { useEffect, useState } from 'react';

import { useUser, useAuth, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from "firebase/firestore";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { User } from "@/lib/types";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<User>(userDocRef);

  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [isUserLoading, user, router]);

  useEffect(() => {
    if (user && profile) {
      // Check for access
      const currentRoute = pathname.split('/')[1] || 'dashboard';
      const routePermissionMap: { [key: string]: string } = {
        '': 'dashboard',
        'dashboard': 'dashboard',
        'inventory': 'inventory',
        'loans': 'loans',
        'reports': 'reports',
        'settings': 'settings'
      };
      
      const requiredPermission = routePermissionMap[currentRoute];

      if (requiredPermission && (profile.permissions?.includes(requiredPermission) || profile.role === 'admin')) {
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
    } else if (!isUserLoading && !isProfileLoading) {
        setHasAccess(false);
    }
  }, [user, profile, pathname, isUserLoading, isProfileLoading]);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      // The useEffect hook above will handle the redirect to /login
    }
  };

  if (isUserLoading || isProfileLoading || !user || !profile) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const canView = (permission: string) => {
    return profile.role === 'admin' || profile.permissions?.includes(permission);
  }

  return (
    <SidebarProvider>
      <div className="print-hide">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <Icons.logo className="size-6 text-primary" />
              <h1 className="text-xl font-semibold">D.E.C.D</h1>
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
              {canView('reports') && (
                 <SidebarMenuItem>
                    <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith("/reports")}
                        tooltip="Reportes"
                    >
                        <Link href="/reports">
                            <FileText />
                            <span>Reportes</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {profile.role === 'admin' && (
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
                <SidebarMenuButton onClick={handleLogout} tooltip="Cerrar Sesión">
                  <LogOut />
                  <span>Cerrar Sesión</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
      </div>
      <main className="relative flex min-h-svh flex-1 flex-col bg-background peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow">
        {!hasAccess ? (
            <div className="flex h-full flex-col items-center justify-center bg-background p-4 print-hide">
                <ShieldAlert className="h-16 w-16 text-destructive" />
                <h2 className="mt-4 text-2xl font-bold">Acceso Denegado</h2>
                <p className="mt-2 text-muted-foreground">No tienes permiso para ver esta página.</p>
                <Button onClick={() => router.back()} className="mt-6">Volver</Button>
            </div>
        ) : children}
      </main>
    </SidebarProvider>
  );
}
