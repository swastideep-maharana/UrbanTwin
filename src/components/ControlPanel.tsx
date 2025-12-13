"use client";

// ControlPanel: Handles user input and displays weather/analysis data

import React, { useState, useCallback, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Loader2, Sparkles, Search, MapPin, Camera, Sun, Moon, Mic, MicOff, Wind, Droplets, Thermometer, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

const COOLDOWN_DURATION = 10;
const WEATHER_ICONS: Record<string, string> = {
  Clear: "☀️",
  Clouds: "☁️",
  Rain: "🌧️",
  Snow: "❄️",
  Drizzle: "🌦️",
  Thunderstorm: "⛈️",
};

// Extraordinary Glassmorphism Style
const GLASS_PANEL = "bg-zinc-950/80 border-white/10 backdrop-blur-3xl text-zinc-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)] ring-1 ring-white/10 relative group";
const INPUT_STYLE = "bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/80 transition-all duration-500 hover:bg-black/60 hover:border-white/20";

interface WeatherData {
  temp: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
}

interface ControlPanelProps {
  onCitySearch: (city: string) => Promise<void>;
  selectedCityName: string;
  weather: WeatherData | null;
  isLoading: boolean;
  onAnalyze: () => Promise<void>;
  analysis: string | null;
  isAnalyzing: boolean;
  isOrbiting: boolean;
  onToggleOrbit: () => void;
  time: number;
  onTimeChange: (val: number) => void;
  // Voice control props
  onVoiceStart: () => void;
  isListening: boolean;
  lastCommand: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  showModels: boolean;
  onToggleModels: () => void;
}

// Helper to format time (e.g. 14.5 -> "14:30")
const formatTime = (val: number) => {
  const hours = Math.floor(val);
  const minutes = Math.floor((val - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Get time period icon and label
const getTimePeriod = (time: number) => {
  if (time >= 5 && time < 7) return { icon: Sun, label: "Dawn", color: "text-orange-400" };
  if (time >= 7 && time < 17) return { icon: Sun, label: "Day", color: "text-yellow-400" };
  if (time >= 17 && time < 19) return { icon: Sun, label: "Dusk", color: "text-pink-400" };
  return { icon: Moon, label: "Night", color: "text-indigo-400" };
};

// Memoized sub-components
const WeatherMetric = ({ icon: Icon, label, value, unit }: { icon: React.ElementType, label: string, value: string | number, unit?: string }) => (
  <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-900/40 border border-white/5 transition-all hover:bg-slate-800/50 hover:scale-105 group cursor-default">
    <div className="text-slate-400 group-hover:text-cyan-400 transition-colors mb-1">
      <Icon className="h-4 w-4" />
    </div>
    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">{label}</div>
    <div className="font-mono text-sm font-medium text-slate-200">
      {value}<span className="text-slate-500 text-xs ml-0.5">{unit}</span>
    </div>
  </div>
);

const AnalysisResult = memo(({ analysis }: { analysis: string }) => (
  <div className="relative overflow-hidden p-0.5 rounded-xl bg-gradient-to-br from-cyan-500/50 via-indigo-500/50 to-purple-500/50 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div className="bg-zinc-950/95 backdrop-blur-2xl p-5 rounded-[10px] relative">
       {/* Holographic sheers */}
       <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
       
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/5">
        <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
          <Sparkles className="h-4 w-4 animate-pulse" />
        </div>
        <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300 uppercase tracking-[0.2em]">
          AI SECTOR ANALYSIS
        </span>
      </div>
      <div className="max-h-[200px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-indigo-500/20 scrollbar-track-transparent hover:scrollbar-thumb-indigo-500/40 transition-colors">
        <p className="text-sm text-zinc-300 leading-7 font-light tracking-wide text-justify font-sans selection:bg-indigo-500/30">
          {analysis}
        </p>
      </div>
    </div>
  </div>
));

AnalysisResult.displayName = 'AnalysisResult';

const ControlPanel = ({
  onCitySearch,
  selectedCityName,
  weather,
  isLoading,
  onAnalyze,
  analysis,
  isAnalyzing,
  isOrbiting,
  onToggleOrbit,
  time,
  onTimeChange,
  onVoiceStart,
  isListening,
  lastCommand,
  theme,
  onToggleTheme,
  showModels,
  onToggleModels,
}: ControlPanelProps) => {
  const [searchInput, setSearchInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const timePeriod = getTimePeriod(time);
  const TimePeriodIcon = timePeriod.icon;

  const handleSearchSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    setIsSearching(true);
    await onCitySearch(searchInput);
    setIsSearching(false);
    setSearchInput("");
  }, [searchInput, onCitySearch]);

  const handleAnalyzeClick = useCallback(async () => {
    if (cooldown > 0) return;

    await onAnalyze();

    setCooldown(COOLDOWN_DURATION);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [cooldown, onAnalyze]);

  return (
    <div className="absolute top-4 left-4 z-10 w-[22rem] flex flex-col gap-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
      {/* Header & Search Card */}
      <Card className={cn(GLASS_PANEL, "overflow-hidden")}>
          {/* Subtle Grid Overlay */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        <CardHeader className="pb-3 pt-4 px-4 bg-gradient-to-r from-zinc-900/50 to-transparent relative z-10">
          <CardTitle className="text-xl font-black tracking-tighter flex items-center gap-2.5">
            <div className="bg-cyan-500/10 p-1.5 rounded-lg border border-cyan-500/20">
              <MapPin className="h-5 w-5 text-cyan-400" />
            </div>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400 filter drop-shadow-sm">
              URBANTWIN
            </span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4 px-4 pb-4">
          {/* Active Sector Display */}
          <div className="flex items-center justify-between text-sm bg-slate-950/40 p-2.5 rounded-lg border border-white/5 group transition-colors hover:border-white/10">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Active Sector</span>
              <span className="font-bold text-slate-100 tracking-wide truncate max-w-[140px] group-hover:text-cyan-200 transition-colors">
                {selectedCityName}
              </span>
            </div>
            <div className="h-full w-[1px] bg-white/10 mx-2" />
             <div className="flex items-center gap-2">
                {isLoading ? (
                  <Loader2 className="h-3 w-3 text-yellow-500 animate-spin" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                )}
                <span className="text-[10px] text-slate-400 font-mono">
                  {isLoading ? 'SYNCING DATA...' : 'SYSTEM ONLINE'}
                </span>
             </div>
          </div>

          <div className="flex gap-2">
            <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 relative">
              <Input
                placeholder="Locate sector..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={cn(INPUT_STYLE, "pl-9 pr-2")}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <Button
                type="submit"
                size="icon"
                disabled={isSearching}
                title="Search City"
                className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 border border-indigo-500/30 transition-all hover:scale-105 active:scale-95 w-10 shrink-0"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </form>

            <div className="flex gap-1 shrink-0">
               {/* Voice Control */}
              <Button
                size="icon"
                onClick={onVoiceStart}
                className={cn(
                  "border transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg",
                  isListening
                    ? "bg-rose-500 hover:bg-rose-600 border-rose-400 text-white animate-pulse shadow-rose-500/20"
                    : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-indigo-300"
                )}
                title="Voice Command (Try 'Orbit', 'Analyze')"
              >
                {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
              
               {/* Orbit Control */}
              <Button
                size="icon"
                onClick={onToggleOrbit}
                className={cn(
                   "border transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg",
                   isOrbiting
                    ? "bg-amber-500 hover:bg-amber-600 border-amber-400 text-white shadow-amber-500/20"
                    : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-amber-300"
                )}
                title={isOrbiting ? "Stop Orbit" : "Start Drone Orbit"}
              >
                <Camera className={`h-4 w-4 ${isOrbiting ? 'animate-spin-slow' : ''}`} />
              </Button>
            </div>
          </div>

           {/* View Modes (Theme & Models) */}
           <div className="grid grid-cols-2 gap-2 pb-2">
             <Button
                variant="outline"
                size="sm"
                onClick={onToggleTheme}
                title="Toggle Day/Night Theme"
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider h-7 border-slate-700 hover:bg-slate-800",
                  theme === 'light' ? "bg-slate-100 text-slate-900 hover:bg-white" : "bg-slate-900 text-slate-400"
                )}
              >
                {theme === 'light' ? (
                  <><Sun className="mr-1.5 h-3 w-3 text-orange-400" /> DAY MODE</>
                ) : (
                  <><Moon className="mr-1.5 h-3 w-3 text-indigo-400" /> NIGHT MODE</>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleModels}
                title="Toggle 3D Buildings Layer"
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider h-7 border-slate-700",
                  showModels 
                    ? "bg-emerald-900/30 text-emerald-400 border-emerald-500/30 hover:bg-emerald-900/50" 
                    : "bg-slate-900 text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                )}
              >
                <div className={cn("mr-1.5 h-1.5 w-1.5 rounded-sm", showModels ? "bg-emerald-400 shadow-[0_0_4px_cyan]" : "bg-slate-500")} />
                {showModels ? "3D MODELS ON" : "3D MODELS OFF"}
              </Button>
           </div>
           
          {/* Voice Terminal Feedback */}
          <div className={cn(
            "text-xs font-mono bg-black/40 p-2.5 rounded-md border border-white/5 transition-all duration-300 min-h-[2.5rem] flex items-center",
            lastCommand ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 h-0 p-0 border-0 overflow-hidden"
          )}>
            <Radio className="h-3 w-3 text-indigo-400 mr-2 animate-pulse" />
            <span className="text-indigo-200">
              <span className="text-indigo-500 mr-1">&gt;</span> 
              &quot;{lastCommand}&quot;
            </span>
          </div>

          {/* Time Control */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900/50 border border-white/5">
                <TimePeriodIcon className={cn("h-3.5 w-3.5", timePeriod.color)} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{timePeriod.label}</span>
              </div>
              <span className="text-xs font-mono font-medium text-slate-400">{formatTime(time)}</span>
            </div>
            
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500" />
              <Slider
                value={[time]}
                max={24}
                step={0.1}
                onValueChange={(vals: number[]) => onTimeChange(vals[0])}
                className="cursor-pointer relative z-10"
              />
            </div>
            
            <div className="flex justify-between px-1">
              {[0, 6, 12, 18, 24].map((t) => (
                <div key={t} className="flex flex-col items-center gap-1">
                  <div className="h-1 w-0.5 bg-slate-700 rounded-full" />
                  <span className="text-[9px] text-slate-600 font-mono">{t.toString().padStart(2, '0')}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Data & AI Panel */}
      <Card className={cn(GLASS_PANEL, "transition-all duration-300")}>
        <CardHeader className="pb-2 px-4 pt-4 border-b border-white/5">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
            Environmental Data
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <span className="text-xs tracking-wider animate-pulse">ACQUIRING SATELLITE FEED...</span>
            </div>
          ) : weather ? (
            <>
              {/* Main Weather Hero */}
              <div className="flex items-center justify-between mb-4">
                 <div className="flex flex-col">
                    <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 tracking-tighter">
                      {Math.round(weather.temp)}°
                    </span>
                    <span className="text-sm text-cyan-400 font-medium capitalize flex items-center gap-1">
                      {weather.description}
                    </span>
                 </div>
                 <div className="text-5xl filter drop-shadow-lg animate-bounce-slow">
                    {WEATHER_ICONS[weather.condition] || "🌡️"}
                 </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2">
                <WeatherMetric 
                  icon={Droplets} 
                  label="Humidity" 
                  value={weather.humidity} 
                  unit="%" 
                />
                <WeatherMetric 
                  icon={Wind} 
                  label="Wind" 
                  value={weather.windSpeed} 
                  unit="m/s" 
                />
                <WeatherMetric 
                  icon={Thermometer} 
                  label="Feels Like" 
                  value={Math.round(weather.temp) - 2} // Simulated for now
                  unit="°C" 
                />
              </div>

              {/* AI Analysis Action */}
              {!analysis && (
                <Button
                  onClick={handleAnalyzeClick}
                  disabled={isAnalyzing || cooldown > 0}
                  className={cn(
                    "w-full mt-2 font-medium tracking-wide transition-all shadow-lg hover:shadow-cyan-500/20",
                    isAnalyzing 
                      ? "bg-slate-800 text-slate-400" 
                      : cooldown > 0
                        ? "bg-slate-800 text-slate-500"
                        : "bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white border border-white/10"
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      PROCESSING DATA...
                    </>
                  ) : cooldown > 0 ? (
                    <span className="font-mono text-xs">RECHARGE: {cooldown}s</span>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      GENERATE AI ANALYSIS
                    </>
                  )}
                </Button>
              )}

              {analysis && <AnalysisResult analysis={analysis} />}
            </>
          ) : (
            <div className="py-6 text-center">
              <div className="text-4xl mb-2">📡</div>
              <div className="text-sm text-slate-400">No telemetry data available.</div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Footer / Credits style */}
      <div className="text-[10px] text-slate-600 text-center font-mono">
        SYSTEM V2.0 • ONLINE
      </div>
    </div>
  );
};

export default memo(ControlPanel);