import { connectDB } from '@/lib/db';
import { sendOutreachEmail } from '@/lib/email';
import { Lead } from '@/models/Lead';
import { OfferConfig } from '@/models/OfferConfig';
import { OutreachMessage } from '@/models/OutreachMessage';
import { Template } from '@/models/Template';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { leadIds, templateId } = await request.json();
    
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'Lead IDs are required' },
        { status: 400 }
      );
    }
    
    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }
    
    // Fetch required data
    const [leads, template, offerConfig] = await Promise.all([
      Lead.find({ _id: { $in: leadIds } }),
      Template.findById(templateId),
      OfferConfig.findOne(),
    ]);
    
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    if (!offerConfig) {
      return NextResponse.json(
        { error: 'Offer configuration not found. Please set up your offer config first.' },
        { status: 404 }
      );
    }
    
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };
    
    // Send emails to each lead
    for (const lead of leads) {
      try {
        // Apply template variables (with safety checks)
        const personalizedSubject = (template.subject || '')
          .replace(/\{\{firstName\}\}/g, lead.firstName || '')
          .replace(/\{\{lastName\}\}/g, lead.lastName || '')
          .replace(/\{\{companyName\}\}/g, lead.companyName || '')
          .replace(/\{\{location\}\}/g, lead.location || '');
        
        const personalizedBody = (template.body || '')
          .replace(/\{\{firstName\}\}/g, lead.firstName || '')
          .replace(/\{\{lastName\}\}/g, lead.lastName || '')
          .replace(/\{\{companyName\}\}/g, lead.companyName || '')
          .replace(/\{\{location\}\}/g, lead.location || '');
        
        // Validate template has required fields
        if (!personalizedSubject || !personalizedBody) {
          results.failed++;
          results.errors.push(
            `${lead.email}: Template is missing subject or body`
          );
          continue;
        }
        
        const emailResult = await sendOutreachEmail(lead, template, offerConfig);
        
        // Create outreach message record (always with subject/body, even on failure)
        await OutreachMessage.create({
          leadId: lead._id,
          templateId: template._id,
          subject: personalizedSubject,
          body: personalizedBody,
          sentAt: new Date(),
          status: emailResult.success ? 'SENT' : 'FAILED',
          providerMessageId: emailResult.messageId,
        });
        
        if (emailResult.success) {
          // Update lead status if currently NEW
          if (lead.status === 'NEW') {
            lead.status = 'CONTACTED';
          }
          lead.lastContactedAt = new Date();
          await lead.save();
          
          results.sent++;
        } else {
          results.failed++;
          results.errors.push(`${lead.email}: ${emailResult.error}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(
          `${lead.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
    
    return NextResponse.json({
      success: true,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors,
    });
  } catch (error) {
    console.error('Error sending outreach:', error);
    return NextResponse.json(
      { error: 'Failed to send outreach emails' },
      { status: 500 }
    );
  }
}
