import {
  LayoutDashboard,
  CalendarDays,
  Car,
  Users,
  BarChart3,
  Settings,
  Globe,
  ClipboardList,
  Megaphone,
  Gavel,
  Receipt,
  FileText,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

export function isGroup(e: NavEntry): e is NavGroup {
  return (e as NavGroup).items !== undefined;
}

// Individual destinations.
const DASHBOARD: NavItem = { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard };
const CALENDAR: NavItem = { href: "/calendar", label: "Calendar", icon: CalendarDays };
const RENTALS: NavItem = { href: "/rentals", label: "Rentals", icon: ClipboardList };
const CARS: NavItem = { href: "/cars", label: "Cars", icon: Car };
const CLIENTS: NavItem = { href: "/clients", label: "Clients", icon: Users };
const MARKETING: NavItem = { href: "/marketing", label: "Marketing", icon: Megaphone };
const WEBSITE: NavItem = { href: "/website", label: "Website", icon: Globe };
const SETTINGS: NavItem = { href: "/settings", label: "Settings", icon: Settings };

const INVOICES: NavItem = { href: "/invoices", label: "Invoices", icon: FileText };
const EXPENSES: NavItem = { href: "/expenses", label: "Expenses", icon: Receipt };
const FINES: NavItem = { href: "/fines", label: "Fines", icon: Gavel };
const REPORTS: NavItem = { href: "/reports", label: "Reports", icon: BarChart3 };

// Finance tools grouped together so the sidebar stays tidy.
export const FINANCE_GROUP: NavGroup = {
  label: "Finances",
  icon: Wallet,
  items: [INVOICES, EXPENSES, FINES, REPORTS],
};

// The sidebar / mobile menu structure (groups + items), in display order.
export const NAV_TREE: NavEntry[] = [
  DASHBOARD,
  CALENDAR,
  RENTALS,
  CARS,
  CLIENTS,
  MARKETING,
  FINANCE_GROUP,
  WEBSITE,
  SETTINGS,
];

// Flat list of every destination — used for badges and the mobile bottom nav.
export const NAV_ITEMS: NavItem[] = NAV_TREE.flatMap((e) => (isGroup(e) ? e.items : [e]));

// The five most important sections get bottom-nav slots on mobile.
export const MOBILE_NAV_ITEMS: NavItem[] = NAV_ITEMS.filter((i) =>
  ["/dashboard", "/calendar", "/rentals", "/cars", "/clients"].includes(i.href)
);
