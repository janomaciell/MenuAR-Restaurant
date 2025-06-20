// Utilidades para AR
export const checkARSupport = () => {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    window.DeviceOrientationEvent
  );
};

export const getCameraConstraints = () => {
  return {
    video: {
      facingMode: 'environment',
      width: { ideal: 1920, min: 1280 },
      height: { ideal: 1080, min: 720 },
      frameRate: { ideal: 30, min: 15 }
    }
  };
};

export const calculateModelScale = (distance, realSize) => {
  // Calcula la escala basada en la distancia estimada y el tamaño real del objeto
  // Esta es una aproximación básica
  const baseDistance = 1; // metro
  const scaleFactor = distance / baseDistance;
  return realSize * scaleFactor;
};