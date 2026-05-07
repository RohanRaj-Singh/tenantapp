"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useContext } from 'react';
import { RuntimeContext } from '@/runtime/context/RuntimeContext';

export default function Home() {
  const context = useContext(RuntimeContext);
  const config = context?.config ?? null;
  const tenantName = config?.tenant?.name || 'RemedyGCC';
  const primaryColor = config?.branding?.primaryColor || '#f58220';

  return (
    <section className="relative flex min-h-screen items-center justify-center">
      <Image
        src="/images/Ellipse.png"
        alt="Wellbeing Survey Banner"
        width={1600}
        height={1600}
        className="absolute inset-0 top-0 z-10 h-64 w-full"
        priority
      />
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/banner.png"
          alt="Wellbeing Survey Banner"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-white/80" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <h1 
          className="mb-6 bg-gradient-to-r from-[#f58220] to-[#f37820] bg-clip-text pt-20 text-4xl font-bold text-transparent md:text-6xl"
          style={{ backgroundImage: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}cc)` }}
        >
          Employee Wellbeing Survey
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-[#6b7280]">
          Your organization cares about your wellbeing. Take this anonymous survey to help us understand and improve your work experience.
        </p>
        <Link
          href="/survey"
          className="inline-block rounded-full bg-[#f58220] px-8 py-3 text-lg font-medium text-white transition-all duration-300 hover:scale-105 hover:bg-[#f58220]"
          style={{ backgroundColor: primaryColor }}
        >
          Start Survey
        </Link>
      </div>
    </section>
  );
}