"use client";

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// Performance detection
const detectPerformanceLevel = (): 'high' | 'medium' | 'low' => {
  if (typeof window === 'undefined') return 'medium';
  
  const memory = (performance as any).memory;
  const cores = navigator.hardwareConcurrency || 2;
  
  // High-end: 8+ cores or 8GB+ RAM
  if (cores >= 8 || (memory && memory.jsHeapSizeLimit > 8000000000)) {
    return 'high';
  }
  
  // Low-end: 2 cores or <4GB RAM
  if (cores <= 2 || (memory && memory.jsHeapSizeLimit < 4000000000)) {
    return 'low';
  }
  
  return 'medium';
};

// Performance-based configuration
const getMapConfig = (performanceLevel: 'high' | 'medium' | 'low') => {
  const baseConfig = {
    STYLE: 'mapbox://styles/mapbox/navigation-night-v1',
    PITCH: 60,
    BEARING: -17.6,
    FLY_DURATION: 3000,
  };

  switch (performanceLevel) {
    case 'high':
      return {
        ...baseConfig,
        TERRAIN_EXAGGERATION: 1.5,
        ORBIT_SPEED: 0.1,
        ENABLE_TERRAIN: true,
        ENABLE_TRAFFIC: true,
        ENABLE_FOG: true,
        ENABLE_SKY: true,
        BUILDING_OPACITY: 0.8,
        ANTIALIAS: true,
      };
    case 'medium':
      return {
        ...baseConfig,
        TERRAIN_EXAGGERATION: 1.2,
        ORBIT_SPEED: 0.08,
        ENABLE_TERRAIN: true,
        ENABLE_TRAFFIC: true,
        ENABLE_FOG: false, // Disable fog for better performance
        ENABLE_SKY: false,
        BUILDING_OPACITY: 0.7,
        ANTIALIAS: true,
      };
    case 'low':
      return {
        ...baseConfig,
        PITCH: 45, // Lower pitch for less 3D rendering
        TERRAIN_EXAGGERATION: 0, // Disable terrain
        ORBIT_SPEED: 0.05, // Slower orbit
        ENABLE_TERRAIN: false,
        ENABLE_TRAFFIC: false, // Disable traffic layer
        ENABLE_FOG: false,
        ENABLE_SKY: false,
        BUILDING_OPACITY: 0.6,
        ANTIALIAS: false, // Disable antialiasing
      };
  }
};

const COLORS = {
  BUILDING: '#2a2a2a',
  TRAFFIC: {
    LOW: '#059669',
    MODERATE: '#d97706',
    HEAVY: '#dc2626',
    SEVERE: '#7f1d1d',
    FALLBACK: '#ffffff',
  },
  SKY: '#0b0e1f',
  FOG: {
    COLOR: '#242b4b',
    HIGH: '#161b33',
    SPACE: '#0b0e1f',
  },
} as const;

interface MapProps {
  viewState: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  isOrbiting: boolean;
  time: number; // 0-24 hours for solar simulation
}

