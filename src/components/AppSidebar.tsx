import {
  Home,
  Users,
  BarChart3,
  Settings,
  MessageCircle,
  LogOut,
  FileText,
  Database,
  Telescope
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { getUserInitials, getUserDisplayName } from "@/lib/auth-utils";
import { WORKLIST_STATS } from "@/data/riskLensData";

type MenuItem = {
  title: string;
  url: string;
  icon: typeof Home;
  badge?: number | null;
};

const mainMenuItems: MenuItem[] = [
  { title: "Home", url: "/", icon: Home },
  { title: "Assistant", url: "/assistant", icon: MessageCircle },
  { title: "Research", url: "/research", icon: Telescope, badge: WORKLIST_STATS.high },
  { title: "Specialists", url: "/specialists", icon: Users },
  { title: "Metrics", url: "/metrics", icon: BarChart3 },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: `Connector`, url: "/data-connector", icon: Database },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath === path || currentPath.startsWith(path + "/");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <Sidebar collapsible="none" className="border-r border-border/40 w-20 sticky top-0 h-screen">
      <SidebarHeader className="border-b border-border/40 p-3 flex items-center justify-center shrink-0">
        <div className="flex h-10 w-10 items-center justify-center">
          <img src="/favicon.svg" alt="Galen" className="h-8 w-8" />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-0 py-2 flex-1 overflow-y-auto">
        {/* Navigation Group */}
        <SidebarGroup className="px-2">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="flex flex-col items-center justify-center h-15 gap-1 hover:bg-muted !overflow-visible"
                  >
                    <NavLink
                      to={item.url}
                      className="flex flex-col items-center justify-center gap-1"
                    >
                      <span className="relative">
                        <item.icon className="h-5 w-5 shrink-0" />
                        {item.badge != null && item.badge > 0 && (
                          <span
                            className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold leading-none"
                            aria-label={`${item.badge} new`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-center break-words">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-3 shrink-0">
        <div className="flex flex-col items-center gap-3">
          <NavLink
            to="/settings"
            className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="h-5 w-5" />
          </NavLink>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none">
                <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {getUserDisplayName(user)}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-500 focus:text-red-800">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
