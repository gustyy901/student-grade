import { LayoutDashboard, Users, BookOpen, ClipboardList, FileText, BarChart3, GraduationCap, LogOut, Shield } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Data Siswa", url: "/students", icon: Users },
  { title: "Mata Pelajaran", url: "/subjects", icon: BookOpen },
  { title: "Input Nilai", url: "/grades", icon: ClipboardList },
  { title: "Detail Nilai", url: "/grade-details", icon: FileText },
  { title: "Laporan", url: "/reports", icon: BarChart3 },
];

const adminMenuItems = [
  { title: "Admin Panel", url: "/admin", icon: Shield },
];

export function AppSidebar() {
  const { setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-gradient-to-b from-primary via-primary to-accent">
        <div className="p-4 pb-2">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div className="overflow-hidden transition-all duration-300">
              <h1 className="font-bold text-white text-lg leading-tight">Student Grade Hub</h1>
              <p className="text-white/70 text-xs">Sistem Nilai</p>
            </div>
          </div>
        </div>

        {/* Admin Section */}
        {user?.role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-white/50 uppercase text-[10px] font-bold tracking-wider px-4">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <SidebarMenu className="space-y-1">
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/admin"}
                        onClick={handleNavClick}
                        className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300"
                        activeClassName="!text-white !bg-white/20 shadow-lg backdrop-blur-sm font-semibold"
                      >
                        <div className="p-1.5 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-white/50 uppercase text-[10px] font-bold tracking-wider px-4">
            Menu Utama
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      onClick={handleNavClick}
                      className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300"
                      activeClassName="!text-white !bg-white/20 shadow-lg backdrop-blur-sm font-semibold"
                    >
                      <div className="p-1.5 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 space-y-3">
          {user && (
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3">
              <p className="text-white text-sm font-semibold truncate">{user.name || user.email}</p>
              <p className="text-white/60 text-xs truncate">{user.email}</p>
              <p className="text-white/40 text-xs mt-1 uppercase font-semibold tracking-wider">
                {user.role === 'admin' ? 'Administrator' : 'Guru'}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Logout</span>
          </Button>
          <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4">
            <p className="text-white/70 text-xs text-center">© 2024 Student Grade Hub</p>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
