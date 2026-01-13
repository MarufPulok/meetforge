import { connectDB } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { ApifyClient } from 'apify-client';
import { NextRequest, NextResponse } from 'next/server';

const APIFY_TOKEN = process.env.APIFY_TOKEN;
// Using Google Maps Email Extractor - extracts emails from business websites (~$10/1K results)
const GOOGLE_MAPS_EMAIL_ACTOR_ID = 'lukaskrivka/google-maps-with-contact-details';

interface ScrapeRequest {
  // Filter options
  jobTitles?: string[];
  industries?: string[];
  locations?: string[];
  keywords?: string[];
  companySize?: string;
  limit?: number;
}

interface ApifyLead {
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  phone_numbers?: string[];
  phone?: string;
  title?: string;
  organization?: { name?: string };
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  linkedin_url?: string;
}

// Mock data generator for when API is unavailable
function generateMockLeads(request: ScrapeRequest): any[] {
  const industries: Record<string, { companies: string[]; titles: string[] }> = {
    hvac: {
      companies: ['Cool Breeze HVAC', 'Elite Heating & Air', 'ProTemp Solutions', 'Arctic Air Services', 'Comfort Zone HVAC', 'AllSeason Climate', 'Premier Heating Co', 'QuickCool Systems'],
      titles: ['Owner', 'CEO', 'General Manager', 'Operations Director'],
    },
    plumbing: {
      companies: ['Rapid Plumbing Co', 'FlowMaster Plumbing', 'DrainPro Services', 'PipeFix Solutions', 'AquaFlow Plumbing', 'TrueLine Plumbers', 'FastDrain Services', 'ClearPipe Experts'],
      titles: ['Owner', 'Master Plumber', 'Operations Manager', 'Service Director'],
    },
    dental: {
      companies: ['Bright Smile Dental', 'Family Dental Care', 'Premier Dentistry', 'SmileCraft Clinic', 'Dental Excellence', 'ClearView Dental', 'Sunshine Dentistry', 'Modern Dental Group'],
      titles: ['Owner', 'Lead Dentist', 'Practice Manager', 'Dental Director'],
    },
    real_estate: {
      companies: ['Prime Realty Group', 'HomeFinder Realty', 'Elite Properties', 'Keystone Real Estate', 'Sunrise Realtors', 'Metro Property Group', 'Dream Home Realty', 'Prestige Properties'],
      titles: ['Broker', 'Owner', 'Managing Agent', 'Real Estate Director'],
    },
    fitness: {
      companies: ['PowerFit Gym', 'Elite Fitness Center', 'FlexZone Athletics', 'Peak Performance Gym', 'FitLife Studio', 'Iron Works Gym', 'Active Life Fitness', 'Pulse Athletic Club'],
      titles: ['Owner', 'General Manager', 'Fitness Director', 'Operations Manager'],
    },
    restaurant: {
      companies: ['Golden Fork Bistro', 'The Grill House', 'Flavor Kitchen', 'Urban Eats Cafe', 'Spice Route Restaurant', 'The Local Table', 'Farm Fresh Kitchen', 'Artisan Dining Co'],
      titles: ['Owner', 'General Manager', 'Restaurant Director', 'Operations Manager'],
    },
    salon: {
      companies: ['Glamour Hair Studio', 'Chic Beauty Salon', 'Style & Grace Spa', 'Luxe Hair Design', 'Bella Beauty Bar', 'Radiance Salon', 'The Style Lounge', 'Elegant Touch Spa'],
      titles: ['Owner', 'Salon Director', 'Creative Director', 'Manager'],
    },
    auto: {
      companies: ['Elite Auto Detailing', 'ProShine Car Care', 'AutoGlow Services', 'Premier Auto Spa', 'SpeedClean Detailing', 'LuxAuto Care', 'Diamond Finish Auto', 'Crystal Clear Detailing'],
      titles: ['Owner', 'General Manager', 'Operations Director', 'Service Manager'],
    },
    legal: {
      companies: ['Justice Law Group', 'Smith & Associates', 'Premier Legal Services', 'Sterling Law Firm', 'Advocate Partners', 'Legal Excellence PC', 'Paramount Law Office', 'Integrity Legal Group'],
      titles: ['Managing Partner', 'Owner', 'Senior Partner', 'Practice Director'],
    },
    construction: {
      companies: ['BuildRight Construction', 'Premier Builders Inc', 'SolidBase Contracting', 'ConstructPro Services', 'Foundation First Co', 'Elite Building Group', 'Cornerstone Builders', 'BlueStone Construction'],
      titles: ['Owner', 'General Contractor', 'Project Director', 'Operations Manager'],
    },
  };

  const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jennifer', 'Robert', 'Lisa', 'James', 'Mary', 'William', 'Patricia', 'Richard', 'Linda', 'Thomas'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Garcia', 'Martinez', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'White', 'Harris'];
  
  const locations = request.locations?.length ? request.locations : ['Dallas, TX', 'Houston, TX', 'Austin, TX', 'San Antonio, TX', 'Fort Worth, TX'];
  const selectedIndustry = request.industries?.[0] || request.keywords?.[0]?.toLowerCase() || 'hvac';
  
  const industryData = industries[selectedIndustry] || industries.hvac;
  const limit = request.limit || 15;
  
  const mockLeads = [];
  
  for (let i = 0; i < limit; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const company = industryData.companies[Math.floor(Math.random() * industryData.companies.length)];
    const title = industryData.titles[Math.floor(Math.random() * industryData.titles.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    
    const emailDomain = company.toLowerCase().replace(/[^a-z]/g, '').substring(0, 12) + '.com';
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${emailDomain}`;
    
    mockLeads.push({
      firstName,
      lastName,
      email,
      phone: `555-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      companyName: company,
      location,
      notes: `Job Title: ${title}`,
      linkedinUrl: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}-${Math.floor(Math.random() * 1000000)}`,
    });
  }
  
  return mockLeads;
}

export async function POST(request: NextRequest) {
  try {
    const body: ScrapeRequest = await request.json();
    
    // Try Apify API if token is configured
    if (APIFY_TOKEN) {
      try {
        const client = new ApifyClient({ token: APIFY_TOKEN });
        
        // Build Google Maps Email Extractor input
        // Combine industries/keywords into search query
        const searchTerms = [
          ...(body.keywords || []),
          ...(body.industries || []),
        ].filter(Boolean);
        
        const searchQuery = searchTerms.length > 0 ? searchTerms : ['business'];
        const location = body.locations?.[0] || 'New York, USA';
        
        const actorInput = {
          searchStringsArray: searchQuery,
          locationQuery: location,
          maxCrawledPlacesPerSearch: body.limit || 25,
          language: 'en',
          skipClosedPlaces: true,
        };
        
        console.log('Starting Google Maps Email Extractor with input:', actorInput);
        
        // Run the actor and wait for it to finish
        const run = await client.actor(GOOGLE_MAPS_EMAIL_ACTOR_ID).call(actorInput, {
          waitSecs: 300, // Wait up to 5 minutes (email extraction takes longer)
        });
        
        // Get results from the dataset
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        
        if (items && items.length > 0) {
          // Transform results with emails to lead format
          const leads = items.map((place: any) => ({
            firstName: '', // Google Maps doesn't have personal names
            lastName: '',
            email: place.emails?.[0] || '', // Primary email from the actor
            allEmails: place.emails || [],
            phone: place.phone || place.phoneUnformatted || '',
            companyName: place.title || '',
            location: place.address || '',
            website: place.website || '',
            notes: `Rating: ${place.totalScore || 'N/A'} (${place.reviewsCount || 0} reviews)`,
            rating: place.totalScore,
            ratingCount: place.reviewsCount,
            placeId: place.placeId,
            socialMedia: {
              facebook: place.facebooks?.[0]?.startUrl || place.facebooks?.[0] || '',
              instagram: place.instagrams?.[0]?.startUrl || place.instagrams?.[0] || '',
              twitter: place.twitters?.[0]?.startUrl || place.twitters?.[0] || '',
              linkedIn: place.linkedIns?.[0] || '',
            },
          }));
          
          const leadsWithEmails = leads.filter((l: any) => l.email);
          
          return NextResponse.json({
            success: true,
            count: leads.length,
            leadsWithEmails: leadsWithEmails.length,
            leads,
            source: 'google-maps-email',
            message: `Found ${leadsWithEmails.length} leads with emails out of ${leads.length} total.`,
          });
        }
        
        console.log('Google Maps Email Extractor returned no results, falling back to mock');
      } catch (apiError) {
        console.error('Apify API error, falling back to mock:', apiError);
      }
    }


    // Generate mock leads based on search criteria
    const mockLeads = generateMockLeads(body);
    
    return NextResponse.json({
      success: true,
      count: mockLeads.length,
      leads: mockLeads,
      source: 'mock',
      message: 'Using simulated leads. Add APIFY_TOKEN to .env for real data.',
    });
  } catch (error) {
    console.error('Error scraping leads:', error);
    return NextResponse.json(
      { error: 'Failed to scrape leads. Please check your search parameters.' },
      { status: 500 }
    );
  }
}

// Import scraped leads to database
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const { leads } = await request.json();
    
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: 'No leads provided for import' },
        { status: 400 }
      );
    }

    const validLeads = leads.filter((lead: any) => lead.email);
    
    if (validLeads.length === 0) {
      return NextResponse.json(
        { error: 'No valid leads with email addresses found' },
        { status: 400 }
      );
    }

    const existingEmails = await Lead.find({
      email: { $in: validLeads.map((l: any) => l.email) }
    }).select('email');
    
    const existingEmailSet = new Set(existingEmails.map(l => l.email));
    const newLeads = validLeads.filter((lead: any) => !existingEmailSet.has(lead.email));
    
    if (newLeads.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        duplicates: validLeads.length,
        message: 'All leads already exist in your database',
      });
    }

    const createdLeads = await Lead.insertMany(
      newLeads.map((lead: any) => ({
        ...lead,
        status: 'NEW',
      }))
    );

    return NextResponse.json({
      success: true,
      imported: createdLeads.length,
      duplicates: validLeads.length - newLeads.length,
    });
  } catch (error) {
    console.error('Error importing scraped leads:', error);
    return NextResponse.json(
      { error: 'Failed to import leads' },
      { status: 500 }
    );
  }
}
