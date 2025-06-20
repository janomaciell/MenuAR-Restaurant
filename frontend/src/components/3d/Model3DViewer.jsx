import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';

// Precargar el modelo
function usePreloadModel(modelPath) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (modelPath) {
      // Precargar usando useGLTF.preload
      useGLTF.preload(modelPath);
      
      // Simular carga con timeout (ajusta según tu modelo)
      const timer = setTimeout(() => {
        setLoaded(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [modelPath]);
  
  return { loaded, error };
}

// Componente del modelo 3D optimizado para AR
function ARModel3D({ modelPath, scale = 0.5, position = [0, 0, 0], rotation = [0, 0, 0], onLoad, onError }) {
  const { scene, error } = useGLTF(modelPath);
  const modelRef = useRef();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (scene && !error && !isReady) {
      try {
        const clonedScene = scene.clone(true);
        
        // Centrar el modelo
        const box = new THREE.Box3().setFromObject(clonedScene);
        const center = box.getCenter(new THREE.Vector3());
        clonedScene.position.sub(center);
        
        // Optimizar para AR móvil
        clonedScene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.frustumCulled = false;
            
            if (child.material) {
              child.material = child.material.clone();
              child.material.needsUpdate = true;
              if (child.material.map) {
                child.material.map.minFilter = THREE.LinearFilter;
                child.material.map.magFilter = THREE.LinearFilter;
              }
            }
          }
        });

        if (modelRef.current) {
          while (modelRef.current.children.length > 0) {
            modelRef.current.remove(modelRef.current.children[0]);
          }
          
          modelRef.current.add(clonedScene);
          modelRef.current.scale.set(scale, scale, scale);
          modelRef.current.position.set(...position);
          modelRef.current.rotation.set(...rotation);
        }

        setIsReady(true);
        // Notificar que el modelo está listo
        if (onLoad) onLoad();
        
      } catch (err) {
        console.error('Error processing AR model:', err);
        if (onError) onError(err);
      }
    }
  }, [scene, error, scale, position, rotation, isReady, onLoad, onError]);

  // Manejar errores de carga
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  useFrame((state) => {
    if (modelRef.current && isReady) {
      modelRef.current.rotation.y += 0.005;
      modelRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime) * 0.02;
    }
  });

  return <group ref={modelRef} />;
}

