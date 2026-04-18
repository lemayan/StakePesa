/**
 * image-queue.ts  (v2)
 *
 * Non-blocking fire-and-forget wrapper for entity image fetching.
 * Uses a sequential queue to avoid exhausting the Prisma connection pool.
 */

import { getEntityImage } from "@/lib/candidate-image";

type Task = () => Promise<void>;
const queue: Task[] = [];
let isProcessing = false;

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;
  while (queue.length > 0) {
    const task = queue.shift();
    if (task) {
      try {
        await task();
      } catch (err) {
        console.error("[image-queue] Error processing task:", err);
      }
    }
  }
  isProcessing = false;
}

/**
 * Queue an image fetch for a single market option.
 * Does NOT await — returns immediately. Errors are logged silently.
 */
export function queueImageFetch(
  marketId: string,
  optionName: string,
  marketCategory: string
): void {
  queue.push(async () => {
    try {
      await getEntityImage(marketId, optionName, marketCategory);
    } catch (err) {
      console.error(
        `[image-queue] Failed for "${optionName}" (${marketId}):`,
        err
      );
    }
  });
  processQueue();
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
