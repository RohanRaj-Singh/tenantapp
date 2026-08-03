import type { ClinicLoginCredentials } from "../contracts/types";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOWERCASE_LETTER_PATTERN = /[a-z]/;
const UPPERCASE_LETTER_PATTERN = /[A-Z]/;
const NUMBER_PATTERN = /[0-9]/;

export function normalizeClinicEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateClinicPassword(password: string): ValidationResult {
  const normalized = password.trim();
  const errors: string[] = [];

  if (normalized.length < 12) {
    errors.push("Password must be at least 12 characters long.");
  }

  if (!LOWERCASE_LETTER_PATTERN.test(normalized)) {
    errors.push("Password must include a lowercase letter.");
  }

  if (!UPPERCASE_LETTER_PATTERN.test(normalized)) {
    errors.push("Password must include an uppercase letter.");
  }

  if (!NUMBER_PATTERN.test(normalized)) {
    errors.push("Password must include a number.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateClinicLoginInput(
  input: ClinicLoginCredentials,
): ValidationResult {
  const errors: string[] = [];

  if (!input.email.trim()) {
    errors.push("Email is required.");
  }

  if (!input.password) {
    errors.push("Password is required.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateClinicEmail(email: string): ValidationResult {
  const normalized = normalizeClinicEmail(email);
  return {
    isValid: EMAIL_PATTERN.test(normalized),
    errors: EMAIL_PATTERN.test(normalized)
      ? []
      : ["A valid clinic portal email is required."],
  };
}
