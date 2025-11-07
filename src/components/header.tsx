
"use client";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

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
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Alternar notificaciones</span>
        </Button>
      </div>
    </header>
  );
}
