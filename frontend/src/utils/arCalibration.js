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

    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;

    // Verificar si el video está listo
    if (videoWidth === 0 || videoHeight === 0) {
      console.warn('📹 El video aún no tiene dimensiones válidas.');
      return null;
    }

    const canvas = canvasElement;
    const ctx = canvas.getContext('2d');

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    try {
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const surfaceData = this.analyzeSurface(imageData);

      this.detectionHistory.push(surfaceData);
      if (this.detectionHistory.length > this.stabilityFrames) {
        this.detectionHistory.shift();
      }

      return this.calculateStableDetection();
    } catch (error) {
      console.error('❌ Error al analizar imagen del video:', error);
      return null;
    }
  }

  analyzeSurface(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    let horizontalLines = 0;
    let surfaceArea = 0;
    let edgePixels = 0;
    let colorVariance = 0;

    // Analizar la imagen en bloques para detectar superficies planas
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const index = (y * width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        
        // Detectar bordes horizontales (mesas)
        if (y > 0 && y < height - 1) {
          const prevIndex = ((y - 1) * width + x) * 4;
          const nextIndex = ((y + 1) * width + x) * 4;
          
          const brightness = (r + g + b) / 3;
          const prevBrightness = (data[prevIndex] + data[prevIndex + 1] + data[prevIndex + 2]) / 3;
          const nextBrightness = (data[nextIndex] + data[nextIndex + 1] + data[nextIndex + 2]) / 3;
          
          if (Math.abs(brightness - prevBrightness) > 30 || Math.abs(brightness - nextBrightness) > 30) {
            horizontalLines++;
          }
        }

        // Detectar superficies planas (colores similares)
        if (Math.abs(r - g) < 25 && Math.abs(g - b) < 25 && Math.abs(r - b) < 25) {
          surfaceArea++;
        }

        // Detectar bordes
        if (x > 0 && x < width - 1) {
          const leftIndex = (y * width + (x - 1)) * 4;
          const rightIndex = (y * width + (x + 1)) * 4;
          
          const brightness = (r + g + b) / 3;
          const leftBrightness = (data[leftIndex] + data[leftIndex + 1] + data[leftIndex + 2]) / 3;
          const rightBrightness = (data[rightIndex] + data[rightIndex + 1] + data[rightIndex + 2]) / 3;
          
          if (Math.abs(brightness - leftBrightness) > 40 || Math.abs(brightness - rightBrightness) > 40) {
            edgePixels++;
          }
        }

        // Calcular varianza de color
        colorVariance += Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b);
      }
    }

    const totalPixels = (width * height) / 16; // Debido al muestreo cada 4 píxeles
    const surfaceRatio = surfaceArea / totalPixels;
    const edgeRatio = edgePixels / totalPixels;
    const lineRatio = horizontalLines / totalPixels;
    const avgColorVariance = colorVariance / totalPixels;

    // Algoritmo mejorado para detectar mesas
    const tableConfidence = Math.min(1, 
      (surfaceRatio * 0.4) + 
      (edgeRatio * 0.3) + 
      (lineRatio * 0.3) + 
      (avgColorVariance < 50 ? 0.2 : 0)
    );

    return {
      confidence: tableConfidence,
      surfaceRatio,
      edgeRatio,
      lineRatio,
      estimatedPosition: this.estimatePosition(surfaceRatio, edgeRatio),
      estimatedDimensions: this.estimateDimensions(surfaceRatio)
    };
  }

  estimatePosition(surfaceRatio, edgeRatio) {
    const distance = Math.max(0.5, 2 - surfaceRatio * 2);
    const height = -0.3 - (edgeRatio * 0.2);
    return [0, height, -distance];
  }

  estimateDimensions(surfaceRatio) {
    const baseWidth = 1.0;
    const baseHeight = 0.7;
    const scaleFactor = Math.max(0.5, Math.min(1.5, surfaceRatio * 2));
    return {
      width: baseWidth * scaleFactor,
      height: baseHeight * scaleFactor
    };
  }

  calculateStableDetection() {
    if (this.detectionHistory.length < 3) {
      return {
        confidence: 0,
        position: [0, 0, -1],
        dimensions: { width: 0, height: 0 },
        isStable: false
      };
    }

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
  const optimalRatio = 0.15;

  const baseScale = Math.sqrt((tableArea * optimalRatio) / (modelSize.width * modelSize.height));
  const distanceScale = Math.max(0.5, Math.min(2, 1 / distance));

  return baseScale * distanceScale;
};

export const adjustForTableSurface = (tableDimensions, tablePosition) => {
  return {
    position: [
      tablePosition[0],
      tablePosition[1] + 0.05,
      tablePosition[2]
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

    const deltaAlpha = (currentOrientation.alpha - this.baseOrientation.alpha) * Math.PI / 180;
    const deltaBeta = (currentOrientation.beta - this.baseOrientation.beta) * Math.PI / 180;
    const deltaGamma = (currentOrientation.gamma - this.baseOrientation.gamma) * Math.PI / 180;

    const compensatedPosition = [
      modelPosition[0] - Math.sin(deltaGamma) * this.smoothingFactor,
      modelPosition[1] + Math.sin(deltaBeta) * this.smoothingFactor,
      modelPosition[2]
    ];

    this.motionHistory.push(compensatedPosition);
    if (this.motionHistory.length > 5) {
      this.motionHistory.shift();
    }

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
