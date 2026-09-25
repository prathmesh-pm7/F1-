import { Weather } from '../../../types/f1';

/**
 * Parses raw WeatherData payload from F1 live feed.
 * Fields: AirTemp, TrackTemp, Humidity, Pressure, WindSpeed, WindDirection, Rainfall
 */
export function parseWeatherData(raw: any): Weather | null {
  if (!raw || typeof raw !== 'object') return null;

  const airTemp = parseFloat(raw.AirTemp ?? raw.air_temperature ?? 0);
  const trackTemp = parseFloat(raw.TrackTemp ?? raw.track_temperature ?? 0);
  const humidity = parseFloat(raw.Humidity ?? raw.humidity ?? 0);
  const pressure = parseFloat(raw.Pressure ?? raw.pressure ?? 1013);
  const windSpeed = parseFloat(raw.WindSpeed ?? raw.wind_speed ?? 0);
  const windDirection = parseFloat(raw.WindDirection ?? raw.wind_direction ?? 0);
  const rainfall = raw.Rainfall === '1' || raw.Rainfall === true || raw.rainfall === true || raw.Rainfall === 1;

  return {
    airTemp: isNaN(airTemp) ? 0 : airTemp,
    trackTemp: isNaN(trackTemp) ? 0 : trackTemp,
    humidity: isNaN(humidity) ? 0 : humidity,
    pressure: isNaN(pressure) ? 1013 : pressure,
    windSpeed: isNaN(windSpeed) ? 0 : windSpeed,
    windDirection: isNaN(windDirection) ? 0 : windDirection,
    rainfall
  };
}
