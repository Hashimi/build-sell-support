import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  HardHat,
  Wallet,
  Receipt,
  Building2,
  Users,
  ShoppingCart,
  Wrench,
  Hammer,
  Home,
} from "lucide-react";
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
} from "@/components/ui/sidebar";
import { useI18n } from "@/lib/i18n";

export function AppSidebar() {
  const { t, dir } = useI18n();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const groups = [
    {
      label: t("overview"),
      items: [{ to: "/", icon: LayoutDashboard, label: t("dashboard") }],
    },
    {
      label: t("construction"),
      items: [
        { to: "/materials", icon: Package, label: t("materials") },
        { to: "/workers", icon: HardHat, label: t("workers") },
        { to: "/salaries", icon: Wallet, label: t("salaries") },
        { to: "/expenses", icon: Receipt, label: t("expenses") },
      ],
    },
    {
      label: t("realEstate"),
      items: [
        { to: "/apartments", icon: Building2, label: t("apartments") },
        { to: "/clients", icon: Users, label: t("clients") },
        { to: "/sales", icon: ShoppingCart, label: t("sales") },
      ],
    },
    {
      label: t("support"),
      items: [{ to: "/requests", icon: Wrench, label: t("requests") }],
    },
  ];

  return (
    <Sidebar collapsible="icon" side={dir === "rtl" ? "right" : "left"}>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-elegant">
            <Hammer className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold text-sidebar-foreground leading-tight">
              {t("appName")}
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              <Home className="inline h-3 w-3 me-1" />
              v1.0
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = pathname === item.to;
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                        <Link to={item.to} className="flex items-center gap-3">
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
