import React, { useRef, useEffect, useState, Suspense, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment, Html } from '@react-three/drei';
import { 
  XR, 
  useXR, 
  Interactive,
  createXRStore
} from '@react-three/xr';
import * as THREE from 'three';

// Crear store XR con configuración mejorada
const store = createXRStore({
  foveation: 0,
  frameRate: 72,
});

// Componente del modelo mejorado
function Model({ modelPath, scale = 1.5, position = [0, 0, 0], onLoaded, onError, rotation = [0, 0, 0] }) {
  const { scene, error } = useGLTF(modelPath);
  const modelRef = useRef();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (scene && !error && !isReady) {
      try {
        const clonedScene = scene.clone(true);
        const box = new THREE.Box3().setFromObject(clonedScene);
        const center = box.getCenter(new THREE.Vector3());
        
        clonedScene.position.sub(center);
        
        clonedScene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.frustumCulled = false;
            
            if (child.material) {
              child.material = child.material.clone();
              child.material.needsUpdate = true;
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
        onLoaded?.();
      } catch (err) {
        console.error('Error processing model:', err);
        onError?.(err);
      }
    }

    if (error) {
      console.error('GLTF Error:', error);
      onError?.(error);
    }
  }, [scene, error, scale, position, rotation, onLoaded, onError, isReady]);

  return <group ref={modelRef} />;
}

