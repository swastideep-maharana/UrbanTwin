"use client";

import { useState, useEffect } from "react";
import Map from "@/components/Maps";
import ControlPanel from "@/components/ControlPanel";
import { getWeatherData } from "@/app/actions"; // Import the Server Action

const CITIES = {
  NYC: { longitude: -74.006, latitude: 40.7128, zoom: 15.5 },
  London: { longitude: -0.1276, latitude: 51.5072, zoom: 15.5 },
  Tokyo: { longitude: 139.6917, latitude: 35.6895, zoom: 15.5 },
};

// Define types locally
type WeatherData = {
  temp: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
};

export default function Home() {
  const [activeCity, setActiveCity] = useState("NYC");
  const [viewState, setViewState] = useState(CITIES.NYC);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Function to fetch data
  const fetchWeather = async (lat: number, lon: number) => {
    setIsLoading(true);
    try {
      // Call Server Action
      const data = await getWeatherData(lat, lon);
      setWeather(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchWeather(CITIES.NYC.latitude, CITIES.NYC.longitude);
  }, []);

  const handleSelectCity = (cityKey: string) => {
    const city = CITIES[cityKey as keyof typeof CITIES];
    if (city) {
      setActiveCity(cityKey);
      setViewState(city);
      // Fetch new weather data when city changes
      fetchWeather(city.latitude, city.longitude);
    }
  };

  return (
    <main className="relative min-h-screen w-full">
      <ControlPanel 
        onSelectCity={handleSelectCity} 
        selectedCityName={activeCity}
        weather={weather}
        isLoading={isLoading}
      />
      <Map viewState={viewState} />
    </main>
  );
}