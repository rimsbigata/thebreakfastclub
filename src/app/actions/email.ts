'use server';

import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

function getEmailConfig(): EmailConfig {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error('Missing required SMTP environment variables: SMTP_HOST, SMTP_USER, SMTP_PASSWORD');
  }

  return { host, port, user, pass };
}

function createTransporter(config: EmailConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });
}

export async function sendBoostCodeEmail(
  sessionCode: string,
  date: string,
  sessionLink: string,
  adminEmail: string
): Promise<{ success: boolean; message: string }> {
  try {
    const config = getEmailConfig();
    const transporter = createTransporter(config);

    // Verify SMTP connection
    await transporter.verify();

    const mailOptions = {
      from: `"The Breakfast Club" <${config.user}>`,
      to: adminEmail,
      subject: `🔥 Double Star Boost Session Created`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Double Star Boost Session Created</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; }
            .header p { color: #fef3c7; margin: 10px 0 0 0; font-size: 14px; }
            .content { padding: 30px; }
            .details-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #fde68a; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { font-weight: 600; color: #92400e; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
            .detail-value { font-weight: 700; color: #78350f; font-size: 14px; }
            .session-code { font-size: 28px; font-weight: 800; color: #f59e0b; text-align: center; letter-spacing: 4px; margin: 15px 0; font-family: 'Courier New', monospace; }
            .footer { background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; }
            .footer p { color: #6b7280; font-size: 12px; margin: 0; }
            .badge { display: inline-block; background-color: #f59e0b; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
            .button { display: inline-block; background-color: #f59e0b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; margin-top: 15px; }
            .button:hover { background-color: #d97706; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <span class="badge">Double Star Boost</span>
              <h1 style="margin-top: 15px;">Session Created</h1>
              <p>Your Double Star Boost session is ready</p>
            </div>
            
            <div class="content">
              <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                A Double Star Boost session has been created with 2x star multiplier for all matches. Use the link below to access your session.
              </p>
              
              <div class="details-box">
                <div style="text-align: center; margin-bottom: 15px;">
                  <span class="detail-label">Session Code</span>
                  <div class="session-code">${sessionCode}</div>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Scheduled Date</span>
                  <span class="detail-value">${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Boost Multiplier</span>
                  <span class="detail-value">2x Stars</span>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 25px;">
                <a href="${sessionLink}" class="button">Open Session</a>
              </div>
              
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 4px; margin-top: 20px;">
                <p style="color: #991b1b; font-size: 13px; margin: 0; font-weight: 600;">
                  ⚠️ Important: Keep this session code secure. Your session is already active with Double Star Boost enabled.
                </p>
              </div>
            </div>
            
            <div class="footer">
              <p>The Breakfast Club Badminton App</p>
              <p style="margin-top: 5px; font-size: 11px;">This is an automated notification. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Double Star Boost Session Created

Session Code: ${sessionCode}
Date: ${date}
Boost: 2x Stars

Session Link: ${sessionLink}

Your session is already active with Double Star Boost enabled. Use the link above to access your session.
`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully: ${info.messageId}`);

    return { success: true, message: `Email sent successfully to ${adminEmail}` };
  } catch (error) {
    console.error('Failed to send boost code email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred while sending email',
    };
  }
}
