import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarTrigger } from "./ui/sidebar";
import { GraduationCap } from "lucide-react";

export function Layout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-40 h-16 border-b border-border/50 bg-card/80 backdrop-blur-xl flex items-center px-4 md:px-6 gap-4 shadow-sm">
            <SidebarTrigger className="p-2 rounded-xl hover:bg-muted transition-colors" />
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Sistem Rekapitulasi Nilai
                </h1>
                <p className="text-xs text-muted-foreground hidden md:block">Manajemen Data Nilai Siswa</p>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-gradient-to-br from-background to-muted/30">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
