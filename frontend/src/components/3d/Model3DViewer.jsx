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
  const [testMode, setTestMode] = useState(false); // Modo de prueba
  
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

      const cameraConfigs = getFallbackCameraConfigs();

      let stream = null;
      let lastError = null;

      // Probar cada configuración hasta que una funcione
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
        console.log('videoRef.current existe:', !!video);
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.style.display = 'block'; // Asegúrate de que sea visible
        video.style.background = 'red'; // Para depuración visual
        video.width = 640;
        video.height = 480;
        
        // Log de tracks
        if (stream.getVideoTracks().length === 0) {
          console.error('❌ El stream NO tiene tracks de video');
        } else {
          console.log('✅ El stream tiene tracks de video:', stream.getVideoTracks());
        }
        
        video.onloadeddata = () => {
          console.log('video.onloadeddata fired:', video.videoWidth, video.videoHeight);
        };
        video.onloadedmetadata = () => {
          console.log('video.onloadedmetadata fired:', video.videoWidth, video.videoHeight);
        };
        video.onplay = () => {
          console.log('video.onplay fired:', video.videoWidth, video.videoHeight);
        };
        video.onerror = (e) => {
          console.error('❌ video.onerror', e);
        };
        
        // Verificar si el video está en el DOM
        setTimeout(() => {
          if (!document.body.contains(video)) {
            console.error('❌ El video NO está en el DOM');
          } else {
            console.log('✅ El video está en el DOM');
          }
        }, 1000);

        // Esperar a que el video esté completamente listo
        await new Promise((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 50; // 5 segundos máximo
          
          const checkVideoReady = () => {
            attempts++;
            console.log('checkVideoReady:', video.videoWidth, video.videoHeight, 'attempt', attempts);
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              console.log('✅ Video listo:', video.videoWidth, 'x', video.videoHeight);
              resolve();
            } else if (attempts >= maxAttempts) {
              reject(new Error('Timeout: El video no obtuvo dimensiones válidas'));
            } else {
              console.log(`⏳ Esperando dimensiones del video... (${attempts}/${maxAttempts})`);
              setTimeout(checkVideoReady, 100);
            }
          };

          // Intentar reproducir el video
          video.play()
            .then(() => {
              console.log('video.play() resolved');
              checkVideoReady();
            })
            .catch((playError) => {
              console.warn('⚠️ Error al reproducir video, intentando continuar...', playError);
              checkVideoReady();
            });

          // Timeout de seguridad
          setTimeout(() => {
            if (video.videoWidth === 0) {
              console.error('❌ Timeout esperando video');
              reject(new Error('Timeout esperando video'));
            }
          }, 5000);
        });

        startTracking(video);
      } else {
        console.error('❌ videoRef.current es null');
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
      
      // Mensaje de error más específico
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

  // Detectar superficie continuamente
  useEffect(() => {
    if (!arActive || !videoRef.current || !detectionCanvasRef.current) return;

    let detectionAttempts = 0;
    const maxAttempts = 30; // Máximo 15 segundos de intentos
    let detectionInterval = null;

    const detectSurface = () => {
      const video = videoRef.current;

      // Verificar que el video esté listo
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
        // No incrementar attempts en caso de error de detección
      }
    };

    // Iniciar detección después de un pequeño delay para asegurar que todo esté listo
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
    setTestMode(false);
    surfaceDetectorRef.current.reset();
    motionCompensatorRef.current.reset();
  };

  // Activar modo de prueba
  const activateTestMode = () => {
    setTestMode(true);
    setShowARView(true);
    setArActive(true);
    
    // Simular detección de mesa después de 2 segundos
    setTimeout(() => {
      const mockDetection = {
        confidence: 0.95,
        position: [0, -0.3, -1.5],
        dimensions: { width: 1.5, height: 1.0 },
        isStable: true
      };
      trackingState.update(mockDetection);
      console.log('🧪 Modo de prueba activado - Mesa simulada detectada');
    }, 2000);
  };

  // Función de diagnóstico
  const runDiagnostic = async () => {
    try {
      setLoading(true);
      console.log('🔍 Ejecutando diagnóstico de cámara...');
      
      const issues = await diagnoseCameraIssues();
      
      console.log('📋 Resultados del diagnóstico:');
      issues.forEach(issue => console.log(issue));
      
      // Mostrar resultados en un alert temporal
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
      // Aquí llamas a la función que inicializa la cámara y el stream
      initCamera();
    }
  }, [showARView, videoRef]);

  if (!isOpen) return null;

  // Vista AR con detección de mesa
  if (showARView) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {/* Video de la cámara (solo en modo normal) */}
        {!testMode && (
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
        )}

        {/* Fondo de prueba (solo en modo de prueba) */}
        {testMode && (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-blue-900 to-blue-700 flex items-center justify-center">
            <div className="text-white text-center">
              <h2 className="text-2xl font-bold mb-4">🧪 Modo de Prueba AR</h2>
              <p className="text-lg">Simulando detección de mesa...</p>
            </div>
          </div>
        )}

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
              {testMode ? '🧪 Modo Prueba' : 
               trackingState.confidence > 0.8 ? '🎯 Mesa detectada' : '🔍 Buscando mesa...'}
            </div>
          </div>
        </div>

        {/* Instrucciones dinámicas */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-black/80 text-white p-4 rounded-lg">
            {testMode ? (
              <div>
                <h3 className="font-semibold mb-2">🧪 Modo de Prueba Activo</h3>
                <p className="text-sm">Simulando detección de mesa para pruebas</p>
                {trackingState.confidence > 0.8 && (
                  <p className="text-green-400 text-sm mt-1">✅ Mesa simulada detectada</p>
                )}
              </div>
            ) : (
              <>
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
              </>
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