import { deepAccess, logInfo, logWarn } from "../../src/utils.js";
import { config } from '../../src/config.js';
import type { BidderCode } from "../../src/types/common.d.ts";

type GzipUtilsOptions = {
  logPrefix?: string;
}

/**
 * Retrieves the "gzipEnabled" setting for a given bidder from the Prebid config.
 * Falls back to the provided defaultGzipEnabled value if not set or invalid.
 *
 * pbjs.setBidderConfig({
 *   bidders: ['bidderCode'],
 *   config: {
 *     gzipEnabled: true
 *   }
 * });
 */
export function getGzipSetting(bidderCode: BidderCode, defaultGzipEnabled: boolean, options?: GzipUtilsOptions) {
  const { logPrefix = bidderCode } = options || {};

  try {
    const gzipSetting = deepAccess(config.getBidderConfig(), `${bidderCode}.gzipEnabled`);

    if (gzipSetting !== undefined) {
      const gzipValue = String(gzipSetting).toLowerCase().trim();

      if (gzipValue === 'true' || gzipValue === 'false') {
        const parsedValue = gzipValue === 'true';
        logInfo(`${logPrefix}: Using bidder-specific gzipEnabled setting:`, parsedValue);
        return parsedValue;
      }

      logWarn(`${logPrefix}: Invalid gzipEnabled value in bidder config:`, gzipSetting);
    }
  } catch (e) {
    logWarn(`${logPrefix}: Error accessing bidder config:`, e);
  }

  logInfo(`${logPrefix}: Using default gzipEnabled setting:`, defaultGzipEnabled);
  return defaultGzipEnabled;
}
