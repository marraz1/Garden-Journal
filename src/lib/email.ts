import "server-only";
import { Resend } from "resend";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends through Resend when RESEND_API_KEY is configured. Without it — local
 * development, or before the email provider is set up — the message is logged
 * instead so the reset link is still reachable. Never throws: a failing mailer
 * must not turn "we sent you a link" into a 500 that also reveals whether the
 * address exists.
 */
export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Sodo žurnalas <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY not set — not sending. To: ${to}\nSubject: ${subject}\n${text}`,
    );
    return false;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to, subject, html, text });
    if (error) {
      console.error("[email] send failed", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] send threw", error);
    return false;
  }
}

/** Plain, single-column HTML — renders predictably in every mail client. */
export function passwordResetEmail(resetUrl: string, locale: string) {
  const copy =
    locale === "en"
      ? {
          subject: "Reset your Garden Journal password",
          heading: "Reset your password",
          body: "Click the button below to choose a new password. The link is valid for 1 hour.",
          button: "Choose a new password",
          ignore: "If you did not ask for this, you can ignore this email — nothing will change.",
        }
      : {
          subject: "Sodo žurnalo slaptažodžio keitimas",
          heading: "Pakeiskite slaptažodį",
          body: "Paspauskite mygtuką žemiau ir pasirinkite naują slaptažodį. Nuoroda galioja 1 valandą.",
          button: "Pasirinkti naują slaptažodį",
          ignore: "Jei to neprašėte — tiesiog ignoruokite šį laišką, niekas nepasikeis.",
        };

  const html = `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;padding:24px;background:#faf8f3;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2b2a26">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px">
      <h1 style="margin:0 0 16px;font-size:20px">${copy.heading}</h1>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.5">${copy.body}</p>
      <a href="${resetUrl}" style="display:inline-block;background:#4a6b4a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:12px;font-size:16px;font-weight:600">${copy.button}</a>
      <p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#6b6a63">${copy.ignore}</p>
      <p style="margin:16px 0 0;font-size:12px;word-break:break-all;color:#6b6a63">${resetUrl}</p>
    </div>
  </body>
</html>`;

  const text = `${copy.heading}\n\n${copy.body}\n\n${resetUrl}\n\n${copy.ignore}`;

  return { subject: copy.subject, html, text };
}
