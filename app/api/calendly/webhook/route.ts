import { connectDB } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { CalendlyWebhookPayload } from '@/types/calendly';
import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify Calendly webhook signature to ensure authenticity
 * https://developer.calendly.com/api-docs/ZG9jOjM2MzE2MDM4-webhook-signatures
 */
function verifyWebhookSignature(
  signature: string,
  timestamp: string,
  rawBody: string,
  signingKey: string
): boolean {
  try {
    // Reconstruct the signed payload: timestamp + "." + raw request body
    const signedPayload = `${timestamp}.${rawBody}`;
    
    // Compute HMAC SHA256 digest
    const expectedSignature = createHmac('sha256', signingKey)
      .update(signedPayload)
      .digest('hex');
    
    // Compare signatures (use timingSafeEqual in production for security)
    return signature === expectedSignature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
    
    if (!signingKey) {
      console.error('CALENDLY_WEBHOOK_SIGNING_KEY not configured');
      return NextResponse.json(
        { error: 'Webhook signing key not configured' },
        { status: 500 }
      );
    }

    // Get signature header
    const signatureHeader = request.headers.get('calendly-webhook-signature');
    
    if (!signatureHeader) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 }
      );
    }

    // Parse signature header: "t=timestamp,v1=signature"
    const parts: Record<string, string> = {};
    signatureHeader.split(',').forEach((part) => {
      const [key, value] = part.split('=');
      parts[key] = value;
    });

    const timestamp = parts['t'];
    const signature = parts['v1'];

    if (!timestamp || !signature) {
      return NextResponse.json(
        { error: 'Invalid signature format' },
        { status: 401 }
      );
    }

    // Get raw body text for signature verification
    const rawBody = await request.text();
    
    // Verify timestamp is recent (prevent replay attacks)
    const webhookTimestamp = parseInt(timestamp, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const timestampDiff = currentTimestamp - webhookTimestamp;
    
    // Reject if timestamp is older than 3 minutes (180 seconds)
    if (timestampDiff > 180) {
      return NextResponse.json(
        { error: 'Webhook timestamp too old' },
        { status: 401 }
      );
    }

    // Verify signature
    if (!verifyWebhookSignature(signature, timestamp, rawBody, signingKey)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Parse the verified payload
    const body: CalendlyWebhookPayload = JSON.parse(rawBody);
    
    await connectDB();
    
    // Extract invitee email from Calendly payload
    const email = body.payload?.invitee?.email;
    const eventType = body.event;
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email not found in webhook payload' },
        { status: 400 }
      );
    }
    
    // Find lead by email
    const lead = await Lead.findOne({ email });
    
    if (!lead) {
      // Lead not found, but webhook was valid
      console.log(`Calendly webhook: Lead not found for email ${email}`);
      return NextResponse.json({
        success: true,
        message: 'Webhook verified but lead not found',
      });
    }
    
    // Update lead status based on event type
    if (eventType === 'invitee.created') {
      lead.status = 'MEETING_BOOKED';
      await lead.save();
      
      console.log(`✅ Lead ${lead.email} marked as MEETING_BOOKED via Calendly webhook`);
    } else if (eventType === 'invitee.canceled') {
      // Optionally handle cancellations
      console.log(`ℹ️ Meeting canceled for lead ${lead.email}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    console.error('Error processing Calendly webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
