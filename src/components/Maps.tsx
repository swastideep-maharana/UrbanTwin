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
                style: 'mapbox://styles/mapbox/streets-v12',
                center: [-74.5, 40],
                zoom: 9,
                pitch: 45,
                bearing: -17.6,
                antialias: true,
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