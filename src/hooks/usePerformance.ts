
import { useState, useEffect } from 'react';


  
export type PerformanceLevel = 'high' | 'medium' | 'low';

interface ExtendedPerformance extends Performance {
  memory?: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
}

const getPerformanceMetrics = (): PerformanceLevel => {
  if (typeof window === 'undefined') return 'medium';

  const performance = window.performance as ExtendedPerformance;
  const memory = performance.memory;
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

export const usePerformance = () => {
  const [performanceLevel, setPerformanceLevel] = useState<PerformanceLevel>('medium');

  useEffect(() => {
    // Check performance effectively only on client mount
    const level = getPerformanceMetrics();
    
    // Avoid unnecessary updates if already default
    if (level !== 'medium') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPerformanceLevel(level);
    }
  }, []);

  return performanceLevel;
};
