"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, Search, MapPin, Camera } from "lucide-react"; // Import Camera icon

// Define the shape of Weather Data
interface WeatherData {
  temp: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
}

interface ControlPanelProps {
  onCitySearch: (city: string) => Promise<void>; // Updated Prop
  selectedCityName: string;
  weather: WeatherData | null;
  isLoading: boolean;
  onAnalyze: () => Promise<void>;
  analysis: string | null;
  isAnalyzing: boolean;
  // NEW PROPS
  isOrbiting: boolean;
  onToggleOrbit: () => void;
}

const ControlPanel = ({ 
  onCitySearch, 
  selectedCityName, 
  weather, 
  isLoading,
  onAnalyze,
  analysis,
  isAnalyzing,
  isOrbiting,
  onToggleOrbit
}: ControlPanelProps) => {
  const [searchInput, setSearchInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    
    setIsSearching(true);
    await onCitySearch(searchInput);
    setIsSearching(false);
    setSearchInput(""); // Clear input after search
  };

  const handleAnalyzeClick = async () => {
    if (cooldown > 0) return;
    
    await onAnalyze();
    
    // Start 10-second cooldown
    setCooldown(10);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="absolute top-4 left-4 z-10 w-80 space-y-4">
      {/* Search & Location Card */}
      <Card className="bg-slate-900/60 border-white/10 backdrop-blur-xl text-slate-100 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-cyan-400" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              UrbanTwin
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Search Bar with Orbit Toggle */}
          <div className="flex gap-2">
            <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1">
              <Input 
                placeholder="Search city..." 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
              />
              <Button type="submit" size="icon" disabled={isSearching} className="bg-indigo-600 hover:bg-indigo-700">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </form>
            
            {/* Orbit Toggle Button */}
            <Button 
              size="icon" 
              onClick={onToggleOrbit}
              variant={isOrbiting ? "default" : "outline"}
              className={`border-slate-700 ${isOrbiting ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse" : "bg-slate-900 text-slate-400 hover:text-white"}`}
              title="Toggle Drone Orbit"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>

          {/* Current Location Badge */}
          <div className="flex items-center justify-between text-sm text-slate-400 bg-slate-900/50 p-2 rounded border border-slate-800">
            <span>Active Sector:</span>
            <span className="font-bold text-white tracking-wide">{selectedCityName}</span>
          </div>

        </CardContent>
      </Card>

      {/* Live Data & AI Section */}
      <Card className="bg-slate-900/60 border-white/10 backdrop-blur-xl text-slate-100 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-wider text-slate-400">
            Live Conditions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
               <Loader2 className="h-4 w-4 animate-spin" /> Aligning satellites...
            </div>
          ) : weather ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                <div>
                  <div className="text-4xl font-bold">{weather.temp}°C</div>
                  <div className="text-slate-400 capitalize">{weather.description}</div>
                </div>
                <div className="text-4xl">
                    {weather.condition === "Clear" && "☀️"}
                    {weather.condition === "Clouds" && "☁️"}
                    {weather.condition === "Rain" && "🌧️"}
                    {weather.condition === "Snow" && "❄️"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-700">
                <div>
                    <div className="text-xs text-slate-400">HUMIDITY</div>
                    <div className="font-mono text-lg">{weather.humidity}%</div>
                </div>
                <div>
                    <div className="text-xs text-slate-400">WIND SPEED</div>
                    <div className="font-mono text-lg">{weather.windSpeed} m/s</div>
                </div>
              </div>

              {!analysis && (
                <Button 
                  onClick={handleAnalyzeClick} 
                  disabled={isAnalyzing || cooldown > 0}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing Sector...
                    </>
                  ) : cooldown > 0 ? (
                    <>
                      ⏳ Wait {cooldown}s
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" /> Generate AI Report
                    </>
                  )}
                </Button>
              )}

              {analysis && (
                <div className="bg-slate-800 p-3 rounded-md border border-slate-600 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 mb-2 text-xs text-indigo-400 font-bold uppercase">
                    <Sparkles className="h-3 w-3" /> Gemini Insight
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {analysis}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-red-400">Data unavailable</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ControlPanel;