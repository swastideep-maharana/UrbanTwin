"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Define the shape of Weather Data
interface WeatherData {
  temp: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
}

interface ControlPanelProps {
  onSelectCity: (city: string) => void;
  selectedCityName: string; // New Prop: Which city is active?
  weather: WeatherData | null; // New Prop: The live data
  isLoading: boolean; // New Prop: Loading state
}

const ControlPanel = ({ onSelectCity, selectedCityName, weather, isLoading }: ControlPanelProps) => {
  return (
    <div className="absolute top-4 left-4 z-10 w-80 space-y-4">
      {/* 1. City Selector */}
      <Card className="bg-black/80 border-slate-800 text-slate-100 backdrop-blur-md shadow-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold">UrbanTwin Control</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {["NYC", "London", "Tokyo"].map((city) => (
            <Button 
              key={city}
              variant={selectedCityName === city ? "default" : "secondary"} // Highlight active city
              onClick={() => onSelectCity(city)}
              className="w-full justify-start hover:bg-slate-700 transition-all"
            >
              {city === "NYC" && "🗽"}
              {city === "London" && "💂"}
              {city === "Tokyo" && "🗼"}
              <span className="ml-2">{city}</span>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* 2. Live Data Card */}
      <Card className="bg-slate-900/90 border-slate-700 text-slate-100 backdrop-blur-md shadow-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-wider text-slate-400">
            Live Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-slate-400 animate-pulse">Fetching satellite data...</div>
          ) : weather ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-4xl font-bold">{weather.temp}°C</div>
                  <div className="text-slate-400 capitalize">{weather.description}</div>
                </div>
                {/* Dynamic Emoji based on condition */}
                <div className="text-4xl">
                    {weather.condition === "Clear" && "☀️"}
                    {weather.condition === "Clouds" && "☁️"}
                    {weather.condition === "Rain" && "qh️"}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700">
                <div>
                    <div className="text-xs text-slate-400">HUMIDITY</div>
                    <div className="font-mono text-lg">{weather.humidity}%</div>
                </div>
                <div>
                    <div className="text-xs text-slate-400">WIND SPEED</div>
                    <div className="font-mono text-lg">{weather.windSpeed} m/s</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-red-400">Data unavailable</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ControlPanel;