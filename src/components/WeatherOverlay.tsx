"use client";

import React, { useEffect, useRef, memo } from "react";
import { PerformanceLevel } from "@/hooks/usePerformance";

interface WeatherOverlayProps {
  condition: string;
  performanceLevel?: PerformanceLevel;
  theme?: 'dark' | 'light';
}

const WeatherOverlay = ({ condition, performanceLevel = 'medium', theme = 'dark' }: WeatherOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  // Use a Float32Array for better memory locality if we had massive counts, 
  // but object arrays are easier to manage for complex props here. 
  // We'll stick to objects but keep them recycled.
  const particlesRef = useRef<{ x: number; y: number; speed: number; size: number; opacity: number; drift: number }[]>([]);
  
  // Offscreen canvas for sprites to avoid re-drawing gradients/shadows every frame
  const spriteRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Determine particle count based on weather condition & performance
    let baseCount = 0;
    if (condition === "Rain") baseCount = 1000;
    else if (condition === "Drizzle") baseCount = 500;
    else if (condition === "Snow") baseCount = 300;

    // Adjust for performance
    const multiplier = performanceLevel === 'high' ? 1 : performanceLevel === 'medium' ? 0.6 : 0.2;
    const particleCount = Math.floor(baseCount * multiplier);

    if (particleCount === 0) {
        particlesRef.current = [];
        return; 
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Prepare sprite
    const prepareSprite = () => {
      if (!spriteRef.current) {
        spriteRef.current = document.createElement('canvas');
      }
      const spriteCtx = spriteRef.current.getContext('2d', { alpha: true });
      if (!spriteCtx) return;

      if (condition === "Snow") {
        const size = 8; // standardized size for sprite
        spriteRef.current.width = size * 2;
        spriteRef.current.height = size * 2;
        
        const center = size;
        const radius = size / 2;

        // In light mode, make snow slightly grey/blue so it's visible, otherwise white
        spriteCtx.fillStyle = theme === 'light' ? "#cbd5e1" : "#FFF";
        spriteCtx.shadowBlur = 4;
        spriteCtx.shadowColor = theme === 'light' ? "rgba(148, 163, 184, 0.8)" : "rgba(255, 255, 255, 0.8)";
        spriteCtx.beginPath();
        spriteCtx.arc(center, center, radius, 0, Math.PI * 2);
        spriteCtx.fill();
      }
      // For rain, we draw lines dynamically because length varies by speed, 
      // but we can optimize the stroke style.
    };
    prepareSprite();

    const ctx = canvas.getContext("2d", { 
      alpha: true,
      desynchronized: performanceLevel === 'high', 
    });
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    // Initialize Particles
    particlesRef.current = [];
    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: condition === "Snow" 
          ? Math.random() * 1.5 + 0.5
          : Math.random() * 15 + 10, // Rain falls faster
        size: condition === "Snow"
          ? Math.random() * 3 + 2
          : Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.3,
        drift: Math.random() * 2 - 1,
      });
    }

    let lastTime = performance.now();
    const targetFPS = performanceLevel === 'low' ? 30 : 60;
    const frameTime = 1000 / targetFPS;

    const animate = (currentTime: number) => {
      if (!ctx || !canvas) return;

      const deltaTime = currentTime - lastTime;
      if (deltaTime < frameTime) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }
      
      lastTime = currentTime - (deltaTime % frameTime);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const particles = particlesRef.current;
      const len = particles.length;

      // Batch drawing settings
      if (condition === "Rain" || condition === "Drizzle") {
        // Darker rain for light mode, lighter for dark mode
        ctx.strokeStyle = theme === 'light' ? "rgba(71, 85, 105, 0.6)" : "rgba(174, 194, 224, 0.6)";
        ctx.lineCap = "round";
      }

      for (let i = 0; i < len; i++) {
        const p = particles[i];

        if (condition === "Rain" || condition === "Drizzle") {
           // Optimized Rain: Single path (or small batches if we wanted, but individual is fine without gradients)
           // Variable opacity per drop is nice but costly to switch context state.
           // We'll use global alpha trick or just fixed color for speed.
           // For best speed: set style once, draw all. But we want var opacity.
           // Compromise: Pre-calculate alpha groups? No, just simple draw.
           
           ctx.beginPath();
           ctx.lineWidth = p.size;
           ctx.moveTo(p.x, p.y);
           ctx.lineTo(p.x, p.y + p.speed * 2);
           ctx.stroke();
           
        } else if (condition === "Snow") {
          // Draw Cached Sprite
          if (spriteRef.current) {
             ctx.globalAlpha = p.opacity;
             // Draw centered
             ctx.drawImage(spriteRef.current, p.x, p.y, p.size, p.size);
          }
        }

        // Update Physics
        p.y += p.speed;
        
        if (condition === "Snow") {
          p.x += Math.sin(p.y / 50 + p.drift) * 0.5;
        } else {
          p.x += p.drift * 0.2;
        }

        // Reset
        if (p.y > height) {
          p.y = -20;
          p.x = Math.random() * width;
        }
        if (p.x > width) p.x = 0;
        else if (p.x < 0) p.x = width;
      }
      
      // Reset global alpha
      ctx.globalAlpha = 1.0;

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [condition, performanceLevel, theme]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-20"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};

export default memo(WeatherOverlay);
