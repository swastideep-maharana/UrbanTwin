"use client";

import { useState, useEffect, useMemo } from "react";
import Map from "@/components/Maps";
import ControlPanel from "@/components/ControlPanel";
import WeatherOverlay from "@/components/WeatherOverlay";
import { getWeatherData, getCityAnalysis, getCoordinates } from "@/app/actions";
import { useVoiceCommand } from "@/hooks/useVoiceCommand";

const INITIAL_CITY = {
  longitude: -74.006,
  latitude: 40.7128,
  zoom: 15.5,
  name: "New York",
} as const;

const DEFAULT_ZOOM = 13;
const DEFAULT_TIME = 10; // 10:00 AM

type WeatherData = {
  temp: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
};

export default function Home() {
  const [activeCity, setActiveCity] = useState(INITIAL_CITY.name);
  const [viewState, setViewState] = useState<{
    longitude: number;
    latitude: number;
    zoom: number;
  }>({
    longitude: INITIAL_CITY.longitude,
    latitude: INITIAL_CITY.latitude,
    zoom: INITIAL_CITY.zoom,
  });

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [time, setTime] = useState(DEFAULT_TIME);

  const fetchWeather = async (lat: number, lon: number) => {
    setIsLoading(true);
    setAnalysis(null);
    try {
      const data = await getWeatherData(lat, lon);
      setWeather(data);
    } catch (err) {
      console.error("Weather fetch failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCitySearch = async (cityName: string) => {
    try {
      const coords = await getCoordinates(cityName);
      if (coords) {
        setActiveCity(coords.name);
        setViewState({
          longitude: coords.longitude,
          latitude: coords.latitude,
          zoom: DEFAULT_ZOOM,
        });
        await fetchWeather(coords.latitude, coords.longitude);
        setIsOrbiting(false);
      } else {
        alert("City not found!");
      }
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  const handleAnalyze = async () => {
    if (!weather) return;
    
    setIsAnalyzing(true);
    try {
      const result = await getCityAnalysis(activeCity, weather);
      setAnalysis(result);
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Define Voice Commands - The "Brain" of the voice system
  // We use useMemo so this object doesn't recreate on every render
  const commands = useMemo(() => [
    {
      keywords: ["analyze", "report", "status", "sector"],
      action: () => handleAnalyze()
    },
    {
      keywords: ["orbit", "rotate", "spin", "drone", "start"],
      action: () => setIsOrbiting(true)
    },
    {
      keywords: ["stop", "freeze", "halt"],
      action: () => setIsOrbiting(false)
    },
    {
      keywords: ["nyc", "new york"],
      action: () => handleCitySearch("New York")
    },
    {
      keywords: ["london", "uk"],
      action: () => handleCitySearch("London")
    },
    {
      keywords: ["tokyo", "japan"],
      action: () => handleCitySearch("Tokyo")
    },
    {
      keywords: ["paris", "france"],
      action: () => handleCitySearch("Paris")
    },
    {
      keywords: ["dubai"],
      action: () => handleCitySearch("Dubai")
    },
    {
      keywords: ["singapore"],
      action: () => handleCitySearch("Singapore")
    }
  ], []); // Empty deps - functions are stable

  // Initialize the voice hook
  const { isListening, lastTranscript, startListening } = useVoiceCommand(commands);

  useEffect(() => {
    fetchWeather(INITIAL_CITY.latitude, INITIAL_CITY.longitude);
  }, []);

  return (
    <main className="relative min-h-screen w-full">
      {/* 1. The Map (Background Layer) */}
      <Map viewState={viewState} isOrbiting={isOrbiting} time={time} />
      
      {/* 2. Weather Overlay (Particle Layer - sits on top of map, under UI) */}
      {weather && (
        <WeatherOverlay condition={weather.condition} />
      )}

      {/* 3. Control Panel (UI Layer - always on top) */}
      <ControlPanel
        onCitySearch={handleCitySearch}
        selectedCityName={activeCity}
        weather={weather}
        isLoading={isLoading}
        onAnalyze={handleAnalyze}
        analysis={analysis}
        isAnalyzing={isAnalyzing}
        isOrbiting={isOrbiting}
        onToggleOrbit={() => setIsOrbiting(!isOrbiting)}
        time={time}
        onTimeChange={setTime}
        onVoiceStart={startListening}
        isListening={isListening}
        lastCommand={lastTranscript}
      />
    </main>
  );
}