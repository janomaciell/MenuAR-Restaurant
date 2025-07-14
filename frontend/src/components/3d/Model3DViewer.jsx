import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';

// Importar tus utilidades
import { useARTracking, useDeviceStability } from "../../hooks/useARTracking";
import { 
  SurfaceDetector, 
  calculateOptimalScale, 
  MotionCompensator 
} from '../../utils/arCalibration';
import { 
  checkARSupport, 
  getCameraConstraints,
  diagnoseCameraIssues,
  getFallbackCameraConfigs
} from '../../utils/arUtils';

function Model3DViewer({ modelPath, isOpen, onClose, itemName }) {
  const [arActive, setArActive] = useState(false);
  const [showARView, setShowARView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelPlaced, setModelPlaced] = useState(false);
  const [testMode, setTestMode] = useState(false);
  
  // NUEVOS ESTADOS para posición fija
  const [fixedPosition, setFixedPosition] = useState([0, 0, 0]);
  const [fixedScale, setFixedScale] = useState(1);
  const [modelOrientation, setModelOrientation] = useState(0); // Rotación Y inicial
  
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

  // Inicializar cámara optimizada (tu código existente)
  const initCamera = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🚀 Iniciando AR con detección de mesa...');

      const cameraConfigs = getFallbackCameraConfigs();
      let stream = null;
      let lastError = null;

      for (let i = 0; i < cameraConfigs.length; i++) {
        try {
          console.log(`📹 Intentando configuración de cámara ${i + 1}...`);
          stream = await navigator.mediaDevices.getUserMedia(cameraConfigs[i]);
          console.log(`✅ Cámara inicializada con configuración ${i + 1}`);
          break;
        } catch (err) {
          console.warn(`⚠️ Configuración ${i + 1} falló:`, err.message);
          lastError = err;
          continue;
        }
      }

      if (!stream) {
        throw new Error(`No se pudo acceder a la cámara: ${lastError?.message || 'Error desconocido'}`);
      }

      setCameraStream(stream);

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.style.display = 'block';
        video.width = 640;
        video.height = 480;
        
        await new Promise((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 50;
          
          const checkVideoReady = () => {
            attempts++;
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              console.log('✅ Video listo:', video.videoWidth, 'x', video.videoHeight);
              resolve();
            } else if (attempts >= maxAttempts) {
              reject(new Error('Timeout: El video no obtuvo dimensiones válidas'));
            } else {
              setTimeout(checkVideoReady, 100);
            }
          };

          video.play()
            .then(() => {
              console.log('video.play() resolved');
              checkVideoReady();
            })
            .catch((playError) => {
              console.warn('⚠️ Error al reproducir video, intentando continuar...', playError);
              checkVideoReady();
            });
        });

        startTracking(video);
      }

      setArActive(true);
      setShowARView(true);
      setLoading(false);
      console.log('🎉 AR inicializado correctamente');
      
    } catch (e) {
      console.error('❌ Error iniciando AR:', e);
      
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      
      let errorMessage = 'No se pudo acceder a la cámara. ';
      if (e.name === 'NotAllowedError') {
        errorMessage += 'Permisos de cámara denegados.';
      } else if (e.name === 'NotFoundError') {
        errorMessage += 'No se encontró cámara en el dispositivo.';
      } else if (e.name === 'NotSupportedError') {
        errorMessage += 'Tu navegador no soporta acceso a cámara.';
      } else {
        errorMessage += 'Verifica los permisos y reinicia la aplicación.';
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  }, [startTracking]);

  // Detectar superficie continuamente (tu código existente)
  useEffect(() => {
    if (!arActive || !videoRef.current || !detectionCanvasRef.current) return;

    let detectionAttempts = 0;
    const maxAttempts = 30;
    let detectionInterval = null;

    const detectSurface = () => {
      const video = videoRef.current;

      if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
        detectionAttempts++;
        if (detectionAttempts < maxAttempts) {
          console.log(`⏳ Esperando a que el video esté listo... (intento ${detectionAttempts}/${maxAttempts})`);
          return;
        } else {
          console.error('❌ Timeout: El video no se inicializó correctamente');
          setError('No se pudo inicializar la cámara correctamente');
          if (detectionInterval) {
            clearInterval(detectionInterval);
          }
          return;
        }
      }

      try {
        const detection = surfaceDetectorRef.current.detectSurface(
          video,
          detectionCanvasRef.current
        );

        if (detection && detection.confidence > 0.7) {
          console.log('🎯 Mesa detectada:', detection);
          trackingState.update(detection);
        } else if (detection) {
          console.log('🔍 Detectando superficie...', Math.round(detection.confidence * 100) + '%');
          trackingState.update(detection);
        } else {
          console.log('🔍 No se detectó una superficie válida aún.');
          trackingState.reset();
        }
      } catch (error) {
        console.error('❌ Error en detección de superficie:', error);
      }
    };

    const initialDelay = setTimeout(() => {
      detectSurface();
      detectionInterval = setInterval(detectSurface, 500);
    }, 1000);

    return () => {
      clearTimeout(initialDelay);
      if (detectionInterval) {
        clearInterval(detectionInterval);
      }
    };
  }, [arActive, trackingState]);

  // ✅ COMPONENTE DEL MODELO AR CORREGIDO
  const ARModelComponent = () => {
    const { scene } = useGLTF(modelPath);
    const modelRef = useRef();
    const { camera } = useThree();
    const [initialRotation, setInitialRotation] = useState(0);

    // Configurar el modelo una sola vez cuando se carga
    useEffect(() => {
      if (modelRef.current && scene) {
        // Calcular el bounding box del modelo para centrarlo correctamente
        const box = new THREE.Box3().setFromObject(scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Centrar el modelo en su base (parte inferior)
        scene.position.set(-center.x, -box.min.y, -center.z);
        
        // Escala realista para platos (generalmente 20-30cm de diámetro)
        const maxDimension = Math.max(size.x, size.y, size.z);
        const targetSize = 0.25; // 25cm en la escena
        const scale = targetSize / maxDimension;
        
        setFixedScale(scale);
        setInitialRotation(modelOrientation);
        
        console.log('🍽️ Modelo configurado:', {
          originalSize: size,
          scale: scale,
          targetSize: targetSize + 'm'
        });
      }
    }, [scene, modelOrientation]);

    // ✅ USAR useFrame SOLO PARA ANIMACIÓN, NO PARA POSICIONAMIENTO
    useFrame((state) => {
      if (modelRef.current && modelPlaced) {
        // Solo rotar suavemente, NO cambiar posición
        modelRef.current.rotation.y = initialRotation + state.clock.elapsedTime * 0.3;
        
        // Mantener posición fija
        modelRef.current.position.set(...fixedPosition);
        modelRef.current.scale.set(fixedScale, fixedScale, fixedScale);
      }
    });

    return (
      <group ref={modelRef}>
        <primitive object={scene.clone()} />
      </group>
    );
  };

  // ✅ HANDLER PARA COLOCAR EL PLATO CORREGIDO
  const handleManualPlacement = (e) => {
    if (modelPlaced) return;
    
    const overlay = e.currentTarget;
    const rect = overlay.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    // Convertir coordenadas de pantalla a 3D
    const posX = (x - 0.5) * 1.0; // Rango más pequeño para realismo
    const posY = 0; // Altura de la mesa (0 = superficie)
    const posZ = -0.8 - (y * 0.3); // Profundidad basada en Y de pantalla
    
    // ✅ FIJAR POSICIÓN UNA SOLA VEZ
    setFixedPosition([posX, posY, posZ]);
    setModelPlaced(true);
    
    // Actualizar tracking state para la UI
    trackingState.update({
      confidence: 1,
      position: [posX, posY, posZ],
      dimensions: { width: 1.2, height: 0.8 }
    });
    
    console.log('🍽️ Plato colocado en posición fija:', [posX, posY, posZ]);
  };

  // ✅ FUNCIÓN PARA REPOSICIONAR
  const handleReposition = () => {
    setModelPlaced(false);
    setFixedPosition([0, 0, 0]);
    setModelOrientation(Math.random() * Math.PI * 2); // Rotación aleatoria
    console.log('🔄 Modelo listo para reposicionar');
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
    setTestMode(false);
    setFixedPosition([0, 0, 0]);
    setFixedScale(1);
    setModelOrientation(0);
    surfaceDetectorRef.current.reset();
    motionCompensatorRef.current.reset();
  };

  // Activar modo de prueba
  const activateTestMode = () => {
    setTestMode(true);
    setShowARView(true);
    setArActive(true);
    
    setTimeout(() => {
      const mockDetection = {
        confidence: 0.95,
        position: [0, 0, -0.8],
        dimensions: { width: 1.5, height: 1.0 },
        isStable: true
      };
      trackingState.update(mockDetection);
      console.log('🧪 Modo de prueba activado - Mesa simulada detectada');
    }, 2000);
  };

  // Función de diagnóstico (sin cambios)
  const runDiagnostic = async () => {
    try {
      setLoading(true);
      console.log('🔍 Ejecutando diagnóstico de cámara...');
      
      const issues = await diagnoseCameraIssues();
      
      console.log('📋 Resultados del diagnóstico:');
      issues.forEach(issue => console.log(issue));
      
      const diagnosticMessage = issues.join('\n');
      alert(`Diagnóstico de Cámara:\n\n${diagnosticMessage}`);
      
    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
      alert('Error al ejecutar diagnóstico');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showARView && videoRef.current) {
      initCamera();
    }
  }, [showARView, videoRef]);

  if (!isOpen) return null;

  // Vista AR
  if (showARView) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {/* Overlay para tap-to-place */}
        {!modelPlaced && (
          <div
            className="absolute inset-0 w-full h-full z-30 cursor-crosshair"
            style={{ background: 'rgba(0,0,0,0)', pointerEvents: 'auto' }}
            onClick={handleManualPlacement}
          >
            <div className="absolute bottom-24 left-0 right-0 flex justify-center">
              <div className="bg-black/80 text-white px-4 py-2 rounded-lg text-lg font-semibold">
                Toca donde quieres colocar el plato
              </div>
            </div>
          </div>
        )}

        {/* Video de la cámara */}
        {!testMode && (
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
        )}

        {/* Fondo de prueba */}
        {testMode && (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-blue-900 to-blue-700 flex items-center justify-center">
            <div className="text-white text-center">
              <h2 className="text-2xl font-bold mb-4">🧪 Modo de Prueba AR</h2>
              <p className="text-lg">Simulando mesa de restaurante...</p>
            </div>
          </div>
        )}

        {/* Canvas oculto para detección */}
        <canvas ref={detectionCanvasRef} className="hidden" />

        {/* Canvas 3D superpuesto */}
        <div className="absolute inset-0 w-full h-full">
          <Canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', background: 'transparent' }}
            camera={{ position: [0, 0, 2], fov: 60 }} // FOV más realista
            gl={{ alpha: true, preserveDrawingBuffer: true }}
          >
            {/* Iluminación mejorada para platos */}
            <ambientLight intensity={0.4} />
            <directionalLight position={[2, 5, 2]} intensity={0.8} />
            <directionalLight position={[-2, 1, -2]} intensity={0.3} />
            
            {/* Mostrar plato cuando esté colocado */}
            {modelPlaced && (
              <ARModelComponent />
            )}

            {/* Plano de referencia de la mesa (opcional) */}
            {trackingState.confidence > 0.8 && !modelPlaced && (
              <mesh
                position={[0, -0.01, -0.8]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <planeGeometry args={[1.2, 0.8]} />
                <meshBasicMaterial 
                  color="#ffffff" 
                  transparent 
                  opacity={0.2}
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
              {testMode ? '🧪 Modo Prueba' : 
               modelPlaced ? '✅ Plato colocado' :
               trackingState.confidence > 0.8 ? '🎯 Mesa detectada' : '🔍 Buscando mesa...'}
            </div>
          </div>
        </div>

        {/* Controles cuando el modelo está colocado */}
        {modelPlaced && (
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <div className="bg-black/80 text-white p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">🍽️ {itemName}</h3>
                  <p className="text-sm opacity-80">Tamaño real aproximado</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleReposition}
                    className="bg-blue-500 hover:bg-blue-600 px-3 py-2 rounded text-sm"
                  >
                    📍 Reposicionar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instrucciones iniciales */}
        {!modelPlaced && (
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <div className="bg-black/80 text-white p-4 rounded-lg">
              {testMode ? (
                <div>
                  <h3 className="font-semibold mb-2">🧪 Modo de Prueba</h3>
                  <p className="text-sm">Toca la pantalla para colocar el plato</p>
                </div>
              ) : (
                <>
                  {trackingState.confidence < 0.8 && (
                    <div>
                      <h3 className="font-semibold mb-2">📱 Busca tu mesa</h3>
                      <p className="text-sm">Apunta la cámara hacia la mesa</p>
                    </div>
                  )}
                  
                  {trackingState.confidence >= 0.8 && (
                    <div>
                      <h3 className="font-semibold mb-2">✅ Mesa encontrada</h3>
                      <p className="text-sm">Toca donde quieres ver el plato</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Vista normal (sin cambios)
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold">Vista 3D: {itemName}</h3>
            <button onClick={onClose} className="text-2xl">×</button>
          </div>
          
          <div className="text-center">
            <p className="mb-4">¿Quieres ver cómo se ve este plato en tu mesa?</p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowARView(true);
                  setLoading(true);
                }}
                disabled={loading || !checkARSupport()}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg disabled:opacity-50 w-full"
              >
                {loading ? 'Iniciando...' : '📱 Ver en mi mesa (AR)'}
              </button>
              
              <button
                onClick={activateTestMode}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg disabled:opacity-50 w-full"
              >
                🧪 Probar AR (Modo Simulación)
              </button>

              <button
                onClick={runDiagnostic}
                disabled={loading}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg disabled:opacity-50 w-full"
              >
                🔍 Diagnosticar Cámara
              </button>
            </div>
            
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