const Map = ({ viewState, isOrbiting, time }: MapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const requestRef = useRef<number | null>(null);
  const [performanceLevel] = useState(() => detectPerformanceLevel());
  const config = getMapConfig(performanceLevel);

  // Initialize map
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: config.STYLE,
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
      pitch: config.PITCH,
      bearing: config.BEARING,
      antialias: config.ANTIALIAS,
      interactive: true,
      // Performance optimizations
      preserveDrawingBuffer: false,
      refreshExpiredTiles: false,
      maxTileCacheSize: performanceLevel === 'low' ? 50 : 100,
    });

    mapRef.current.on('load', () => {
      if (!mapRef.current) return;

      // Add 3D buildings (always enabled but with varying opacity)
      if (!mapRef.current.getLayer('3d-buildings')) {
        mapRef.current.addLayer({
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 15,
          paint: {
            'fill-extrusion-color': COLORS.BUILDING,
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15, 0,
              15.05, ['get', 'height']
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15, 0,
              15.05, ['get', 'min_height']
            ],
            'fill-extrusion-opacity': config.BUILDING_OPACITY,
          },
        });
      }

      // Add fog (only on high/medium performance)
      if (config.ENABLE_FOG) {
        mapRef.current.setFog({
          range: [0.5, 10],
          color: COLORS.FOG.COLOR,
          'high-color': COLORS.FOG.HIGH,
          'space-color': COLORS.FOG.SPACE,
        });
      }

      // Add traffic (only on high/medium performance)
      if (config.ENABLE_TRAFFIC) {
        if (!mapRef.current.getSource('mapbox-traffic')) {
          mapRef.current.addSource('mapbox-traffic', {
            type: 'vector',
            url: 'mapbox://mapbox.mapbox-traffic-v1',
          });
        }

        if (!mapRef.current.getLayer('traffic-flow')) {
          mapRef.current.addLayer({
            id: 'traffic-flow',
            type: 'line',
            source: 'mapbox-traffic',
            'source-layer': 'traffic',
            paint: {
              'line-width': 2,
              'line-color': [
                'match',
                ['get', 'congestion'],
                'low', COLORS.TRAFFIC.LOW,
                'moderate', COLORS.TRAFFIC.MODERATE,
                'heavy', COLORS.TRAFFIC.HEAVY,
                'severe', COLORS.TRAFFIC.SEVERE,
                COLORS.TRAFFIC.FALLBACK,
              ],
              'line-opacity': 0.8,
            },
          });
        }
      }

      // Add terrain (only on high/medium performance)
      if (config.ENABLE_TERRAIN && config.TERRAIN_EXAGGERATION > 0) {
        if (!mapRef.current.getSource('mapbox-dem')) {
          mapRef.current.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14,
          });
        }

        mapRef.current.setTerrain({
          source: 'mapbox-dem',
          exaggeration: config.TERRAIN_EXAGGERATION,
        });
      }

      // Add atmospheric sky (only on high performance)
      if (config.ENABLE_SKY) {
        if (!mapRef.current.getLayer('sky')) {
          mapRef.current.addLayer({
            id: 'sky',
            type: 'sky',
            paint: {
              'sky-type': 'atmosphere',
              'sky-atmosphere-sun': [0.0, 0.0],
              'sky-atmosphere-sun-intensity': 15,
              'sky-atmosphere-color': COLORS.SKY,
              'sky-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 1,
                5, 1,
                22, 0,
              ],
            },
          });
        }
      }

      // Log performance level for debugging
      console.log(`🎮 Performance Level: ${performanceLevel.toUpperCase()}`);
      console.log(`⚙️ Terrain: ${config.ENABLE_TERRAIN ? 'ON' : 'OFF'}`);
      console.log(`🚦 Traffic: ${config.ENABLE_TRAFFIC ? 'ON' : 'OFF'}`);
      console.log(`🌫️ Fog: ${config.ENABLE_FOG ? 'ON' : 'OFF'}`);
      console.log(`🌌 Sky: ${config.ENABLE_SKY ? 'ON' : 'OFF'}`);
    });

    return () => {
      mapRef.current?.remove();
    };
  }, []);

  // Handle view state changes
  useEffect(() => {
    if (!mapRef.current) return;

    mapRef.current.flyTo({
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
      essential: true,
      duration: config.FLY_DURATION,
    });
  }, [viewState, config.FLY_DURATION]);

  // Handle orbit animation with performance throttling
  useEffect(() => {
    if (!mapRef.current) return;

    let frameCount = 0;
    const skipFrames = performanceLevel === 'low' ? 2 : 0; // Skip every 2nd frame on low-end

    const rotateCamera = () => {
      if (!mapRef.current) return;

      frameCount++;
      
      // Skip frames on low-end devices
      if (frameCount % (skipFrames + 1) === 0) {
        const currentBearing = mapRef.current.getBearing();
        mapRef.current.rotateTo((currentBearing + config.ORBIT_SPEED) % 360, {
          duration: 0,
          easing: (t) => t,
        });
      }

      requestRef.current = requestAnimationFrame(rotateCamera);
    };

    if (isOrbiting) {
      requestRef.current = requestAnimationFrame(rotateCamera);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isOrbiting, config.ORBIT_SPEED, performanceLevel]);

  // Solar simulation - Update sun position based on time
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;
    if (!config.ENABLE_SKY) return; // Skip if sky is disabled for performance

    // Calculate sun position based on time (0-24)
    // Azimuth: Angle around horizon (0=North, 90=East, 180=South, 270=West)
    // Time 6am = East (90°), Noon = South (180°), 6pm = West (270°)
    const azimuth = 180 + (time - 12) * 15;

    // Polar: Angle from zenith (0=directly above, 90=horizon)
    // Noon = low angle (sun high), Sunrise/Sunset = high angle (sun at horizon)
    const polar = 90 - Math.sin((time - 6) * Math.PI / 12) * 80;
    const safePolar = Math.max(5, Math.min(85, polar));

    // Calculate sun intensity (bright at noon, dark at night)
    const intensity = Math.max(0, Math.sin((time - 6) * Math.PI / 12) * 30);

    // Update sky layer if it exists
    if (mapRef.current.getLayer('sky')) {
      mapRef.current.setPaintProperty('sky', 'sky-atmosphere-sun', [azimuth, safePolar]);
      mapRef.current.setPaintProperty('sky', 'sky-atmosphere-sun-intensity', intensity);

      // Change sky color based on time of day
      let skyColor: string = COLORS.SKY; // Default night color
      
      if (time >= 5 && time < 7) {
        // Dawn - orange/pink
        skyColor = '#ff6b35';
      } else if (time >= 7 && time < 17) {
        // Day - light blue
        skyColor = '#87ceeb';
      } else if (time >= 17 && time < 19) {
        // Dusk - purple/orange
        skyColor = '#ff6b9d';
      }
      
      mapRef.current.setPaintProperty('sky', 'sky-atmosphere-color', skyColor);
    }

    // Update fog based on time (denser at dawn/dusk)
    if (config.ENABLE_FOG && mapRef.current.getFog()) {
      const fogDensity = 1 - Math.abs(time - 12) / 12; // Denser away from noon
      mapRef.current.setFog({
        range: [0.5, 10],
        color: time >= 6 && time <= 18 ? '#e0e7ff' : COLORS.FOG.COLOR,
        'high-color': time >= 6 && time <= 18 ? '#c7d2fe' : COLORS.FOG.HIGH,
        'space-color': COLORS.FOG.SPACE,
      });
    }
  }, [time, config.ENABLE_SKY, config.ENABLE_FOG]);

  return (
    <>
      <div ref={mapContainerRef} className="w-full h-screen" />
      {/* Performance indicator */}
      <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-slate-400 border border-slate-700">
        {performanceLevel === 'high' && '🚀 High Performance'}
        {performanceLevel === 'medium' && '⚡ Medium Performance'}
        {performanceLevel === 'low' && '🐢 Optimized Mode'}
      </div>
    </>
  );
};

export default Map;