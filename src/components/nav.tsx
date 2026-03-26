"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#0A0F1C]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-1 text-lg font-semibold tracking-tight transition-colors duration-200 hover:text-emerald-400"
        >
          Med<span className="text-emerald-400">Panel</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 sm:flex">
          <Link
            href="/consult"
            className="text-sm text-slate-400 transition-colors duration-200 hover:text-slate-50"
          >
            Consult
          </Link>
          <Link
            href="/consult/demo"
            className="text-sm text-slate-400 transition-colors duration-200 hover:text-slate-50"
          >
            Demo
          </Link>
          <Link
            href="/engine"
            className="text-sm text-slate-400 transition-colors duration-200 hover:text-slate-50"
          >
            Engine
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="cursor-pointer sm:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? (
            <X className="h-5 w-5 text-slate-400" />
          ) : (
            <Menu className="h-5 w-5 text-slate-400" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-slate-800/60 bg-[#0A0F1C] px-4 pb-4 pt-2 sm:hidden">
          <Link
            href="/consult"
            className="block rounded py-2 text-sm text-slate-400 transition-colors duration-200 hover:text-slate-50"
            onClick={() => setMobileOpen(false)}
          >
            Consult
          </Link>
          <Link
            href="/consult/demo"
            className="block rounded py-2 text-sm text-slate-400 transition-colors duration-200 hover:text-slate-50"
            onClick={() => setMobileOpen(false)}
          >
            Demo
          </Link>
          <Link
            href="/engine"
            className="block rounded py-2 text-sm text-slate-400 transition-colors duration-200 hover:text-slate-50"
            onClick={() => setMobileOpen(false)}
          >
            Engine
          </Link>
        </div>
      )}
    </nav>
  );
}
