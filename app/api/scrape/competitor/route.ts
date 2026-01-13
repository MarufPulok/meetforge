import {
    analyzePainPoints,
    scrapeTrustpilotReviews,
} from '@/lib/apify/scrapers/trustpilot';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      companyDomain, 
      count = 50, 
      stars, 
      search,
      includeAnalysis = true 
    } = body;

    if (!companyDomain) {
      return NextResponse.json(
        { error: 'Company domain is required' },
        { status: 400 }
      );
    }

    const reviews = await scrapeTrustpilotReviews({
      companyDomain,
      count,
      stars,
      search,
    });

    const response: {
      success: boolean;
      count: number;
      reviews: typeof reviews;
      analysis?: ReturnType<typeof analyzePainPoints>;
    } = {
      success: true,
      count: reviews.length,
      reviews,
    };

    // Optional: Include pain point analysis
    if (includeAnalysis && reviews.length > 0) {
      response.analysis = analyzePainPoints(reviews);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Trustpilot scrape error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape Trustpilot reviews' },
      { status: 500 }
    );
  }
}
