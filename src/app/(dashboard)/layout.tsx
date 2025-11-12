

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
        // If there's a user but no profile, or vice versa, something is wrong.
        // For now, deny access. A more robust solution might log this error.
        setHasAccess(false);
    }
  }, [user, profile, pathname, isUserLoading, isProfileLoading]);


  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
    // The useEffect hook will handle the redirection
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  const getUserAvatar = (profile: User) => {
    if (profile.username === 'admin') {
      return 'https://escarcega.gob.mx/wp-content/uploads/2021/08/logo-escarcega-white.png';
    }

    switch(profile.gender) {
        case 'male':
            return 'https://placehold.co/40x40/3F51B5/FFFFFF/png?text=H&font=roboto';
        case 'female':
            return 'https://placehold.co/40x40/8E24AA/FFFFFF/png?text=M&font=roboto';
        default:
             return 'https://placehold.co/40x40/757575/FFFFFF/png?text=U&font=roboto';
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

  const userRoleDisplay = profile.role === 'admin' ? 'Administrador' : 'Usuario';

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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-3 px-2 py-1 rounded-md hover:bg-sidebar-accent cursor-pointer">
                      <Avatar className="h-8 w-8 bg-sidebar-accent">
                        <AvatarImage src={getUserAvatar(profile)} alt={profile.name} data-ai-hint="person avatar" />
                        <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col truncate">
                        <span className="text-sm font-semibold">{profile.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">{userRoleDisplay}</span>
                      </div>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
                    <DropdownMenuLabel>{profile.username}</DropdownMenuLabel>
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
      </div>
      <SidebarInset>
        {!hasAccess ? (
            <div className="flex h-full flex-col items-center justify-center bg-background p-4 print-hide">
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

