import { ILead } from '@/models/Lead';
import { IOfferConfig } from '@/models/OfferConfig';
import { ITemplate } from '@/models/Template';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Replace template variables with lead data
 */
function replaceVariables(
  text: string,
  lead: Partial<ILead>
): string {
  return text
    .replace(/\{\{firstName\}\}/g, lead.firstName || '')
    .replace(/\{\{lastName\}\}/g, lead.lastName || '')
    .replace(/\{\{companyName\}\}/g, lead.companyName || '')
    .replace(/\{\{location\}\}/g, lead.location || '')
    .replace(/\{\{email\}\}/g, lead.email || '');
}

/**
 * Send outreach email using Resend
 */
export async function sendOutreachEmail(
  lead: Partial<ILead>,
  template: ITemplate,
  offerConfig: IOfferConfig
): Promise<EmailResult> {
  try {
    // Validate required fields
    if (!lead.email) {
      throw new Error('Lead email is required');
    }

    // Replace variables in subject and body
    const subject = replaceVariables(template.subject, lead);
    const body = replaceVariables(template.body, lead);

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: `${offerConfig.fromName} <${offerConfig.fromEmail}>`,
      to: [lead.email],
      subject,
      html: body.replace(/\n/g, '<br>'), // Convert newlines to <br> for HTML
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
