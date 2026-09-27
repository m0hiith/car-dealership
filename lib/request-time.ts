import 'server-only';
import { cache } from 'react';

/**
 * One timestamp per request, for time-based UI such as the New Arrival
 * badge. Cached data stays shareable because the badge is worked out at
 * render time, not stored with the cars.
 */
export const getRequestTime = cache(() => Date.now());
