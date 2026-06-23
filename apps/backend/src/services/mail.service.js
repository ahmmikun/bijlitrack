import nodemailer from 'nodemailer';

const getRequiredSmtpFields = () => {
  return [
    process.env.SMTP_HOST,
    process.env.SMTP_PORT,
    process.env.SMTP_USER,
    process.env.SMTP_PASS,
    process.env.MAIL_FROM,
  ];
};

export const isMailConfigured = () => {
  return getRequiredSmtpFields().every(Boolean);
};

const createTransporter = () => {
  if (!isMailConfigured()) {
    throw new Error('SMTP email service is not configured');
  }

  const port = Number(process.env.SMTP_PORT);

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const transporter = createTransporter();
  const appName = process.env.APP_NAME || 'BijliTrack';
  const displayName = name || 'there';

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: `${appName} password reset`,
    text: [
      `Hi ${displayName},`,
      '',
      `We received a request to reset your ${appName} password.`,
      `Open this link to set a new password: ${resetUrl}`,
      '',
      'This link expires in 1 hour. If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2 style="margin:0 0 16px">${appName} password reset</h2>
        <p>Hi ${displayName},</p>
        <p>We received a request to reset your ${appName} password.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">
            Reset password
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px">This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
};
