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

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      SMTP_FROM,
      SMTP_FROM_NAME,
    } = process.env;

    // If no SMTP config, use development mode with ethereal
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.log(
        "⚠️  No SMTP configuration found. Emails will be logged to console only."
      );
      console.log(
        "💡 To enable email sending, add SMTP credentials to your .env file."
      );
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT || "587"),
        secure: parseInt(SMTP_PORT || "587") === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });

      console.log("✅ Email service initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize email service:", error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.log("\n📧 Email would be sent (SMTP not configured):");
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Body: ${options.text}`);
      if (options.attachments) {
        console.log(
          `Attachments: ${options.attachments.map((a) => a.filename).join(", ")}`
        );
      }
      console.log("\n");
      return false;
    }

    try {
      const { SMTP_FROM, SMTP_FROM_NAME } = process.env;
      const from = SMTP_FROM_NAME
        ? `"${SMTP_FROM_NAME}" <${SMTP_FROM}>`
        : SMTP_FROM;

      await this.transporter.sendMail({
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
