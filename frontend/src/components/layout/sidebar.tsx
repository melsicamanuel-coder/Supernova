"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FolderKanban,
  Cpu,
  GitBranch,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/use-api";
import { getProviderHealth, listApprovals, listAgents, type ProviderHealthResponse } from "@/lib/api";
import type { ApprovalResponse } from "@/types/approval";
import type { AgentListResponse } from "@/types/agent";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/projects/new", label: "Projects", icon: FolderKanban },
  { href: "/agents", label: "Agent Network", icon: Cpu },
  { href: "/workflow", label: "Workflow Explorer", icon: GitBranch },
  { href: "/approvals", label: "Approvals", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data: health } = useApi<ProviderHealthResponse>(getProviderHealth);
  const { data: pendingApprovals } = useApi<ApprovalResponse[]>(() => listApprovals({ status: "pending" }));
  const { data: agentData } = useApi<AgentListResponse>(listAgents);
  const pendingCount = pendingApprovals?.length ?? 0;
  const agentCount = agentData?.agents.length ?? 0;

  return (
    <aside
      className={cn(
        "hidden flex-col border-r border-surface-4 bg-surface-1 transition-all duration-300 md:flex",
        collapsed ? "w-[60px]" : "w-[220px]",
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-surface-4 px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 text-primary"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap text-sm font-bold tracking-wide text-foreground"
            >
              SUPERNOVA
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-200",
                active
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-surface-3 hover:text-foreground",
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!collapsed && item.label === "Approvals" && pendingCount > 0 && (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Status + collapse */}
      <div className="space-y-2 border-t border-surface-4 p-3">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 rounded-xl border border-nova-success/10 bg-nova-success/5 px-2.5 py-2"
            >
              <div className="relative shrink-0">
                <Zap className="h-4 w-4 text-nova-success" />
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-nova-success" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-[11px] font-medium text-foreground">
                  {health?.status.healthy ? "System Online" : health ? "System Degraded" : "Connecting..."}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {agentCount} agents ready
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex w-full items-center justify-center rounded-lg py-1.5 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground",
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
