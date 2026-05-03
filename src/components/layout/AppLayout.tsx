import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Receipt,
  LineChart,
  FileUp,
  HelpCircle,
  Settings,
  Bell,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

const nav = [
  { to: "/panel", label: "Panel", icon: LayoutGrid },
  { to: "/gastos", label: "Gastos", icon: Receipt },
  { to: "/analisis", label: "Análisis", icon: LineChart },
  { to: "/extractos", label: "Extractos", icon: FileUp },
];

const navBottom = [
  { to: "/soporte", label: "Soporte", icon: HelpCircle },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const title =
    nav.find((n) => location.pathname.startsWith(n.to))?.label ??
    navBottom.find((n) => location.pathname.startsWith(n.to))?.label ??
    "Panel";

  return (
    <div className="flex min-h-screen bg-[var(--app-bg)] text-foreground">
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col border-r border-border/80 bg-[var(--app-sidebar)]">
        <div className="border-b border-border/60 px-5 py-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-lg font-bold text-emerald-400">
              T
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight">Arquitecto patrimonial</p>
              <p className="text-[11px] text-muted-foreground">Claridad financiera</p>
            </div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-l-2 border-emerald-400 bg-emerald-500/10 text-emerald-100"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )
              }
            >
              <Icon className="size-4 shrink-0 opacity-80" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border/60 p-3">
          {navBottom.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/5 text-foreground"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )
              }
            >
              <Icon className="size-4 shrink-0 opacity-80" />
              {label}
            </NavLink>
          ))}
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col pl-[260px]">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border/80 bg-[var(--app-bg)]/90 px-8 py-4 backdrop-blur-md">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            <p className="text-xs text-muted-foreground">
              {location.pathname === "/panel" && "Resumen de tu salud financiera"}
              {location.pathname.startsWith("/gastos") && "Revisa y filtra tus movimientos"}
              {location.pathname.startsWith("/analisis") && "Tendencias y reparto por tipo de gasto"}
              {location.pathname.startsWith("/extractos") && "Importa extractos bancarios en Excel o CSV"}
              {location.pathname.startsWith("/soporte") && "Centro de ayuda"}
              {location.pathname.startsWith("/ajustes") && "Preferencias de la cuenta"}
            </p>
          </div>
          <div className="flex flex-1 items-center justify-end gap-3">
            <div className="relative hidden max-w-md flex-1 md:block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Buscar…"
                className="h-10 w-full rounded-full border border-border/80 bg-card/50 py-2 pl-10 pr-4 text-sm outline-none ring-emerald-500/30 placeholder:text-muted-foreground focus:ring-2"
                disabled
                title="Próximamente: búsqueda global"
              />
            </div>
            <button
              type="button"
              className="rounded-full p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
              aria-label="Notificaciones"
            >
              <Bell className="size-5" />
            </button>
            <button
              type="button"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
            >
              Salir
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-xs font-bold text-white">
              U
            </div>
          </div>
        </header>
        <main className="flex-1 px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