// Componente principal corregido
function Model3DViewer({ modelPath, isOpen, onClose, itemName }) {
  const [arActive, setArActive] = useState(false);
  const [showARView, setShowARView] = useState(false); // NUEVO
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const videoRef = useRef();
  const canvasRef = useRef();
  
  // Precargar modelo
  const { loaded: modelPreloaded } = usePreloadModel(modelPath);

  // Verificar compatibilidad de cámara
  const checkCameraSupport = useCallback(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Tu navegador no soporta acceso a la cámara');
    }
    
    // Verificar HTTPS en producción
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      throw new Error('AR requiere conexión HTTPS segura');
    }
  }, []);

  // Inicializar cámara con mejor manejo de errores
  const initCamera = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🚀 Iniciando AR...');
      checkCameraSupport();

      if (!modelPreloaded) {
        throw new Error('El modelo 3D aún se está cargando');
      }

      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await new Promise((resolve, reject) => {
          const video = videoRef.current;
          video.onloadedmetadata = () => {
            video.play().then(resolve).catch(reject);
          };
          video.onerror = reject;
          setTimeout(() => reject(new Error('Timeout cargando video')), 10000);
        });
      }

      console.log('✅ AR activado correctamente');
      setArActive(true);
      setShowARView(true); // NUEVO
      setLoading(false);
    } catch (err) {
      console.error('❌ Error iniciando AR:', err);

      let errorMessage = 'Error desconocido';

      if (err.name === 'NotAllowedError') {
        errorMessage = 'Permisos de cámara denegados. Por favor, permite el acceso a la cámara.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No se encontró cámara en el dispositivo.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'Tu navegador no soporta esta funcionalidad.';
      } else {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setLoading(false);
    }
  }, [checkCameraSupport, modelPreloaded]);

  const handleCloseARView = () => {
    stopCamera();
    setShowARView(false);
  };

  // Callbacks para el modelo
  const handleModelLoad = useCallback(() => {
    console.log('✅ Modelo 3D cargado en AR');
    setModelLoaded(true);
  }, []);

  const handleModelError = useCallback((err) => {
    console.error('❌ Error cargando modelo 3D:', err);
    setError('No se pudo cargar el modelo 3D');
  }, []);

  // Detener cámara
  const stopCamera = useCallback(() => {
    console.log('🛑 Deteniendo cámara AR');
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        track.stop();
        console.log(`Track ${track.kind} detenido`);
      });
      setCameraStream(null);
    }
    setArActive(false);
    setModelLoaded(false);
  }, [cameraStream]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Debug del estado
  useEffect(() => {
    console.log('📊 Estado actual:', {
      isOpen,
      arActive,
      loading,
      modelLoaded,
      modelPreloaded,
      hasError: !!error,
      hasCameraStream: !!cameraStream
    });
  }, [isOpen, arActive, loading, modelLoaded, modelPreloaded, error, cameraStream]);

  if (!isOpen) return null;

  // Vista AR
  if (showARView) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
          style={{ transform: 'scaleX(-1)' }}
        />

        <div className="absolute inset-0 w-full h-full">
          <Canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', background: 'transparent' }}
            camera={{ position: [0, 0, 2], fov: 75, near: 0.1, far: 1000 }}
            gl={{
              alpha: true,
              preserveDrawingBuffer: true,
              antialias: false,
              powerPreference: 'high-performance'
            }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight 
              position={[2, 2, 2]} 
              intensity={0.8}
              castShadow
              shadow-mapSize={[1024, 1024]}
            />
            <pointLight position={[0, 2, 0]} intensity={0.4} />

            <ARModel3D
              modelPath={modelPath}
              scale={0.3}
              position={[0, -0.2, -0.8]}
              rotation={[0, 0, 0]}
              onLoad={handleModelLoad}
              onError={handleModelError}
            />

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
              <planeGeometry args={[4, 4]} />
              <meshLambertMaterial 
                color="#ffffff" 
                transparent 
                opacity={0.1}
                side={THREE.DoubleSide}
              />
            </mesh>

            {!modelLoaded && (
              <Html center>
                <div className="bg-black/70 text-white px-4 py-2 rounded-lg">
                  <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-sm">Cargando modelo...</p>
                </div>
              </Html>
            )}
          </Canvas>
        </div>

        {/* Controles */}
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="flex justify-between items-center">
            <button
              onClick={handleCloseARView}
              className="bg-red-500/80 hover:bg-red-600/80 text-white font-semibold px-4 py-2 rounded-lg backdrop-blur-sm"
            >
              ← Salir AR
            </button>
            
            <div className="bg-black/50 text-white px-3 py-1 rounded-lg text-sm backdrop-blur-sm">
              📱 AR: {itemName}
            </div>
          </div>
        </div>

        {/* Instrucciones */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-black/70 text-white p-4 rounded-lg backdrop-blur-sm">
            <h3 className="font-semibold mb-2">🎯 Instrucciones AR</h3>
            <ul className="text-sm space-y-1">
              <li>• Mueve el teléfono lentamente</li>
              <li>• Apunta a una superficie plana</li>
              <li>• El modelo aparecerá automáticamente</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Vista normal
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-neutral-200">
          <div>
            <h3 className="text-2xl font-bold text-neutral-950">
              Vista 3D: {itemName}
            </h3>
            <p className="text-sm text-neutral-600 mt-1">
              Visualiza el plato en realidad aumentada
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100"
          >
            ×
          </button>
        </div>

        <div className="relative h-96 md:h-[500px] bg-gradient-to-br from-neutral-50 to-neutral-100">
          <div className="w-full h-full">
            <Canvas
              camera={{ position: [0, 2, 4], fov: 45 }}
              gl={{ antialias: true, alpha: false }}
              shadows
            >
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow />
              <pointLight position={[-10, -10, -5]} intensity={0.3} />

              <ARModel3D
                modelPath={modelPath}
                scale={1.5}
                position={[0, 0, 0]}
                onLoad={handleModelLoad}
                onError={handleModelError}
              />

              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
                <planeGeometry args={[20, 20]} />
                <meshLambertMaterial color="#f0f0f0" transparent opacity={0.3} />
              </mesh>
            </Canvas>
          </div>
        </div>

        <div className="p-6 border-t border-neutral-200 bg-neutral-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-neutral-600">
              <p>📱 <strong>AR disponible:</strong> Coloca el plato en tu mesa</p>
              <p className="text-xs mt-1">
                Modelo: {modelPreloaded ? '✅ Listo' : '⏳ Cargando...'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="border border-neutral-300 text-neutral-700 hover:bg-neutral-100 px-4 py-2 rounded-md"
              >
                Cerrar
              </button>
              <button
                onClick={initCamera}
                disabled={loading || !modelPreloaded}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Iniciando...' : !modelPreloaded ? 'Cargando modelo...' : '📱 Abrir AR'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de error mejorado */}
      {error && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
          <div className="bg-white p-6 rounded-xl max-w-sm mx-4 text-center">
            <div className="text-4xl mb-4">❌</div>
            <h3 className="font-bold text-lg mb-2">Error de AR</h3>
            <p className="text-neutral-600 mb-4">{error}</p>
            <div className="text-sm text-neutral-500 mb-4">
              <p><strong>Soluciones:</strong></p>
              <p>• Recarga la página</p>  
              <p>• Verifica permisos de cámara</p>
              <p>• Usa Chrome o Safari</p>
              <p>• Asegúrate de usar HTTPS</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setError(null)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg flex-1"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setError(null);
                  initCamera();
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg flex-1"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Model3DViewer;