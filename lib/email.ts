import { ILead } from '@/models/Lead';
import { IOfferConfig } from '@/models/OfferConfig';
import { ITemplate } from '@/models/Template';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
}

interface EmailProvider {
  name: string;
  send: (params: {
    from: string;
    to: string;
    subject: string;
    html: string;
  }) => Promise<EmailResult>;
}

/**
 * Replace template variables with lead and offer config data
 */
function replaceVariables(
  text: string,
  lead: Partial<ILead>,
  offerConfig: IOfferConfig
): string {
  let result = text
    .replace(/\{\{firstName\}\}/g, lead.firstName || '')
    .replace(/\{\{lastName\}\}/g, lead.lastName || '')
    .replace(/\{\{companyName\}\}/g, lead.companyName || '')
    .replace(/\{\{location\}\}/g, lead.location || '')
    .replace(/\{\{email\}\}/g, lead.email || '');
  
  result = result
    .replace(/\{\{calendlyUrl\}\}/g, offerConfig.calendlyUrl || '')
    .replace(/\{\{fromName\}\}/g, offerConfig.fromName || '')
    .replace(/\{\{nicheName\}\}/g, offerConfig.nicheName || '')
    .replace(/\{\{icpDescription\}\}/g, offerConfig.icpDescription || '')
    .replace(/\{\{offerDescription\}\}/g, offerConfig.offerDescription || '');
  
  return result;
}

/**
 * Resend email provider
 */
class ResendProvider implements EmailProvider {
  name = 'Resend';
  private client: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    this.client = new Resend(apiKey);
  }

  async send(params: { from: string; to: string; subject: string; html: string }): Promise<EmailResult> {
    try {
      const { data, error } = await this.client.emails.send({
        from: params.from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      });

      if (error) {
        const errorMessage = error.message || '';
        if (errorMessage.includes('verify a domain') || errorMessage.includes('testing emails')) {
          return {
            success: false,
            error: `Domain verification required: ${errorMessage}. Please verify your domain at resend.com/domains or use a verified domain in your fromEmail.`,
            provider: this.name,
          };
        }
        
        return {
          success: false,
          error: errorMessage,
          provider: this.name,
        };
      }

      return {
        success: true,
        messageId: data?.id,
        provider: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }
}

/**
 * Gmail SMTP provider (using nodemailer)
 * 
 * Setup instructions:
 * 1. Enable 2-Step Verification on your Google Account
 * 2. Generate an App Password: https://myaccount.google.com/apppasswords
 * 3. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local
 * 
 * Note: Free Gmail accounts have a limit of 500 emails/day
 */
class GmailSMTPProvider implements EmailProvider {
  name = 'Gmail SMTP';
  private transporter: nodemailer.Transporter;

  constructor() {
    const user = process.env.GMAIL_USER;
    const password = process.env.GMAIL_APP_PASSWORD;

    if (!user || !password) {
      throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD must be configured');
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass: password.replace(/\s/g, ''), // Remove spaces from app password
      },
    });
  }

  async send(params: { from: string; to: string; subject: string; html: string }): Promise<EmailResult> {
    try {
      const info = await this.transporter.sendMail({
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });

      return {
        success: true,
        messageId: info.messageId,
        provider: this.name,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Provide helpful error messages
      if (errorMessage.includes('Invalid login') || errorMessage.includes('authentication')) {
        return {
          success: false,
          error: 'Gmail authentication failed. Make sure you\'re using an App Password (not your regular password). Generate one at https://myaccount.google.com/apppasswords',
          provider: this.name,
        };
      }
      
      if (errorMessage.includes('quota') || errorMessage.includes('limit') || errorMessage.includes('550')) {
        return {
          success: false,
          error: 'Gmail daily sending limit reached (500 emails/day for free accounts). Consider upgrading to Google Workspace or using another provider.',
          provider: this.name,
        };
      }

      return {
        success: false,
        error: errorMessage,
        provider: this.name,
      };
    }
  }
}

/**
 * Generic SMTP provider (for any SMTP server)
 * 
 * Supports self-hosted SMTP servers like:
 * - Postfix (open source)
 * - Mail-in-a-Box (open source)
 * - Any SMTP server
 * 
 * Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD in .env.local
 */
