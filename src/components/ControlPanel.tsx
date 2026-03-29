"use client";

import React, { useState, useCallback, memo } from "react";
import { 
  Loader2, Search, MapPin, Camera, Activity, Globe, Zap, Cpu, Workflow, 
  BarChart3, Database, ChevronRight, Wind, Droplets, Thermometer, Radio,
  Cloud, CloudRain, CloudLightning, CloudSnow, CloudDrizzle,
  MousePointer2, Ruler, AlertTriangle, Layers, Sun, Moon
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useTerminalSounds } from "@/hooks/useTerminalSounds";

const COOLDOWN_DURATION = 10;
const WEATHER_ICONS: Record<string, React.ElementType> = {
  Clear: Sun, Clouds: Cloud, Rain: CloudRain, Snow: CloudSnow, Drizzle: CloudDrizzle, Thunderstorm: CloudLightning,
};

const HUD_SECTION_LABEL = "text-[9px] font-black uppercase tracking-[0.4em] text-cyan-500/40 mb-4 block px-1 flex items-center gap-2";
const HUD_METRIC_LABEL = "text-[8px] font-bold uppercase tracking-widest text-slate-500 mb-1 block truncate";
const HUD_METRIC_VALUE = "text-sm font-black font-mono text-slate-200 tracking-wider flex items-baseline gap-1";

