
"use client";

import { useMemo } from 'react';
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Bell, Search, AlertTriangle, PackageX, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from '@/components/ui/separator';
import { useCollection, useFirestore, useMemoFirebase, useUser, useAuth, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import type { Product, User } from '@/lib/types';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


type SearchProps = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
};

export default function AppHeader({
  title,
  children,
  search,
}: {
  title: string;
  children?: React.ReactNode;
  search?: SearchProps;
}) {
  const { isMobile } = useSidebar();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: profile } = useDoc<User>(userDocRef);

  const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsRef);

  const lowStockItems = useMemo(() => 
    products?.filter(p => p.quantity > 0 && p.quantity <= p.reorderPoint) || [],
    [products]
  );
  
  const outOfStockItems = useMemo(() => 
    products?.filter(p => p.quantity === 0) || [],
    [products]
  );
  
  const notificationCount = lowStockItems.length + outOfStockItems.length;

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
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


  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background px-4 md:px-6 print-hide">
      <div className="flex items-center gap-4">
        {isMobile && <SidebarTrigger />}
        <h1 className="text-xl font-semibold md:text-2xl">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        {search && (
          <div className="relative ml-auto flex-1 md:grow-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={search.placeholder}
              className="w-full rounded-lg bg-secondary pl-8 md:w-[200px] lg:w-[320px]"
              value={search.value}
              onChange={search.onChange}
            />
          </div>
        )}
        {children}
        
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full">
                    <Bell className="h-5 w-5" />
                    {notificationCount > 0 && (
                        <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                            {notificationCount}
                        </span>
                    )}
                    <span className="sr-only">Abrir notificaciones</span>
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Notificaciones</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                    {notificationCount === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-10">
                            <Bell className="h-10 w-10 mb-2" />
                            <p>No tienes notificaciones</p>
                        </div>
                    ) : (
                        <>
                            {outOfStockItems.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="font-semibold flex items-center gap-2"><PackageX className="h-5 w-5 text-destructive" />Agotados ({outOfStockItems.length})</h3>
                                    <Separator />
                                    <div className="space-y-2 text-sm">
                                    {outOfStockItems.map(item => (
                                        <div key={item.id} className="flex justify-between items-center">
                                            <span>{item.name}</span>
                                            <Badge variant="destructive">Agotado</Badge>
                                        </div>
                                    ))}
                                    </div>
                                </div>
                            )}
                             {lowStockItems.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="font-semibold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" />Stock Bajo ({lowStockItems.length})</h3>
                                    <Separator />
                                    <div className="space-y-2 text-sm">
                                    {lowStockItems.map(item => (
                                        <div key={item.id} className="flex justify-between items-center">
                                            <span>{item.name}</span>
                                            <span className="font-bold text-amber-600">{item.quantity} uds.</span>
                                        </div>
                                    ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
        
        {profile && (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8 bg-sidebar-accent">
                    <AvatarImage src={getUserAvatar(profile)} alt={profile.name} data-ai-hint="person avatar" />
                    <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
                    </Avatar>
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                        {profile.username}
                    </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        )}
      </div>
    </header>
  );
}
