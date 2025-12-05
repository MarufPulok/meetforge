import { connectDB } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    
    // Expected payload from Calendly webhook might vary, but typically includes:
    // { email: "lead@example.com", event_type: "meeting_booked" }
    // Adjust this based on actual Calendly webhook payload structure
    
    const email = body.email || body.invitee?.email;
    const eventType = body.event || body.event_type;
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email not provided in webhook payload' },
        { status: 400 }
      );
    }
    
    // Find lead by email
    const lead = await Lead.findOne({ email });
    
    if (!lead) {
      // Lead not found, but webhook successful
      console.log(`Calendly webhook: Lead not found for email ${email}`);
      return NextResponse.json({
        success: true,
        message: 'Lead not found but webhook processed',
      });
    }
    
    // Update lead status to MEETING_BOOKED
    lead.status = 'MEETING_BOOKED';
    await lead.save();
    
    console.log(`✅ Lead ${lead.email} marked as MEETING_BOOKED via Calendly webhook`);
    
    return NextResponse.json({
      success: true,
      message: 'Lead status updated to MEETING_BOOKED',
    });
  } catch (error) {
    console.error('Error processing Calendly webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