class GenericSMTPProvider implements EmailProvider {
  name = 'Generic SMTP';
  private transporter: nodemailer.Transporter;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD;
    const secure = process.env.SMTP_SECURE === 'true';

    if (!host || !user || !password) {
      throw new Error('SMTP_HOST, SMTP_USER, and SMTP_PASSWORD must be configured');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure, // true for 465, false for other ports
      auth: {
        user,
        pass: password,
      },
    });
  }

  async send(params: { from: string; to: string; subject: string; html: string }): Promise<EmailResult> {
    try {
      const info = await this.transporter.sendMail({
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });

      return {
        success: true,
        messageId: info.messageId,
        provider: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }
}

/**
 * SendGrid email provider (fallback)
 */
class SendGridProvider implements EmailProvider {
  name = 'SendGrid';
  private apiKey: string;

  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY is not configured');
    }
    this.apiKey = apiKey;
  }

  async send(params: { from: string; to: string; subject: string; html: string }): Promise<EmailResult> {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: params.to }],
          }],
          from: { 
            email: params.from.match(/<(.+)>/)?.[1] || params.from, 
            name: params.from.match(/^(.+?)\s*</)?.[1] || '' 
          },
          subject: params.subject,
          content: [{
            type: 'text/html',
            value: params.html,
          }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.errors?.[0]?.message || `SendGrid error: ${response.statusText}`,
          provider: this.name,
        };
      }

      const messageId = response.headers.get('x-message-id') || undefined;
      return {
        success: true,
        messageId,
        provider: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }
}

/**
 * Initialize available email providers
 */
function getAvailableProviders(): EmailProvider[] {
  const providers: EmailProvider[] = [];

  // Resend (primary)
  if (process.env.RESEND_API_KEY) {
    try {
      providers.push(new ResendProvider());
    } catch (error) {
      console.warn('Resend provider not available:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Gmail SMTP (great for testing and small volumes)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      providers.push(new GmailSMTPProvider());
    } catch (error) {
      console.warn('Gmail SMTP provider not available:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Generic SMTP (for self-hosted solutions)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    try {
      providers.push(new GenericSMTPProvider());
    } catch (error) {
      console.warn('Generic SMTP provider not available:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // SendGrid (fallback)
  if (process.env.SENDGRID_API_KEY) {
    try {
      providers.push(new SendGridProvider());
    } catch (error) {
      console.warn('SendGrid provider not available:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  return providers;
}

/**
 * Send outreach email with automatic fallback across multiple providers
 */
export async function sendOutreachEmail(
  lead: Partial<ILead>,
  template: ITemplate,
  offerConfig: IOfferConfig
): Promise<EmailResult> {
  // Validate required fields
  if (!lead.email) {
    return {
      success: false,
      error: 'Lead email is required',
    };
  }

  // Replace variables in subject and body
  const subject = replaceVariables(template.subject, lead, offerConfig);
  const body = replaceVariables(template.body, lead, offerConfig);

  const htmlBody = body.replace(/\n/g, '<br>');
  const fromAddress = `${offerConfig.fromName} <${offerConfig.fromEmail}>`;

  // Get available providers
  const providers = getAvailableProviders();
  
  if (providers.length === 0) {
    return {
      success: false,
      error: 'No email providers configured. Please set one of: RESEND_API_KEY, GMAIL_USER+GMAIL_APP_PASSWORD, SMTP_HOST+SMTP_USER+SMTP_PASSWORD, or SENDGRID_API_KEY in your environment variables.',
    };
  }

  // Try each provider with automatic fallback
  let lastError: string | undefined;
  let lastProvider: string | undefined;

  for (const provider of providers) {
    try {
      const result = await provider.send({
        from: fromAddress,
        to: lead.email,
        subject,
        html: htmlBody,
      });

      if (result.success) {
        console.log(`✅ Email sent successfully via ${result.provider} to ${lead.email}`);
        return result;
      }

      // Store error for fallback
      lastError = result.error;
      lastProvider = result.provider;
      console.warn(`⚠️ ${provider.name} failed: ${result.error}, trying next provider...`);
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      lastProvider = provider.name;
      console.warn(`⚠️ ${provider.name} threw error: ${lastError}, trying next provider...`);
    }
  }

  // All providers failed
  return {
    success: false,
    error: `All email providers failed. Last error from ${lastProvider}: ${lastError}`,
    provider: lastProvider,
  };
}
