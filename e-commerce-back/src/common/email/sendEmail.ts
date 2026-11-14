/** Nodemailer email sender utility. */
import nodemailer, { Transporter } from "nodemailer";

import { env } from "../../../config/env.service.js";

interface SendEmailOptions {
  email: string;
  subject: string;
  text?: string;
  html?: string;
}

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (!env.email || !env.password) {
    throw new Error("Email transport is not configured (EMAIL / PASSWORD)");
  }

  transporter ??= nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.email,
      pass: env.password,
    },
  });

  return transporter;
};

/** Sends an email through the configured SMTP server. */
export const sendEmail = async ({
  email,
  subject,
  text,
  html,
}: SendEmailOptions): Promise<void> => {
  const mailer = getTransporter();
  await mailer.sendMail({
    from: `"${env.emailFromName}" <${env.email}>`,
    to: email,
    subject,
    text,
    html,
  });
};
