export interface SessionInfo {
  sessionName?: string;
  circuitName?: string;
  totalLaps?: number;
  currentLap?: number;
}

/**
 * Parses SessionData / LapCount / Heartbeat streams
 */
export function parseSessionData(raw: any): Partial<SessionInfo> {
  if (!raw || typeof raw !== 'object') return {};

  const res: Partial<SessionInfo> = {};
  if (raw.Series || raw.Meeting) {
    const meetingName = raw.Meeting?.Name || raw.Meeting?.OfficialName;
    const sessionName = raw.Session?.Name || raw.Session?.Type;
    if (meetingName && sessionName) {
      res.sessionName = `${meetingName} — ${sessionName}`.toUpperCase();
    } else if (meetingName) {
      res.sessionName = meetingName.toUpperCase();
    }
    if (raw.Meeting?.Circuit?.ShortName) {
      res.circuitName = raw.Meeting.Circuit.ShortName;
    }
  }

  return res;
}

export function parseLapCount(raw: any): { currentLap?: number; totalLaps?: number } {
  if (!raw) return {};
  const current = raw.CurrentLap ? parseInt(String(raw.CurrentLap), 10) : undefined;
  const total = raw.TotalLaps ? parseInt(String(raw.TotalLaps), 10) : undefined;
  return {
    currentLap: isNaN(current!) ? undefined : current,
    totalLaps: isNaN(total!) ? undefined : total
  };
}
