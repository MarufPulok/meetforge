import {
    enrichWithSocialData,
    extractPrimaryEmail,
    extractPrimaryPhone,
    extractSocialLinks,
} from '@/lib/apify/scrapers/social-enricher';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { websites } = body;

    if (!websites || !Array.isArray(websites) || websites.length === 0) {
      return NextResponse.json(
        { error: 'Websites array is required' },
        { status: 400 }
      );
    }

    // Filter valid URLs
    const validUrls = websites.filter((url: string) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });

    if (validUrls.length === 0) {
      return NextResponse.json(
        { error: 'No valid URLs provided' },
        { status: 400 }
      );
    }

    const results = await enrichWithSocialData({ urls: validUrls });

    // Transform to enriched contact format
    const enrichedContacts = results.map((result) => ({
      domain: result.domain,
      email: extractPrimaryEmail(result),
      phone: extractPrimaryPhone(result),
      allEmails: result.emails,
      allPhones: [...result.phones, ...result.phonesUncertain],
      socialMedia: extractSocialLinks(result),
    }));

    return NextResponse.json({
      success: true,
      count: enrichedContacts.length,
      enrichedContacts,
    });
  } catch (error) {
    console.error('Social enrichment error:', error);
    return NextResponse.json(
      { error: 'Failed to enrich contacts' },
      { status: 500 }
    );
  }
}
