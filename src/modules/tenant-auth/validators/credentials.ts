import type { TenantLoginCredentials } from "../contracts/types";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/i;
const LOWERCASE_LETTER_PATTERN = /[a-z]/;
const UPPERCASE_LETTER_PATTERN = /[A-Z]/;
const NUMBER_PATTERN = /[0-9]/;

export function normalizeTenantIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

export function normalizeTenantUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function normalizeTenantEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateTenantPassword(password: string): ValidationResult {
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

export function validateTenantLoginInput(
  input: TenantLoginCredentials,
): ValidationResult {
  const errors: string[] = [];

  if (!input.identifier.trim()) {
    errors.push("Email or username is required.");
  }

  if (!input.password) {
    errors.push("Password is required.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateTenantUsername(username: string): ValidationResult {
  const normalized = normalizeTenantUsername(username);
  const errors: string[] = [];

  if (!USERNAME_PATTERN.test(normalized)) {
    errors.push(
      "Username must be 3-32 characters and contain only letters, numbers, dots, dashes, or underscores.",
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateTenantEmail(email: string): ValidationResult {
  const normalized = normalizeTenantEmail(email);
  return {
    isValid: EMAIL_PATTERN.test(normalized),
    errors: EMAIL_PATTERN.test(normalized)
      ? []
      : ["A valid dashboard email is required."],
  };
}
