import { TrackStatus, FlagColor } from '../../../types/f1';

/**
 * Parses raw TrackStatus messages from SignalR / F1 live stream.
 * F1 track status values:
 * '1' = All Clear (Green)
 * '2' = Yellow Flag
 * '4' = Safety Car Deployed
 * '5' = Red Flag
 * '6' = Virtual Safety Car Deployed
 * '7' = Virtual Safety Car Ending
 */
export function parseTrackStatus(raw: any, updatedAt = new Date().toISOString()): TrackStatus | null {
  if (!raw) return null;

  // The payload may be an object { Status: '1', Message: 'All Clear' } or string
  const statusCode = String(raw.Status || raw.status || raw || '1').trim() as TrackStatus['status'];
  const rawMsg = raw.Message || raw.message;

  let flag: FlagColor = 'GREEN';
  let message = rawMsg || 'TRACK CLEAR';
  let safetyCarDeployed = false;
  let virtualSafetyCar = false;
  let redFlag = false;

  switch (statusCode) {
    case '5':
      flag = 'RED';
      message = rawMsg || 'RED FLAG - SESSION SUSPENDED';
      redFlag = true;
      break;
    case '4':
      flag = 'YELLOW';
      message = rawMsg || 'SAFETY CAR DEPLOYED';
      safetyCarDeployed = true;
      break;
    case '6':
      flag = 'YELLOW';
      message = rawMsg || 'VIRTUAL SAFETY CAR DEPLOYED';
      virtualSafetyCar = true;
      break;
    case '7':
      flag = 'YELLOW';
      message = rawMsg || 'VIRTUAL SAFETY CAR ENDING';
      break;
    case '2':
      flag = 'YELLOW';
      message = rawMsg || 'YELLOW FLAG';
      break;
    case '1':
    default:
      flag = 'GREEN';
      message = rawMsg || 'TRACK CLEAR';
      break;
  }

  return {
    status: statusCode,
    message,
    flag,
    safetyCarDeployed,
    virtualSafetyCar,
    redFlag,
    updatedAt
  };
}
