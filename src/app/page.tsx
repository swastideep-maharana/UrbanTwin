"use client";

import { useState, useEffect } from "react";
import Map from "@/components/Maps";
import ControlPanel from "@/components/ControlPanel";
import { getWeatherData, getCityAnalysis, getCoordinates } from "@/app/actions"; // Import new action

// Initial city to load
const INITIAL_CITY = { longitude: -74.006, latitude: 40.7128, zoom: 15.5, name: "New York" };

// Define types locally
type WeatherData = {
  temp: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
};

export default function Home() {
  const [activeCity, setActiveCity] = useState(INITIAL_CITY.name);
  const [viewState, setViewState] = useState({
    longitude: INITIAL_CITY.longitude,
    latitude: INITIAL_CITY.latitude,
    zoom: INITIAL_CITY.zoom
  });
  
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOrbiting, setIsOrbiting] = useState(false); // NEW STATE: Orbit toggle

  const fetchWeather = async (lat: number, lon: number) => {
    setIsLoading(true);
    setAnalysis(null);
    try {
      const data = await getWeatherData(lat, lon);
      setWeather(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Search Handler
  const handleCitySearch = async (cityName: string) => {
    try {
      // 1. Get Coordinates
      const coords = await getCoordinates(cityName);
      if (coords) {
        // 2. Update Map
        setActiveCity(coords.name);
        setViewState({
          longitude: coords.longitude,
          latitude: coords.latitude,
          zoom: 13 // Start slightly zoomed out for new cities
        });
        // 3. Update Weather
        await fetchWeather(coords.latitude, coords.longitude);
        // 4. Stop orbiting when moving to a new city so user gets oriented
        setIsOrbiting(false);
      } else {
        alert("City not found!");
      }
    } catch (error) {
      console.error("Search failed", error);
    }
  };

  // AI Handler
  const handleAnalyze = async () => {
    if (!weather) return;
    setIsAnalyzing(true);
    try {
      const result = await getCityAnalysis(activeCity, weather);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchWeather(INITIAL_CITY.latitude, INITIAL_CITY.longitude);
  }, []);

  return (
    <main className="relative min-h-screen w-full">
      <ControlPanel 
        onCitySearch={handleCitySearch} // Pass the search handler
        selectedCityName={activeCity}
        weather={weather}
        isLoading={isLoading}
        onAnalyze={handleAnalyze}
        analysis={analysis}
        isAnalyzing={isAnalyzing}
        isOrbiting={isOrbiting} // NEW: Pass orbit state
        onToggleOrbit={() => setIsOrbiting(!isOrbiting)} // NEW: Pass toggle handler
      />
      <Map viewState={viewState} isOrbiting={isOrbiting} />
    </main>
  );
}