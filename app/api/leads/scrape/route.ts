import { connectDB } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { ApifyClient } from 'apify-client';
import { NextRequest, NextResponse } from 'next/server';

const APIFY_TOKEN = process.env.APIFY_TOKEN;

// Actor IDs - ordered by cost efficiency
const ACTORS = {
  // TIER 1: Cheapest - Basic Google Maps (~$0.50/1K) + Free Enrichment
  GOOGLE_MAPS_BASIC: 'damilo/google-maps-scraper',
  SOCIAL_ENRICHER: 'apify/social-media-leads-analyzer', // FREE - extracts emails from websites
  
  // TIER 2: Premium - More expensive but includes emails (~$10/1K)
  GOOGLE_MAPS_EMAIL: 'lukaskrivka/google-maps-with-contact-details',
  
  // Utility - FREE
  TRUSTPILOT: 'nikita-sviridenko/trustpilot-reviews-scraper',
};

interface ScrapeRequest {
  jobTitles?: string[];
  industries?: string[];
  locations?: string[];
  keywords?: string[];
  companySize?: string;
  limit?: number;
  strategy?: 'budget' | 'premium' | 'auto';
}

interface ScrapedPlace {
  companyName: string;
  email: string;
  allEmails: string[];
  phone: string;
  location: string;
  website: string;
  businessCategory: string[];
  rating: number | null;
  ratingCount: number | null;
  priceRange: string | null;
  placeId: string;
  coordinates: { lat: number; lng: number } | null;
  socialMedia: {
    linkedIn: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
    tiktok: string;
  };
  notes: string;
}

// ========== MOCK DATA GENERATOR (LAST RESORT) ==========
function generateMockLeads(request: ScrapeRequest): ScrapedPlace[] {
  const industries: Record<string, { companies: string[] }> = {
    hvac: { companies: ['Cool Breeze HVAC', 'Elite Heating & Air', 'ProTemp Solutions'] },
    plumbing: { companies: ['Rapid Plumbing Co', 'FlowMaster Plumbing', 'DrainPro Services'] },
    dental: { companies: ['Bright Smile Dental', 'Family Dental Care', 'Premier Dentistry'] },
    restaurant: { companies: ['Golden Fork Bistro', 'The Grill House', 'Flavor Kitchen'] },
  };

  const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis'];
  
  const locations = request.locations?.length ? request.locations : ['Dallas, TX'];
  const selectedIndustry = request.industries?.[0]?.toLowerCase() || 'hvac';
  const industryData = industries[selectedIndustry] || industries.hvac;
  const limit = Math.min(request.limit || 15, 25);
  
  return Array.from({ length: limit }, (_, i) => {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const company = industryData.companies[i % industryData.companies.length];
    const emailDomain = company.toLowerCase().replace(/[^a-z]/g, '') + '.com';
    
    return {
      companyName: company,
      email: `${firstName.toLowerCase()}@${emailDomain}`,
      allEmails: [`${firstName.toLowerCase()}@${emailDomain}`],
      phone: `555-${100 + i}-${1000 + i}`,
      location: locations[i % locations.length],
      website: `https://${emailDomain}`,
      businessCategory: [selectedIndustry],
      rating: 4.0 + Math.random(),
      ratingCount: 50 + i * 10,
      priceRange: '$$',
      placeId: `mock_${Date.now()}_${i}`,
      coordinates: { lat: 32.78 + Math.random() * 0.1, lng: -96.8 + Math.random() * 0.1 },
      socialMedia: { linkedIn: '', facebook: `https://facebook.com/${company.replace(/\s/g, '')}`, instagram: '', twitter: '', youtube: '', tiktok: '' },
      notes: `[MOCK DATA] ${selectedIndustry}`,
    };
  });
}

// ========== TIER 1: BUDGET STRATEGY ==========
// Step 1: Google Maps Basic ($0.50/1K) - gets businesses with websites
async function scrapeGoogleMapsBasic(
  client: ApifyClient,
  query: string,
  location: string,
  limit: number
): Promise<{ places: any[]; runId: string }> {
  console.log('🗺️ [TIER 1a] Starting Google Maps Basic scraper (~$0.50/1K)');
  
  const run = await client.actor(ACTORS.GOOGLE_MAPS_BASIC).call({
    query,
    location,
    language: 'en',
    max_results: limit,
  }, { waitSecs: 120 });
  
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  console.log(`   ✅ Found ${items.length} businesses`);
  
  return { places: items, runId: run.id };
}

