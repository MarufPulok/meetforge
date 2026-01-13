import { ApifyClient } from 'apify-client';

// Initialize the Apify client with your API token
const apifyClient = new ApifyClient({
  token: process.env.APIFY_TOKEN!,
});

export { apifyClient };

// Helper to run an actor and get results
export async function runActorAndGetResults<T>(
  actorId: string,
  input: Record<string, unknown>
): Promise<T[]> {
  // Run the Actor and wait for it to finish
  const run = await apifyClient.actor(actorId).call(input);
  
  // Fetch results from the run's dataset
  const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
  
  return items as T[];
}