// Controles para el modelo 3D normal - CORREGIDO
function ModelControls({ children, enabled = true }) {
  const groupRef = useRef();
  const { gl } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const handleMouseDown = useCallback((event) => {
    if (!enabled) return;
    setIsDragging(true);
    setLastMouse({ x: event.clientX, y: event.clientY });
  }, [enabled]);

  const handleMouseMove = useCallback((event) => {
    if (!isDragging || !enabled) return;
    
    const deltaX = event.clientX - lastMouse.x;
    const deltaY = event.clientY - lastMouse.y;
    
    setRotation(prev => ({
      x: prev.x + deltaY * 0.01,
      y: prev.y + deltaX * 0.01
    }));
    
    setLastMouse({ x: event.clientX, y: event.clientY });
  }, [isDragging, lastMouse, enabled]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // CORREGIDO: Event listener para wheel sin preventDefault
  const handleWheel = useCallback((event) => {
    if (!enabled) return;
    // No usar preventDefault para evitar el warning
    const delta = event.deltaY * -0.001;
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    
    const canvas = gl.domElement;
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    // CORREGIDO: Remover passive: false
    canvas.addEventListener('wheel', handleWheel);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [enabled, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, gl.domElement]);

  useFrame(() => {
    if (groupRef.current && enabled) {
      groupRef.current.rotation.x = rotation.x;
      groupRef.current.rotation.y = rotation.y;
      groupRef.current.scale.setScalar(zoom);
    }
  });

  return (
    <group ref={groupRef}>
      {children}
    </group>
  );
}

// Componente para el modelo AR simplificado
function ARModel({ modelPath, onPlaced }) {
  const [models, setModels] = useState([]);
  const { isPresenting } = useXR();
  const [isPlaced, setIsPlaced] = useState(false);

  // Función para colocar modelo
  const placeModel = useCallback((position = [0, -0.5, -1.5]) => {
    if (!isPlaced) {
      const newModel = {
        id: Date.now(),
        position: position,
        rotation: [0, 0, 0, 1],
        scale: 0.3
      };
      
      setModels([newModel]);
      setIsPlaced(true);
      onPlaced?.(newModel);
    }
  }, [isPlaced, onPlaced]);

  // Auto-colocar modelo cuando inicia AR
  useEffect(() => {
    if (isPresenting && !isPlaced) {
      const timer = setTimeout(() => {
        placeModel([0, -0.3, -1]);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
    
    if (!isPresenting) {
      setModels([]);
      setIsPlaced(false);
    }
  }, [isPresenting, isPlaced, placeModel]);

  return (
    <>
      {models.map((model) => (
        <Interactive 
          key={model.id}
          onSelect={() => {
            console.log('Model selected:', model.id);
            setIsPlaced(false);
            setModels([]);
          }}
        >
          <group 
            position={model.position}
            quaternion={model.rotation}
            scale={model.scale}
          >
            <Suspense fallback={null}>
              <Model
                modelPath={modelPath}
                scale={1}
                position={[0, 0, 0]}
                onLoaded={() => console.log('AR Model loaded')}
                onError={(err) => console.error('AR Model error:', err)}
              />
            </Suspense>
            
            <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.2, 32]} />
              <meshBasicMaterial color="black" transparent opacity={0.2} />
            </mesh>
          </group>
        </Interactive>
      ))}
    </>
  );
}

// Componente para mostrar instrucciones AR
function ARInstructions() {
  const [showInstructions, setShowInstructions] = useState(true);
  const { isPresenting } = useXR();

  useEffect(() => {
    if (isPresenting) {
      const timer = setTimeout(() => setShowInstructions(false), 6000);
      return () => clearTimeout(timer);
    } else {
      setShowInstructions(true);
    }
  }, [isPresenting]);

  if (!isPresenting || !showInstructions) return null;

  return (
    <Html 
      center 
      distanceFactor={8}
      position={[0, 0.8, -1.5]}
      style={{
        color: 'white',
        background: 'rgba(0,0,0,0.7)',
        padding: '12px 16px',
        borderRadius: '8px',
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
        userSelect: 'none',
        pointerEvents: 'none',
        fontSize: '12px',
        maxWidth: '250px'
      }}
    >
      <div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>🎯 Modo AR Activado</h3>
        <p style={{ margin: '4px 0', fontSize: '11px' }}>El objeto aparecerá automáticamente</p>
        <p style={{ margin: '4px 0', fontSize: '11px' }}>Toca para reposicionar</p>
      </div>
    </Html>
  );
}

// Función mejorada para detectar soporte AR - CORREGIDA
function checkARSupport() {
  return new Promise((resolve) => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!navigator.xr) {
      console.log('WebXR not supported');
      resolve(false);
      return;
    }

    // CORREGIDO: Mejor manejo del resultado
    navigator.xr.isSessionSupported('immersive-ar')
      .then((supported) => {
        console.log('AR Session Support:', supported);
        console.log('Is Mobile:', isMobile);
        console.log('Navigator XR:', navigator.xr);
        
        // Resolver con boolean explícito
        const finalSupport = Boolean(supported);
        console.log('Final AR Support:', finalSupport);
        resolve(finalSupport);
      })
      .catch((error) => {
        console.log('AR Support Check Error:', error);
        // En móviles, aún podría funcionar
        const fallbackSupport = isMobile && !!navigator.xr;
        console.log('Fallback AR Support:', fallbackSupport);
        resolve(fallbackSupport);
      });
  });
}

// Hook mejorado para manejar el Canvas AR
function useARCanvas() {
  const [canvasReady, setCanvasReady] = useState(false);
  
  useEffect(() => {
    // Verificar soporte WebXR primero
    if (!navigator.xr) {
      setCanvasReady(false);
      return;
    }
    
    let timeoutId;
    let attempts = 0;
    const maxAttempts = 10;
    
    const checkCanvas = () => {
      attempts++;
      
      // Verificar si Three.js y WebXR están disponibles
      const isReady = window.THREE && navigator.xr && attempts >= 3;
      
      if (isReady || attempts >= maxAttempts) {
        setCanvasReady(isReady);
      } else {
        timeoutId = setTimeout(checkCanvas, 500);
      }
    };
    
    timeoutId = setTimeout(checkCanvas, 1000);
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);
  
  return canvasReady;
}

// Componente principal del visor 3D - CORREGIDO
function Model3DViewer({ modelPath, isOpen, onClose, itemName }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isARMode, setIsARMode] = useState(false);
  const [arSupported, setARSupported] = useState(false);
  const [checkingAR, setCheckingAR] = useState(true);
  const canvasReady = useARCanvas();

  // Verificar soporte AR mejorado
  useEffect(() => {
    let mounted = true;
    
    const checkSupport = async () => {
      try {
        setCheckingAR(true);
        const supported = await checkARSupport();
        
        if (mounted) {
          setARSupported(supported);
        }
      } catch (error) {
        console.error('Error checking AR support:', error);
        if (mounted) {
          setARSupported(false);
        }
      } finally {
        if (mounted) {
          setCheckingAR(false);
        }
      }
    };

    if (isOpen) {
      checkSupport();
    }
    
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && modelPath) {
      setLoading(true);
      setError(null);
    }
  }, [isOpen, modelPath]);

  // NUEVO: Manejo del contexto perdido de WebGL
  useEffect(() => {
    const handleContextLost = (event) => {
      console.warn('WebGL context lost, preventing default behavior');
      event.preventDefault();
      setError('Contexto 3D perdido. Refresca la página.');
    };

    const handleContextRestored = () => {
      console.log('WebGL context restored');
      setError(null);
      setLoading(true);
    };

    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('webglcontextlost', handleContextLost);
      canvas.addEventListener('webglcontextrestored', handleContextRestored);
      
      return () => {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      };
    }
  }, [isOpen]);

  const handleModelLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const handleModelError = useCallback((err) => {
    console.error('Error loading 3D model:', err);
    setError('No se pudo cargar el modelo 3D');
    setLoading(false);
  }, []);

  // CORREGIDO: Mejor manejo de entrada AR
  const handleEnterAR = async () => {
    if (!arSupported) {
      alert('AR no está disponible. Requiere dispositivo móvil con navegador compatible.');
      return;
    }

    try {
      console.log('Iniciando proceso AR...');
      
      // Asegurar que el canvas normal se cierre primero
      setLoading(true);
      
      // Esperar más tiempo para que el canvas AR se inicialice completamente
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsARMode(true);
      
      // Esperar que el canvas AR esté completamente montado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verificar que el store esté listo
      if (!store || typeof store.enterAR !== 'function') {
        throw new Error('AR Store no está inicializado correctamente');
      }
      
      await store.enterAR();
      console.log('AR iniciado correctamente');
      setLoading(false);
      
    } catch (error) {
      console.error('Error entering AR:', error);
      setIsARMode(false);
      setLoading(false);
      
      let errorMessage = 'No se pudo iniciar el modo AR. ';
      if (error.message.includes('not connected')) {
        errorMessage += 'Intenta esperar unos segundos y vuelve a intentarlo.';
      } else if (error.message.includes('not supported')) {
        errorMessage += 'AR no soportado en este dispositivo.';
      } else {
        errorMessage += 'Verifica que tengas un navegador compatible con WebXR.';
      }
      
      alert(errorMessage);
    }
  };

  const handleExitAR = () => {
    try {
      setIsARMode(false);
      store.exitAR();
    } catch (error) {
      console.error('Error exiting AR:', error);
      setIsARMode(false);
    }
  };

  if (!isOpen) return null;

  if (isARMode) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between">
          <button
            onClick={handleExitAR}
            className="bg-red-500 hover:bg-red-600 text-white font-poppins px-4 py-2 rounded-md transition-colors duration-200"
            style={{ pointerEvents: 'auto' }}
          >
            Salir AR
          </button>
          
          <div className="bg-black/50 text-white px-3 py-1 rounded-md text-sm">
            AR: {itemName}
          </div>
        </div>

        {/* CORREGIDO: Canvas AR más robusto */}
        <Canvas
          style={{ width: '100%', height: '100%' }}
          dpr={[1, 1.5]}
          gl={{ 
            preserveDrawingBuffer: true,
            alpha: true,
            antialias: false,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
            xr: { enabled: true }
          }}
          camera={{
            position: [0, 0, 0],
            fov: 75,
            near: 0.01,
            far: 20
          }}
          onCreated={({ gl, scene, camera }) => {
            // Configuración mejorada para AR
            gl.xr.enabled = true;
            console.log('AR Canvas created successfully');
            
            // Configurar la cámara para AR
            camera.matrixAutoUpdate = false;
            
            // Asegurar que el canvas esté listo
            setTimeout(() => {
              console.log('Canvas AR completamente inicializado');
            }, 500);
          }}
          onError={(error) => {
            console.error('Canvas AR Error:', error);
          }}
        >
          <XR store={store}>
            <ambientLight intensity={0.8} />
            <directionalLight 
              position={[1, 1, 1]} 
              intensity={1}
            />
            
            <ARModel 
              modelPath={modelPath}
              onPlaced={(model) => console.log('Model placed:', model)}
            />
            
            <ARInstructions />
          </XR>
        </Canvas>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-neutral-200">
          <div>
            <h3 className="text-2xl font-playfair font-bold text-neutral-950">
              Vista 3D: {itemName}
            </h3>
            <p className="text-sm font-poppins text-neutral-600 mt-1">
              Arrastra para rotar, rueda del mouse para zoom
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors duration-200"
          >
            ×
          </button>
        </div>

        {/* Visor 3D */}
        <div className="relative h-96 md:h-[500px] bg-gradient-to-br from-neutral-50 to-neutral-100">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                <p className="text-neutral-600 font-poppins">Cargando modelo 3D...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="text-6xl mb-4">🍽️</div>
                <p className="text-neutral-600 font-poppins">{error}</p>
              </div>
            </div>
          )}

          {modelPath && !error && (
            <div className="w-full h-full">
              <Canvas
                dpr={[1, 2]}
                camera={{ 
                  position: [0, 2, 4], 
                  fov: 45,
                  near: 0.1,
                  far: 1000
                }}
                gl={{ 
                  preserveDrawingBuffer: true,
                  antialias: true,
                  alpha: false,
                  powerPreference: "high-performance"
                }}
                shadows="soft"
                style={{ background: 'transparent' }}
              >
                <ambientLight intensity={0.5} />
                <directionalLight 
                  position={[10, 10, 5]} 
                  intensity={1.2}
                  castShadow
                  shadow-mapSize={[2048, 2048]}
                />
                <pointLight position={[-10, -10, -5]} intensity={0.3} />

                <Environment preset="studio" />

                <ModelControls enabled={true}>
                  <Suspense fallback={
                    <Html center>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </Html>
                  }>
                    <Model
                      modelPath={modelPath}
                      scale={1.5}
                      position={[0, 0, 0]}
                      onLoaded={handleModelLoad}
                      onError={handleModelError}
                    />
                  </Suspense>
                </ModelControls>

                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
                  <planeGeometry args={[20, 20]} />
                  <meshLambertMaterial color="#f0f0f0" transparent opacity={0.3} />
                </mesh>
              </Canvas>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-200 bg-neutral-50">
          <div className="flex justify-between items-center">
            <div className="text-sm font-poppins text-neutral-600">
              <p>💡 <strong>Tip:</strong> Arrastra para rotar, rueda del mouse para zoom</p>
              {checkingAR && (
                <p className="text-blue-600 mt-1">🔍 Verificando soporte AR...</p>
              )}
              {!checkingAR && !arSupported && (
                <p className="text-orange-600 mt-1">⚠️ AR requiere dispositivo móvil compatible</p>
              )}
              {!checkingAR && arSupported && (
                <p className="text-green-600 mt-1">✅ AR disponible</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="border border-neutral-300 text-neutral-700 hover:bg-neutral-100 font-poppins px-4 py-2 rounded-md transition-colors duration-200"
              >
                Cerrar
              </button>
              <button
                className={`font-poppins px-4 py-2 rounded-md transition-colors duration-200 ${
                  arSupported && !checkingAR && canvasReady
                    ? 'bg-primary-500 hover:bg-primary-600 text-white' 
                    : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                }`}
                onClick={handleEnterAR}
                disabled={!arSupported || checkingAR || !canvasReady}
                title={
                  checkingAR 
                    ? 'Verificando soporte AR...' 
                    : !canvasReady
                      ? 'Preparando canvas...'
                    : !arSupported 
                      ? 'AR requiere dispositivo móvil compatible' 
                      : 'Activar modo AR'
                }
              >
                🥽 {checkingAR ? 'Verificando...' : !canvasReady ? 'Preparando...' : 'Modo AR'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Model3DViewer;