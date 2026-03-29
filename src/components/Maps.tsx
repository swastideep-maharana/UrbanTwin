"use client";

import React, { useEffect, useRef, memo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// Distance calc (Haversine)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

const getFogConfig = (aqi: number, theme: 'dark' | 'light'): mapboxgl.FogSpecification => {
  const intensity = Math.min(1, Math.max(0, (aqi - 1) / 4));
  return {
    range: [0.4, 10 - (intensity * 7)] as [number, number],
    color: theme === 'light' ? '#e2e8f0' : (intensity > 0.5 ? '#1e293b' : '#0f172a'),
    'high-color': theme === 'light' ? '#cbd5e1' : '#1e1bc3',
    'space-color': theme === 'light' ? '#f1f5f9' : '#020617',
    'horizon-blend': 0.05 + (intensity * 0.15)
  };
};

interface MapConfiguration {
  STYLE: string;
  PITCH: number;
  BEARING: number;
  ORBIT_SPEED: number;
  ENABLE_TRAFFIC: boolean;
  ENABLE_FOG: boolean;
  BUILDING_OPACITY: number;
}

const getMapConfig = (performanceLevel: 'high' | 'medium' | 'low', theme: 'dark' | 'light'): MapConfiguration => {
  const baseConfig = {
    STYLE: theme === 'dark' ? 'mapbox://styles/mapbox/navigation-night-v1' : 'mapbox://styles/mapbox/navigation-day-v1',
    PITCH: 60,
    BEARING: -17.6,
  };
  switch (performanceLevel) {
    case 'high': return { ...baseConfig, ORBIT_SPEED: 0.1, ENABLE_TRAFFIC: true, ENABLE_FOG: true, BUILDING_OPACITY: 0.8 };
    case 'medium': return { ...baseConfig, ORBIT_SPEED: 0.08, ENABLE_TRAFFIC: true, ENABLE_FOG: true, BUILDING_OPACITY: 0.7 };
    case 'low': return { ...baseConfig, ORBIT_SPEED: 0, ENABLE_TRAFFIC: false, ENABLE_FOG: false, BUILDING_OPACITY: 0.6 };
    default: return { ...baseConfig, ORBIT_SPEED: 0.08, ENABLE_TRAFFIC: true, ENABLE_FOG: true, BUILDING_OPACITY: 0.7 };
  }
};

interface MapProps {
  viewState: { longitude: number; latitude: number; zoom: number };
  isOrbiting: boolean;
  time: number;
  performanceLevel: 'high' | 'medium' | 'low';
  theme: 'dark' | 'light';
  showModels: boolean;
  interactionMode: 'none' | 'probe' | 'ruler';
  onBuildingSelect: (building: any) => void;
  onMeasureUpdate: (points: any[]) => void;
  aqiValue: number;
}

const Map = ({ 
  viewState, isOrbiting, time, performanceLevel, theme, showModels,
  interactionMode, onBuildingSelect, onMeasureUpdate, aqiValue
}: MapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const requestRef = useRef<number | null>(null);
  const modeRef = useRef(interactionMode);
  const measurePointsRef = useRef<any[]>([]);

  useEffect(() => { modeRef.current = interactionMode; }, [interactionMode]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const config = getMapConfig(performanceLevel, theme);
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: config.STYLE,
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
      pitch: config.PITCH || 60,
      bearing: config.BEARING || 0,
    });

    mapRef.current = map;

    map.on('load', () => {
      // Traffic
      if (config.ENABLE_TRAFFIC) {
        map.addSource('traffic', { type: 'vector', url: 'mapbox://mapbox.mapbox-traffic-v1' });
        map.addLayer({
          id: 'traffic-flow', type: 'line', source: 'traffic', 'source-layer': 'traffic',
          paint: {
            'line-width': 2,
            'line-color': ['match', ['get', 'congestion'], 'low', '#4ade80', 'moderate', '#facc15', 'heavy', '#f87171', 'severe', '#ef4444', '#6366f1'],
            'line-opacity': 0.7
          }
        });
      }

      // Buildings
      map.addLayer({
        id: '3d-buildings', source: 'composite', 'source-layer': 'building', filter: ['==', 'extrude', 'true'], type: 'fill-extrusion', minzoom: 12,
        paint: {
          'fill-extrusion-color': theme === 'light' ? '#cbd5e1' : '#1e293b',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': config.BUILDING_OPACITY || 0.8,
        }
      });

      // Ruler Layer
      map.addSource('measure', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'measure-line', type: 'line', source: 'measure',
        paint: { 'line-color': '#a855f7', 'line-width': 3, 'line-dasharray': [1, 1] }
      });
      map.addLayer({
        id: 'measure-points', type: 'circle', source: 'measure',
        paint: { 'circle-radius': 4, 'circle-color': '#a855f7', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' }
      });

      if (config.ENABLE_FOG) map.setFog(getFogConfig(aqiValue, theme));
    });

    map.on('click', (e) => {
      const mode = modeRef.current;
      if (mode === 'probe') {
        const features = map.queryRenderedFeatures(e.point, { layers: ['3d-buildings'] });
        if (features.length > 0) {
          const b = features[0];
          onBuildingSelect({ id: b.id || `B-${Math.floor(Math.random() * 10000)}`, height: b.properties?.height || 20, type: b.properties?.type || 'STRUCTURE' });
        }
      } else if (mode === 'ruler') {
        if (measurePointsRef.current.length >= 2) measurePointsRef.current = [];
        measurePointsRef.current.push({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        const geojson: any = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: measurePointsRef.current.map(p => [p.lng, p.lat]) } }] };
        if (measurePointsRef.current.length === 2) {
          const [p1, p2] = measurePointsRef.current;
          const dist = getDistance(p1.lat, p1.lng, p2.lat, p2.lng);
          geojson.features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [[p1.lng, p1.lat], [p2.lng, p2.lat]] } });
          onMeasureUpdate([p1, p2, dist]);
        } else { onMeasureUpdate([measurePointsRef.current[0]]); }
        (map.getSource('measure') as mapboxgl.GeoJSONSource)?.setData(geojson);
      }
    });

    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const config = getMapConfig(performanceLevel, theme);
    if (config.ENABLE_FOG) map.setFog(getFogConfig(aqiValue, theme));
    if (map.getLayer('3d-buildings')) {
      map.setLayoutProperty('3d-buildings', 'visibility', showModels ? 'visible' : 'none');
      map.setPaintProperty('3d-buildings', 'fill-extrusion-opacity', config.BUILDING_OPACITY || 0.8);
    }
  }, [aqiValue, theme, performanceLevel, showModels]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({ center: [viewState.longitude, viewState.latitude], zoom: viewState.zoom, duration: 2000 });
  }, [viewState]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (isOrbiting) {
      const rotate = () => {
        if (!mapRef.current) return;
        const config = getMapConfig(performanceLevel, theme);
        mapRef.current.easeTo({ bearing: mapRef.current.getBearing() + (config.ORBIT_SPEED || 0), duration: 100, easing: t => t });
        requestRef.current = requestAnimationFrame(rotate);
      };
      requestRef.current = requestAnimationFrame(rotate);
    } else if (requestRef.current) { cancelAnimationFrame(requestRef.current); }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isOrbiting, performanceLevel, theme]);

  return <div ref={mapContainerRef} className="w-full h-screen" />;
};

export default memo(Map);