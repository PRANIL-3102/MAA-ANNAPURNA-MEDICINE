import { Link, useLocation } from "@tanstack/react-router";
import { Receipt, Boxes, LayoutDashboard, Pill, History } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Billing", icon: Receipt, exact: true },
  { to: "/history", label: "History", icon: History },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex h-14 items-center gap-2 px-4 border-b border-sidebar-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Pill className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">Pharma ERP</span>
          <span className="text-[10px] text-muted-foreground">Lite · v0.1</span>
        </div>
      </div>

      <nav className="flex-1 p-2">
        <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Workspace
        </div>
        <ul className="space-y-0.5">
          {items.map((it) => {
            const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <li key={it.to}>
                <Link
                  to={it.to}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-3 text-[11px] text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Local mode</span>
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-success" />
        </div>
        <div className="mt-1">Press <kbd>/</kbd> to search</div>
      </div>
    </aside>
  );
}
