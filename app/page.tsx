"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/runtime/language/LanguageContext";
import { useTheme } from "@/runtime/theme/useTheme";

export default function Home() {
  const theme = useTheme();
  const { copy } = useLanguage();

  return (
    <section className="tenant-page-shell relative flex min-h-screen items-center justify-center overflow-hidden">
      <Image
        src="/images/Ellipse.png"
        alt={copy.home.bannerAlt}
        width={1600}
        height={1600}
        className="absolute inset-0 top-0 z-10 h-48 w-full sm:h-64"
        priority
      />
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/banner.png"
          alt={copy.home.bannerAlt}
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-white/80" />
        <div className="absolute inset-0" style={{ background: theme.headerGradient }} />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-14 pt-28 text-center sm:px-6 sm:pb-20 sm:pt-32">
        <span className="tenant-chip mb-4 inline-flex max-w-full rounded-full px-4 py-1.5 text-sm font-medium">
          <span className="truncate">{theme.tenantName}</span>
        </span>
        <h1
          className="mb-5 bg-clip-text text-3xl font-bold text-transparent sm:text-5xl md:text-6xl"
          style={{ backgroundImage: theme.heroGradient }}
        >
          {copy.home.heroTitle}
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-sm leading-7 text-[#6b7280] sm:text-base">
          {copy.home.heroDescription}
        </p>
        <Link
          href="/survey"
          className="tenant-button inline-flex w-full items-center justify-center rounded-full px-8 py-3 text-base font-medium transition-all duration-300 sm:w-auto sm:text-lg sm:hover:scale-105"
        >
          {copy.home.startSurvey}
        </Link>
      </div>
    </section>
  );
}
