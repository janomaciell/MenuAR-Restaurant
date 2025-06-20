import { useState, useEffect, useRef, useCallback } from 'react';

export const useARTracking = () => {
  const [trackingState, setTrackingState] = useState({
    isActive: false,
    confidence: 0,
    surfacePosition: [0, 0, -1],
    surfaceDimensions: { width: 0, height: 0 },
    lastUpdate: Date.now()
  });

  const detectionRef = useRef();
  const stabilityBuffer = useRef([]);
  const maxBufferSize = 10;

  const startTracking = useCallback((videoElement) => {
    if (!videoElement) return;

    setTrackingState(prev => ({ ...prev, isActive: true }));
    
    // Simulación de detección progresiva más realista
    let progress = 0;
    const detectionInterval = setInterval(() => {
      progress += Math.random() * 0.15 + 0.05; // Progreso más natural
      
      // Agregar a buffer de estabilidad
      stabilityBuffer.current.push(progress);
      if (stabilityBuffer.current.length > maxBufferSize) {
        stabilityBuffer.current.shift();
      }

      // Calcular confianza promedio
      const avgConfidence = stabilityBuffer.current.reduce((a, b) => a + b, 0) / stabilityBuffer.current.length;
      
      setTrackingState(prev => ({
        ...prev,
        confidence: Math.min(avgConfidence, 1),
        lastUpdate: Date.now()
      }));

      if (avgConfidence >= 0.9) {
        // Superficie detectada con alta confianza
        setTrackingState(prev => ({
          ...prev,
          confidence: 1,
          surfacePosition: [0, -0.5, -1],
          surfaceDimensions: { width: 1.2, height: 0.8 }
        }));
        
        clearInterval(detectionInterval);
      }
    }, 300);

    detectionRef.current = detectionInterval;
    
    return () => {
      if (detectionRef.current) {
        clearInterval(detectionRef.current);
      }
    };
  }, []);

  const stopTracking = useCallback(() => {
    setTrackingState(prev => ({ ...prev, isActive: false, confidence: 0 }));
    if (detectionRef.current) {
      clearInterval(detectionRef.current);
    }
    stabilityBuffer.current = [];
  }, []);

  return {
    trackingState,
    startTracking,
    stopTracking
  };
};

export const useDeviceStability = () => {
  const [stability, setStability] = useState({ 
    isStable: false, 
    movement: { x: 0, y: 0, z: 0 } 
  });
  
  const motionBuffer = useRef([]);
  const stabilityThreshold = 0.5;

  useEffect(() => {
    const handleMotion = (event) => {
      if (event.accelerationIncludingGravity) {
        const motion = {
          x: event.accelerationIncludingGravity.x || 0,
          y: event.accelerationIncludingGravity.y || 0,
          z: event.accelerationIncludingGravity.z || 0
       };

       // Agregar al buffer de movimiento
       motionBuffer.current.push(motion);
       if (motionBuffer.current.length > 20) {
         motionBuffer.current.shift();
       }

       // Calcular estabilidad basada en varianza de movimiento
       if (motionBuffer.current.length >= 10) {
         const avgMotion = motionBuffer.current.reduce(
           (acc, curr) => ({
             x: acc.x + Math.abs(curr.x),
             y: acc.y + Math.abs(curr.y),
             z: acc.z + Math.abs(curr.z)
           }),
           { x: 0, y: 0, z: 0 }
         );

         const totalMovement = (avgMotion.x + avgMotion.y + avgMotion.z) / motionBuffer.current.length;
         const isStable = totalMovement < stabilityThreshold;

         setStability({
           isStable,
           movement: motion
         });
       }
     }
   };

   if (window.DeviceMotionEvent) {
     window.addEventListener('devicemotion', handleMotion);
     return () => window.removeEventListener('devicemotion', handleMotion);
   }
 }, []);

 return stability;
};