// Step 2: Social Media Enricher (FREE) - extracts emails from websites
async function enrichWithEmails(
  client: ApifyClient,
  websites: string[]
): Promise<Map<string, { emails: string[]; socials: any }>> {
  if (websites.length === 0) return new Map();
  
  console.log(`📧 [TIER 1b] Enriching ${websites.length} websites with Social Media Analyzer (FREE)`);
  
  const run = await client.actor(ACTORS.SOCIAL_ENRICHER).call({
    startUrls: websites.slice(0, 50).map(url => ({ url })), // Limit to 50 for free tier
  }, { waitSecs: 180 });
  
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  console.log(`   ✅ Enriched ${items.length} websites`);
  
  const enrichmentMap = new Map<string, { emails: string[]; socials: any }>();
  
  for (const item of items) {
    const domain = (item as any).domain || '';
    enrichmentMap.set(domain.toLowerCase(), {
      emails: (item as any).emails || [],
      socials: {
        linkedIn: (item as any).linkedIns?.[0] || '',
        facebook: (item as any).facebooks?.[0]?.profileURL || (item as any).facebooks?.[0]?.startUrl || '',
        instagram: (item as any).instagrams?.[0]?.profileURL || (item as any).instagrams?.[0]?.startUrl || '',
        twitter: (item as any).twitters?.[0]?.profileURL || (item as any).twitters?.[0]?.startUrl || '',
        youtube: (item as any).youtubes?.[0]?.profileURL || (item as any).youtubes?.[0]?.startUrl || '',
        tiktok: (item as any).tiktoks?.[0]?.profileURL || (item as any).tiktoks?.[0]?.startUrl || '',
      },
    });
  }
  
  return enrichmentMap;
}

// Combine Basic Maps + Enricher results
function combineResults(places: any[], enrichmentMap: Map<string, { emails: string[]; socials: any }>): ScrapedPlace[] {
  return places.map(place => {
    // Extract domain from website
    let domain = '';
    try {
      if (place.website) {
        domain = new URL(place.website).hostname.replace('www.', '').toLowerCase();
      }
    } catch {}
    
    const enrichment = enrichmentMap.get(domain);
    
    return {
      companyName: place.title || place.name || '',
      email: enrichment?.emails?.[0] || '',
      allEmails: enrichment?.emails || [],
      phone: place.phoneNumber || place.phone || '',
      location: place.address || '',
      website: place.website || '',
      businessCategory: place.types || [],
      rating: place.rating || null,
      ratingCount: place.ratingCount || place.reviewCount || null,
      priceRange: null,
      placeId: place.placeId || '',
      coordinates: place.latitude && place.longitude 
        ? { lat: place.latitude, lng: place.longitude } 
        : null,
      socialMedia: enrichment?.socials || { linkedIn: '', facebook: '', instagram: '', twitter: '', youtube: '', tiktok: '' },
      notes: `Rating: ${place.rating || 'N/A'}`,
    };
  });
}

// ========== TIER 2: PREMIUM STRATEGY ==========
async function scrapePremium(
  client: ApifyClient,
  searchTerms: string[],
  location: string,
  limit: number
): Promise<{ leads: ScrapedPlace[]; runId: string }> {
  console.log('💎 [TIER 2] Starting Premium Google Maps Email Extractor (~$10/1K)');
  
  const run = await client.actor(ACTORS.GOOGLE_MAPS_EMAIL).call({
    searchStringsArray: searchTerms,
    locationQuery: location,
    maxCrawledPlacesPerSearch: limit,
    language: 'en',
    skipClosedPlaces: true,
  }, { waitSecs: 300 });
  
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  console.log(`   ✅ Found ${items.length} businesses with emails`);
  
  const leads: ScrapedPlace[] = items.map((place: any) => ({
    companyName: place.title || '',
    email: place.emails?.[0] || '',
    allEmails: place.emails || [],
    phone: place.phone || '',
    location: place.address || '',
    website: place.website || '',
    businessCategory: place.categories || [],
    rating: place.totalScore || null,
    ratingCount: place.reviewsCount || null,
    priceRange: place.price || null,
    placeId: place.placeId || '',
    coordinates: place.location ? { lat: place.location.lat, lng: place.location.lng } : null,
    socialMedia: {
      linkedIn: place.linkedIns?.[0] || '',
      facebook: place.facebooks?.[0]?.startUrl || '',
      instagram: place.instagrams?.[0]?.startUrl || '',
      twitter: place.twitters?.[0]?.startUrl || '',
      youtube: place.youtubes?.[0]?.startUrl || '',
      tiktok: place.tiktoks?.[0]?.startUrl || '',
    },
    notes: `Rating: ${place.totalScore || 'N/A'} | Categories: ${(place.categories || []).slice(0, 3).join(', ')}`,
  }));

  return { leads, runId: run.id };
}

