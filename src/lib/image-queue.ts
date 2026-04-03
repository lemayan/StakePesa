/**
 * image-queue.ts  (v2)
 *
 * Non-blocking fire-and-forget wrapper for entity image fetching.
 */

import { getEntityImage } from "@/lib/candidate-image";

/**
 * Queue an image fetch for a single market option.
 * Does NOT await — returns immediately. Errors are logged silently.
 */
export function queueImageFetch(
  marketId: string,
  optionName: string,
  marketCategory: string
): void {
  getEntityImage(marketId, optionName, marketCategory).catch((err) => {
    console.error(
      `[image-queue] Failed for "${optionName}" (${marketId}):`,
      err
    );
  });
}

/**
 * Queue image fetches for all options in a market.
 */
export function queueMarketImages(
  marketId: string,
  marketCategory: string,
  optionNames: string[]
): void {
  for (const name of optionNames) {
    queueImageFetch(marketId, name, marketCategory);
  }
}
