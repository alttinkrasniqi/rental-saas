import {
  LayoutDashboard,
  CalendarDays,
  Car,
  Users,
  BarChart3,
  Settings,
  Globe,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/rentals", label: "Rentals", icon: ClipboardList },
  { href: "/cars", label: "Cars", icon: Car },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/website", label: "Website", icon: Globe },
    { href: "/requests", label: "Requests", icon: ClipboardList },
];

// The five most important sections get bottom-nav slots on mobile.
export const MOBILE_NAV_ITEMS: NavItem[] = NAV_ITEMS.filter((i) =>
  ["/dashboard", "/calendar", "/rentals", "/cars", "/clients"].includes(i.href)
);
