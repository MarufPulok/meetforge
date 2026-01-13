import { connectDB } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { ApifyClient } from 'apify-client';
import { NextRequest, NextResponse } from 'next/server';

const APIFY_TOKEN = process.env.APIFY_TOKEN;

// Actor IDs - ordered by cost (cheapest first for fallback strategy)
const ACTORS = {
  GOOGLE_MAPS_EMAIL: 'lukaskrivka/google-maps-with-contact-details', // ~$10/1K, has emails
  GOOGLE_MAPS_BASIC: 'damilo/google-maps-scraper', // ~$0.50/1K, no emails
  SOCIAL_ENRICHER: 'apify/social-media-leads-analyzer', // Compute only, extracts emails
};

interface ScrapeRequest {
  jobTitles?: string[];
  industries?: string[];
  locations?: string[];
  keywords?: string[];
  companySize?: string;
  limit?: number;
  // Strategy: 'premium' (email extractor) | 'budget' (basic + enricher) | 'auto'
  strategy?: 'premium' | 'budget' | 'auto';
}

interface ScrapedPlace {
  // Core fields
  companyName: string;
  email: string;
  allEmails: string[];
  phone: string;
  location: string;
  website: string;
  
  // Business details
  businessCategory: string[];
  rating: number | null;
  ratingCount: number | null;
  priceRange: string | null;
  openingHours: Array<{ day: string; hours: string }>;
  
  // Location
  placeId: string;
  coordinates: { lat: number; lng: number } | null;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  
  // Social Media
  socialMedia: {
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
    tiktok: string;
  };
  
  // Metadata
  notes: string;
}

// ========== MOCK DATA GENERATOR ==========
function generateMockLeads(request: ScrapeRequest): ScrapedPlace[] {
  const industries: Record<string, { companies: string[]; titles: string[] }> = {
    hvac: {
      companies: ['Cool Breeze HVAC', 'Elite Heating & Air', 'ProTemp Solutions', 'Arctic Air Services'],
      titles: ['Owner', 'CEO', 'General Manager'],
    },
    plumbing: {
      companies: ['Rapid Plumbing Co', 'FlowMaster Plumbing', 'DrainPro Services', 'PipeFix Solutions'],
      titles: ['Owner', 'Master Plumber', 'Operations Manager'],
    },
    dental: {
      companies: ['Bright Smile Dental', 'Family Dental Care', 'Premier Dentistry', 'SmileCraft Clinic'],
      titles: ['Owner', 'Lead Dentist', 'Practice Manager'],
    },
    restaurant: {
      companies: ['Golden Fork Bistro', 'The Grill House', 'Flavor Kitchen', 'Urban Eats Cafe'],
      titles: ['Owner', 'General Manager', 'Restaurant Director'],
    },
  };

  const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jennifer', 'Robert', 'Lisa'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Garcia', 'Martinez', 'Wilson'];
  
  const locations = request.locations?.length ? request.locations : ['Dallas, TX', 'Houston, TX'];
  const selectedIndustry = request.industries?.[0]?.toLowerCase() || request.keywords?.[0]?.toLowerCase() || 'hvac';
  const industryData = industries[selectedIndustry] || industries.hvac;
  const limit = Math.min(request.limit || 15, 50);
  
  const mockLeads: ScrapedPlace[] = [];
  
  for (let i = 0; i < limit; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const company = industryData.companies[Math.floor(Math.random() * industryData.companies.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const emailDomain = company.toLowerCase().replace(/[^a-z]/g, '').substring(0, 12) + '.com';
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${emailDomain}`;
    
    mockLeads.push({
      companyName: company,
      email,
      allEmails: [email],
      phone: `555-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      location,
      website: `https://www.${emailDomain}`,
      businessCategory: [selectedIndustry],
      rating: Math.round((3 + Math.random() * 2) * 10) / 10,
      ratingCount: Math.floor(Math.random() * 500) + 10,
      priceRange: ['$', '$$', '$$$'][Math.floor(Math.random() * 3)],
      openingHours: [
        { day: 'Monday-Friday', hours: '8 AM - 6 PM' },
        { day: 'Saturday', hours: '9 AM - 2 PM' },
      ],
      placeId: `mock_${Date.now()}_${i}`,
      coordinates: {
        lat: 32.7767 + (Math.random() - 0.5) * 0.2,
        lng: -96.797 + (Math.random() - 0.5) * 0.2,
      },
      street: `${Math.floor(Math.random() * 9999) + 1} Main Street`,
      city: location.split(',')[0]?.trim() || 'Dallas',
      state: location.split(',')[1]?.trim() || 'TX',
      postalCode: String(75000 + Math.floor(Math.random() * 999)),
      countryCode: 'US',
      socialMedia: {
        linkedIn: '',
        facebook: `https://facebook.com/${company.toLowerCase().replace(/\s/g, '')}`,
        instagram: '',
        twitter: '',
        youtube: '',
        tiktok: '',
      },
      notes: `Mock data - ${industryData.titles[Math.floor(Math.random() * industryData.titles.length)]}`,
    });
  }
  
  return mockLeads;
}

