"use client";

import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// Define the shape of our props
interface MapProps {
  viewState: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  isOrbiting: boolean; // NEW PROP: Are we flying?
}

const Map = ({ viewState, isOrbiting }: MapProps) => { // Receive props here
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const requestRef = useRef<number | null>(null); // To track the animation frame ID

  // 1. Initialize Map (Runs once)
  useEffect(() => {
    if (mapRef.current) return;
    if (mapContainerRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [viewState.longitude, viewState.latitude], // Use prop
        zoom: viewState.zoom, // Use prop
        pitch: 55,
        bearing: -17.6,
        antialias: true,
        interactive: true // Allow user to stop orbit by grabbing map
      });

      mapRef.current.on('load', () => {
        if (!mapRef.current) return;
        mapRef.current.addLayer({
          'id': '3d-buildings',
          'source': 'composite',
          'source-layer': 'building',
          'filter': ['==', 'extrude', 'true'],
          'type': 'fill-extrusion',
          'minzoom': 15,
          'paint': {
            'fill-extrusion-color': '#2a2a2a',
            'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']],
            'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'min_height']],
            'fill-extrusion-opacity': 0.8
          }
        });
        
        // Add sky atmosphere
        mapRef.current.setFog({
            'range': [0.5, 10],
            'color': '#242b4b',
            'high-color': '#161b33',
            'space-color': '#0b0e1f'
        });
      });
    }
    return () => { mapRef.current?.remove(); };
  }, []); // Empty dependency array = runs once on mount

  // 2. React to Changes (Runs whenever viewState changes)
  useEffect(() => {
    if (!mapRef.current) return;
    
    // The "Fly" animation
    mapRef.current.flyTo({
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
      essential: true, // Animation will happen even if user prefers reduced motion
      duration: 3000 // 3 seconds flight time
    });
  }, [viewState]); // Dependency: run this when viewState changes

  // 3. THE ORBIT LOGIC (New)
  useEffect(() => {
    if (!mapRef.current) return;

    const rotateCamera = (timestamp: number) => {
      if (!mapRef.current) return;
      
      // Rotate around the center by increasing bearing by 0.1 degree per frame
      mapRef.current.rotateTo((mapRef.current.getBearing() + 0.1) % 360, {
        duration: 0, // 0 duration means "instant" (for smooth animation frame)
        easing: (t) => t // Linear easing
      });
      
      // Request the next frame recursively
      requestRef.current = requestAnimationFrame(rotateCamera);
    };

    if (isOrbiting) {
      // Start the loop
      requestRef.current = requestAnimationFrame(rotateCamera);
    } else {
      // Stop the loop
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    }

    // Cleanup when component unmounts or isOrbiting changes
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isOrbiting]);

  return <div ref={mapContainerRef} className="w-full h-screen" />;
};

export default Map;