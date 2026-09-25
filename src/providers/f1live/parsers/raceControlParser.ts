import { RaceControlMessage, FlagColor } from '../../../types/f1';

/**
 * Parses raw RaceControlMessages payload.
 * F1 messages usually contain:
 * { Messages: [ { Utc, Lap, Category, Message, Flag, DriverNumber } ] }
 * or a single message object.
 */
export function parseRaceControlMessages(raw: any): RaceControlMessage[] {
  if (!raw) return [];

  const rawList = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.Messages)
    ? raw.Messages
    : [raw];

  const results: RaceControlMessage[] = [];

  for (const item of rawList) {
    if (!item || !item.Message) continue;

    const rawCategory = (item.Category || '').toUpperCase();
    const rawFlag = (item.Flag || '').toUpperCase();
    const messageText = String(item.Message).trim();

    let category: RaceControlMessage['category'] = 'INFO';
    if (rawCategory.includes('FLAG') || item.Flag) category = 'FLAG';
    else if (rawCategory.includes('SAFETY') || messageText.includes('SAFETY CAR') || messageText.includes('VSC')) category = 'SAFETY_CAR';
    else if (rawCategory.includes('PENALTY') || messageText.includes('PENALTY')) category = 'PENALTY';
    else if (rawCategory.includes('INVESTIGATION') || messageText.includes('NOTED') || messageText.includes('INVESTIGATED')) category = 'INVESTIGATION';
    else if (rawCategory.includes('TRACK_LIMITS') || messageText.includes('TRACK LIMITS')) category = 'TRACK_LIMITS';
    else if (rawCategory.includes('DRS') || messageText.includes('DRS')) category = 'DRS';

    let flag: FlagColor | undefined = undefined;
    if (rawFlag.includes('YELLOW')) flag = 'YELLOW';
    else if (rawFlag.includes('DOUBLE')) flag = 'DOUBLE_YELLOW';
    else if (rawFlag.includes('RED')) flag = 'RED';
    else if (rawFlag.includes('BLUE')) flag = 'BLUE';
    else if (rawFlag.includes('CHEQUERED')) flag = 'CHEQUERED';
    else if (rawFlag.includes('CLEAR') || rawFlag.includes('GREEN')) flag = 'CLEAR';

    const driverNum = item.RacingNumber || item.DriverNumber ? parseInt(item.RacingNumber || item.DriverNumber, 10) : undefined;
    const lapNum = item.Lap ? parseInt(item.Lap, 10) : undefined;

    // Time extraction
    let timeStr = '00:00:00';
    if (item.Utc) {
      try {
        timeStr = new Date(item.Utc).toTimeString().split(' ')[0];
      } catch {
        timeStr = String(item.Utc);
      }
    } else if (item.Time) {
      timeStr = String(item.Time);
    } else {
      timeStr = new Date().toTimeString().split(' ')[0];
    }

    results.push({
      id: item.Id || `rc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      time: timeStr,
      lap: isNaN(lapNum!) ? undefined : lapNum,
      category,
      flag,
      driverNumber: isNaN(driverNum!) ? undefined : driverNum,
      message: messageText,
      provenance: {
        provider: 'F1 Live Timing (SignalR)',
        retrievedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        isLive: true,
        isFixture: false,
        notes: 'Race Control stream packet'
      }
    });
  }

  return results;
}
