"use client";

import { useState } from "react";
import Map from "@/components/Maps";
import ControlPanel from "@/components/ControlPanel";

// Our data source (Hardcoded for now, could be from a DB later)
const CITIES = {
  NYC: { longitude: -74.006, latitude: 40.7128, zoom: 15.5 },
  London: { longitude: -0.1276, latitude: 51.5072, zoom: 15.5 },
  Tokyo: { longitude: 139.6917, latitude: 35.6895, zoom: 15.5 },
};

export default function Home() {
  // State: Tracks the current view
  const [viewState, setViewState] = useState(CITIES.NYC);

  // Handler: Updates the state when a button is clicked
  const handleSelectCity = (cityKey: string) => {
    const city = CITIES[cityKey as keyof typeof CITIES];
    if (city) {
      setViewState(city);
    }
  };

  return (
    <main className="relative min-h-screen w-full">
      {/* 1. The Control Panel (Floats on top) */}
      <ControlPanel onSelectCity={handleSelectCity} />

      {/* 2. The Map (Receives the state) */}
      <Map viewState={viewState} />
    </main>
  );
}