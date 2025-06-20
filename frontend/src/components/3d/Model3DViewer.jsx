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

// Controles para el modelo 3D normal
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

  const handleWheel = useCallback((event) => {
    if (!enabled) return;
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

// CORREGIDO: Detección de soporte AR más precisa
function checkARSupport() {
  return new Promise((resolve) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isMobile = isIOS || isAndroid;
    
    console.log('Device Info:', { isMobile, isIOS, isAndroid });
    
    // En iOS, WebXR AR no está soportado en Safari
    if (isIOS) {
      console.log('iOS detected - WebXR AR not supported in Safari');
      resolve(false);
      return;
    }

    // Solo Android puede tener WebXR AR
    if (!navigator.xr || !isAndroid) {
      console.log('WebXR not supported or not Android');
      resolve(false);
      return;
    }

    // Verificar soporte AR en Android
    navigator.xr.isSessionSupported('immersive-ar')
      .then((supported) => {
        console.log('immersive-ar Support:', supported);
        resolve(supported);
      })
      .catch((error) => {
        console.log('AR Check Error:', error);
        resolve(false);
      });
  });
}

// NUEVO: Función para AR Quick Look en iOS
function createARQuickLook(modelPath, itemName) {
  // Crear un enlace temporal para AR Quick Look
  const link = document.createElement('a');
  
  // Convertir la ruta del modelo GLTF a USDZ si es necesario
  // Nota: Necesitarías tener versiones USDZ de tus modelos para iOS
  const usdzPath = modelPath.replace('.gltf', '.usdz').replace('.glb', '.usdz');
  
  link.href = usdzPath;
  link.rel = 'ar';
  link.setAttribute('data-ar-object', itemName);
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// SIMPLIFICADO: Hook para Canvas AR solo en Android
function useARCanvas() {
  const [canvasReady, setCanvasReady] = useState(false);
  
  useEffect(() => {
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (!navigator.xr || !isAndroid) {
      setCanvasReady(false);
      return;
    }
    
    const timer = setTimeout(() => {
      setCanvasReady(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  return canvasReady;
}

// NUEVO: Modal de información iOS
function IOSARModal({ isOpen, onClose, onUseQuickLook, itemName }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">📱</div>
          <h3 className="text-xl font-playfair font-bold text-neutral-950 mb-2">
            AR en iOS
          </h3>
          <p className="text-sm text-neutral-600">
            Safari en iOS no soporta WebXR. Puedes usar AR Quick Look si tienes el modelo en formato USDZ.
          </p>
        </div>

        <div className="space-y-3 mb-6 text-sm text-neutral-700">
          <div className="flex items-start gap-3">
            <span className="text-orange-500">⚠️</span>
            <span>WebXR no disponible en Safari iOS</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-500">ℹ️</span>
            <span>AR Quick Look requiere archivos USDZ</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-500">✓</span>
            <span>Funciona nativamente en iOS 12+</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-neutral-300 text-neutral-700 hover:bg-neutral-100 font-poppins px-4 py-2 rounded-md transition-colors duration-200"
          >
            Cerrar
          </button>
          <button
            onClick={onUseQuickLook}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-poppins px-4 py-2 rounded-md transition-colors duration-200"
          >
            Probar Quick Look
          </button>
        </div>
      </div>
    </div>
  );
}

// NUEVO: Modal de información AR mejorado
function ARInfoModal({ isOpen, onClose, onContinue }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🥽</div>
          <h3 className="text-xl font-playfair font-bold text-neutral-950 mb-2">
            Modo AR WebXR
          </h3>
          <p className="text-sm text-neutral-600">
            Tu dispositivo Android soporta WebXR. Vamos a iniciar el modo AR.
          </p>
        </div>

        <div className="space-y-3 mb-6 text-sm text-neutral-700">
          <div className="flex items-start gap-3">
            <span className="text-green-500">✓</span>
            <span>WebXR disponible</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-500">✓</span>
            <span>AR inmersivo soportado</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-500">ℹ️</span>
            <span>Permitir acceso a la cámara</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-neutral-300 text-neutral-700 hover:bg-neutral-100 font-poppins px-4 py-2 rounded-md transition-colors duration-200"
          >
            Cancelar
          </button>
          <button
            onClick={onContinue}
            className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-poppins px-4 py-2 rounded-md transition-colors duration-200"
          >
            Iniciar AR
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente principal del visor 3D - CORREGIDO
function Model3DViewer({ modelPath, isOpen, onClose, itemName }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isARMode, setIsARMode] = useState(false);
  const [arSupported, setARSupported] = useState(false);
  const [checkingAR, setCheckingAR] = useState(true);
  const [showARInfo, setShowARInfo] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const canvasReady = useARCanvas();

  // Detectar iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  // Verificar soporte AR
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

  const handleModelLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const handleModelError = useCallback((err) => {
    console.error('Error loading 3D model:', err);
    setError('No se pudo cargar el modelo 3D');
    setLoading(false);
  }, []);

  // Manejo del botón AR
  const handleARButtonClick = () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else if (arSupported) {
      setShowARInfo(true);
    } else {
      alert('AR no está disponible en este dispositivo. Necesitas Chrome/Edge en Android con WebXR.');
    }
  };

  // AR Quick Look para iOS
  const handleQuickLook = () => {
    setShowIOSModal(false);
    try {
      createARQuickLook(modelPath, itemName);
    } catch (error) {
      console.error('Error launching AR Quick Look:', error);
      alert('No se pudo iniciar AR Quick Look. Asegúrate de que el modelo esté en formato USDZ.');
    }
  };

  // WebXR para Android
  const handleEnterAR = async () => {
    setShowARInfo(false);
    
    try {
      console.log('Iniciando WebXR AR...');
      setLoading(true);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsARMode(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await store.enterAR();
      console.log('AR iniciado correctamente');
      setLoading(false);
      
    } catch (error) {
      console.error('Error entering AR:', error);
      setIsARMode(false);
      setLoading(false);
      
      alert('No se pudo iniciar AR. Asegúrate de permitir el acceso a la cámara y usar un navegador compatible con WebXR.');
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

  // Modo AR solo para Android
  if (isARMode && !isIOS) {
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
          onCreated={({ gl }) => {
            gl.xr.enabled = true;
            console.log('AR Canvas created');
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
    <>
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
                {!checkingAR && isIOS && (
                  <p className="text-blue-600 mt-1">📱 AR Quick Look disponible (requiere USDZ)</p>
                )}
                {!checkingAR && !isIOS && !arSupported && (
                  <p className="text-orange-600 mt-1">⚠️ WebXR AR no disponible</p>
                )}
                {!checkingAR && !isIOS && arSupported && (
                  <p className="text-green-600 mt-1">🥽 WebXR AR disponible</p>
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
                    !checkingAR
                      ? isIOS 
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : arSupported && canvasReady
                          ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                          : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                      : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                  }`}
                  onClick={handleARButtonClick}
                  disabled={checkingAR || (!isIOS && (!arSupported || !canvasReady))}
                  title={
                    checkingAR 
                      ? 'Verificando soporte AR...' 
                      : isIOS
                        ? 'Usar AR Quick Look (iOS)'
                        : !canvasReady
                          ? 'Preparando canvas...'
                          : !arSupported 
                            ? 'WebXR AR no disponible' 
                            : 'Iniciar WebXR AR'
                  }
                >
                  {isIOS ? '📱 Quick Look' : checkingAR ? 'Verificando...' : !canvasReady ? 'Preparando...' : '🥽 WebXR AR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}
      <IOSARModal 
        isOpen={showIOSModal}
        onClose={() => setShowIOSModal(false)}
        onUseQuickLook={handleQuickLook}
        itemName={itemName}
      />

      <ARInfoModal 
        isOpen={showARInfo}
        onClose={() => setShowARInfo(false)}
        onContinue={handleEnterAR}
      />
    </>
  );
}

export default Model3DViewer;