import { runActorAndGetResults } from '../client';

const ACTOR_ID = 'damilo/google-maps-scraper';

export interface GoogleMapsInput {
  query: string;
  location: string;
  language?: string;
  max_results?: number;
}

export interface GoogleMapsResult {
  title: string;
  address?: string;
  phoneNumber?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  ratingCount?: number;
  openingHours?: Array<{ day: string; hours: string }>;
  types?: string[];
  type?: string;
  thumbnailUrl?: string;
  placeId?: string;
  cid?: string;
}

/**
 * Scrape business listings from Google Maps
 * Cost: ~$0.50 per 1,000 results
 * 
 * @example
 * const leads = await scrapeGoogleMaps({
 *   query: "HVAC contractor",
 *   location: "Dallas, TX, USA",
 *   max_results: 100
 * });
 */
export async function scrapeGoogleMaps(
  input: GoogleMapsInput
): Promise<GoogleMapsResult[]> {
  const actorInput = {
    query: input.query,
    location: input.location,
    language: input.language || 'en',
    max_results: input.max_results || 100,
  };

  return runActorAndGetResults<GoogleMapsResult>(ACTOR_ID, actorInput);
}
