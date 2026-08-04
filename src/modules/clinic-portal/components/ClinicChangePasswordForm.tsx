"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import { CLINIC_CLAIMS_PATH } from "../guards/routes";

interface ClinicChangePasswordFormProps {
  /** True when the password change is mandatory (e.g. first login). */
  forced: boolean;
  email: string;
}

const PASSWORD_RULES = [
  { test: (value: string) => value.length >= 8, label: "At least 8 characters" },
  { test: (value: string) => /[A-Z]/.test(value), label: "One uppercase letter" },
  { test: (value: string) => /[a-z]/.test(value), label: "One lowercase letter" },
  { test: (value: string) => /\d/.test(value), label: "One number" },
] as const;

export function ClinicChangePasswordForm({
  forced,
  email,
}: ClinicChangePasswordFormProps) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError("Enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/clinic/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        setError(payload?.error ?? "Password change failed.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.replace(CLINIC_CLAIMS_PATH), 900);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Password change failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const strengthOk = PASSWORD_RULES.every((rule) => rule.test(newPassword));

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-black/[0.06] bg-white p-10 shadow-2xl shadow-black/[0.04]">
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50">
              <LockKeyhole className="h-5 w-5 text-teal-600" />
            </div>
            <h1 className="text-2xl font-semibold text-teal-700">Change Password</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {forced
                ? "You must set a new password before using the clinic portal."
                : "Update the password for your clinic portal account."}
            </p>
            <p className="mt-1 text-xs text-slate-400">{email}</p>
          </div>

          {success ? (
            <div className="mt-8 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Password updated. Redirecting to your claims…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label
                  htmlFor="currentPassword"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Current password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  placeholder="Your current password"
                />
              </div>

              <div>
                <label
                  htmlFor="newPassword"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  New password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  placeholder="New password"
                />
                <ul className="mt-2 space-y-1">
                  {PASSWORD_RULES.map((rule) => {
                    const met = rule.test(newPassword);
                    return (
                      <li
                        key={rule.label}
                        className={`flex items-center gap-1.5 text-xs ${met ? "text-green-600" : "text-slate-400"}`}
                      >
                        {met ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <span className="h-3.5 w-3.5 rounded-full border border-current" />
                        )}
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  placeholder="Re-enter new password"
                />
              </div>

              {error ? (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting || !strengthOk}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-medium text-white transition-all hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
