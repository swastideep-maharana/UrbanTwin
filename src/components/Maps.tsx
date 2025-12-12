"use client";

import React,{useRef, useEffect} from "react";
import mapboxgl from "mapbox-gl";
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

const Map = ()=>{
    const mapContainerRef = useRef<HTMLDivElement>(null);

    const mapRef = useRef<mapboxgl.Map | null>(null);

    useEffect(()=>{
        if (mapRef.current) return;

        if (mapContainerRef.current){
            mapRef.current = new mapboxgl.Map({
                container: mapContainerRef.current,
                style: 'mapbox://styles/mapbox/streets-v11',
                center: [-74.006, 40.7128], // NYC
                zoom: 15.5, // Zoomed in closer to see buildings
                pitch: 55, // Steeper pitch to look "through" the city
                bearing: -17.6, // Rotate slightly for a better angle
                antialias: true // Makes the 3D edges look smoother
            })
            mapRef.current.on('load', ()=>{
                if (!mapRef.current) return;
                
                //1.insert the 3d buildings
                mapRef.current.addLayer({
                'id': '3d-buildings',
                'source': 'composite',
                'source-layer': 'building',
                'filter': ['==', 'extrude', 'true'], // Only select items marked as 'extrude'
                'type': 'fill-extrusion',
                'minzoom': 15,
                'paint': {
                // Color the buildings a dark grey to match the theme
                'fill-extrusion-color': '#2a2a2a',

                // Use 'interpolate' to transition the height smoothly as you zoom
                'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'height'] // Get real-world height from data
                ],
                'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'min_height']
                ],
                'fill-extrusion-opacity': 0.8
            }
                })
                //2.add some atmosphere
                mapRef.current.addLayer({
                    'id': 'atmosphere',
                    'source': 'composite',
                    'source-layer': 'building',
                    'type': 'fill-extrusion',
                    'minzoom': 15,
                    'paint': {
                        'fill-extrusion-color': '#2a2a2a',
                        'fill-extrusion-height': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            15,
                            0,
                            15.05,
                            ['get', 'height']
                        ],
                        'fill-extrusion-base': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            15,
                            0,
                            15.05,
                            ['get', 'min_height']
                        ],
                        'fill-extrusion-opacity': 0.8
                    }
                })
            })
        }

        return ()=>{
            mapRef.current?.remove();
        };


    },[]);

    return(
        <div ref={mapContainerRef} className="w-full h-screen"/>
    )
}

export default Map;