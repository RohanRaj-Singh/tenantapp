"use client";

import Link from "next/link";
import { useContext, useState } from "react";
import { RuntimeContext } from "@/runtime/context/RuntimeContext";
import { Menu, X } from "lucide-react";
import { useTheme } from "@/runtime/theme/useTheme";

export default function Header() {
  const context = useContext(RuntimeContext);
  const config = context?.config ?? null;
  const { logoUrl, tenantName, primaryColor } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-white">
      <nav className="fixed top-0 right-0 left-0 z-50 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm sm:px-8 sm:py-4">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#f37820] to-[#f37820]">
                {/* Using Heart icon as fallback since we don't have the actual logo yet */}
                <span className="h-4 w-4 text-white">❤</span>
              </div>
              <span className="text-lg font-semibold text-[#1a1a1a]">{tenantName}</span>
            </div>
          </Link>

          {/* Hamburger Button for Mobile */}
          <button
            className="text-[#f58220] focus:outline-none sm:hidden"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 cursor-pointer" />
            ) : (
              <Menu className="h-6 w-6 cursor-pointer" />
            )}
          </button>

          {/* Navigation Links - Desktop */}
          <div className="hidden items-center gap-8 sm:flex">
            <Link
              href="/"
              className="text-sm font-medium text-[#f58220] transition-colors hover:text-[#f58220]"
            >
              Home
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-[#f58220] transition-colors hover:text-[#f58220]"
            >
              About
            </Link>
            <Link
              href="/survey"
              className="text-sm font-medium text-[#f58220] transition-colors hover:text-[#f58220]"
            >
              Survey
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium text-[#f58220] transition-colors hover:text-[#f58220]"
            >
              Contact Us
            </Link>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="mt-2 rounded-lg bg-[#f58220]/10 px-4 py-4 shadow-sm backdrop-blur-sm sm:hidden">
            <div className="flex flex-col gap-4">
              <Link
                href="/"
                className="text-sm font-medium text-[#f58220] transition-colors hover:text-[#f17305]"
                onClick={toggleMenu}
              >
                Home
              </Link>
              <Link
                href="/about"
                className="text-sm font-medium text-[#f37820] transition-colors hover:text-[#f58220]"
                onClick={toggleMenu}
              >
                About
              </Link>
              <Link
                href="/survey"
                className="text-sm font-medium text-[#f58220] transition-colors hover:text-[#f58220]"
                onClick={toggleMenu}
              >
                Survey
              </Link>
              <Link
                href="/contact"
                className="text-sm font-medium text-[#f58220] transition-colors hover:text-[#f58220]"
                onClick={toggleMenu}
              >
                Contact Us
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}