import nodemailer from 'nodemailer';
import { logger } from './logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'LoanLens <noreply@loanlens.ai>',
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    logger.error('Failed to send email:', error);
    throw error;
  }
}

const baseStyle = `
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #F8FAFC;
  padding: 40px 20px;
`;

const cardStyle = `
  background: white;
  border-radius: 12px;
  padding: 40px;
  max-width: 480px;
  margin: 0 auto;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
`;

const logoStyle = `
  font-size: 24px; font-weight: 700;
  background: linear-gradient(135deg, #1E40AF, #3B82F6);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  margin-bottom: 32px; display: block;
`;

const otpBoxStyle = `
  background: #F0F9FF; border: 2px dashed #3B82F6;
  border-radius: 12px; padding: 24px; text-align: center;
  font-size: 36px; font-weight: 700; letter-spacing: 12px;
  color: #1E40AF; margin: 24px 0;
`;

export const emailTemplates = {
  otp: (name: string, otp: string, purpose: string) => `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <span style="${logoStyle}">🔍 LoanLens</span>
        <h2 style="color:#1E293B;margin:0 0 8px">Hello, ${name}!</h2>
        <p style="color:#64748B;margin:0 0 24px">
          Your OTP for <strong>${purpose}</strong> is:
        </p>
        <div style="${otpBoxStyle}">${otp}</div>
        <p style="color:#64748B;font-size:14px;margin:0">
          This OTP expires in <strong>10 minutes</strong>. Do not share it with anyone.
        </p>
        <hr style="border:none;border-top:1px solid #E2E8F0;margin:32px 0">
        <p style="color:#94A3B8;font-size:12px;margin:0;text-align:center">
          © 2024 LoanLens · Smart AI Verification for Transparent Loan Utilization
        </p>
      </div>
    </div>
  `,

  verificationApproved: (name: string, loanNumber: string) => `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <span style="${logoStyle}">🔍 LoanLens</span>
        <div style="text-align:center;margin-bottom:24px">
          <div style="width:64px;height:64px;background:#D1FAE5;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:28px;">✅</div>
        </div>
        <h2 style="color:#1E293B;text-align:center;margin:0 0 8px">Loan Verified!</h2>
        <p style="color:#64748B;text-align:center;margin:0 0 24px">
          Your loan utilization proof for <strong>${loanNumber}</strong> has been approved.
        </p>
        <div style="background:#F0FDF4;border-left:4px solid #10B981;padding:16px;border-radius:0 8px 8px 0;margin:24px 0;">
          <p style="color:#065F46;margin:0;font-weight:600">Verification Status: APPROVED</p>
        </div>
        <p style="color:#64748B;font-size:14px">
          Dear ${name}, your loan has been successfully verified. You can download the verification report from your dashboard.
        </p>
      </div>
    </div>
  `,

  verificationRejected: (name: string, loanNumber: string, reason: string) => `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <span style="${logoStyle}">🔍 LoanLens</span>
        <div style="text-align:center;margin-bottom:24px">
          <div style="width:64px;height:64px;background:#FEE2E2;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:28px;">❌</div>
        </div>
        <h2 style="color:#1E293B;text-align:center;margin:0 0 8px">Verification Not Approved</h2>
        <p style="color:#64748B;text-align:center;margin:0 0 24px">
          Loan <strong>${loanNumber}</strong>
        </p>
        <div style="background:#FFF5F5;border-left:4px solid #EF4444;padding:16px;border-radius:0 8px 8px 0;margin:24px 0;">
          <p style="color:#991B1B;margin:0;font-weight:600">Reason: ${reason}</p>
        </div>
        <p style="color:#64748B;font-size:14px">
          Dear ${name}, please upload better quality evidence with GPS enabled and try again.
        </p>
      </div>
    </div>
  `,

  moreEvidence: (name: string, loanNumber: string, instructions: string) => `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <span style="${logoStyle}">🔍 LoanLens</span>
        <div style="text-align:center;margin-bottom:24px">
          <div style="width:64px;height:64px;background:#FEF3C7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:28px;">📸</div>
        </div>
        <h2 style="color:#1E293B;text-align:center;margin:0 0 8px">Additional Evidence Required</h2>
        <p style="color:#64748B;text-align:center;margin:0 0 24px">Loan ${loanNumber}</p>
        <div style="background:#FFFBEB;border-left:4px solid #F59E0B;padding:16px;border-radius:0 8px 8px 0;margin:24px 0;">
          <p style="color:#92400E;margin:0">${instructions}</p>
        </div>
        <p style="color:#64748B;font-size:14px">
          Dear ${name}, please login to your LoanLens dashboard and upload the requested evidence.
        </p>
      </div>
    </div>
  `,

  welcome: (name: string, role: string) => `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <span style="${logoStyle}">🔍 LoanLens</span>
        <h2 style="color:#1E293B;margin:0 0 8px">Welcome to LoanLens, ${name}!</h2>
        <p style="color:#64748B;margin:0 0 24px">
          Your account has been created as a <strong>${role}</strong>.
        </p>
        <a href="${process.env.FRONTEND_URL}/login" style="display:block;background:linear-gradient(135deg,#1E40AF,#3B82F6);color:white;text-decoration:none;padding:14px 24px;border-radius:8px;text-align:center;font-weight:600;">
          Login to Dashboard
        </a>
      </div>
    </div>
  `,
};