// ========== POST HANDLER ==========
export async function POST(request: NextRequest) {
  try {
    const body: ScrapeRequest = await request.json();
    const strategy = body.strategy || 'budget'; // Default to budget!
    
    const searchTerms = [...(body.keywords || []), ...(body.industries || [])].filter(Boolean);
    if (searchTerms.length === 0) searchTerms.push('business');
    
    const location = body.locations?.[0] || 'New York, USA';
    const limit = Math.min(body.limit || 25, 100);
    
    console.log(`\n🎯 Scraping: "${searchTerms.join(', ')}" in "${location}" (limit: ${limit})`);
    console.log(`💰 Strategy: ${strategy.toUpperCase()}\n`);
    
    if (!APIFY_TOKEN) {
      console.log('⚠️ No APIFY_TOKEN, using mock data');
      const mockLeads = generateMockLeads(body);
      return NextResponse.json({
        success: true,
        count: mockLeads.length,
        leadsWithEmails: mockLeads.length,
        leads: mockLeads,
        source: 'mock',
        strategy: 'mock',
        cost: '$0.00',
        message: 'Using mock data. Add APIFY_TOKEN to .env for real leads.',
      });
    }

    const client = new ApifyClient({ token: APIFY_TOKEN });
    
    // ===== BUDGET STRATEGY (DEFAULT) =====
    // Google Maps Basic ($0.50/1K) + Social Enricher (FREE)
    if (strategy === 'budget' || strategy === 'auto') {
      try {
        // Step 1: Get businesses with websites
        const { places, runId } = await scrapeGoogleMapsBasic(
          client,
          searchTerms.join(' '),
          location,
          limit
        );
        
        if (places.length > 0) {
          // Step 2: Extract emails from websites (FREE!)
          const websites = places
            .map((p: any) => p.website)
            .filter((w: string) => w && w.startsWith('http'));
          
          const enrichmentMap = await enrichWithEmails(client, websites);
          
          // Step 3: Combine results
          const leads = combineResults(places, enrichmentMap);
          const leadsWithEmails = leads.filter(l => l.email);
          
          const cost = (places.length * 0.0005).toFixed(2); // ~$0.50/1K
          
          return NextResponse.json({
            success: true,
            count: leads.length,
            leadsWithEmails: leadsWithEmails.length,
            leads,
            source: 'google-maps-basic+enricher',
            strategy: 'budget',
            cost: `~$${cost}`,
            runId,
            message: `✅ Budget mode: ${leads.length} businesses, ${leadsWithEmails.length} with emails. Cost: ~$${cost}`,
          });
        }
      } catch (error: any) {
        console.error('❌ Budget strategy failed:', error.message);
        // Fall through to premium or mock
      }
    }
    
    // ===== PREMIUM STRATEGY =====
    if (strategy === 'premium') {
      try {
        const { leads, runId } = await scrapePremium(client, searchTerms, location, limit);
        
        if (leads.length > 0) {
          const leadsWithEmails = leads.filter(l => l.email);
          const cost = (leads.length * 0.01).toFixed(2); // ~$10/1K
          
          return NextResponse.json({
            success: true,
            count: leads.length,
            leadsWithEmails: leadsWithEmails.length,
            leads,
            source: 'google-maps-email',
            strategy: 'premium',
            cost: `~$${cost}`,
            runId,
            message: `💎 Premium mode: ${leads.length} businesses, ${leadsWithEmails.length} with emails. Cost: ~$${cost}`,
          });
        }
      } catch (error: any) {
        console.error('❌ Premium strategy failed:', error.message);
      }
    }

    // ===== FALLBACK: MOCK DATA =====
    console.log('📋 All strategies failed, using mock data');
    const mockLeads = generateMockLeads(body);
    
    return NextResponse.json({
      success: true,
      count: mockLeads.length,
      leadsWithEmails: mockLeads.length,
      leads: mockLeads,
      source: 'mock',
      strategy: 'mock',
      cost: '$0.00',
      message: '⚠️ Using mock data due to API issues.',
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
    
    const { leads, source = 'google-maps-basic' } = await request.json();
    
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'No leads provided' }, { status: 400 });
    }

    const validLeads = leads.filter((l: any) => l.email?.includes('@'));
    
    if (validLeads.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        noEmail: leads.length,
        message: 'No leads with valid emails found',
      });
    }

    const existingEmails = await Lead.find({
      email: { $in: validLeads.map((l: any) => l.email.toLowerCase()) }
    }).select('email');
    
    const existingSet = new Set(existingEmails.map(l => l.email.toLowerCase()));
    const newLeads = validLeads.filter((l: any) => !existingSet.has(l.email.toLowerCase()));
    
    if (newLeads.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        duplicates: validLeads.length,
        message: 'All leads already exist',
      });
    }

    const toInsert = newLeads.map((lead: ScrapedPlace) => ({
      companyName: lead.companyName,
      email: lead.email.toLowerCase(),
      allEmails: lead.allEmails?.map(e => e.toLowerCase()),
      phone: lead.phone,
      location: lead.location,
      website: lead.website,
      businessCategory: lead.businessCategory,
      rating: lead.rating,
      ratingCount: lead.ratingCount,
      placeId: lead.placeId,
      coordinates: lead.coordinates,
      socialMedia: lead.socialMedia,
      notes: lead.notes,
      source,
      status: 'NEW',
      scrapedAt: new Date(),
    }));

    const created = await Lead.insertMany(toInsert, { ordered: false });

    return NextResponse.json({
      success: true,
      imported: created.length,
      duplicates: validLeads.length - newLeads.length,
      noEmail: leads.length - validLeads.length,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ success: true, imported: error.insertedDocs?.length || 0, message: 'Some duplicates skipped' });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
