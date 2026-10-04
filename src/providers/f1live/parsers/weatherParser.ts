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
  const pressure = parseFloat(raw.Pressure ?? raw.pressure ?? 0);
  const windSpeed = parseFloat(raw.WindSpeed ?? raw.wind_speed ?? 0);
  const windDirection = parseFloat(raw.WindDirection ?? raw.wind_direction ?? 0);
  const rainfall = raw.Rainfall === '1' || raw.Rainfall === true || raw.rainfall === true || raw.Rainfall === 1;
  const rawProb = raw.RainfallProbability ?? raw.RainProbability ?? raw.rainfall_probability ?? raw.rain_probability;
  const parsedProb = rawProb !== undefined ? parseFloat(rawProb) : undefined;
  const rainfallProbability = parsedProb !== undefined && !isNaN(parsedProb) ? parsedProb : (rainfall ? 100 : undefined);

  return {
    airTemp: isNaN(airTemp) ? 0 : airTemp,
    trackTemp: isNaN(trackTemp) ? 0 : trackTemp,
    humidity: isNaN(humidity) ? 0 : humidity,
    pressure: isNaN(pressure) ? 0 : pressure,
    windSpeed: isNaN(windSpeed) ? 0 : windSpeed,
    windDirection: isNaN(windDirection) ? 0 : windDirection,
    rainfall,
    rainfallProbability
  };
}
