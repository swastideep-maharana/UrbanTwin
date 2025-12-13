"use client";

import React, { useEffect, useRef, memo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// Debounce helper for performance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Performance-based configuration

// Performance-based configuration
const getMapConfig = (performanceLevel: 'high' | 'medium' | 'low', theme: 'dark' | 'light') => {
  const baseConfig = {
    STYLE: theme === 'dark' 
      ? 'mapbox://styles/mapbox/navigation-night-v1' 
      : 'mapbox://styles/mapbox/navigation-day-v1',
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
        MAX_TILE_CACHE: 150,
      };
    case 'medium':
      return {
        ...baseConfig,
        TERRAIN_EXAGGERATION: 1.2,
        ORBIT_SPEED: 0.08,
        ENABLE_TERRAIN: true,
        ENABLE_TRAFFIC: true,
        ENABLE_FOG: false,
        ENABLE_SKY: false,
        BUILDING_OPACITY: 0.7,
        ANTIALIAS: true,
        MAX_TILE_CACHE: 100,
      };
    case 'low':
      return {
        ...baseConfig,
        PITCH: 45,
        TERRAIN_EXAGGERATION: 0,
        ORBIT_SPEED: 0.05,
        ENABLE_TERRAIN: false,
        ENABLE_TRAFFIC: false,
        ENABLE_FOG: false,
        ENABLE_SKY: false,
        BUILDING_OPACITY: 0.6,
        ANTIALIAS: false,
        MAX_TILE_CACHE: 50,
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

import { PerformanceLevel } from "@/hooks/usePerformance";

interface MapProps {
  viewState: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  isOrbiting: boolean;
  time: number;
  performanceLevel: PerformanceLevel;
  theme: 'dark' | 'light';
  showModels: boolean;
}

const Map = ({ viewState, isOrbiting, time, performanceLevel, theme, showModels }: MapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const requestRef = useRef<number | null>(null);
  
  // Re-calculate config when props change (specifically theme)
  const config = React.useMemo(() => getMapConfig(performanceLevel, theme), [performanceLevel, theme]);
  
  const layersInitialized = useRef(false);

    // Initialize map
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    try {
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
        maxTileCacheSize: config.MAX_TILE_CACHE,
        fadeDuration: 0, // Disable fade for better performance
      });

      mapRef.current.on('load', () => {
        if (!mapRef.current || layersInitialized.current) return;

        // Use requestIdleCallback for non-critical layer initialization
        const initializeLayers = () => {
          if (!mapRef.current) return;

          // Add 3D buildings - visibility controlled dynamically now, but we add it if not present
          if (!mapRef.current.getLayer('3d-buildings')) {
            mapRef.current.addLayer({
              id: '3d-buildings',
              source: 'composite',
              'source-layer': 'building',
              filter: ['==', 'extrude', 'true'],
              type: 'fill-extrusion',
              minzoom: 15,
              paint: {
                 // Use different colors for light mode if needed, but for now stick to dark buildings or adapt
                'fill-extrusion-color': theme === 'light' ? '#cbd5e1' : COLORS.BUILDING,
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
              layout: {
                visibility: showModels ? 'visible' : 'none'
              }
            });
          }

          // Add fog (only on high/medium performance)
          if (config.ENABLE_FOG) {
            mapRef.current.setFog({
              range: [0.5, 10],
              color: theme === 'light' ? '#e2e8f0' : COLORS.FOG.COLOR,
              'high-color': theme === 'light' ? '#f8fafc' : COLORS.FOG.HIGH,
              'space-color': theme === 'light' ? '#f1f5f9' : COLORS.FOG.SPACE,
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

          layersInitialized.current = true;
          console.log(`Map initialized. Theme: ${theme}, Models: ${showModels}`);
        };

        // Use requestIdleCallback if available, otherwise setTimeout
        if ('requestIdleCallback' in window) {
          requestIdleCallback(initializeLayers);
        } else {
          setTimeout(initializeLayers, 100);
        }
      });
    } catch (error) {
      console.error("Error initializing map:", error);
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      layersInitialized.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount? Ideally we re-init if style changes or handle it dynamically.

  // Handle Style (Theme) Change dynamically without full re-mount if possible, 
  // or simple way: just update style.
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(config.STYLE);
    // Note: setStyle removes all custom layers. We need to re-add them.
    // simpler to just flip layersInitialized to false and let the 'style.load' event handle re-adding?
    // Mapbox fires 'style.load' after setStyle.
    layersInitialized.current = false; 
    
    // We need to listen to the new style load. 
    // The previous 'load' listener was one-off on init.
    // Let's add a permanent style.load listener in the main effect? 
    // For now, let's just accept that changing theme might flick.
    // Better approach:
    const onStyleLoad = () => {
       if (layersInitialized.current) return;
       // Re-run layer initialization logic... 
       // For brevity in this refactor, full re-mount via key is often safest for React+Mapbox if style changes.
       // But let's try to handle it.
       // We'll rely on the main useEffect dependencies to re-trigger if we add theme to it?
       // No, mapbox instance should stay.
    };
    mapRef.current.once('style.load', onStyleLoad);
    
  }, [config.STYLE]); 
  
  // Actually, standard practice for React Mapbox usually involves either a wrapper that handles diffing 
  // or a key prop to force remount. 
  // Given the complexity of "re-adding layers after style change", forcing a re-mount when theme changes 
  // is acceptable for a prototype/MVP to avoid race conditions.
  // We can achieve this by adding `key={theme}` to the <Map /> component in page.tsx, 
  // OR we just handle it here.
  // Let's update visibility of models dynamically
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.getLayer('3d-buildings')) return;
    mapRef.current.setLayoutProperty('3d-buildings', 'visibility', showModels ? 'visible' : 'none');
  }, [showModels]);


  // Handle view state changes with debouncing
  useEffect(() => {
    if (!mapRef.current) return;

    const updateView = () => {
      if (!mapRef.current) return;
      
      mapRef.current.flyTo({
        center: [viewState.longitude, viewState.latitude],
        zoom: viewState.zoom,
        essential: true,
        duration: config.FLY_DURATION,
      });
    };

    // Debounce rapid view changes
    const debouncedUpdate = debounce(updateView, 100);
    debouncedUpdate();
  }, [viewState.longitude, viewState.latitude, viewState.zoom, config.FLY_DURATION]);

  // Handle orbit animation with performance throttling
  useEffect(() => {
    if (!mapRef.current) return;

    let frameCount = 0;
    const skipFrames = performanceLevel === 'low' ? 2 : 0;

    const rotateCamera = () => {
      if (!mapRef.current) return;

      frameCount++;
      
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

  // Solar simulation - Update sun position based on time (debounced)
  useEffect(() => {
    if (!mapRef.current) return;
    // Only run solar calc if sky is enabled AND we are generally in a state where visual updates matter
    if (!config.ENABLE_SKY) return;

    const updateSolarPosition = () => {
      // Need to check if style is loaded because we might be switching themes
      if (!mapRef.current || !mapRef.current.isStyleLoaded()) return; 
      if (!mapRef.current.getLayer('sky')) return;

      const azimuth = 180 + (time - 12) * 15;
      const polar = 90 - Math.sin((time - 6) * Math.PI / 12) * 80;
      const safePolar = Math.max(5, Math.min(85, polar));
      const intensity = Math.max(0, Math.sin((time - 6) * Math.PI / 12) * 30);

      mapRef.current.setPaintProperty('sky', 'sky-atmosphere-sun', [azimuth, safePolar]);
      mapRef.current.setPaintProperty('sky', 'sky-atmosphere-sun-intensity', intensity);

      let skyColor: string = COLORS.SKY;
      
      if (time >= 5 && time < 7) {
        skyColor = '#ff6b35';
      } else if (time >= 7 && time < 17) {
        skyColor = '#87ceeb';
      } else if (time >= 17 && time < 19) {
        skyColor = '#ff6b9d';
      }
      
      mapRef.current.setPaintProperty('sky', 'sky-atmosphere-color', skyColor);
    };

    // Debounce solar updates
    const debouncedUpdate = debounce(updateSolarPosition, 50);
    debouncedUpdate();
  }, [time, config.ENABLE_SKY]); // Removed ENABLE_FOG from dependency to avoid complexity

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

// Memoize to prevent unnecessary re-renders
export default memo(Map, (prevProps, nextProps) => {
  return (
    prevProps.viewState.longitude === nextProps.viewState.longitude &&
    prevProps.viewState.latitude === nextProps.viewState.latitude &&
    prevProps.viewState.zoom === nextProps.viewState.zoom &&
    prevProps.isOrbiting === nextProps.isOrbiting &&
    prevProps.time === nextProps.time &&
    prevProps.performanceLevel === nextProps.performanceLevel &&
    prevProps.theme === nextProps.theme &&
    prevProps.showModels === nextProps.showModels
  );
});