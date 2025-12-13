"use client";

import { useState, useEffect, useMemo, useCallback, lazy, Suspense, memo } from "react";
import dynamic from "next/dynamic";
import ControlPanel from "@/components/ControlPanel";
import { getWeatherData, getCityAnalysis, getCoordinates } from "@/app/actions";
import { useVoiceCommand } from "@/hooks/useVoiceCommand";

// Dynamic imports for heavy components - improves initial load time
const Map = dynamic(() => import("@/components/Maps"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-cyan-400 text-xl animate-pulse">Initializing Digital Twin...</div>
    </div>
  ),
});

const WeatherOverlay = dynamic(() => import("@/components/WeatherOverlay"), {
  ssr: false,
});

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

function Home() {
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

  // Memoize fetchWeather to prevent recreation on every render
  const fetchWeather = useCallback(async (lat: number, lon: number) => {
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
  }, []);

  // Memoize handleCitySearch to prevent recreation
  const handleCitySearch = useCallback(async (cityName: string) => {
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
  }, [fetchWeather]);

  // Memoize handleAnalyze
  const handleAnalyze = useCallback(async () => {
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
  }, [activeCity, weather]);

  // Memoize toggle orbit handler
  const handleToggleOrbit = useCallback(() => {
    setIsOrbiting(prev => !prev);
  }, []);

  // Define Voice Commands - memoized with proper dependencies
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
  ], [handleAnalyze, handleCitySearch]);

  // Initialize the voice hook
  const { isListening, lastTranscript, startListening } = useVoiceCommand(commands);

  // Initial weather fetch
  useEffect(() => {
    fetchWeather(INITIAL_CITY.latitude, INITIAL_CITY.longitude);
  }, [fetchWeather]);

  // Only render weather overlay when there's actual weather that needs particles
  const shouldShowWeatherOverlay = useMemo(() => {
    return weather && (weather.condition === "Rain" || weather.condition === "Snow" || weather.condition === "Drizzle");
  }, [weather]);

  return (
    <main className="relative min-h-screen w-full">
      {/* 1. The Map (Background Layer) - Dynamically loaded */}
      <Map viewState={viewState} isOrbiting={isOrbiting} time={time} />
      
      {/* 2. Weather Overlay (Particle Layer) - Only render when needed */}
      {shouldShowWeatherOverlay && (
        <WeatherOverlay condition={weather!.condition} />
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
        onToggleOrbit={handleToggleOrbit}
        time={time}
        onTimeChange={setTime}
        onVoiceStart={startListening}
        isListening={isListening}
        lastCommand={lastTranscript}
      />
    </main>
  );
}

// Export memoized version to prevent unnecessary re-renders
export default memo(Home);