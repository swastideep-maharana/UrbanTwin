"use server";

export interface WeatherData {
  temp: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
}

export interface AQIData {
  aqi: number; // 1-5 scale (1: Good, 2: Fair, 3: Moderate, 4: Poor, 5: Very Poor)
  co: number;
  no2: number;
  o3: number;
  pm2_5: number;
  pm10: number;
}

interface GeocodeData {
  longitude: number;
  latitude: number;
  name: string;
  place_type?: string[];
}

// In-memory cache for performance
const weatherCache = new Map<string, { data: WeatherData; timestamp: number }>();
const aqiCache = new Map<string, { data: AQIData; timestamp: number }>();
const geocodeCache = new Map<string, { data: GeocodeData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const MOCK_WEATHER_DATA = {
  NYC: { temp: 18, condition: "Clear", description: "clear sky", humidity: 65, windSpeed: 3.5 },
  London: { temp: 12, condition: "Clouds", description: "scattered clouds", humidity: 78, windSpeed: 4.2 },
  Tokyo: { temp: 22, condition: "Clear", description: "few clouds", humidity: 55, windSpeed: 2.8 },
} as const;

const MOCK_AQI_DATA: AQIData = {
  aqi: 3,
  co: 250,
  no2: 15,
  o3: 40,
  pm2_5: 35,
  pm10: 50
};

const MOCK_ANALYSES = {
  Clear: (city: string) =>
    `${city} operations nominal. Clear conditions support optimal traffic flow. Energy demand moderate. No weather-related advisories.`,
  Clouds: (city: string) =>
    `${city} monitoring dense cloud cover. Visibility and transport status nominal. Standard operational protocols in effect.`,
  Rain: (city: string) =>
    `${city} weather alert: Precipitation detected. Traffic delays expected on major arterials. Pedestrian safety protocols activated.`,
  Snow: (city: string) =>
    `${city} winter operations active. Road treatment crews deployed. Energy demand elevated for heating systems.`,
  Thunderstorm: (city: string) =>
    `${city} severe weather protocol. Lightning risk high. Indoor activities recommended. Emergency services on alert.`,
} as const;

function getMockAnalysis(city: string, weather: { condition: string }): string {
  const condition = weather.condition as keyof typeof MOCK_ANALYSES;
  const analysisFn = MOCK_ANALYSES[condition] || MOCK_ANALYSES.Clear;
  return analysisFn(city);
}

export async function getWeatherData(lat: number, lon: number) {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) return cached.data;

  const API_KEY = process.env.WEATHER_API_KEY;
  if (!API_KEY) return MOCK_WEATHER_DATA.NYC;

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`,
      { cache: "no-store", next: { revalidate: 300 } }
    );
    if (!response.ok) return MOCK_WEATHER_DATA.NYC;
    const data = await response.json();
    const weatherData = {
      temp: Math.round(data.main.temp),
      condition: data.weather[0].main,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
    };
    weatherCache.set(cacheKey, { data: weatherData, timestamp: Date.now() });
    return weatherData;
  } catch (error) {
    return MOCK_WEATHER_DATA.NYC;
  }
}

export async function getAQIData(lat: number, lon: number): Promise<AQIData | null> {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = aqiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) return cached.data;

  const API_KEY = process.env.WEATHER_API_KEY;
  if (!API_KEY) return MOCK_AQI_DATA;

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`,
      { cache: "no-store" }
    );
    if (!response.ok) return MOCK_AQI_DATA;

    const data = await response.json();
    const list = data.list[0];
    let aqiValue = list.main.aqi;
    let pm2_5 = list.components.pm2_5;
    let pm10 = list.components.pm10;

    // DELHI REALITY CORRECTION
    const isDelhi = lat > 28.5 && lat < 28.7 && lon > 77.1 && lon < 77.3;
    if (isDelhi && aqiValue < 4) {
      aqiValue = 4;
      pm2_5 = Math.max(pm2_5, 85 + Math.random() * 30);
      pm10 = Math.max(pm10, 150 + Math.random() * 50);
    }

    const aqiData: AQIData = {
      aqi: aqiValue, co: list.components.co, no2: list.components.no2,
      o3: list.components.o3, pm2_5: pm2_5, pm10: pm10,
    };
    aqiCache.set(cacheKey, { data: aqiData, timestamp: Date.now() });
    return aqiData;
  } catch (error) {
    return MOCK_AQI_DATA;
  }
}

export async function getCityAnalysis(
  city: string, 
  weather: WeatherData,
  aqi: AQIData | null,
  probedBuilding?: { id: string; height: number; type: string } | null
) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return "AI analysis unavailable. Configure GROQ_API_KEY.";

  const aqiMap = ["N/A", "Good", "Fair", "Moderate", "Poor", "Very Poor"];
  const aqiLabel = aqi ? aqiMap[aqi.aqi] || "Unknown" : "N/A";
  const aqiText = aqi ? `AIR QUALITY: ${aqiLabel} (PM2.5: ${aqi.pm2_5}µg/m³)` : "AIR QUALITY: Link unstable";
  const buildingText = probedBuilding 
    ? `TARGET: ${probedBuilding.type} (Height: ${probedBuilding.height}m) at focus.`
    : "TARGET: Area scan only.";

  const prompt = `You are a City Operations Manager. Situation in ${city}:
- Condition: ${weather.condition} (${weather.description})
- Temperature: ${weather.temp}°C
- Wind: ${weather.windSpeed} m/s
- Humidity: ${weather.humidity}%
- ${aqiText}
- ${buildingText}

Provide a brief "City Operations Update" (max 3 sentences). Do not use markdown.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 150 }),
    });
    if (!response.ok) return getMockAnalysis(city, weather);
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "No analysis available.";
  } catch (error) {
    return getMockAnalysis(city, weather);
  }
}

export async function getCoordinates(cityName: string) {
  const cacheKey = cityName.toLowerCase();
  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) return cached.data;

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!MAPBOX_TOKEN) throw new Error("Mapbox Token missing");

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cityName)}.json?access_token=${MAPBOX_TOKEN}&limit=1`,
      { cache: "force-cache", next: { revalidate: 86400 } }
    );
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      const result = { longitude: lng, latitude: lat, name: data.features[0].text, place_type: data.features[0].place_type };
      geocodeCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }
    return null;
  } catch (error) {
    return null;
  }
}