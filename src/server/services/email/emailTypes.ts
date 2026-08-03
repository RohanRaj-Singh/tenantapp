/** Shared email types (Phase D). */

/** A single outbound email message. */
export interface EmailMessage {
  /** Recipient email address. */
  to: string;
  /** Subject line. */
  subject: string;
  /** HTML body. */
  html: string;
}

/** Pluggable email provider — implemented by console and SendGrid senders. */
export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}
