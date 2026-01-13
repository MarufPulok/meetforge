import { connectDB } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { NextRequest, NextResponse } from 'next/server';

interface ScrapedLead {
  companyName?: string;
  email?: string;
  phone?: string;
  website?: string;
  location?: string;
  rating?: number;
  ratingCount?: number;
  placeId?: string;
  socialMedia?: {
    linkedIn?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const body = await req.json();
    const { leads, skipDuplicates = true } = body;

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: 'Leads array is required' },
        { status: 400 }
      );
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: 0,
      skippedEmails: [] as string[],
    };

    for (const lead of leads as ScrapedLead[]) {
      try {
        // Skip leads without email if they don't have a website to enrich
        if (!lead.email && !lead.website) {
          results.skipped++;
          continue;
        }

        // Check for duplicates by email or placeId
        if (skipDuplicates) {
          const existingLead = lead.email 
            ? await Lead.findOne({ email: lead.email })
            : lead.placeId 
              ? await Lead.findOne({ placeId: lead.placeId })
              : null;

          if (existingLead) {
            results.skipped++;
            if (lead.email) results.skippedEmails.push(lead.email);
            continue;
          }
        }

        // Create the lead
        await Lead.create({
          companyName: lead.companyName,
          email: lead.email || `pending-${Date.now()}@scrape.temp`, // Temporary email for leads needing enrichment
          phone: lead.phone,
          website: lead.website,
          location: lead.location,
          rating: lead.rating,
          ratingCount: lead.ratingCount,
          placeId: lead.placeId,
          socialMedia: lead.socialMedia,
          source: 'google-maps',
          status: 'NEW',
          scrapedAt: new Date(),
        });

        results.imported++;
      } catch (error) {
        console.error('Error importing lead:', error);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `Imported ${results.imported} leads, skipped ${results.skipped} duplicates, ${results.errors} errors`,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import leads' },
      { status: 500 }
    );
  }
}
