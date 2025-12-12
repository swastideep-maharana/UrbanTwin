"use client";

import React from "react";
// Import the UI components Shadcn installed for us
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Define the props this component sends back to the parent
interface ControlPanelProps {
  onSelectCity: (city: string) => void;
}

const ControlPanel = ({ onSelectCity }: ControlPanelProps) => {
  return (
    <div className="absolute top-4 left-4 z-10 w-64">
      {/* "absolute top-4 left-4 z-10" -> Tailwind classes to float this 
         on top of the map (z-index 10) in the top-left corner.
      */}
      <Card className="bg-black/80 border-slate-800 text-slate-100 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-lg font-bold">UrbanTwin Control</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button 
            variant="secondary" 
            onClick={() => onSelectCity("NYC")}
            className="w-full justify-start hover:bg-slate-700"
          >
            🗽 New York City
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => onSelectCity("London")}
            className="w-full justify-start hover:bg-slate-700"
          >
            💂 London
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => onSelectCity("Tokyo")}
            className="w-full justify-start hover:bg-slate-700"
          >
            🗼 Tokyo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ControlPanel;