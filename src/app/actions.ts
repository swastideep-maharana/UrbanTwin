"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

// Mock weather data for development/fallback
function getMockWeatherData(lat: number, lon: number) {
    // Different mock data based on approximate location
    const mockData = {
        NYC: { temp: 18, condition: "Clear", description: "clear sky", humidity: 65, windSpeed: 3.5 },
        London: { temp: 12, condition: "Clouds", description: "scattered clouds", humidity: 78, windSpeed: 4.2 },
        Tokyo: { temp: 22, condition: "Clear", description: "few clouds", humidity: 55, windSpeed: 2.8 }
    };
    
    // Simple location detection based on coordinates
    if (lat > 40 && lat < 41 && lon > -75 && lon < -73) return mockData.NYC;
    if (lat > 51 && lat < 52 && lon > -1 && lon < 1) return mockData.London;
    if (lat > 35 && lat < 36 && lon > 139 && lon < 140) return mockData.Tokyo;
    
    return mockData.NYC; // Default
}

export async function getWeatherData(lat: number, lon: number){
    const API_KEY = process.env.WEATHER_API_KEY;

    if (!API_KEY) {
        console.warn("Weather API key not found, using mock data");
        return getMockWeatherData(lat, lon);
    }

    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`,
      { cache: 'no-store' } // Ensure we always get fresh data
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Weather API error (${response.status}):`, errorText);
            console.warn("Falling back to mock weather data");
            return getMockWeatherData(lat, lon);
        }

        const data = await response.json();
        
        return {
      temp: Math.round(data.main.temp),
      condition: data.weather[0].main,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed
    };
    } catch (error) {
        console.error("Weather fetch failed:", error);
        console.warn("Falling back to mock weather data");
        return getMockWeatherData(lat, lon);
    }
}

export async function getCityAnalysis(city: string, weather: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Gemini API Key missing");
    return "AI analysis unavailable. Please configure GEMINI_API_KEY.";
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Use gemini-2.0-flash for fast, reliable performance
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  const prompt = `
    You are an expert Urban Planner and City Operations Manager.
    The current situation in ${city} is:
    - Condition: ${weather.condition} (${weather.description})
    - Temperature: ${weather.temp}°C
    - Wind Speed: ${weather.windSpeed} m/s
    - Humidity: ${weather.humidity}%

    Based *only* on this data, provide a brief, professional "City Operations Update" (max 3 sentences). 
    Focus on potential impacts to traffic flow, energy grid usage, or pedestrian safety. 
    Do not use markdown formatting. Be direct and authoritative.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return "System offline. Unable to generate analysis.";
  }
}