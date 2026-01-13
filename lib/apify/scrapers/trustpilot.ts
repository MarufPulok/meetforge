import { runActorAndGetResults } from '../client';

const ACTOR_ID = 'nikita-sviridenko/trustpilot-reviews-scraper';

export interface TrustpilotInput {
  companyDomain: string;
  count?: number;
  stars?: number[];
  languages?: string[];
  verified?: boolean;
  search?: string;
  startPage?: number;
  replies?: boolean;
}

export interface TrustpilotReview {
  reviewId: string;
  authorName: string;
  datePublished: string;
  reviewHeadline: string;
  reviewBody: string;
  reviewLanguage: string;
  ratingValue: number;
  verificationLevel: string;
  numberOfReviews: number;
  consumerCountryCode: string;
  experienceDate: string;
  likes: number;
  replyMessage?: string;
  replyPublishedDate?: string;
  replyUpdatedDate?: string;
}

/**
 * Scrape reviews from Trustpilot for competitor research
 * Cost: FREE (compute only)
 * 
 * @example
 * // Get negative reviews to find pain points
 * const reviews = await scrapeTrustpilotReviews({
 *   companyDomain: "competitor.com",
 *   stars: [1, 2, 3],  // Focus on negative/neutral reviews
 *   count: 50
 * });
 */
export async function scrapeTrustpilotReviews(
  input: TrustpilotInput
): Promise<TrustpilotReview[]> {
  const actorInput = {
    companyDomain: input.companyDomain,
    count: input.count || 50,
    stars: input.stars,
    languages: input.languages || ['en'],
    verified: input.verified,
    search: input.search,
    startPage: input.startPage || 1,
    replies: input.replies,
  };

  return runActorAndGetResults<TrustpilotReview>(ACTOR_ID, actorInput);
}

/**
 * Analyze reviews to extract common pain points
 */
export function analyzePainPoints(reviews: TrustpilotReview[]): {
  averageRating: number;
  totalReviews: number;
  commonComplaints: string[];
} {
  const negativeReviews = reviews.filter(r => r.ratingValue <= 2);
  
  // Extract common words from negative reviews (simple analysis)
  const wordCounts = new Map<string, number>();
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'is', 'was', 'are', 'were', 'i', 'my', 'they', 'their', 'this', 'that', 'it', 'of', 'with', 'not', 'have', 'had', 'been', 'be', 'no', 'do', 'did', 'from', 'as', 'by', 'so', 'if', 'we', 'you', 'your', 'me', 'them', 'has']);
  
  negativeReviews.forEach(review => {
    const words = review.reviewBody.toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));
    
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
  });

  // Get top 10 most common words in negative reviews
  const commonComplaints = [...wordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  return {
    averageRating: reviews.reduce((sum, r) => sum + r.ratingValue, 0) / reviews.length || 0,
    totalReviews: reviews.length,
    commonComplaints,
  };
}