// ========== GOOGLE MAPS EMAIL EXTRACTOR (PREMIUM) ==========
async function scrapeWithGoogleMapsEmail(
  client: ApifyClient,
  searchTerms: string[],
  location: string,
  limit: number
): Promise<{ leads: ScrapedPlace[]; runId: string }> {
  const actorInput = {
    searchStringsArray: searchTerms,
    locationQuery: location,
    maxCrawledPlacesPerSearch: limit,
    language: 'en',
    skipClosedPlaces: true,
  };

  console.log('🚀 Starting Google Maps Email Extractor (premium):', actorInput);
  
  const run = await client.actor(ACTORS.GOOGLE_MAPS_EMAIL).call(actorInput, {
    waitSecs: 300,
  });
  
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  const leads: ScrapedPlace[] = items.map((place: any) => ({
    companyName: place.title || '',
    email: place.emails?.[0] || '',
    allEmails: place.emails || [],
    phone: place.phone || place.phoneUnformatted || '',
    location: place.address || '',
    website: place.website || '',
    businessCategory: place.categories || [],
    rating: place.totalScore || null,
    ratingCount: place.reviewsCount || null,
    priceRange: place.price || null,
    openingHours: place.openingHours || [],
    placeId: place.placeId || '',
    coordinates: place.location ? { lat: place.location.lat, lng: place.location.lng } : null,
    street: place.street || '',
    city: place.city || '',
    state: place.state || '',
    postalCode: place.postalCode || '',
    countryCode: place.countryCode || 'US',
    socialMedia: {
      linkedIn: place.linkedIns?.[0] || '',
      facebook: place.facebooks?.[0]?.startUrl || place.facebooks?.[0] || '',
      instagram: place.instagrams?.[0]?.startUrl || place.instagrams?.[0] || '',
      twitter: place.twitters?.[0]?.startUrl || place.twitters?.[0] || '',
      youtube: place.youtubes?.[0]?.startUrl || place.youtubes?.[0] || '',
      tiktok: place.tiktoks?.[0]?.startUrl || place.tiktoks?.[0] || '',
    },
    notes: `Rating: ${place.totalScore || 'N/A'} (${place.reviewsCount || 0} reviews) | Categories: ${(place.categories || []).join(', ')}`,
  }));

  return { leads, runId: run.id };
}

