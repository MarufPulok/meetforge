import { GoogleMapsResult, scrapeGoogleMaps } from '@/lib/apify/scrapers/google-maps';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, location, maxResults = 100 } = body;

    if (!query || !location) {
      return NextResponse.json(
        { error: 'Query and location are required' },
        { status: 400 }
      );
    }

    const results = await scrapeGoogleMaps({
      query,
      location,
      max_results: maxResults,
    });

    // Transform to lead-friendly format
    const leads = results.map((result: GoogleMapsResult) => ({
      companyName: result.title,
      phone: result.phoneNumber,
      website: result.website,
      location: result.address,
      rating: result.rating,
      ratingCount: result.ratingCount,
      placeId: result.placeId,
      coordinates: result.latitude && result.longitude
        ? { lat: result.latitude, lng: result.longitude }
        : null,
    }));

    return NextResponse.json({
      success: true,
      count: leads.length,
      leads,
    });
  } catch (error) {
    console.error('Google Maps scrape error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape Google Maps' },
      { status: 500 }
    );
  }
}
