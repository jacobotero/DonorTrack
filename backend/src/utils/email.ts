import nodemailer from "nodemailer";

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

export interface OrgSmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string; // org's registered email
}

function createTransporter(config: OrgSmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

class EmailService {
  // Lazily initialized on first use so dotenv has time to load
  private getSystemTransporter(): nodemailer.Transporter | null {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return null;
    }

    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || "587"),
      secure: parseInt(SMTP_PORT || "587") === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }

  // Send using org-specific SMTP (for tax letters sent from org's own email)
  async sendEmailWithOrgConfig(options: EmailOptions, orgConfig: OrgSmtpConfig): Promise<boolean> {
    try {
      const transporter = createTransporter(orgConfig);
      const from = `"${orgConfig.fromName}" <${orgConfig.fromEmail}>`;

      await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text,
        attachments: options.attachments,
      });

      console.log(`✅ Email sent from ${orgConfig.fromEmail} to ${options.to}`);
      return true;
    } catch (error) {
      console.error("❌ Failed to send email with org SMTP:", error);
      throw error;
    }
  }

  // Test org SMTP credentials
  async testOrgSmtp(orgConfig: OrgSmtpConfig): Promise<void> {
    const transporter = createTransporter(orgConfig);
    await transporter.verify();
  }

  // Send using system SMTP (for verification emails etc.)
  async sendEmail(options: EmailOptions): Promise<boolean> {
    const transporter = this.getSystemTransporter();

    if (!transporter) {
      console.log("\n📧 Email would be sent (SMTP not configured):");
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Body: ${options.text}`);
      if (options.attachments) {
        console.log(`Attachments: ${options.attachments.map((a) => a.filename).join(", ")}`);
      }
      console.log("\n");
      return false;
    }

    try {
      const { SMTP_FROM, SMTP_FROM_NAME } = process.env;
      const from = SMTP_FROM_NAME ? `"${SMTP_FROM_NAME}" <${SMTP_FROM}>` : SMTP_FROM;

      await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text,
        attachments: options.attachments,
      });

      console.log(`✅ Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      console.error("❌ Failed to send email:", error);
      throw new Error("Failed to send email");
    }
  }
}

export const emailService = new EmailService();
