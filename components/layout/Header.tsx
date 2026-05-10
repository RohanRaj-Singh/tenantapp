"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useTheme } from "@/runtime/theme/useTheme";

const navigationLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/survey", label: "Survey" },
  { href: "/contact", label: "Contact Us" },
];

export default function Header() {
  const theme = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen((current) => !current);
  };

  return (
    <header className="bg-white">
      <nav className="fixed inset-x-0 top-0 z-50 px-4 py-4 sm:px-6">
        <div
          className="mx-auto flex max-w-7xl items-center justify-between rounded-full border bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm sm:px-8 sm:py-4"
          style={{ borderColor: theme.borderAccent, boxShadow: `0 20px 40px -32px ${theme.strongAccent}` }}
        >
          <Link href="/" className="min-w-0">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden ${
                  theme.logoUrl ? "bg-transparent" : "rounded-xl"
                }`}
                style={theme.logoUrl ? undefined : { background: theme.brandGradient, color: theme.onPrimaryColor }}
              >
                {theme.logoUrl ? (
                  <Image
                    src={theme.logoUrl}
                    alt={`${theme.tenantName} logo`}
                    fill
                    sizes="36px"
                    className="object-contain"
                  />
                ) : (
                  <span className="text-sm font-semibold">{theme.tenantName.charAt(0)}</span>
                )}
              </div>
              <span className="max-w-[12rem] truncate text-base font-semibold text-slate-900 sm:max-w-[20rem]">
                {theme.tenantName}
              </span>
            </div>
          </Link>

          <button
            className="sm:hidden"
            onClick={toggleMenu}
            aria-label="Toggle menu"
            style={{ color: theme.linkColor }}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 cursor-pointer" />
            ) : (
              <Menu className="h-6 w-6 cursor-pointer" />
            )}
          </button>

          <div className="hidden items-center gap-8 sm:flex">
            {navigationLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="tenant-brand-text text-sm font-medium transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {isMenuOpen ? (
          <div
            className="mt-2 rounded-2xl border px-4 py-4 shadow-sm backdrop-blur-sm sm:hidden"
            style={{ backgroundColor: theme.surfaceAccentStrong, borderColor: theme.borderAccent }}
          >
            <div className="flex flex-col gap-4">
              {navigationLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="tenant-brand-text text-sm font-medium transition-colors"
                  onClick={toggleMenu}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </nav>
    </header>
  );
}
