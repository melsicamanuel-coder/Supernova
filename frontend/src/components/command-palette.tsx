"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  FolderKanban,
  Cpu,
  GitBranch,
  ShieldCheck,
  Settings,
  Plus,
  Rocket,
  ArrowRight,
} from "lucide-react";
import { startDemo } from "@/lib/api";

interface Action {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  section: string;
  action: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const actions: Action[] = useMemo(
    () => [
      {
        id: "nav-overview",
        label: "Overview",
        description: "Go to dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
        section: "Navigation",
        action: () => router.push("/"),
        keywords: ["home", "dashboard"],
      },
      {
        id: "nav-projects",
        label: "Projects",
        description: "Browse all projects",
        icon: <FolderKanban className="h-4 w-4" />,
        section: "Navigation",
        action: () => router.push("/"),
        keywords: ["browse", "list"],
      },
      {
        id: "nav-agents",
        label: "Agent Network",
        description: "View agent command center",
        icon: <Cpu className="h-4 w-4" />,
        section: "Navigation",
        action: () => router.push("/agents"),
        keywords: ["ai", "network", "constellation"],
      },
      {
        id: "nav-approvals",
        label: "Approvals",
        description: "Review pending approvals",
        icon: <ShieldCheck className="h-4 w-4" />,
        section: "Navigation",
        action: () => router.push("/approvals"),
        keywords: ["review", "pending"],
      },
      {
        id: "nav-settings",
        label: "Settings",
        description: "Platform configuration",
        icon: <Settings className="h-4 w-4" />,
        section: "Navigation",
        action: () => router.push("/settings"),
        keywords: ["config", "provider"],
      },
      {
        id: "action-new",
        label: "Create Project",
        description: "Start a new project",
        icon: <Plus className="h-4 w-4" />,
        section: "Actions",
        action: () => router.push("/projects/new"),
        keywords: ["new", "create", "start"],
      },
      {
        id: "action-demo",
        label: "Launch Demo",
        description: "Run demo workflow",
        icon: <Rocket className="h-4 w-4" />,
        section: "Actions",
        action: async () => {
          try {
            const res = await startDemo();
            router.push(`/projects/${res.project_id}`);
          } catch {
            router.push("/");
          }
        },
        keywords: ["demo", "try", "sample"],
      },
    ],
    [router],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.toLowerCase();
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.keywords?.some((k) => k.includes(q)),
    );
  }, [actions, query]);

  const sections = useMemo(() => {
    const map = new Map<string, Action[]>();
    for (const a of filtered) {
      const list = map.get(a.section) ?? [];
      list.push(a);
      map.set(a.section, list);
    }
    return map;
  }, [filtered]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const execute = useCallback(
    (index: number) => {
      const action = filtered[index];
      if (action) {
        setOpen(false);
        setQuery("");
        action.action();
      }
    },
    [filtered],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      execute(activeIndex);
    }
  }

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  let flatIndex = -1;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setOpen(false);
              setQuery("");
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-x-0 top-[15%] z-50 mx-auto w-full max-w-lg"
          >
            <div className="overflow-hidden rounded-xl border border-surface-4 bg-surface-1 shadow-2xl shadow-black/40">
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-surface-4 px-4 py-3">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search commands..."
                  className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <kbd className="rounded border border-surface-4 bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-72 overflow-y-auto p-1.5">
                {filtered.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No results found.
                  </div>
                ) : (
                  Array.from(sections.entries()).map(([section, items]) => (
                    <div key={section}>
                      <div className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {section}
                      </div>
                      {items.map((item) => {
                        flatIndex++;
                        const idx = flatIndex;
                        return (
                          <button
                            key={item.id}
                            data-index={idx}
                            onClick={() => execute(idx)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                              activeIndex === idx
                                ? "bg-primary/10 text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span
                              className={
                                activeIndex === idx
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              }
                            >
                              {item.icon}
                            </span>
                            <span className="flex-1">
                              <span className="font-medium text-foreground">
                                {item.label}
                              </span>
                              <span className="ml-2 text-xs text-muted-foreground">
                                {item.description}
                              </span>
                            </span>
                            {activeIndex === idx && (
                              <ArrowRight className="h-3 w-3 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-4 border-t border-surface-4 px-4 py-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-surface-4 bg-surface-3 px-1 py-0.5 font-mono text-[9px]">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-surface-4 bg-surface-3 px-1 py-0.5 font-mono text-[9px]">↵</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-surface-4 bg-surface-3 px-1 py-0.5 font-mono text-[9px]">esc</kbd>
                  Close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