// ========== POST HANDLER ==========
export async function POST(request: NextRequest) {
  try {
    const body: ScrapeRequest = await request.json();
    const strategy = body.strategy || 'premium';
    
    // Build search query from user inputs
    const searchTerms = [
      ...(body.keywords || []),
      ...(body.industries || []),
    ].filter(Boolean);
    
    if (searchTerms.length === 0) {
      searchTerms.push('business');
    }
    
    const location = body.locations?.[0] || 'New York, USA';
    const limit = Math.min(body.limit || 25, 100);
    
    // Try Apify API
    if (APIFY_TOKEN) {
      try {
        const client = new ApifyClient({ token: APIFY_TOKEN });
        
        if (strategy === 'premium' || strategy === 'auto') {
          const { leads, runId } = await scrapeWithGoogleMapsEmail(
            client,
            searchTerms,
            location,
            limit
          );
          
          if (leads.length > 0) {
            const leadsWithEmails = leads.filter(l => l.email);
            
            return NextResponse.json({
              success: true,
              count: leads.length,
              leadsWithEmails: leadsWithEmails.length,
              leads,
              source: 'google-maps-email',
              runId,
              strategy: 'premium',
              cost: `~$${(leads.length * 0.01).toFixed(2)}`,
              message: `Scraped ${leads.length} businesses. ${leadsWithEmails.length} have emails.`,
            });
          }
        }
        
        console.log('⚠️ Premium scraper returned no results, falling back to mock');
      } catch (apiError: any) {
        console.error('❌ Apify API error:', apiError.message || apiError);
        // Continue to fallback
      }
    }

    // Fallback: Generate mock leads
    console.log('📋 Using mock data fallback');
    const mockLeads = generateMockLeads(body);
    
    return NextResponse.json({
      success: true,
      count: mockLeads.length,
      leadsWithEmails: mockLeads.length,
      leads: mockLeads,
      source: 'mock',
      strategy: 'mock',
      cost: '$0.00',
      message: 'Using simulated leads. Configure APIFY_TOKEN in .env for real data.',
    });
  } catch (error: any) {
    console.error('❌ Error in scrape handler:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape leads' },
      { status: 500 }
    );
  }
}

// ========== PUT HANDLER - IMPORT TO DATABASE ==========
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const { leads, source = 'google-maps-email' } = await request.json();
    
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: 'No leads provided for import' },
        { status: 400 }
      );
    }

    // Filter leads with valid emails
    const validLeads = leads.filter((lead: any) => lead.email && lead.email.includes('@'));
    
    if (validLeads.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        duplicates: 0,
        noEmail: leads.length,
        message: 'No leads with valid email addresses found',
      });
    }

    // Check for existing emails to avoid duplicates
    const existingEmails = await Lead.find({
      email: { $in: validLeads.map((l: any) => l.email.toLowerCase()) }
    }).select('email');
    
    const existingEmailSet = new Set(existingEmails.map(l => l.email.toLowerCase()));
    const newLeads = validLeads.filter((lead: any) => 
      !existingEmailSet.has(lead.email.toLowerCase())
    );
    
    if (newLeads.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        duplicates: validLeads.length,
        noEmail: leads.length - validLeads.length,
        message: 'All leads already exist in your database',
      });
    }

    // Prepare leads for insertion with full metadata
    const leadsToInsert = newLeads.map((lead: ScrapedPlace) => ({
      companyName: lead.companyName,
      email: lead.email.toLowerCase(),
      allEmails: lead.allEmails?.map(e => e.toLowerCase()) || [],
      phone: lead.phone,
      location: lead.location,
      website: lead.website,
      businessCategory: lead.businessCategory,
      rating: lead.rating,
      ratingCount: lead.ratingCount,
      priceRange: lead.priceRange,
      openingHours: lead.openingHours,
      placeId: lead.placeId,
      coordinates: lead.coordinates,
      street: lead.street,
      city: lead.city,
      state: lead.state,
      postalCode: lead.postalCode,
      countryCode: lead.countryCode,
      socialMedia: lead.socialMedia,
      notes: lead.notes,
      source,
      status: 'NEW',
      scrapedAt: new Date(),
    }));

    const createdLeads = await Lead.insertMany(leadsToInsert, { ordered: false });

    return NextResponse.json({
      success: true,
      imported: createdLeads.length,
      duplicates: validLeads.length - newLeads.length,
      noEmail: leads.length - validLeads.length,
      message: `Successfully imported ${createdLeads.length} new leads`,
    });
  } catch (error: any) {
    // Handle duplicate key errors gracefully
    if (error.code === 11000) {
      return NextResponse.json({
        success: true,
        imported: error.insertedDocs?.length || 0,
        duplicates: 'some',
        message: 'Some leads imported, duplicates skipped',
      });
    }
    
    console.error('❌ Error importing leads:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import leads' },
      { status: 500 }
    );
  }
}
