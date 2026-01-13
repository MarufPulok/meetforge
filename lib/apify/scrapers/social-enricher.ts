import { runActorAndGetResults } from '../client';

const ACTOR_ID = 'apify/social-media-leads-analyzer';

export interface SocialEnricherInput {
  urls: string[];
}

export interface SocialProfile {
  startUrl?: string;
  profileName?: string;
  profilePictureURL?: string;
  description?: string;
  username?: string;
  followersCount?: number;
  followingCount?: number;
  profileURL?: string;
  creationDate?: string;
  accountVerificationStatus?: boolean;
}

export interface SocialEnricherResult {
  domain: string;
  emails: string[];
  phones: string[];
  phonesUncertain: string[];
  linkedIns: string[] | SocialProfile[];
  pinterests: string[];
  discords: string[];
  facebooks: SocialProfile[];
  instagrams: SocialProfile[];
  tiktoks: SocialProfile[];
  twitters: SocialProfile[];
  youtubes: SocialProfile[];
}

/**
 * Enrich websites with contact details and social media profiles
 * Cost: FREE (compute only, 200+ websites included in free tier)
 * 
 * @example
 * const enriched = await enrichWithSocialData({
 *   urls: ["https://example-hvac.com", "https://plumber-dallas.com"]
 * });
 */
export async function enrichWithSocialData(
  input: SocialEnricherInput
): Promise<SocialEnricherResult[]> {
  const actorInput = {
    startUrls: input.urls.map(url => ({ url })),
  };

  return runActorAndGetResults<SocialEnricherResult>(ACTOR_ID, actorInput);
}

/**
 * Extract the first email from enricher results
 */
export function extractPrimaryEmail(result: SocialEnricherResult): string | null {
  return result.emails.length > 0 ? result.emails[0] : null;
}

/**
 * Extract the first phone from enricher results
 */
export function extractPrimaryPhone(result: SocialEnricherResult): string | null {
  if (result.phones.length > 0) return result.phones[0];
  if (result.phonesUncertain.length > 0) return result.phonesUncertain[0];
  return null;
}

/**
 * Extract social media links from enricher results
 */
export function extractSocialLinks(result: SocialEnricherResult): {
  linkedIn?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
} {
  return {
    linkedIn: Array.isArray(result.linkedIns) && result.linkedIns.length > 0
      ? typeof result.linkedIns[0] === 'string' 
        ? result.linkedIns[0] 
        : (result.linkedIns[0] as SocialProfile).profileURL
      : undefined,
    facebook: result.facebooks[0]?.profileURL,
    instagram: result.instagrams[0]?.profileURL,
    twitter: result.twitters[0]?.profileURL,
    youtube: result.youtubes[0]?.profileURL,
    tiktok: result.tiktoks[0]?.profileURL,
  };
}
