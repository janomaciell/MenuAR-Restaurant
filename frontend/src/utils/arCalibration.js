// Utilidades para calibración y detección de superficie AR
export class SurfaceDetector {
  constructor() {
    this.detectionHistory = [];
    this.confidenceThreshold = 0.8;
    this.stabilityFrames = 10;
  }

  // Simular detección de superficie basada en análisis de imagen
  detectSurface(videoElement, canvasElement) {
    if (!videoElement || !canvasElement) return null;

    const canvas = canvasElement;
    const ctx = canvas.getContext('2d');
    
    // Configurar canvas del tamaño del video
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    // Dibujar frame actual
    ctx.drawImage(videoElement, 0, 0);
    
    // Obtener datos de imagen
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Análisis simulado de superficie
    const surfaceData = this.analyzeSurface(imageData);
    
    // Agregar a historial para estabilidad
    this.detectionHistory.push(surfaceData);
    if (this.detectionHistory.length > this.stabilityFrames) {
      this.detectionHistory.shift();
    }
    
    // Calcular confianza estable
    const stableDetection = this.calculateStableDetection();
    
    return stableDetection;
  }

  analyzeSurface(imageData) {
    // Simulación de análisis de superficie
    // En una implementación real, usarías algoritmos de computer vision
    const data = imageData.data;
    let horizontalLines = 0;
    let surfaceArea = 0;
    
    // Simular detección de líneas horizontales (bordes de mesa)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Detectar contrastes que podrían ser bordes
      const brightness = (r + g + b) / 3;
      if (brightness > 100 && brightness < 200) {
        horizontalLines++;
      }
      
      // Detectar áreas uniformes (superficie de mesa)
      if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20) {
        surfaceArea++;
      }
    }
    
    const totalPixels = data.length / 4;
    const surfaceRatio = surfaceArea / totalPixels;
    const edgeRatio = horizontalLines / totalPixels;
    
    // Calcular confianza basada en ratios
    const confidence = Math.min(1, (surfaceRatio * 2 + edgeRatio * 3));
    
    return {
      confidence,
      surfaceRatio,
      edgeRatio,
      estimatedPosition: this.estimatePosition(surfaceRatio, edgeRatio),
      estimatedDimensions: this.estimateDimensions(surfaceRatio)
    };
  }

  estimatePosition(surfaceRatio, edgeRatio) {
    // Estimar posición 3D basada en análisis de imagen
    const distance = Math.max(0.5, 2 - surfaceRatio * 2); // Entre 0.5m y 2m
    const height = -0.3 - (edgeRatio * 0.2); // Altura de mesa estimada
    
    return [0, height, -distance];
  }

  estimateDimensions(surfaceRatio) {
    // Estimar dimensiones de la mesa
    const baseWidth = 1.0;
    const baseHeight = 0.7;
    
    // Ajustar basado en el área de superficie detectada
    const scaleFactor = Math.max(0.5, Math.min(1.5, surfaceRatio * 2));
    
    return {
      width: baseWidth * scaleFactor,
      height: baseHeight * scaleFactor
    };
  }

  calculateStableDetection() {
    if (this.detectionHistory.length < 3) {
      return { confidence: 0, position: [0, 0, -1], dimensions: { width: 0, height: 0 } };
    }

    // Promediar detecciones recientes para estabilidad
    const avgConfidence = this.detectionHistory.reduce((sum, det) => sum + det.confidence, 0) / this.detectionHistory.length;
    
    const avgPosition = this.detectionHistory.reduce(
      (sum, det) => [
        sum[0] + det.estimatedPosition[0],
        sum[1] + det.estimatedPosition[1],
        sum[2] + det.estimatedPosition[2]
      ],
      [0, 0, 0]
    ).map(coord => coord / this.detectionHistory.length);

    const avgDimensions = {
      width: this.detectionHistory.reduce((sum, det) => sum + det.estimatedDimensions.width, 0) / this.detectionHistory.length,
      height: this.detectionHistory.reduce((sum, det) => sum + det.estimatedDimensions.height, 0) / this.detectionHistory.length
    };

    return {
      confidence: avgConfidence,
      position: avgPosition,
      dimensions: avgDimensions,
      isStable: avgConfidence > this.confidenceThreshold
    };
  }

  reset() {
    this.detectionHistory = [];
  }
}

// Utilidades de escala y posicionamiento
export const calculateOptimalScale = (tableDimensions, modelSize, distance) => {
  const tableArea = tableDimensions.width * tableDimensions.height;
  const optimalRatio = 0.15; // El modelo debería ocupar ~15% del área de la mesa
  
  const baseScale = Math.sqrt((tableArea * optimalRatio) / (modelSize.width * modelSize.height));
  const distanceScale = Math.max(0.5, Math.min(2, 1 / distance)); // Ajuste por distancia
  
  return baseScale * distanceScale;
};

export const adjustForTableSurface = (tableDimensions, tablePosition) => {
  return {
    position: [
      tablePosition[0], // X centrado
      tablePosition[1] + 0.05, // Ligeramente sobre la mesa
      tablePosition[2] // Misma profundidad
    ],
    maxBounds: {
      x: tableDimensions.width * 0.4,
      z: tableDimensions.height * 0.4
    }
  };
};

// Compensación de movimiento del dispositivo
export class MotionCompensator {
  constructor() {
    this.baseOrientation = null;
    this.motionHistory = [];
    this.smoothingFactor = 0.1;
  }

  setBaseOrientation(orientation) {
    this.baseOrientation = orientation;
  }

  compensateMotion(currentOrientation, modelPosition) {
    if (!this.baseOrientation) {
      this.setBaseOrientation(currentOrientation);
      return modelPosition;
    }

    // Calcular diferencia de orientación
    const deltaAlpha = (currentOrientation.alpha - this.baseOrientation.alpha) * Math.PI / 180;
    const deltaBeta = (currentOrientation.beta - this.baseOrientation.beta) * Math.PI / 180;
    const deltaGamma = (currentOrientation.gamma - this.baseOrientation.gamma) * Math.PI / 180;

    // Aplicar compensación suave
    const compensatedPosition = [
      modelPosition[0] - Math.sin(deltaGamma) * this.smoothingFactor,
      modelPosition[1] + Math.sin(deltaBeta) * this.smoothingFactor,
      modelPosition[2]
    ];

    // Suavizar usando historial
    this.motionHistory.push(compensatedPosition);
    if (this.motionHistory.length > 5) {
      this.motionHistory.shift();
    }

    // Retornar posición suavizada
    return this.motionHistory.reduce(
      (avg, pos) => [
        avg[0] + pos[0] / this.motionHistory.length,
        avg[1] + pos[1] / this.motionHistory.length,
        avg[2] + pos[2] / this.motionHistory.length
      ],
      [0, 0, 0]
    );
  }

  reset() {
    this.baseOrientation = null;
    this.motionHistory = [];
  }
}