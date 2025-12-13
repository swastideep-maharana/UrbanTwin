"use client";

import React, { useEffect, useRef, memo } from "react";

interface WeatherOverlayProps {
  condition: string;
}

const WeatherOverlay = ({ condition }: WeatherOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<{ x: number; y: number; speed: number; size: number; opacity: number; drift: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { 
      alpha: true,
      desynchronized: true, // Better performance
    });
    if (!ctx) return;

    // Resize canvas to full screen
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    // Determine particle count based on weather condition
    let particleCount = 0;
    if (condition === "Rain") particleCount = 800;
    else if (condition === "Drizzle") particleCount = 400;
    else if (condition === "Snow") particleCount = 250;

    // Initialize Particles with enhanced properties
    particlesRef.current = [];
    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: condition === "Snow" 
          ? Math.random() * 1.5 + 0.5
          : Math.random() * 6 + 3,
        size: condition === "Snow"
          ? Math.random() * 3 + 1
          : Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.3,
        drift: Math.random() * 2 - 1,
      });
    }

    let lastTime = performance.now();
    const targetFPS = 60;
    const frameTime = 1000 / targetFPS;

    const animate = (currentTime: number) => {
      if (!ctx || !canvas) return;

      const deltaTime = currentTime - lastTime;
      
      // Frame rate limiting for better performance
      if (deltaTime < frameTime) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      lastTime = currentTime - (deltaTime % frameTime);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // No weather? Stop rendering.
      if (condition !== "Rain" && condition !== "Snow" && condition !== "Drizzle") return;

      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        if (condition === "Rain" || condition === "Drizzle") {
          // Enhanced Rain rendering with gradient for realism
          const gradient = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.speed * 5);
          gradient.addColorStop(0, `rgba(174, 194, 224, ${p.opacity * 0.8})`);
          gradient.addColorStop(1, `rgba(174, 194, 224, 0)`);
          
          ctx.strokeStyle = gradient;
          ctx.lineWidth = condition === "Drizzle" ? 0.5 : 1;
          ctx.lineCap = "round";
          
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, p.y + p.speed * (condition === "Drizzle" ? 3 : 5));
          ctx.stroke();
        } else if (condition === "Snow") {
          // Enhanced Snow rendering with glow effect
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
          
          // Add subtle glow
          ctx.shadowBlur = 3;
          ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          
          // Reset shadow
          ctx.shadowBlur = 0;
        }

        // Move Particle
        p.y += p.speed;
        
        // Enhanced wind effect for snow - more natural drift
        if (condition === "Snow") {
          p.x += Math.sin(p.y / 50 + p.drift) * 0.8;
        } else {
          // Slight wind for rain too
          p.x += p.drift * 0.3;
        }

        // Reset if off screen (with some margin)
        if (p.y > canvas.height + 10) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
          p.opacity = Math.random() * 0.5 + 0.3;
        }
        
        // Reset if drifted too far horizontally
        if (p.x < -10 || p.x > canvas.width + 10) {
          p.x = Math.random() * canvas.width;
          p.y = -10;
        }
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [condition]);

  // Pass click events through to the map (pointer-events-none)
  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-20"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};

// Memoize to prevent unnecessary re-renders
export default memo(WeatherOverlay, (prevProps, nextProps) => {
  return prevProps.condition === nextProps.condition;
});
