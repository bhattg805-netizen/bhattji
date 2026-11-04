/**
 * Utility to extract or calculate realistic Service Speed, Start Time, and Completion Hours
 * for SMM panel services.
 */

export interface ServiceTimingInfo {
  speed: string;                  // e.g. "15,000 - 30,000 / Day" or "5,000 / Hour"
  completionHours: string;        // e.g. "1 - 6 Hours (घंटे)"
  startTime: string;              // e.g. "Instant (0 - 30 Mins)"
  avgHoursFor1K: number;          // numeric reference for 1,000 qty
  estimatedForQuantity?: string;  // dynamic estimate for user's entered quantity
  badgeText: string;              // e.g. "Superfast Delivery"
  hourlyRate: number;             // approximate units delivered per hour
}

export function getServiceSpeedAndTiming(
  service: {
    id?: number;
    name: string;
    description?: string | null;
    categoryName?: string;
  },
  quantityNum?: number
): ServiceTimingInfo {
  const name = (service.name || '').toLowerCase();
  const desc = (service.description || '').toLowerCase();
  const cat = (service.categoryName || '').toLowerCase();
  const fullText = `${name} ${desc} ${cat}`;

  // 1. Check for explicit speed in description or name
  let explicitSpeed: string | null = null;
  const speedMatch = desc.match(/(?:speed|रफ्तार|गति)\s*[:\-]\s*([^\n\r,\.;|]+)/i);
  if (speedMatch && speedMatch[1]) {
    explicitSpeed = speedMatch[1].trim();
  } else {
    const kDayMatch = fullText.match(/(\d+[\d,\.]*\s*[kKmM]?\s*(?:[-–]\s*\d+[\d,\.]*\s*[kKmM]?)?\s*(?:\/|\s*per\s*|\s*a\s*)\s*(?:d|day|din|hr|hour|ghanta)s?)/i);
    if (kDayMatch && kDayMatch[1]) {
      explicitSpeed = kDayMatch[1].trim();
    }
  }

  // 2. Check for explicit start time
  let explicitStart: string | null = null;
  const startMatch = desc.match(/(?:start|starts\s*in|शुरू|shuru)\s*(?:time)?\s*[:\-]\s*([^\n\r,\.;|]+)/i);
  if (startMatch && startMatch[1]) {
    explicitStart = startMatch[1].trim();
  }

  // 3. Check for explicit completion/hours time
  let explicitCompletion: string | null = null;
  const compMatch = desc.match(/(?:completion|complete\s*in|delivery\s*time|delivery|pura\s*hone\s*ka\s*samay|avg\s*time)\s*[:\-]\s*([^\n\r,\.;|]+)/i);
  if (compMatch && compMatch[1]) {
    explicitCompletion = compMatch[1].trim();
  } else {
    const hoursMatch = desc.match(/(\d+(?:\s*[-–]\s*\d+)?\s*(?:hours?|hrs?|ghante|घंटे))/i);
    if (hoursMatch && hoursMatch[1]) {
      explicitCompletion = hoursMatch[1].trim();
    }
  }

  // Baseline defaults based on service category and keywords
  let defaultSpeed = '10,000 - 30,000 / Day';
  let defaultStart = 'Instant (0 - 30 Mins)';
  let defaultCompletion = '1 - 6 Hours';
  let defaultBadge = 'Fast Delivery';
  let hourlyRate = 1500;
  let avgHoursFor1K = 1.5;

  if (fullText.includes('view') || fullText.includes('reel') || fullText.includes('impression') || fullText.includes('reach') || fullText.includes('story')) {
    // Views / Reels / Impressions: Super fast
    defaultSpeed = '50,000 - 200,000 / Day';
    defaultStart = 'Instant (0 - 10 Mins)';
    defaultCompletion = '1 - 3 Hours';
    defaultBadge = 'Instant Views';
    hourlyRate = 15000;
    avgHoursFor1K = 0.5;
  } else if (fullText.includes('like') || fullText.includes('reaction') || fullText.includes('heart')) {
    // Likes / Reactions: Instant burst
    defaultSpeed = '5,000 - 15,000 / Hour';
    defaultStart = 'Instant (0 - 5 Mins)';
    defaultCompletion = '0.5 - 2 Hours';
    defaultBadge = 'Superfast Delivery';
    hourlyRate = 8000;
    avgHoursFor1K = 0.5;
  } else if (fullText.includes('telegram') || fullText.includes('channel') || fullText.includes('group')) {
    // Telegram: Fast channel/group adds
    defaultSpeed = '20,000 - 50,000 / Day';
    defaultStart = 'Instant (0 - 15 Mins)';
    defaultCompletion = '1 - 4 Hours';
    defaultBadge = 'High Speed Member Add';
    hourlyRate = 4000;
    avgHoursFor1K = 0.8;
  } else if (fullText.includes('youtube') && (fullText.includes('subscriber') || fullText.includes('watch'))) {
    // YouTube Subs / Watch Time: Slow & steady safe
    defaultSpeed = '200 - 1,000 / Day (Safe Pace)';
    defaultStart = '1 - 6 Hours';
    defaultCompletion = '24 - 48 Hours';
    defaultBadge = '100% Safe Pace';
    hourlyRate = 40;
    avgHoursFor1K = 24;
  } else if (fullText.includes('youtube') && fullText.includes('view')) {
    // YouTube Views
    defaultSpeed = '2,000 - 10,000 / Day';
    defaultStart = '1 - 3 Hours';
    defaultCompletion = '12 - 24 Hours';
    defaultBadge = 'Organic Views';
    hourlyRate = 350;
    avgHoursFor1K = 4;
  } else if (fullText.includes('comment')) {
    // Comments: Natural pacing
    defaultSpeed = '500 - 2,000 / Day';
    defaultStart = '15 - 45 Mins';
    defaultCompletion = '2 - 8 Hours';
    defaultBadge = 'Organic Comments';
    hourlyRate = 150;
    avgHoursFor1K = 5;
  } else if (fullText.includes('follower') || fullText.includes('member') || fullText.includes('subscriber')) {
    // Followers
    defaultSpeed = '10,000 - 30,000 / Day';
    defaultStart = '0 - 30 Mins (Instant)';
    defaultCompletion = '1 - 6 Hours';
    defaultBadge = 'Non-Drop Speed';
    hourlyRate = 1800;
    avgHoursFor1K = 1.2;
  } else if (fullText.includes('facebook')) {
    // Facebook
    defaultSpeed = '5,000 - 20,000 / Day';
    defaultStart = '0 - 1 Hour';
    defaultCompletion = '2 - 12 Hours';
    defaultBadge = 'Guaranteed Speed';
    hourlyRate = 1000;
    avgHoursFor1K = 2;
  }

  const speed = explicitSpeed || defaultSpeed;
  const startTime = explicitStart || defaultStart;
  const completionHours = explicitCompletion || defaultCompletion;

  // Dynamic estimate if user entered a quantity
  let estimatedForQuantity: string | undefined;
  if (quantityNum && quantityNum > 0) {
    const hours = quantityNum / hourlyRate;
    if (hours <= 0.5) {
      estimatedForQuantity = '~15 - 30 Minutes';
    } else if (hours <= 1) {
      estimatedForQuantity = '~1 Hour';
    } else if (hours <= 3) {
      estimatedForQuantity = '~1 - 3 Hours';
    } else if (hours <= 6) {
      estimatedForQuantity = '~3 - 6 Hours';
    } else if (hours <= 12) {
      estimatedForQuantity = '~6 - 12 Hours';
    } else if (hours <= 24) {
      estimatedForQuantity = '~12 - 24 Hours';
    } else {
      const days = Math.ceil(hours / 24);
      estimatedForQuantity = `~${days} Days`;
    }
  }

  return {
    speed,
    completionHours,
    startTime,
    avgHoursFor1K,
    estimatedForQuantity,
    badgeText: defaultBadge,
    hourlyRate,
  };
}
