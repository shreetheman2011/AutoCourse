import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

interface Recipient {
  email: string;
  name?: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  try {
    const {
      recipients = [],
      documentTitle = "Untitled document",
      accessLevel = "view",
      shareUrl = "",
      senderName = "Someone",
    }: {
      recipients?: Recipient[];
      documentTitle?: string;
      accessLevel?: string;
      shareUrl?: string;
      senderName?: string;
    } = await req.json();

    const cleanRecipients = recipients.filter((recipient) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)
    );

    if (cleanRecipients.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;

    if (!host || !user || !pass || !from) {
      return NextResponse.json(
        { error: "SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM must be configured" },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      auth: { user, pass },
    });
    const safeSender = escapeHtml(senderName);
    const safeTitle = escapeHtml(documentTitle);
    const safeAccess = escapeHtml(accessLevel);
    const safeUrl = escapeHtml(shareUrl);

    await transporter.sendMail({
      from,
      to: cleanRecipients.map((recipient) => recipient.email).join(","),
      subject: `${senderName} shared "${documentTitle}" with you`,
      text: `${senderName} shared "${documentTitle}" with ${accessLevel} access.\n\nOpen it here: ${shareUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
          <p>${safeSender} shared <strong>${safeTitle}</strong> with ${safeAccess} access.</p>
          <p>
            <a href="${safeUrl}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 10px 14px; border-radius: 6px;">
              Open document
            </a>
          </p>
          <p style="color: #6b7280; font-size: 13px;">If the button does not work, paste this link into your browser: ${safeUrl}</p>
        </div>
      `,
    });

    return NextResponse.json({ sent: cleanRecipients.length });
  } catch (error: any) {
    console.error("Share notification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send share notification" },
      { status: 500 }
    );
  }
}
