/**
 * Email HTML templates (Phase D).
 */

/**
 * Password reset email template.
 * Renders a simple, branded, self-contained HTML email with a single
 * call-to-action button linking to the password reset page.
 */
export function passwordResetEmailTemplate(options: {
  /** Recipient's first name (display only). */
  name: string;
  /** Full reset URL (marketing site reset-password page with ?token=...). */
  resetUrl: string;
}): string {
  const { name, resetUrl } = options;
  const appName = "RemedyGCC";
  const displayName = name && name.trim() ? name.trim().split(" ")[0] : "there";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Reset your password</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background-color:#3b5bdb;padding:24px 32px;text-align:center;">
                <span style="font-size:20px;font-weight:bold;color:#ffffff;">${appName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px;font-size:20px;color:#1f2937;">Reset your password</h1>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4b5563;">
                  Hi ${displayName},
                </p>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#4b5563;">
                  We received a request to reset the password for your ${appName} account.
                  Click the button below to choose a new password. This link is valid for
                  <strong>1 hour</strong> and can only be used once.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                  <tr>
                    <td style="border-radius:8px;background-color:#3b5bdb;">
                      <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">
                        Reset Password
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4b5563;">
                  If the button above does not work, copy and paste this link into your browser:
                </p>
                <p style="margin:0 0 24px;font-size:12px;line-height:1.5;color:#6b7280;word-break:break-all;">
                  ${resetUrl}
                </p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">
                  If you did not request a password reset, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f9fafb;padding:16px 32px;text-align:center;">
                <span style="font-size:12px;color:#9ca3af;">&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
