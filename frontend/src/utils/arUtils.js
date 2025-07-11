// Utilidades para AR
export const checkARSupport = () => {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    window.DeviceOrientationEvent
  );
};

// Función de diagnóstico para identificar problemas de cámara
export const diagnoseCameraIssues = async () => {
  const issues = [];
  
  // Verificar soporte básico
  if (!navigator.mediaDevices) {
    issues.push('❌ navigator.mediaDevices no está disponible');
  }
  
  if (!navigator.mediaDevices?.getUserMedia) {
    issues.push('❌ getUserMedia no está disponible');
  }
  
  // Verificar permisos
  try {
    const permissions = await navigator.permissions.query({ name: 'camera' });
    if (permissions.state === 'denied') {
      issues.push('❌ Permisos de cámara denegados');
    } else if (permissions.state === 'prompt') {
      issues.push('⚠️ Permisos de cámara no solicitados');
    } else {
      issues.push('✅ Permisos de cámara concedidos');
    }
  } catch (e) {
    issues.push('⚠️ No se pudo verificar permisos de cámara');
  }
  
  // Verificar dispositivos disponibles
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    if (videoDevices.length === 0) {
      issues.push('❌ No se encontraron cámaras en el dispositivo');
    } else {
      issues.push(`✅ Se encontraron ${videoDevices.length} cámara(s)`);
      videoDevices.forEach((device, index) => {
        issues.push(`   📹 Cámara ${index + 1}: ${device.label || 'Sin nombre'}`);
      });
    }
  } catch (e) {
    issues.push('❌ Error al enumerar dispositivos de cámara');
  }
  
  return issues;
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

// Configuraciones de cámara alternativas
export const getFallbackCameraConfigs = () => {
  return [
    // Configuración ideal para AR
    {
      video: {
        facingMode: 'environment',
        width: { ideal: 1920, min: 1280 },
        height: { ideal: 1080, min: 720 },
        frameRate: { ideal: 30, min: 15 }
      }
    },
    // Configuración más permisiva
    {
      video: {
        facingMode: 'environment',
        width: { min: 640 },
        height: { min: 480 }
      }
    },
    // Configuración básica
    {
      video: true
    },
    // Configuración con cámara frontal como fallback
    {
      video: {
        facingMode: 'user',
        width: { min: 640 },
        height: { min: 480 }
      }
    }
  ];
};

export const calculateModelScale = (distance, realSize) => {
  // Calcula la escala basada en la distancia estimada y el tamaño real del objeto
  // Esta es una aproximación básica
  const baseDistance = 1; // metro
  const scaleFactor = distance / baseDistance;
  return realSize * scaleFactor;
};

// Configuración para diferentes tipos de platos
export const getDishConfig = (dishType) => {
  const configs = {
    'hamburger': {
      realSize: { width: 0.15, height: 0.08 }, // 15cm x 8cm
      scaleMultiplier: 1.2,
      heightOffset: 0.02
    },
    'pizza': {
      realSize: { width: 0.30, height: 0.30 }, // 30cm x 30cm
      scaleMultiplier: 1.0,
      heightOffset: 0.01
    },
    'drink': {
      realSize: { width: 0.08, height: 0.15 }, // 8cm x 15cm
      scaleMultiplier: 1.1,
      heightOffset: 0.03
    },
    'default': {
      realSize: { width: 0.20, height: 0.15 }, // 20cm x 15cm
      scaleMultiplier: 1.0,
      heightOffset: 0.02
    }
  };
  
  return configs[dishType] || configs.default;
};

// Mejorar la detección de superficie para restaurantes
export const getRestaurantSurfaceConfig = () => {
  return {
    minConfidence: 0.6,
    stabilityFrames: 8,
    detectionInterval: 400, // ms
    surfaceTypes: ['table', 'counter', 'plate']
  };
};

// Utilidades para mejorar la experiencia del usuario
export const getARInstructions = (step) => {
  const instructions = {
    'initial': {
      title: '📱 Escanea tu mesa',
      description: 'Apunta la cámara hacia la mesa del restaurante',
      icon: '📱'
    },
    'detecting': {
      title: '🎯 Detectando superficie...',
      description: 'Mantén la cámara estable y apunta hacia la mesa',
      icon: '🎯'
    },
    'found': {
      title: '✅ ¡Mesa encontrada!',
      description: 'Toca la pantalla para colocar tu plato',
      icon: '✅'
    },
    'placed': {
      title: '🍽️ Plato en tu mesa',
      description: 'Mueve el teléfono para verlo desde diferentes ángulos',
      icon: '🍽️'
    }
  };
  
  return instructions[step] || instructions.initial;
};