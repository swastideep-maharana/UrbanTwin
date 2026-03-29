"use client";

import React, { useState, useCallback, memo } from "react";
// Split imports to prevent HMR module factory issues in Turbopack
import { 
  Loader2, Search, MapPin, Camera, 
  Activity, Globe, Zap,
  Monitor, Cpu, Workflow, BarChart3, Database,
  ChevronUp, ChevronDown, ChevronRight
} from "lucide-react";

import { 
  Sun, Moon, Wind, Droplets, Thermometer, Radio,
  Cloud, CloudRain, CloudLightning, CloudSnow, CloudDrizzle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const COOLDOWN_DURATION = 10;

const WEATHER_ICONS: Record<string, React.ElementType> = {
  Clear: Sun,
  Clouds: Cloud,
  Rain: CloudRain,
  Snow: CloudSnow,
  Drizzle: CloudDrizzle,
  Thunderstorm: CloudLightning,
};

// HUD Constants
const HUD_SECTION_LABEL = "text-[9px] font-black uppercase tracking-[0.4em] text-cyan-500/40 mb-4 block px-1 flex items-center gap-2";
const HUD_METRIC_LABEL = "text-[8px] font-bold uppercase tracking-widest text-slate-500 mb-1 block truncate";
const HUD_METRIC_VALUE = "text-sm font-black font-mono text-slate-200 tracking-wider flex items-baseline gap-1";

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
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  showModels: boolean;
  onToggleModels: () => void;
}

