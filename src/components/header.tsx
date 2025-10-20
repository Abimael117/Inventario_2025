"use client";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AppHeader({
  title,
  children,
  search,
}: {
  title: string;
  children?: React.ReactNode;
  search?: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
  };
}) {
  const { isMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4 md:px-6 print-hide">
      {isMobile && <SidebarTrigger />}
      <h1 className="text-xl font-semibold md:text-2xl">{title}</h1>
      <div className="ml-auto flex items-center gap-4">
        {!isMobile && search && (
          <form className="relative ml-auto flex-1 md:grow-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={search.placeholder}
              className="w-full rounded-lg bg-secondary pl-8 md:w-[200px] lg:w-[320px]"
              value={search.value}
              onChange={search.onChange}
            />
          </form>
        )}
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Alternar notificaciones</span>
        </Button>
        {children}
      </div>
    </header>
  );
}
