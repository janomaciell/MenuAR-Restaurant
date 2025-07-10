import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';

// Importar tus utilidades
import { useARTracking, useDeviceStability } from "../../hooks/useARTracking";
// ✅ De arCalibration.js
import { 
  SurfaceDetector, 
  calculateOptimalScale, 
  MotionCompensator 
} from '../../utils/arCalibration';

// ✅ De arUtils.js
import { 
  checkARSupport, 
  getCameraConstraints 
} from '../../utils/arUtils';


function Model3DViewer({ modelPath, isOpen, onClose, itemName }) {
  const [arActive, setArActive] = useState(false);
  const [showARView, setShowARView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelPlaced, setModelPlaced] = useState(false);
  
  // Usar tus hooks personalizados
  const { trackingState, startTracking, stopTracking } = useARTracking();
  const deviceStability = useDeviceStability();
  
  // Referencias
  const videoRef = useRef();
  const canvasRef = useRef();
  const detectionCanvasRef = useRef();
  const surfaceDetectorRef = useRef(new SurfaceDetector());
  const motionCompensatorRef = useRef(new MotionCompensator());

  // Verificar soporte AR al montar
  useEffect(() => {
    if (!checkARSupport()) {
      setError('Tu dispositivo no soporta AR. Necesitas un navegador compatible y cámara.');
    }
  }, []);

  // Inicializar cámara optimizada
  const initCamera = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🚀 Iniciando AR con detección de mesa...');

      const constraints = getCameraConstraints();
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve, reject) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(resolve).catch(reject);
          };
        });

        // Iniciar tracking de superficie
        startTracking(videoRef.current);
      }

      setArActive(true);
      setShowARView(true);
      setLoading(false);
    } catch (e) {
      console.error('❌ Error iniciando AR:', e);
      setError('No se pudo acceder a la cámara. Verifica los permisos.');
      setLoading(false);
    }
  }, [startTracking]);

  // Detectar superficie continuamente
  useEffect(() => {
    if (!arActive || !videoRef.current || !detectionCanvasRef.current) return;

    const detectSurface = () => {
      const detection = surfaceDetectorRef.current.detectSurface(
        videoRef.current,
        detectionCanvasRef.current
      );
      
      if (detection && detection.confidence > 0.7) {
        console.log('🎯 Mesa detectada:', detection);
        // La mesa está detectada y lista para colocar el plato
      }
    };

    const interval = setInterval(detectSurface, 500);
    return () => clearInterval(interval);
  }, [arActive]);

  // Componente del modelo AR mejorado
  const ARModelComponent = () => {
    const { scene } = useGLTF(modelPath);
    const modelRef = useRef();
    const { camera } = useThree();

    useFrame((state) => {
      if (modelRef.current && modelPlaced && trackingState.confidence > 0.8) {
        // Usar compensación de movimiento
        const compensatedPosition = motionCompensatorRef.current.compensateMotion(
          { alpha: 0, beta: 0, gamma: 0 }, // Orientación actual (simplificada)
          trackingState.surfacePosition
        );

        // Aplicar posición compensada
        modelRef.current.position.set(...compensatedPosition);
        
        // Escala automática basada en la mesa detectada
        const optimalScale = calculateOptimalScale(
          trackingState.surfaceDimensions,
          { width: 1, height: 1 },
          Math.abs(compensatedPosition[2])
        );
        
        modelRef.current.scale.set(optimalScale, optimalScale, optimalScale);
        
        // Rotación suave
        modelRef.current.rotation.y += 0.005;
      }
    });

    // Colocar plato al tocar la pantalla
    const handlePlacement = (event) => {
      if (trackingState.confidence > 0.8) {
        setModelPlaced(true);
        console.log('🍽️ Plato colocado en la mesa');
      }
    };

    return (
      <group ref={modelRef} onClick={handlePlacement}>
        <primitive object={scene.clone()} />
      </group>
    );
  };

  // Cerrar AR
  const handleCloseARView = () => {
    stopTracking();
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowARView(false);
    setArActive(false);
    setModelPlaced(false);
    surfaceDetectorRef.current.reset();
    motionCompensatorRef.current.reset();
  };

  if (!isOpen) return null;

  // Vista AR con detección de mesa
  if (showARView) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {/* Video de la cámara */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* Canvas oculto para detección */}
        <canvas
          ref={detectionCanvasRef}
          className="hidden"
        />

        {/* Canvas 3D superpuesto */}
        <div className="absolute inset-0 w-full h-full">
          <Canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', background: 'transparent' }}
            camera={{ position: [0, 0, 2], fov: 75 }}
            gl={{ alpha: true, preserveDrawingBuffer: true }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[2, 2, 2]} intensity={0.8} />
            
            {/* Mostrar plato solo si hay confianza en la detección */}
            {trackingState.confidence > 0.5 && (
              <ARModelComponent />
            )}

            {/* Plano de la mesa (opcional, para visualización) */}
            {trackingState.confidence > 0.8 && (
              <mesh
                position={trackingState.surfacePosition}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <planeGeometry args={[
                  trackingState.surfaceDimensions.width,
                  trackingState.surfaceDimensions.height
                ]} />
                <meshBasicMaterial 
                  color="#ffffff" 
                  transparent 
                  opacity={0.1}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}
          </Canvas>
        </div>

        {/* Interfaz de usuario */}
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="flex justify-between items-center">
            <button
              onClick={handleCloseARView}
              className="bg-red-500/80 hover:bg-red-600/80 text-white font-semibold px-4 py-2 rounded-lg"
            >
              ← Salir AR
            </button>
            
            <div className="bg-black/70 text-white px-3 py-1 rounded-lg text-sm">
              {trackingState.confidence > 0.8 ? '🎯 Mesa detectada' : '🔍 Buscando mesa...'}
            </div>
          </div>
        </div>

        {/* Instrucciones dinámicas */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-black/80 text-white p-4 rounded-lg">
            {trackingState.confidence < 0.3 && (
              <div>
                <h3 className="font-semibold mb-2">📱 Escanea tu mesa</h3>
                <p className="text-sm">Apunta la cámara hacia la mesa del restaurante</p>
                <div className="mt-2 bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${trackingState.confidence * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            {trackingState.confidence >= 0.3 && trackingState.confidence < 0.8 && (
              <div>
                <h3 className="font-semibold mb-2">🎯 Detectando superficie...</h3>
                <p className="text-sm">Mantén la cámara estable</p>
                <div className="mt-2 bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${trackingState.confidence * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            {trackingState.confidence >= 0.8 && !modelPlaced && (
              <div>
                <h3 className="font-semibold mb-2">✅ ¡Mesa encontrada!</h3>
                <p className="text-sm">Toca la pantalla para colocar tu plato</p>
                {!deviceStability.isStable && (
                  <p className="text-xs text-yellow-400 mt-1">
                    💡 Mantén el teléfono más estable para mejor experiencia
                  </p>
                )}
              </div>
            )}
            
            {modelPlaced && (
              <div>
                <h3 className="font-semibold mb-2">🍽️ {itemName} en tu mesa</h3>
                <p className="text-sm">Mueve el teléfono para verlo desde diferentes ángulos</p>
                <button
                  onClick={() => setModelPlaced(false)}
                  className="mt-2 bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-sm"
                >
                  Reposicionar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Vista normal (sin cambios)
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Tu interfaz normal existente */}
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Contenido normal del modal */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold">Vista 3D: {itemName}</h3>
            <button onClick={onClose} className="text-2xl">×</button>
          </div>
          
          <div className="text-center">
            <p className="mb-4">¿Quieres ver cómo se ve este plato en tu mesa?</p>
            <button
              onClick={initCamera}
              disabled={loading || !checkARSupport()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Iniciando...' : '📱 Ver en mi mesa (AR)'}
            </button>
            
            {!checkARSupport() && (
              <p className="text-red-500 text-sm mt-2">
                Tu navegador no soporta AR. Usa Chrome o Safari en dispositivo móvil.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal de error */}
      {error && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
          <div className="bg-white p-6 rounded-xl max-w-sm mx-4">
            <h3 className="font-bold text-lg mb-2">Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => setError(null)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Model3DViewer;