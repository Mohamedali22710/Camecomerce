/** Public contact form: validates input and forwards it by email. */
import { Request, Response } from "express";

import { env } from "../../../config/env.service.js";
import { sendEmail } from "../../common/email/sendEmail.js";
import { HttpError } from "../../common/utils/httpError.js";

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const submitContactForm = async (req: Request, res: Response): Promise<void> => {
  const recipient = env.contactRecipientEmail;
  if (!recipient) {
    throw new HttpError(503, "Contact form is temporarily unavailable");
  }

  const { name, email, subject, message } = req.body;

  await sendEmail({
    email: recipient,
    subject: `[Contact Form] ${subject}`,
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
    `,
  });

  res.status(200).json({ message: "Message sent successfully" });
};
