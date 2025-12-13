"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

interface WeatherData {
  temp: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
}

interface GeocodeData {
  longitude: number;
  latitude: number;
  name: string;
  place_type?: string[];
}

// In-memory cache for performance
const weatherCache = new Map<string, { data: WeatherData; timestamp: number }>();
const geocodeCache = new Map<string, { data: GeocodeData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const MOCK_WEATHER_DATA = {
  NYC: { temp: 18, condition: "Clear", description: "clear sky", humidity: 65, windSpeed: 3.5 },
  London: { temp: 12, condition: "Clouds", description: "scattered clouds", humidity: 78, windSpeed: 4.2 },
  Tokyo: { temp: 22, condition: "Clear", description: "few clouds", humidity: 55, windSpeed: 2.8 },
} as const;

const MOCK_ANALYSES = {
  Clear: (city: string) =>
    `${city} operations nominal. Clear conditions support optimal traffic flow and pedestrian activity. Energy demand moderate with favorable outdoor conditions. No weather-related advisories at this time.`,
  Clouds: (city: string) =>
    `${city} monitoring cloudy conditions. Visibility remains good for all transport modes. Slight increase in lighting demand anticipated. Standard operational protocols in effect.`,
  Rain: (city: string) =>
    `${city} weather alert: Precipitation detected. Traffic delays expected on major arterials. Pedestrian safety protocols activated. Drainage systems engaged. Recommend reduced speeds and increased following distance.`,
  Snow: (city: string) =>
    `${city} winter operations active. Road treatment crews deployed. Public transit may experience delays. Pedestrians advised to use designated walkways. Energy demand elevated for heating systems.`,
  Thunderstorm: (city: string) =>
    `${city} severe weather protocol. Lightning risk high - outdoor activities restricted. Traffic management systems on standby. Emergency services on alert. Citizens advised to seek shelter.`,
} as const;

function getMockWeatherData(lat: number, lon: number) {
  if (lat > 40 && lat < 41 && lon > -75 && lon < -73) return MOCK_WEATHER_DATA.NYC;
  if (lat > 51 && lat < 52 && lon > -1 && lon < 1) return MOCK_WEATHER_DATA.London;
  if (lat > 35 && lat < 36 && lon > 139 && lon < 140) return MOCK_WEATHER_DATA.Tokyo;
  return MOCK_WEATHER_DATA.NYC;
}

function getMockAnalysis(city: string, weather: { condition: string }): string {
  const condition = weather.condition as keyof typeof MOCK_ANALYSES;
  const analysisFn = MOCK_ANALYSES[condition] || MOCK_ANALYSES.Clear;
  return analysisFn(city);
}

export async function getWeatherData(lat: number, lon: number) {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  
  // Check cache first
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const API_KEY = process.env.WEATHER_API_KEY;

  if (!API_KEY) {
    console.warn("Weather API key not found, using mock data");
    return getMockWeatherData(lat, lon);
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`,
      { 
        cache: "no-store",
        next: { revalidate: 300 } // Revalidate every 5 minutes
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Weather API error (${response.status}):`, errorText);
      console.warn("Falling back to mock weather data");
      return getMockWeatherData(lat, lon);
    }

    const data = await response.json();

    const weatherData = {
      temp: Math.round(data.main.temp),
      condition: data.weather[0].main,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
    };

    // Cache the result
    weatherCache.set(cacheKey, { data: weatherData, timestamp: Date.now() });

    return weatherData;
  } catch (error) {
    console.error("Weather fetch failed:", error);
    console.warn("Falling back to mock weather data");
    return getMockWeatherData(lat, lon);
  }
}

export async function getCityAnalysis(city: string, weather: { condition: string; description: string; temp: number; windSpeed: number; humidity: number }) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("Gemini API Key missing");
    return "AI analysis unavailable. Please configure GEMINI_API_KEY.";
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `You are an expert Urban Planner and City Operations Manager.
The current situation in ${city} is:
- Condition: ${weather.condition} (${weather.description})
- Temperature: ${weather.temp}°C
- Wind Speed: ${weather.windSpeed} m/s
- Humidity: ${weather.humidity}%

Based *only* on this data, provide a brief, professional "City Operations Update" (max 3 sentences). 
Focus on potential impacts to traffic flow, energy grid usage, or pedestrian safety. 
Do not use markdown formatting. Be direct and authoritative.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: unknown) {
    console.error("AI Analysis failed:", error);

    const err = error as { status?: number; message?: string };

    if (err.status === 429 && err.message?.includes("quota")) {
      console.warn("⚠️ Gemini API quota exhausted. Using mock analysis.");
      return `${getMockAnalysis(city, weather)}`;
    }

    if (err.status === 429) {
      return "⏳ Rate limit reached. Please wait 60 seconds before requesting another analysis.";
    }

    if (err.status === 401 || err.status === 403) {
      return "🔑 API authentication failed. Please check your GEMINI_API_KEY.";
    }

    if (err.message?.includes("API key")) {
      return "🔑 Invalid API key. Please regenerate your Gemini API key.";
    }

    return "⚠️ System temporarily offline. Please try again in a moment.";
  }
}

export async function getCoordinates(cityName: string) {
  const cacheKey = cityName.toLowerCase();
  
  // Check cache first
  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  
  if (!MAPBOX_TOKEN) {
    throw new Error("Mapbox Token missing");
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cityName)}.json?access_token=${MAPBOX_TOKEN}&limit=1`,
      { 
        cache: "force-cache",
        next: { revalidate: 86400 } // Cache for 24 hours
      }
    );
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      const result = {
        longitude: lng,
        latitude: lat,
        name: data.features[0].text,
        place_type: data.features[0].place_type,
      };

      // Cache the result
      geocodeCache.set(cacheKey, { data: result, timestamp: Date.now() });

      return result;
    }
    
    return null;
  } catch (error) {
    console.error("Geocoding failed:", error);
    return null;
  }
}