const AQI_LEVELS = [
  { label: "N/A", color: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/20" },
  { label: "GOOD", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  { label: "FAIR", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  { label: "MODERATE", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { label: "POOR", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  { label: "VERY POOR", color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
];

interface ControlPanelProps {
  onCitySearch: (city: string) => Promise<void>;
  selectedCityName: string;
  weather: any | null;
  aqi: any | null;
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
  interactionMode: 'none' | 'probe' | 'ruler';
  setInteractionMode: (mode: 'none' | 'probe' | 'ruler') => void;
  probedBuilding: any;
  measurementPoints: any[];
}

const formatTime = (val: number) => {
  const h = Math.floor(val);
  const m = Math.floor((val - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const HUDMetric = ({ icon: Icon, label, value, unit, color = "text-cyan-400", id, onHover }: any) => (
  <div className="relative group overflow-hidden" onMouseEnter={onHover}>
    <div className="corner-notch bg-white/[0.02] border border-white/5 p-4 flex flex-col hover:bg-white/[0.04] hover:border-cyan-500/30 transition-all duration-300">
      <div className={cn("mb-3 p-2 rounded-lg bg-white/5 w-fit group-hover:hud-glow transition-all", color)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className={HUD_METRIC_LABEL}>{label}</span>
      <div className={HUD_METRIC_VALUE}>{value}<span className="text-[9px] text-slate-600 ml-1">{unit}</span></div>
    </div>
  </div>
);

const ControlPanel = ({
  onCitySearch, selectedCityName, weather, aqi, isLoading, onAnalyze, analysis,
  isAnalyzing, isOrbiting, onToggleOrbit, time, onTimeChange, theme, onToggleTheme,
  showModels, onToggleModels, interactionMode, setInteractionMode, probedBuilding, measurementPoints
}: ControlPanelProps) => {
  const [searchInput, setSearchInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isHUDMinimized, setIsHUDMinimized] = useState(false);
  const { playChirp } = useTerminalSounds();

  const handleSearchSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    playChirp("select");
    setIsSearching(true);
    await onCitySearch(searchInput);
    setIsSearching(false);
    setSearchInput("");
  }, [searchInput, onCitySearch, playChirp]);

  const handleAnalyzeClick = useCallback(async () => {
    if (cooldown > 0) return;
    playChirp("select");
    await onAnalyze();
    setCooldown(COOLDOWN_DURATION);
    const interval = setInterval(() => {
      setCooldown((p) => { if (p <= 1) { clearInterval(interval); return 0; } return p - 1; });
    }, 1000);
  }, [cooldown, onAnalyze, playChirp]);

  const aqiInfo = aqi ? AQI_LEVELS[aqi.aqi] : AQI_LEVELS[0];

  return (
    <div className={cn(
      "hud-panel cyber-grid fixed top-0 left-0 h-full z-50 flex flex-col transition-all duration-700 ease-[cubic-bezier(0.85,0,0.15,1)]",
      isHUDMinimized ? "-translate-x-[calc(100%-3rem)] w-[26rem]" : "translate-x-0 w-full md:w-[26rem]"
    )}>
      <button
        onClick={() => { playChirp("select"); setIsHUDMinimized(!isHUDMinimized); }}
        className="absolute -right-10 top-1/2 -translate-y-1/2 h-40 w-10 bg-zinc-950/90 backdrop-blur-3xl border border-l-0 border-cyan-500/20 rounded-r-2xl flex flex-col items-center justify-center gap-4 group hover:bg-black transition-all z-[60]"
      >
        <div className={cn("transition-transform duration-700", isHUDMinimized ? "" : "rotate-180")}>
          <ChevronRight className="h-5 w-5 text-cyan-500 group-hover:scale-125 transition-transform" />
        </div>
        <span className="text-[8px] font-black uppercase text-cyan-500/40 [writing-mode:vertical-lr] tracking-[0.3em] group-hover:text-cyan-400 transition-colors">Terminal_Control</span>
      </button>

      <div className="p-6 border-b border-white/5 relative overflow-hidden bg-black/20 shrink-0">
        <div className="scanning-line opacity-30" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 hud-glow"><Globe className="h-6 w-6 text-cyan-400" /></div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[9px] font-black tracking-[0.3em] text-emerald-400/80 uppercase">Node_Active [v4.5.AUD]</span>
            </div>
            <h1 className="text-2xl font-black tracking-[0.2em] text-white italic">URBAN<span className="text-cyan-500">TWIN</span></h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-none">
        {/* Navigation */}
        <section className="transition-all duration-500 ease-in-out transform">
          <label className={HUD_SECTION_LABEL}><MapPin className="h-3 w-3" /> Navigation_System</label>
          <div className="space-y-3">
             <div className="corner-notch p-4 bg-white/[0.03] border border-white/5 flex items-center justify-between group" onMouseEnter={() => playChirp("hover")}>
                <div className="flex flex-col"><span className={HUD_METRIC_LABEL}>Active Sector</span><span className="text-sm font-black text-white terminal-text uppercase">{selectedCityName}</span></div>
                <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
             </div>
             <form onSubmit={handleSearchSubmit} className="relative">
                <Input placeholder="Target Coordinates..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="bg-black/40 border-white/10 h-12 pl-10 pr-4 rounded-xl text-[10px] focus:border-cyan-500/50 font-mono text-cyan-400" />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-cyan-500 animate-spin" />}
             </form>
          </div>
        </section>

        {/* Telemetry */}
        <section className="transition-all duration-500 delay-75">
          <label className={HUD_SECTION_LABEL}><Workflow className="h-3 w-3" /> Atmo_Telemetry</label>
          {isLoading ? <div className="py-8 flex flex-col items-center opacity-50"><Loader2 className="h-6 w-6 animate-spin text-cyan-500 mb-3" /><span className="text-[8px] font-black uppercase text-cyan-500/60">Syncing...</span></div> : weather ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="corner-notch bg-white/[0.03] border border-white/10 p-5 flex flex-col" onMouseEnter={() => playChirp("hover")}>
                  <div className="flex items-baseline gap-1"><span className="text-4xl font-black text-white terminal-text tabular-nums">{Math.round(weather.temp)}</span><span className="text-lg font-black text-cyan-500/40">°C</span></div>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-cyan-400/60 mt-2">{weather.description}</span>
                </div>
                <div className={cn("corner-notch border p-5 flex flex-col transition-all", aqiInfo.bg, aqiInfo.border)} onMouseEnter={() => playChirp("hover")}>
                  <div className="flex items-center gap-2 mb-1"><AlertTriangle className={cn("h-3 w-3", aqiInfo.color)} /><span className={cn("text-[10px] font-black font-mono", aqiInfo.color)}>AQI: {aqi?.aqi || '---'}</span></div>
                  <span className={cn("text-[8px] font-black uppercase tracking-widest", aqiInfo.color)}>{aqiInfo.label}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <HUDMetric id="HUM" icon={Droplets} label="Humid" value={weather.humidity} unit="%" color="text-blue-400" onHover={() => playChirp("hover")} />
                <HUDMetric id="WND" icon={Wind} label="Wind" value={Math.round(weather.windSpeed)} unit="m/s" color="text-emerald-400" onHover={() => playChirp("hover")} />
                <HUDMetric id="PM2" icon={Layers} label="PM2.5" value={Math.round(aqi?.pm2_5 || 0)} unit="µg" color="text-purple-400" onHover={() => playChirp("hover")} />
              </div>
            </div>
          ) : <div className="p-8 text-center bg-white/[0.01] border border-dashed border-white/5 corner-notch"><Radio className="h-8 w-8 text-slate-800 mx-auto mb-3 animate-pulse" /><span className="text-[8px] font-black uppercase text-slate-700">Datalink Required</span></div>}
        </section>

        {/* Tools */}
        <section className="transition-all duration-500 delay-100">
          <label className={HUD_SECTION_LABEL}><MousePointer2 className="h-3 w-3" /> Interactive_Tools [Mode: {interactionMode.toUpperCase()}]</label>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { playChirp("select"); setInteractionMode(interactionMode === 'probe' ? 'none' : 'probe'); }} className={cn("h-14 corner-notch border flex flex-col items-center justify-center transition-all", interactionMode === 'probe' ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400" : "bg-white/[0.03] border-white/5 text-slate-500")}>
              <MousePointer2 className="h-4 w-4 mb-1" /><span className="text-[8px] font-black uppercase tracking-widest">Sector Probe</span>
            </button>
            <button onClick={() => { playChirp("select"); setInteractionMode(interactionMode === 'ruler' ? 'none' : 'ruler'); }} className={cn("h-14 corner-notch border flex flex-col items-center justify-center transition-all", interactionMode === 'ruler' ? "bg-purple-500/20 border-purple-500/40 text-purple-400" : "bg-white/[0.03] border-white/5 text-slate-500")}>
              <Ruler className="h-4 w-4 mb-1" /><span className="text-[8px] font-black uppercase tracking-widest">3D Ruler</span>
            </button>
          </div>
          {(probedBuilding || measurementPoints.length > 0) && (
            <div className="mt-4 corner-notch bg-indigo-500/5 border border-indigo-500/20 p-4 space-y-3 animate-vertical-shutter">
              {interactionMode === 'probe' && probedBuilding && (
                <>
                  <div className="flex items-center justify-between"><span className="text-[9px] font-black text-indigo-400 uppercase">Structural Analysis</span><span className="text-[8px] font-mono text-slate-600">ID: {probedBuilding.id}</span></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-[7px] text-slate-500 uppercase block">Elevation</span><span className="text-xs font-black text-white font-mono">{probedBuilding.height}m</span></div>
                    <div><span className="text-[7px] text-slate-500 uppercase block">Usage</span><span className="text-xs font-black text-white font-mono">{probedBuilding.type}</span></div>
                  </div>
                </>
              )}
              {interactionMode === 'ruler' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between"><span className="text-[9px] font-black text-purple-400 uppercase">Spatial Vector</span><span className={cn("text-[8px] font-mono", measurementPoints.length >= 2 ? "text-emerald-400" : "text-amber-400")}>{measurementPoints.length >= 2 ? "LINKED" : "AWAITING"}</span></div>
                  <div className="text-2xl font-black text-white font-mono flex items-baseline gap-2">{measurementPoints.length >= 2 ? <>{measurementPoints[2] || '0.00'}<span className="text-xs text-slate-500 uppercase">Meters</span></> : <span className="text-sm italic opacity-50">Select points</span>}</div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* AI & Controls */}
        <section className="space-y-8">
           <div>
            <label className={HUD_SECTION_LABEL}><Cpu className="h-3 w-3" /> Engine_Intelligence</label>
            {!analysis ? <Button onClick={handleAnalyzeClick} disabled={isAnalyzing || cooldown > 0 || !weather} className={cn("w-full h-14 corner-notch font-black tracking-[0.3em] uppercase transition-all duration-500", isAnalyzing ? "bg-slate-900 text-slate-600" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20")}>{isAnalyzing ? "Processing..." : "Run Analysis"}</Button> : (
              <div className="corner-notch bg-white/[0.03] border border-white/10 p-5 space-y-4 animate-vertical-shutter">
                <div className="flex items-center justify-between opacity-40"><div className="flex items-center gap-2"><Database className="h-3 w-3 text-indigo-400" /><span className="text-[8px] font-black uppercase text-indigo-300">Memory Cluster [A-7]</span></div></div>
                <div className="font-mono text-[10px] leading-relaxed text-slate-400 border-l border-indigo-500/20 pl-4">{analysis}</div>
                <button onClick={() => { playChirp("select"); handleAnalyzeClick(); }} className="text-[7px] font-black uppercase text-slate-600 hover:text-white transition-colors">Re-Initialize</button>
              </div>
            )}
           </div>

           <div>
            <label className={HUD_SECTION_LABEL}><Cpu className="h-3 w-3" /> System_Controls</label>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => { playChirp("select"); onToggleOrbit(); }} className={cn("h-12 corner-notch border flex flex-col items-center justify-center transition-all", isOrbiting ? "bg-amber-500/20 border-amber-500/40 text-amber-400" : "bg-white/[0.03] border-white/5 text-slate-500")}><Camera className={cn("h-3.5 w-3.5 mb-1", isOrbiting && "animate-spin-slow")} /><span className="text-[6px] font-black uppercase tracking-widest">Orbit</span></button>
              <button onClick={() => { playChirp("select"); onToggleTheme(); }} className="h-12 corner-notch border border-white/5 bg-white/[0.03] flex flex-col items-center justify-center text-slate-500 hover:text-white transition-all">{theme === 'dark' ? <Moon className="h-3.5 w-3.5 mb-1" /> : <Sun className="h-3.5 w-3.5 mb-1 text-yellow-500" />}<span className="text-[6px] font-black uppercase tracking-widest">{theme.toUpperCase()}</span></button>
              <button onClick={() => { playChirp("select"); onToggleModels(); }} className={cn("h-12 corner-notch border flex flex-col items-center justify-center transition-all", showModels ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-white/[0.03] border-white/5 text-slate-500")}><BarChart3 className="h-3.5 w-3.5 mb-1" /><span className="text-[6px] font-black uppercase tracking-widest">3D Data</span></button>
            </div>
           </div>
        </section>

        {/* Temporal */}
        <section className="pb-6">
           <label className={HUD_SECTION_LABEL}><Zap className="h-3 w-3" /> Chronos_Temporal_Shift</label>
           <div className="corner-notch bg-black/40 border border-white/5 p-5 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center"><Sun className="h-5 w-5 text-cyan-400" /></div><div className="flex flex-col"><span className={HUD_METRIC_LABEL}>Local Sync</span><span className="text-xs font-black text-white italic tracking-wider terminal-text">SOLAR_DRIFT</span></div></div>
                <div className="text-right"><span className="text-[8px] font-bold text-slate-600 tracking-widest block mb-1">REALTIME_VAL</span><span className="text-2xl font-black font-mono text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">{formatTime(time)}</span></div>
              </div>
              <Slider value={[time]} max={24} step={0.1} onValueChange={(v) => onTimeChange(v[0])} onPointerUp={() => playChirp("hover")} />
           </div>
        </section>
      </div>

      <div className="p-5 bg-black/60 border-t border-cyan-500/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.05)]">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
          <span className="text-[7px] font-black text-emerald-500/80 tracking-[0.4em] uppercase">LINK Stable</span>
        </div>
        <span className="text-[7px] font-black text-slate-700 uppercase font-mono tracking-widest">AURORA_CORE_v4.5.AUD</span>
      </div>
    </div>
  );
};

export default memo(ControlPanel);