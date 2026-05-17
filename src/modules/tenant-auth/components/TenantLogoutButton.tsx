"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";

interface TenantLogoutButtonProps {
  className?: string;
}

export function TenantLogoutButton({
  className,
}: TenantLogoutButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);

    try {
      await fetch("/api/tenant-auth/logout", {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        credentials: "include",
      });
    } finally {
      router.replace("/login");
      router.refresh();
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isSubmitting}
      className={className}
    >
      {isSubmitting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      <span>{isSubmitting ? "Signing out" : "Sign Out"}</span>
    </button>
  );
}
