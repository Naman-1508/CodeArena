import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendPasswordResetEmail = async (toEmail, resetUrl, username) => {
  const mailOptions = {
    from: `"CodeArena" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '🔐 CodeArena — Reset Your Password',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#000000;font-family:'Inter',sans-serif;">
        <div style="max-width:520px;margin:40px auto;background:#0a0a0a;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1a1a2e,#0d0d1a);padding:32px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
            <div style="font-size:32px;margin-bottom:8px;">⚡</div>
            <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0;">Code<span style="color:#3b82f6;">Arena</span></h1>
          </div>
          <div style="padding:36px 32px;">
            <h2 style="color:#ffffff;font-size:18px;font-weight:700;margin:0 0 12px;">Hi ${username},</h2>
            <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
              We received a request to reset your password. Click the button below to set a new one. This link expires in <strong style="color:#ffffff;">1 hour</strong>.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${resetUrl}" style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:0.3px;">
                Reset My Password
              </a>
            </div>
            <p style="color:#475569;font-size:12px;line-height:1.6;margin:24px 0 0;">
              If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
            <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="color:#334155;font-size:11px;margin:0;">
                Or copy this link: <span style="color:#3b82f6;word-break:break-all;">${resetUrl}</span>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const sendOTPEmail = async (toEmail, otp, username) => {
  const mailOptions = {
    from: `"CodeArena" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '🔐 CodeArena — Verify your Email',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#000000;font-family:'Inter',sans-serif;">
        <div style="max-width:520px;margin:40px auto;background:#0a0a0a;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1a1a2e,#0d0d1a);padding:32px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
            <div style="font-size:32px;margin-bottom:8px;">⚡</div>
            <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0;">Code<span style="color:#3b82f6;">Arena</span></h1>
          </div>
          <div style="padding:36px 32px;">
            <h2 style="color:#ffffff;font-size:18px;font-weight:700;margin:0 0 12px;">Welcome, ${username}!</h2>
            <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
              Please use the following One-Time Password (OTP) to verify your email address. This code will expire in 5 minutes.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <div style="display:inline-block;background:#3b82f61a;border:1px solid #3b82f6;color:#ffffff;padding:16px 40px;border-radius:12px;font-size:32px;font-weight:900;letter-spacing:4px;">
                ${otp}
              </div>
            </div>
            <p style="color:#475569;font-size:12px;line-height:1.6;margin:24px 0 0;">
              If you didn't request this verification, you can safely ignore this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};
