import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { AssistantSidebarProvider } from "@/contexts/AssistantSidebarContext";
import { NotificationPopover } from "@/components/Notifications/NotificationPopover";

export function AppLayout() {

  return (
    <AssistantSidebarProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top Header */}
            <header className="h-14 border-b border-border/40 flex items-center justify-between px-4 bg-background sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-4">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    className="pl-9 h-9 bg-muted/50 border-transparent focus:border-border"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <NotificationPopover />
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 bg-background">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AssistantSidebarProvider>
  );
}
