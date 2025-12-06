
"use client";

import { useMemo, useTransition } from 'react';
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Bell, Search, AlertTriangle, PackageX, LogOut, MinusSquare, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from '@/components/ui/separator';
import { useCollection, useFirestore, useUser, useAuth, useDoc } from '@/firebase';
import { collection, doc, query, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import type { Product, User, Notification } from '@/lib/types';
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
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';


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
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  const userDocRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: profile } = useDoc<User>(userDocRef);

  const productsRef = useMemo(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsRef);

  const notificationsRef = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc'), limit(5));
  }, [firestore]);
  const { data: adjustmentNotifications } = useCollection<Notification>(notificationsRef);

  const lowStockItems = useMemo(() => 
    products?.filter(p => p.quantity > 0 && p.quantity <= p.reorderPoint) || [],
    [products]
  );
  
  const outOfStockItems = useMemo(() => 
    products?.filter(p => p.quantity === 0) || [],
    [products]
  );
  
  const stockNotificationCount = lowStockItems.length + outOfStockItems.length;
  const totalNotificationCount = stockNotificationCount + (adjustmentNotifications?.length || 0);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.replace('/login');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const names = name.trim().split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  const getUserAvatar = (user: User | null | undefined): string => {
    if (!user) return "";
    if (user.role === 'admin') {
      return 'https://escarcega.gob.mx/wp-content/uploads/2021/08/logo-escarcega-white.png';
    }
    return ""; // Fallback to initials
  };

  const handleDeleteNotification = (notificationId: string) => {
    if (!firestore) return;
    startTransition(async () => {
      const notificationRef = doc(firestore, 'notifications', notificationId);
      try {
        await deleteDoc(notificationRef);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo eliminar la notificación.',
        });
      }
    });
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
                    {totalNotificationCount > 0 && (
                        <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                            {totalNotificationCount}
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
                    {totalNotificationCount === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-10">
                            <Bell className="h-10 w-10 mb-2" />
                            <p>No tienes notificaciones</p>
                        </div>
                    ) : (
                        <>
                            {adjustmentNotifications && adjustmentNotifications.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="font-semibold flex items-center gap-2"><MinusSquare className="h-5 w-5 text-blue-500" />Ajustes Recientes</h3>
                                    <Separator />
                                    <div className="space-y-3 text-sm">
                                    {adjustmentNotifications.map(item => (
                                        <div key={item.id} className="flex flex-col relative group">
                                            <div className="flex justify-between items-start">
                                                <span className="font-semibold pr-8">{item.title}</span>
                                                <div className="flex items-center">
                                                    <span className="text-xs text-muted-foreground whitespace-nowrap pl-2">
                                                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: es })}
                                                    </span>
                                                     <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-6 w-6 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => handleDeleteNotification(item.id)}
                                                        disabled={isPending}
                                                        aria-label="Eliminar notificación"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <p className="text-muted-foreground">{item.description}</p>
                                        </div>
                                    ))}
                                    </div>
                                </div>
                            )}

                            {stockNotificationCount > 0 && (
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
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
        
        {profile && (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-9 w-9 bg-sidebar-accent">
                    <AvatarImage 
                        src={getUserAvatar(profile)}
                        alt={profile.name} 
                    />
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

    