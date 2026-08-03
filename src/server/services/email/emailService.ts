/**
 * Email service (Phase D).
 *
 * Pluggable sender with two providers:
 *  - "sendgrid" — real delivery via the SendGrid v3 REST API (uses global
 *    fetch, no external SDK dependency). Requires SENDGRID_API_KEY.
 *  - "console" — logs the message to the server console. Used in development
 *    and tests when no SENDGRID_API_KEY is configured.
 *
 * Selection is via EMAIL_PROVIDER (defaults to "console" unless a
 * SENDGRID_API_KEY is present, in which case "sendgrid" is used).
 *
 * Env:
 *  EMAIL_PROVIDER        "console" | "sendgrid" (default: console)
 *  SENDGRID_API_KEY      SendGrid API key (sendgrid only)
 *  EMAIL_FROM            From address, e.g. "RemedyGCC <noreply@remedygcc.com>"
 */
import type { EmailMessage, EmailProvider } from "./emailTypes";

export const EMAIL_PROVIDER_CONSOLE = "console" as const;
export const EMAIL_PROVIDER_SENDGRID = "sendgrid" as const;

export type EmailProviderName =
  | typeof EMAIL_PROVIDER_CONSOLE
  | typeof EMAIL_PROVIDER_SENDGRID;

/** SendGrid REST API base URL (v3 /mail/send). */
const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

/** Timeout for the SendGrid HTTP call. */
const SENDGRID_REQUEST_TIMEOUT_MS = 10_000;

/** Resolve the provider name from env, defaulting to console. */
function resolveProviderName(): EmailProviderName {
  const configured = process.env.EMAIL_PROVIDER;
  if (configured === "sendgrid" || configured === "console") {
    return configured;
  }
  return process.env.SENDGRID_API_KEY ? "sendgrid" : "console";
}

/**
 * SendGrid provider — sends via the SendGrid v3 REST API using global fetch.
 * Falls back to the console provider if no SENDGRID_API_KEY is configured.
 */
const sendgridProvider: EmailProvider = {
  async send(message: EmailMessage): Promise<void> {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      await consoleProvider.send(message);
      return;
    }

    const from = process.env.EMAIL_FROM ?? "RemedyGCC <noreply@remedygcc.com>";
    // Extract the plain address from a "Name <addr>" style From.
    const match = from.match(/<([^>]+)>/);
    const fromAddress = match ? match[1] : from;

    const payload = {
      personalizations: [{ to: [{ email: message.to }] }],
      from: { email: fromAddress },
      subject: message.subject,
      content: [{ type: "text/html", value: message.html }],
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SENDGRID_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(SENDGRID_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
          `SendGrid error ${response.status}: ${body.slice(0, 500) || response.statusText}`,
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  },
};

/** Console provider — logs the email instead of sending it. */
const consoleProvider: EmailProvider = {
  async send(message: EmailMessage): Promise<void> {
    const separator = "─".repeat(72);
    console.log(separator);
    console.log(`[EMAIL:console] To: ${message.to}`);
    console.log(`[EMAIL:console] Subject: ${message.subject}`);
    console.log(separator);
    console.log(message.html);
    console.log(separator);
  },
};

const providers: Record<EmailProviderName, EmailProvider> = {
  [EMAIL_PROVIDER_CONSOLE]: consoleProvider,
  [EMAIL_PROVIDER_SENDGRID]: sendgridProvider,
};

let cachedProvider: EmailProvider | null = null;

/**
 * Resolve the email provider based on environment configuration.
 * The result is cached for the lifetime of the process.
 */
export function getEmailProvider(): EmailProvider {
  if (!cachedProvider) {
    const name = resolveProviderName();
    cachedProvider = providers[name];
  }
  return cachedProvider;
}

/** Reset the cached provider — used by tests. */
export function resetEmailProviderCache(): void {
  cachedProvider = null;
}

/**
 * Send an email using the configured provider.
 * Thin convenience wrapper over the resolved provider.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  await getEmailProvider().send({ to, subject, html });
}
