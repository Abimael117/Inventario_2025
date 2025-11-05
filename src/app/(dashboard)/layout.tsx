"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Package, Settings, ArrowRightLeft, UserPlus, LogOut, Loader2 } from "lucide-react";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import React, { useEffect } from 'react';

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
import { useFirebase, useUser } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

type UserProfile = {
  name: string;
  role: 'admin' | 'user';
  email: string;
};

const UserSkeleton = () => (
  <div className="flex items-center gap-3 px-2 py-1">
    <Skeleton className="h-8 w-8 rounded-full" />
    <div className="flex flex-col gap-1">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-3 w-16" />
    </div>
  </div>
);

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { auth, firestore, isUserLoading, user } = useFirebase();
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(true);
  
  useEffect(() => {
    if (isUserLoading) {
      setProfileLoading(true);
      return;
    }
    if (!user) {
      router.replace('/login');
      return;
    }

    const fetchUserProfile = async () => {
      setProfileLoading(true);
      if (!firestore) return;
      const userDocRef = doc(firestore, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        setUserProfile(userDocSnap.data() as UserProfile);
      } else {
        console.error("No user profile found in Firestore!");
        auth.signOut();
        router.replace('/login');
      }
      setProfileLoading(false);
    };

    fetchUserProfile();

  }, [user, isUserLoading, firestore, auth, router]);

  const handleLogout = () => {
    if (!auth) return;
    auth.signOut().then(() => {
      router.push('/login');
    });
  };

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  const isLoading = isUserLoading || profileLoading;
  const isAdmin = userProfile?.role === 'admin';

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
             {isAdmin && (
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
            <SidebarMenuItem>
               {isLoading || !userProfile ? (
                  <UserSkeleton />
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="flex items-center gap-3 px-2 py-1 rounded-md hover:bg-sidebar-accent cursor-pointer">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://picsum.photos/seed/${user?.uid}/40/40`} alt={userProfile.name} data-ai-hint="person avatar" />
                          <AvatarFallback>{getInitials(userProfile.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col truncate">
                          <span className="text-sm font-semibold">{userProfile.name}</span>
                          <span className="text-xs text-muted-foreground capitalize">{userProfile.role === 'admin' ? 'Administrador' : 'Usuario'}</span>
                        </div>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
                      <DropdownMenuLabel>{userProfile.email}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
                         <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
               )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="print-hide">
        {isLoading ? (
           <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
           </div>
        ) : children}
      </SidebarInset>
    </SidebarProvider>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseClientProvider>
      <DashboardContent>{children}</DashboardContent>
    </FirebaseClientProvider>
  );
}
