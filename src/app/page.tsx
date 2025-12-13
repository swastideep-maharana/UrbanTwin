"use client";

import { useState, useEffect } from "react";
import Map from "@/components/Maps";
import ControlPanel from "@/components/ControlPanel";
import { getWeatherData, getCityAnalysis, getCoordinates } from "@/app/actions";

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

  useEffect(() => {
    fetchWeather(INITIAL_CITY.latitude, INITIAL_CITY.longitude);
  }, []);

  return (
    <main className="relative min-h-screen w-full">
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
      />
      <Map viewState={viewState} isOrbiting={isOrbiting} time={time} />
    </main>
  );
}