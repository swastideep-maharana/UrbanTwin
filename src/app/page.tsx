"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import dynamic from "next/dynamic";
import ControlPanel from "@/components/ControlPanel";
import { getWeatherData, getCityAnalysis, getCoordinates, getAQIData, type WeatherData, type AQIData } from "@/app/actions";
import { usePerformance } from "@/hooks/usePerformance";

// Dynamic imports for heavy components
const Map = dynamic(() => import("@/components/Maps"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-cyan-400 text-xl animate-pulse font-mono tracking-widest uppercase">Initializing_Digital_Twin...</div>
    </div>
  ),
});

const WeatherOverlay = dynamic(() => import("@/components/WeatherOverlay"), {
  ssr: false,
});

const INITIAL_CITY = {
  longitude: 77.2090,
  latitude: 28.6139,
  zoom: 12.5,
  name: "Delhi",
} as const;

const DEFAULT_ZOOM = 13;
const DEFAULT_TIME = 10;

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
  const [aqi, setAqi] = useState<AQIData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [time, setTime] = useState(DEFAULT_TIME);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showModels, setShowModels] = useState(true);
  
  // Interaction States
  const [interactionMode, setInteractionMode] = useState<'none' | 'probe' | 'ruler'>('none');
  const [probedBuilding, setProbedBuilding] = useState<any>(null);
  const [measurementPoints, setMeasurementPoints] = useState<any[]>([]);
  
  const performanceLevel = usePerformance();

  const fetchEnvironmentData = useCallback(async (lat: number, lon: number) => {
    setIsLoading(true);
    setAnalysis(null);
    try {
      const [weatherData, aqiData] = await Promise.all([
        getWeatherData(lat, lon),
        getAQIData(lat, lon)
      ]);
      setWeather(weatherData);
      setAqi(aqiData);
    } catch (err) {
      console.error("Data fetch failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCitySearch = useCallback(async (cityName: string) => {
    try {
      const coords = await getCoordinates(cityName);
      if (coords) {
        setActiveCity(coords.name);
        let newZoom = DEFAULT_ZOOM;
        const isLandmark = coords.place_type && (
          coords.place_type.includes('poi') || coords.place_type.includes('landmark') || coords.place_type.includes('address')
        );
        if (isLandmark) { newZoom = 17.5; setShowModels(true); }
        setViewState({ longitude: coords.longitude, latitude: coords.latitude, zoom: newZoom });
        await fetchEnvironmentData(coords.latitude, coords.longitude);
        setIsOrbiting(false);
      } else { alert("City not found!"); }
    } catch (error) { console.error("Search failed:", error); }
  }, [fetchEnvironmentData]);

  const handleAnalyze = useCallback(async () => {
    if (!weather) return;
    setIsAnalyzing(true);
    try {
      const result = await getCityAnalysis(activeCity, weather, aqi, probedBuilding);
      setAnalysis(result);
    } catch (err) { console.error("Analysis failed:", err); } finally { setIsAnalyzing(false); }
  }, [activeCity, weather, aqi, probedBuilding]);

  useEffect(() => {
    fetchEnvironmentData(INITIAL_CITY.latitude, INITIAL_CITY.longitude);
  }, [fetchEnvironmentData]);

  const shouldShowWeatherOverlay = useMemo(() => {
    return weather && (weather.condition === "Rain" || weather.condition === "Snow" || weather.condition === "Drizzle");
  }, [weather]);

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-slate-950">
      <Map 
        key={`${theme}-${interactionMode}`}
        viewState={viewState} 
        isOrbiting={isOrbiting} 
        time={time} 
        performanceLevel={performanceLevel}
        theme={theme}
        showModels={showModels}
        interactionMode={interactionMode}
        onBuildingSelect={setProbedBuilding}
        onMeasureUpdate={setMeasurementPoints}
        aqiValue={aqi?.aqi || 1}
      />
      {shouldShowWeatherOverlay && (
        <WeatherOverlay condition={weather!.condition} performanceLevel={performanceLevel} theme={theme} />
      )}
      <ControlPanel
        onCitySearch={handleCitySearch}
        selectedCityName={activeCity}
        weather={weather}
        aqi={aqi}
        isLoading={isLoading}
        onAnalyze={handleAnalyze}
        analysis={analysis}
        isAnalyzing={isAnalyzing}
        isOrbiting={isOrbiting}
        onToggleOrbit={() => setIsOrbiting(prev => !prev)}
        time={time}
        onTimeChange={setTime}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        showModels={showModels}
        onToggleModels={() => setShowModels(prev => !prev)}
        interactionMode={interactionMode}
        setInteractionMode={setInteractionMode}
        probedBuilding={probedBuilding}
        measurementPoints={measurementPoints}
      />
    </main>
  );
}

export default memo(Home);