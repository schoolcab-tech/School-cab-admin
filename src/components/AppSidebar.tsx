import {
  Activity,
  BarChart3,
  Bell,
  Car,
  Gift,
  Globe,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MapPin,
  Route,
  Settings,
  Users,
  Ticket,
  Building2,
  UserCog,
  History,
  DollarSign,
  Truck,
  ClipboardList,
  Clock,
  FileText,
  TrendingUp,
  Shield,
  Trash2,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database['public']['Enums']['app_role'];

type NavItem = {
  title: string;
  url: string;
  icon: any;
  roles: UserRole[];
};

// Navigation items for different roles
const navigationItems: NavItem[] = [
  // Regular Admin & Master Admin shared items
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: ['admin', 'master_admin'],
  },
  {
    title: "Schools",
    url: "/schools",
    icon: GraduationCap,
    roles: ['admin', 'master_admin'],
  },
  {
    title: "Drivers",
    url: "/drivers",
    icon: Car,
    roles: ['admin', 'master_admin'],
  },
  {
    title: "Vehicles",
    url: "/vehicles",
    icon: Truck,
    roles: ['admin', 'master_admin'],
  },
  {
    title: "Students",
    url: "/students",
    icon: Users,
    roles: ['admin', 'master_admin'],
  },
  {
    title: "Routes & Areas",
    url: "/routes",
    icon: MapPin,
    roles: ['admin', 'master_admin'],
  },
  {
    title: "Route Ordering",
    url: "/route-ordering",
    icon: Route,
    roles: ['admin', 'master_admin'],
  },
  {
    title: "Trip Schedules",
    url: "/trip-schedules",
    icon: Clock,
    roles: ['admin', 'master_admin'],
  },
  {
    title: "Earnings",
    url: "/master-admin/earnings",
    icon: DollarSign,
    roles: ['master_admin'],
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
    roles: ['admin'],
  },
  {
    title: "Benefits",
    url: "/benefits",
    icon: Gift,
    roles: ['admin', 'master_admin'],
  },
  {
    title: "Coupons",
    url: "/coupons",
    icon: Ticket,
    roles: ['admin', 'master_admin'],
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
    roles: ['admin', 'master_admin'],
  },
  {
    title: "Website Leads",
    url: "/website-leads",
    icon: Globe,
    roles: ['admin', 'master_admin'],
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    roles: ['admin', 'master_admin'],
  },

  // Master Admin only items
  {
    title: "Fleet Owners",
    url: "/master-admin/fleet-owners",
    icon: Building2,
    roles: ['master_admin'],
  },
  {
    title: "Fleet Mapping",
    url: "/master-admin/fleet-mapping",
    icon: UserCog,
    roles: ['master_admin'],
  },
  {
    title: "Platform Admins",
    url: "/master-admin/platform-admins",
    icon: Shield,
    roles: ['master_admin'],
  },
  {
    title: "School Admins",
    url: "/master-admin/school-admins",
    icon: GraduationCap,
    roles: ['master_admin'],
  },
  {
    title: "Moderators",
    url: "/master-admin/moderators",
    icon: UserCog,
    roles: ['master_admin'],
  },
  {
    title: "Live Tracking",
    url: "/master-admin/live-tracking",
    icon: MapPin,
    roles: ['master_admin', 'admin'],
  },
  {
    title: "Performance",
    url: "/master-admin/performance",
    icon: TrendingUp,
    roles: ['master_admin', 'admin'],
  },
  {
    title: "Reports",
    url: "/master-admin/reports",
    icon: FileText,
    roles: ['master_admin', 'admin'],
  },
  {
    title: "Driver Requests",
    url: "/master-admin/driver-requests",
    icon: ClipboardList,
    roles: ['master_admin'],
  },
  {
    title: "Driver Delete Requests",
    url: "/master-admin/driver-delete-requests",
    icon: Trash2,
    roles: ['master_admin', 'admin'],
  },
  {
    title: "Audit Trail",
    url: "/master-admin/audit-trail",
    icon: History,
    roles: ['master_admin'],
  },

  // Sub-Admin only items
  {
    title: "My Dashboard",
    url: "/sub-admin/dashboard",
    icon: LayoutDashboard,
    roles: ['sub_admin'],
  },
  {
    title: "My Fleet",
    url: "/sub-admin/my-fleet",
    icon: Truck,
    roles: ['sub_admin'],
  },
  {
    title: "My Vehicles",
    url: "/sub-admin/vehicles",
    icon: Car,
    roles: ['sub_admin'],
  },
  {
    title: "Switch Drivers",
    url: "/sub-admin/students",
    icon: UserCog,
    roles: ['sub_admin'],
  },
  {
    title: "Route Ordering",
    url: "/sub-admin/route-ordering",
    icon: Route,
    roles: ['sub_admin'],
  },
  {
    title: "Live Tracking",
    url: "/sub-admin/live-tracking",
    icon: Activity,
    roles: ['sub_admin'],
  },
  {
    title: "Request Drivers",
    url: "/sub-admin/request-drivers",
    icon: ClipboardList,
    roles: ['sub_admin'],
  },
  {
    title: "My Earnings",
    url: "/sub-admin/my-earnings",
    icon: DollarSign,
    roles: ['sub_admin'],
  },

  // School Admin only items
  {
    title: "Dashboard",
    url: "/school-admin/dashboard",
    icon: LayoutDashboard,
    roles: ['school_admin'],
  },
  {
    title: "School Profile",
    url: "/school-admin/school",
    icon: Building2,
    roles: ['school_admin'],
  },
  {
    title: "Students",
    url: "/school-admin/students",
    icon: GraduationCap,
    roles: ['school_admin'],
  },
  {
    title: "Bookings",
    url: "/school-admin/bookings",
    icon: ClipboardList,
    roles: ['school_admin'],
  },
  {
    title: "Payments",
    url: "/school-admin/payments",
    icon: DollarSign,
    roles: ['school_admin'],
  },
  {
    title: "Route Ordering",
    url: "/school-admin/route-ordering",
    icon: Route,
    roles: ['school_admin'],
  },
  {
    title: "Trip Schedules",
    url: "/school-admin/trip-schedules",
    icon: Clock,
    roles: ['school_admin'],
  },
  {
    title: "Drivers",
    url: "/school-admin/drivers",
    icon: Car,
    roles: ['school_admin'],
  },
  {
    title: "Vehicles",
    url: "/school-admin/vehicles",
    icon: Truck,
    roles: ['school_admin'],
  },
  {
    title: "Live Tracking",
    url: "/school-admin/live-tracking",
    icon: MapPin,
    roles: ['school_admin'],
  },
  {
    title: "Performance",
    url: "/school-admin/performance",
    icon: TrendingUp,
    roles: ['school_admin'],
  },
  {
    title: "Reports",
    url: "/school-admin/reports",
    icon: FileText,
    roles: ['school_admin'],
  },

  // Moderator items
  {
    title: "Dashboard",
    url: "/moderator/dashboard",
    icon: LayoutDashboard,
    roles: ['moderator'],
  },
  {
    title: "Schools",
    url: "/moderator/schools",
    icon: GraduationCap,
    roles: ['moderator'],
  },
  {
    title: "School Admins",
    url: "/moderator/school-admins",
    icon: UserCog,
    roles: ['moderator'],
  },
  {
    title: "Students",
    url: "/moderator/students",
    icon: Users,
    roles: ['moderator'],
  },
  {
    title: "Bookings",
    url: "/moderator/bookings",
    icon: ClipboardList,
    roles: ['moderator'],
  },
  {
    title: "Payments",
    url: "/moderator/payments",
    icon: DollarSign,
    roles: ['moderator'],
  },
  {
    title: "Route Ordering",
    url: "/moderator/route-ordering",
    icon: Route,
    roles: ['moderator'],
  },
  {
    title: "Trip Schedules",
    url: "/moderator/trip-schedules",
    icon: Clock,
    roles: ['moderator'],
  },
  {
    title: "Drivers",
    url: "/moderator/drivers",
    icon: Car,
    roles: ['moderator'],
  },
  {
    title: "Vehicles",
    url: "/moderator/vehicles",
    icon: Truck,
    roles: ['moderator'],
  },
  {
    title: "Live Tracking",
    url: "/moderator/live-tracking",
    icon: MapPin,
    roles: ['moderator'],
  },
  {
    title: "Performance",
    url: "/moderator/performance",
    icon: TrendingUp,
    roles: ['moderator'],
  },
  {
    title: "Reports",
    url: "/moderator/reports",
    icon: FileText,
    roles: ['moderator'],
  },
  {
    title: "School Profile",
    url: "/moderator/school",
    icon: Building2,
    roles: ['moderator'],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { userRole, signOut } = useAuth();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  // Filter navigation items based on user role
  const visibleNavItems = navigationItems.filter((item) => {
    if (!userRole) return false;
    return item.roles.includes(userRole);
  });

  const isActive = (path: string) => {
    // Exact match for most routes
    if (currentPath === path) return true;
    // For non-root paths, check if current path starts with the nav path
    if (path !== "/" && path !== "/dashboard" && currentPath.startsWith(path)) return true;
    return false;
  };

  const getNavClassName = (path: string) =>
    cn(
      "w-full justify-start transition-all duration-200 hover:bg-accent",
      isActive(path)
        ? "bg-primary text-primary-foreground hover:bg-primary/90"
        : "text-muted-foreground hover:text-foreground"
    );

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <Sidebar
      className={cn(
        "transition-all duration-300 border-r bg-card",
        collapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      {/* Header */}
      <SidebarHeader className="border-b px-4 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Car className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold">School Cab</span>
              <span className="text-xs text-muted-foreground">Admin Panel</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel
            className={cn(
              "px-4 text-xs font-medium text-muted-foreground",
              collapsed && "sr-only"
            )}
          >
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2">
              {visibleNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={getNavClassName(item.url)}
                    >
                      <item.icon className="h-4 w-4 min-w-4" />
                      {!collapsed && (
                        <span className="ml-3 text-sm font-medium">
                          {item.title}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom section with logout */}
        <div className="mt-auto border-t px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className={cn(
              "w-full justify-start text-muted-foreground hover:text-foreground",
              collapsed ? "px-2" : "px-3"
            )}
          >
            <LogOut className="h-4 w-4 min-w-4" />
            {!collapsed && <span className="ml-3">Logout</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
