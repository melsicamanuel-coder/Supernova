"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Zap,
  Menu,
  X,
  LayoutDashboard,
  FolderKanban,
  Cpu,
  ShieldCheck,
  Settings,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { startDemo } from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  "/": "Overview",
  "/projects/new": "New Project",
  "/agents": "Agent Network",
  "/approvals": "Approvals",
  "/settings": "Settings",
};

const MOBILE_NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/projects/new", label: "Projects", icon: FolderKanban },
  { href: "/agents", label: "Agent Network", icon: Cpu },
  { href: "/approvals", label: "Approvals", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/workflow/")) return "Workflow Pipeline";
  if (pathname.startsWith("/projects/")) return "Project Workspace";
  return "SUPERNOVA";
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [launching, setLaunching] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  async function handleDemo() {
    setLaunching(true);
    try {
      const result = await startDemo();
      router.push(`/projects/${result.project_id}`);
    } catch {
      /* fallback silently */
    } finally {
      setLaunching(false);
    }
  }

  function openCommandPalette() {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true }),
    );
  }

  return (
    <>
      <header className="glass-strong flex h-12 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground md:hidden"
            onClick={() => setMobileNav(!mobileNav)}
          >
            {mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          {/* Mobile logo */}
          <span className="text-sm font-bold text-foreground md:hidden">
            SUPERNOVA
          </span>
          {/* Desktop page title */}
          <h1 className="hidden text-sm font-medium text-muted-foreground md:block">
            {getTitle(pathname)}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Search trigger */}
          <button
            onClick={openCommandPalette}
            className="hidden items-center gap-2 rounded-lg border border-surface-4 bg-surface-2 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground md:flex"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search...</span>
            <kbd className="ml-4 rounded border border-surface-4 bg-surface-3 px-1 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>

          {/* Create project */}
          <Link href="/projects/new" className="hidden md:block">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-surface-4 text-xs hover:border-primary/30"
            >
              <Plus className="h-3 w-3" />
              New Project
            </Button>
          </Link>

          {/* Demo */}
          <Button
            size="sm"
            onClick={handleDemo}
            disabled={launching}
            className="h-8 gap-1.5 text-xs"
          >
            <Zap className="h-3 w-3" />
            {launching ? "..." : "Demo"}
          </Button>
        </div>
      </header>

      {/* Mobile nav overlay */}
      <AnimatePresence>
        {mobileNav && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute inset-x-0 top-12 z-50 border-b border-surface-4 bg-surface-1 p-3 shadow-lg md:hidden"
          >
            <nav className="space-y-0.5">
              {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileNav(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-surface-3 hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("h-4 w-4", active && "text-primary")} />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
