import * as brevo from '@getbrevo/brevo';
import { config } from '../config/index.js';

// Initialize Brevo API
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  config.brevo.apiKey
);

// Email templates
const getOTPEmailTemplate = (otp: string, name: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Vilanow</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                🏠 Vilanow
              </h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #a0aec0;">
                Your Gateway to Real Estate
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a2e;">
                Hello, ${name}! 👋
              </h2>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4a5568;">
                Thank you for signing up with Vilanow! To complete your registration and start exploring amazing properties, please verify your email address using the code below:
              </p>
              
              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 32px; text-align: center; margin: 24px 0;">
                <p style="margin: 0 0 12px; font-size: 14px; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 2px;">
                  Your Verification Code
                </p>
                <h1 style="margin: 0; font-size: 48px; font-weight: 700; color: #ffffff; letter-spacing: 12px; font-family: monospace;">
                  ${otp}
                </h1>
                <p style="margin: 16px 0 0; font-size: 13px; color: rgba(255,255,255,0.7);">
                  Code expires in 10 minutes
                </p>
              </div>
              
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #718096;">
                If you didn't create an account with Vilanow, you can safely ignore this email.
              </p>
              
              <!-- Security Notice -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin-top: 24px;">
                <p style="margin: 0; font-size: 13px; color: #92400e;">
                  <strong>🔒 Security Tip:</strong> Never share this code with anyone. Vilanow staff will never ask for your verification code.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: #f8fafc; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #64748b;">
                Need help? Contact us at <a href="mailto:support@vilanow.com" style="color: #667eea; text-decoration: none;">support@vilanow.com</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} Vilanow. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const getWelcomeEmailTemplate = (name: string, role: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Vilanow</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                🏠 Vilanow
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <span style="font-size: 64px;">🎉</span>
              </div>
              
              <h2 style="margin: 0 0 16px; font-size: 28px; font-weight: 600; color: #1a1a2e; text-align: center;">
                Welcome to Vilanow, ${name}!
              </h2>
              
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4a5568; text-align: center;">
                Your email has been verified successfully. You're now part of Nigeria's fastest-growing real estate marketplace!
              </p>
              
              ${role === 'agent' ? `
              <!-- Agent Features -->
              <div style="background-color: #f0fdf4; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h3 style="margin: 0 0 16px; font-size: 18px; color: #166534;">🏆 As an Agent, you can:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #15803d; line-height: 1.8;">
                  <li>List unlimited properties</li>
                  <li>Connect with serious buyers</li>
                  <li>Use credits to unlock leads</li>
                  <li>Build your reputation with reviews</li>
                  <li>Access exclusive marketplace features</li>
                </ul>
              </div>
              ` : `
              <!-- Seeker Features -->
              <div style="background-color: #eff6ff; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h3 style="margin: 0 0 16px; font-size: 18px; color: #1e40af;">🔍 As a Seeker, you can:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #1d4ed8; line-height: 1.8;">
                  <li>Browse thousands of verified properties</li>
                  <li>Express interest directly to agents</li>
                  <li>Schedule property inspections</li>
                  <li>Chat with agents in real-time</li>
                  <li>Save your favorite listings</li>
                </ul>
              </div>
              `}
              
              <div style="text-align: center; margin-top: 32px;">
                <a href="${config.frontendUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Start Exploring →
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: #f8fafc; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} Vilanow. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const getPasswordResetEmailTemplate = (otp: string, name: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - Vilanow</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                🔐 Password Reset
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a2e;">
                Hello, ${name}
              </h2>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4a5568;">
                We received a request to reset your password. Use the code below to proceed:
              </p>
              
              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 12px; padding: 32px; text-align: center; margin: 24px 0;">
                <p style="margin: 0 0 12px; font-size: 14px; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 2px;">
                  Reset Code
                </p>
                <h1 style="margin: 0; font-size: 48px; font-weight: 700; color: #ffffff; letter-spacing: 12px; font-family: monospace;">
                  ${otp}
                </h1>
                <p style="margin: 16px 0 0; font-size: 13px; color: rgba(255,255,255,0.7);">
                  Code expires in 10 minutes
                </p>
              </div>
              
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #718096;">
                If you didn't request a password reset, please ignore this email or contact support if you have concerns.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: #f8fafc; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} Vilanow. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Send email function
export const sendEmail = async (
  to: string,
  subject: string,
  htmlContent: string
): Promise<boolean> => {
  try {
    if (!config.brevo.apiKey) {
      console.warn('Brevo API key not configured. Skipping email.');
      return false;
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.sender = {
      email: config.brevo.senderEmail,
      name: config.brevo.senderName,
    };
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✉️ Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

// Send OTP verification email
export const sendOTPEmail = async (
  email: string,
  otp: string,
  name: string
): Promise<boolean> => {
  const subject = `${otp} is your Vilanow verification code`;
  const html = getOTPEmailTemplate(otp, name);
  return sendEmail(email, subject, html);
};

// Send welcome email after verification
export const sendWelcomeEmail = async (
  email: string,
  name: string,
  role: string
): Promise<boolean> => {
  const subject = `Welcome to Vilanow, ${name}! 🏠`;
  const html = getWelcomeEmailTemplate(name, role);
  return sendEmail(email, subject, html);
};

// Send password reset email
export const sendPasswordResetEmail = async (
  email: string,
  otp: string,
  name: string
): Promise<boolean> => {
  const subject = `Reset your Vilanow password`;
  const html = getPasswordResetEmailTemplate(otp, name);
  return sendEmail(email, subject, html);
};

// Generate 6-digit OTP
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const isEmailServiceConfigured = (): boolean => {
  return !!config.brevo.apiKey;
};


