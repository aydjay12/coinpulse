import nodemailer, { Transporter } from 'nodemailer';

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type MailResult = {
  delivered: boolean;
  devOnly: boolean;
};

let transporter: Transporter | null = null;

function hasSmtpConfig() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS,
  );
}

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

async function sendMail(payload: MailPayload): Promise<MailResult> {
  if (!hasSmtpConfig()) {
    console.info('[Coinnex auth email]', payload.subject);
    console.info(payload.text);
    return { delivered: false, devOnly: true };
  }

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    ...payload,
  });

  return { delivered: true, devOnly: false };
}

export async function sendVerificationEmail(email: string, code: string) {
  return sendMail({
    to: email,
    subject: 'Verify your Coinnex account',
    text: `Your Coinnex verification code is ${code}. It expires in 10 minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>Verify your Coinnex account</h2>
        <p>Your verification code is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(email: string, username: string) {
  return sendMail({
    to: email,
    subject: 'Welcome to Coinnex',
    text: `Welcome to Coinnex, ${username}. Your account is now verified.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>Welcome to Coinnex, ${username}</h2>
        <p>Your account is now verified and ready to use.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  return sendMail({
    to: email,
    subject: 'Reset your Coinnex password',
    text: `Use this link to reset your Coinnex password: ${resetUrl}. It expires in 1 hour.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>Reset your Coinnex password</h2>
        <p>Use the secure link below to create a new password. It expires in 1 hour.</p>
        <p><a href="${resetUrl}">Reset password</a></p>
      </div>
    `,
  });
}

export async function sendResetSuccessEmail(email: string) {
  return sendMail({
    to: email,
    subject: 'Your Coinnex password was reset',
    text: 'Your Coinnex password was reset successfully.',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>Password reset successful</h2>
        <p>Your Coinnex password was reset successfully.</p>
      </div>
    `,
  });
}