const formatTime = (val: number) => {
  const hours = Math.floor(val);
  const minutes = Math.floor((val - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const HUDMetric = ({ icon: Icon, label, value, unit, color = "text-cyan-400", id }: any) => (
  <div className="relative group overflow-hidden">
    <div className="absolute top-0 right-0 p-1">
      <span className="text-[6px] font-mono text-slate-700 tracking-tighter uppercase">{id}</span>
    </div>
    <div className="corner-notch bg-white/[0.02] border border-white/5 p-4 flex flex-col hover:bg-white/[0.04] hover:border-cyan-500/30 transition-all duration-300">
      <div className={cn("mb-3 p-2 rounded-lg bg-white/5 w-fit group-hover:hud-glow transition-all", color)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className={HUD_METRIC_LABEL}>{label}</span>
      <div className={HUD_METRIC_VALUE}>
        {value}
        <span className="text-[9px] text-slate-600 font-normal uppercase tracking-tighter">{unit}</span>
      </div>
    </div>
    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
  </div>
);

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
  theme,
  onToggleTheme,
  showModels,
  onToggleModels,
}: ControlPanelProps) => {
  const [searchInput, setSearchInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isHUDMinimized, setIsHUDMinimized] = useState(false);

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

  const WeatherIcon = weather ? (WEATHER_ICONS[weather.condition] || Thermometer) : Thermometer;

  return (
    <div className={cn(
      "hud-panel cyber-grid fixed top-0 left-0 h-full z-50 flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
      isHUDMinimized 
        ? "-translate-x-[calc(100%-3rem)] md:-translate-x-[calc(100%-3.5rem)] w-[26rem]" 
        : "translate-x-0 w-full md:w-[26rem]"
    )}>
      {/* Minimize Toggle - Technical Tab */}
      <button
        type="button"
        onClick={() => setIsHUDMinimized(!isHUDMinimized)}
        className="absolute -right-10 top-1/2 -translate-y-1/2 h-40 w-10 bg-zinc-950/90 backdrop-blur-3xl border border-l-0 border-cyan-500/20 rounded-r-2xl flex flex-col items-center justify-center gap-4 group hover:bg-black transition-all z-[60] shadow-[10px_0_30px_rgba(0,0,0,0.5)]"
      >
        <div className="flex flex-col gap-1 items-center opacity-40 group-hover:opacity-100 transition-opacity">
           <div className="w-1 h-1 rounded-full bg-cyan-400" />
           <div className="w-1 h-4 rounded-full bg-cyan-400" />
           <div className="w-1 h-1 rounded-full bg-cyan-400" />
        </div>
        <div className={cn("transition-transform duration-700", isHUDMinimized ? "" : "rotate-180")}>
          <ChevronRight className="h-5 w-5 text-cyan-500 group-hover:scale-125 transition-transform" />
        </div>
        <span className="text-[8px] font-black uppercase text-cyan-500/40 [writing-mode:vertical-lr] tracking-[0.3em] group-hover:text-cyan-400 transition-colors">
          Terminal Control
        </span>
      </button>

      {/* HUD HEADER */}
      <div className="p-6 border-b border-white/5 relative overflow-hidden shrink-0 bg-black/20">
        <div className="scanning-line opacity-30" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 hud-glow">
            <Globe className="h-6 w-6 text-cyan-400" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
              <span className="text-[9px] font-black tracking-[0.3em] text-emerald-400/80 uppercase">Node Active [v4.2]</span>
            </div>
            <h1 className="text-2xl font-black tracking-[0.2em] text-white italic drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
              URBAN<span className="text-cyan-500">TWIN</span>
            </h1>
          </div>
        </div>
      </div>

      {/* HUD CONTENT - COMPACT SCROLLING */}
      <div className="flex-1 overflow-y-auto scrollbar-none p-6 space-y-8">
        
        {/* NAVIGATION MODULE */}
        <section>
          <label className={HUD_SECTION_LABEL}>
            <MapPin className="h-3 w-3" />
            Navigation System
          </label>
          <div className="space-y-3">
            <div className="corner-notch p-4 bg-white/[0.03] border border-white/5 flex items-center justify-between group">
              <div className="flex flex-col">
                <span className={HUD_METRIC_LABEL}>Active Sector</span>
                <span className="text-sm font-black text-white tracking-widest uppercase terminal-text">{selectedCityName}</span>
              </div>
              <div className="p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10 group-hover:border-cyan-500/30 transition-colors">
                <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
              </div>
            </div>
            
            <form onSubmit={handleSearchSubmit} className="relative">
              <Input
                placeholder="Target Coordinates..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="bg-black/40 border-white/10 h-12 pl-10 pr-4 rounded-xl text-[10px] focus:border-cyan-500/50 transition-all font-mono text-cyan-400 placeholder:text-slate-500"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
              {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-cyan-500 animate-spin" />}
            </form>
          </div>
        </section>

        {/* ENVIRONMENT DATA */}
        <section>
          <label className={HUD_SECTION_LABEL}>
            <Workflow className="h-3 w-3" />
            Atmo-Telemetry
          </label>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 opacity-50 bg-white/[0.01] corner-notch border border-dashed border-white/10">
              <Loader2 className="h-6 w-6 text-cyan-500 animate-spin mb-3" />
              <span className="text-[8px] font-black uppercase tracking-widest text-cyan-500/60">Syncing...</span>
            </div>
          ) : weather ? (
            <div className="space-y-3">
              <div className="corner-notch bg-white/[0.03] border border-white/10 p-5 flex items-center justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                  <span className="text-[10px] font-mono font-black text-white">0x00FF45</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-white tracking-tighter tabular-nums leading-none terminal-text">
                      {Math.round(weather.temp)}
                    </span>
                    <span className="text-xl font-black text-cyan-500/40">°C</span>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-400/80">
                      STATUS: {weather.description}
                    </span>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 group-hover:hud-glow transition-all">
                  <WeatherIcon className="h-10 w-10 text-cyan-500/80" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <HUDMetric id="HYD-01" icon={Droplets} label="Humidity" value={weather.humidity} unit="%" color="text-blue-400" />
                <HUDMetric id="WND-V1" icon={Wind} label="Wind Speed" value={weather.windSpeed} unit="M/S" color="text-emerald-400" />
              </div>
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed border-white/5 corner-notch bg-white/[0.01]">
              <Radio className="h-8 w-8 text-slate-800 mx-auto mb-3 animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-700">Datalink Required</span>
            </div>
          )}
        </section>

        {/* AI INTELLIGENCE */}
        <section>
          <label className={HUD_SECTION_LABEL}>
            <Cpu className="h-3 w-3" />
            Engine Intelligence
          </label>
          <div className="space-y-3">
            {!analysis ? (
              <Button
                onClick={handleAnalyzeClick}
                disabled={isAnalyzing || cooldown > 0 || !weather}
                className={cn(
                  "w-full h-14 corner-notch font-black tracking-[0.3em] uppercase transition-all duration-500 border border-white/10 group relative overflow-hidden",
                  isAnalyzing 
                    ? "bg-slate-900 text-slate-600" 
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_10px_30px_rgba(79,70,229,0.3)]"
                )}
              >
                {isAnalyzing ? "Processing Sector..." : "Run Analysis"}
                <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-[1.2s]" />
              </Button>
            ) : (
              <div className="corner-notch bg-white/[0.03] border border-white/10 p-5 space-y-4 relative overflow-hidden group">
                <div className="scanning-line opacity-20" />
                <div className="flex items-center justify-between opacity-40">
                  <div className="flex items-center gap-2">
                    <Database className="h-3 w-3 text-indigo-400" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-indigo-300">Memory Cluster [A-7]</span>
                  </div>
                  <span className="text-[8px] font-mono">HASH: 44E9-F1</span>
                </div>
                <div className="max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/5 font-mono text-[10px] leading-relaxed text-slate-400 text-justify border-l border-indigo-500/20 pl-4">
                  {analysis}
                </div>
                <div className="pt-3 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-indigo-500 shadow-[0_0_5px_rgba(99,102,241,0.5)]" />
                      <span className="text-[7px] font-black uppercase tracking-widest text-indigo-500/60">Target Verified</span>
                   </div>
                   <button type="button" className="text-[7px] font-black uppercase tracking-widest text-slate-600 hover:text-white transition-colors" onClick={() => handleAnalyzeClick()}>Re-Initialize</button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SYSTEM CONTROLS */}
        <section>
          <label className={HUD_SECTION_LABEL}>
            <Cpu className="h-3 w-3" />
            System Control Center
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onToggleOrbit}
              className={cn(
                "h-12 corner-notch border flex flex-col items-center justify-center transition-all group relative overflow-hidden",
                isOrbiting ? "bg-amber-500/20 border-amber-500/40 text-amber-400" : "bg-white/[0.03] border-white/5 text-slate-500 hover:border-cyan-500/40 hover:text-white"
              )}
            >
              <div className="absolute top-1 right-2 text-[5px] font-mono opacity-20 uppercase tracking-tighter">Drn</div>
              <Camera className={cn("h-3.5 w-3.5 mb-1", isOrbiting && "animate-spin-slow")} />
              <span className="text-[6px] font-black uppercase tracking-widest leading-none">{isOrbiting ? 'Active' : 'Orbit'}</span>
            </button>
            
            <button
              type="button"
              onClick={onToggleTheme}
              className="h-12 corner-notch border border-white/5 bg-white/[0.03] flex flex-col items-center justify-center text-slate-500 hover:border-cyan-500/40 hover:text-white transition-all group relative overflow-hidden"
            >
              <div className="absolute top-1 right-2 text-[5px] font-mono opacity-20 uppercase tracking-tighter">Vsn</div>
              {theme === 'dark' ? <Moon className="h-3.5 w-3.5 mb-1" /> : <Sun className="h-3.5 w-3.5 mb-1 text-yellow-500" />}
              <span className="text-[6px] font-black uppercase tracking-widest leading-none">{theme} Mode</span>
            </button>

            <button
              type="button"
              onClick={onToggleModels}
              className={cn(
                "h-12 corner-notch border flex flex-col items-center justify-center transition-all group relative overflow-hidden",
                showModels ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-white/[0.03] border-white/5 text-slate-500 hover:border-cyan-500/40 hover:text-white"
              )}
            >
              <div className="absolute top-1 right-2 text-[5px] font-mono opacity-20 uppercase tracking-tighter">3Dt</div>
              <BarChart3 className="h-3.5 w-3.5 mb-1" />
              <span className="text-[6px] font-black uppercase tracking-widest leading-none">3D Data</span>
            </button>
          </div>
        </section>

        {/* TEMPORAL SENSOR */}
        <section className="pb-6">
           <label className={HUD_SECTION_LABEL}>
             <Zap className="h-3 w-3" />
             Chronos Temporal Shift
           </label>
           <div className="corner-notch bg-black/40 border border-white/5 p-5 space-y-6 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                    <Sun className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className={HUD_METRIC_LABEL}>Local Sync</span>
                    <span className="text-xs font-black text-white italic tracking-wider terminal-text">SOLAR_DRIFT</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-bold text-slate-600 tracking-widest block mb-1">REALTIME_VAL</span>
                  <span className="text-2xl font-black font-mono text-cyan-400 hud-text-glow drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">{formatTime(time)}</span>
                </div>
              </div>
              
              <Slider
                value={[time]}
                max={24}
                step={0.1}
                onValueChange={(vals) => onTimeChange(vals[0])}
                className="cursor-pointer"
              />
           </div>
        </section>
      </div>

      {/* HUD FOOTER */}
      <div className="p-5 bg-black/60 border-t border-cyan-500/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.05)]">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
          <span className="text-[7px] font-black text-emerald-500/80 tracking-[0.4em] uppercase">Sector Link Stable</span>
        </div>
        <span className="text-[7px] font-black text-slate-700 tracking-[0.2em] uppercase font-mono">AURORA_CORE_v4.2</span>
      </div>
    </div>
  );
};

export default memo(ControlPanel);