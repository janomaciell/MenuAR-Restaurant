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

// Crear store XR
const store = createXRStore();

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
    event.preventDefault();
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

// Componente para el modelo AR con hit testing real
function ARModel({ modelPath, onPlaced }) {
  const [models, setModels] = useState([]);
  const { isPresenting } = useXR();
  
  // Hit testing real con WebXR
  useHitTest((hitMatrix, hit) => {
    if (!isPresenting) return;
    
    // Crear nuevo modelo en la posición detectada
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    
    hitMatrix.decompose(position, rotation, scale);
    
    const newModel = {
      id: Date.now(),
      position: position.toArray(),
      rotation: [rotation.x, rotation.y, rotation.z, rotation.w],
      scale: 0.3
    };
    
    setModels(prev => [...prev, newModel]);
    onPlaced?.(newModel);
  });

  return (
    <>
      {models.map((model) => (
        <Interactive 
          key={model.id}
          onSelect={() => console.log('Model selected:', model.id)}
          onHover={() => console.log('Model hovered:', model.id)}
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
            
            {/* Sombra circular debajo del modelo */}
            <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.5, 32]} />
              <meshBasicMaterial color="black" transparent opacity={0.3} />
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
      const timer = setTimeout(() => setShowInstructions(false), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowInstructions(true);
    }
  }, [isPresenting]);

  if (!isPresenting || !showInstructions) return null;

  return (
    <Html 
      center 
      distanceFactor={10}
      style={{
        color: 'white',
        background: 'rgba(0,0,0,0.8)',
        padding: '20px',
        borderRadius: '10px',
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
        userSelect: 'none',
        pointerEvents: 'none'
      }}
    >
      <div>
        <h3>🎯 Modo AR Activado</h3>
        <p>Apunta tu dispositivo hacia una superficie</p>
        <p>Toca la pantalla para colocar el objeto</p>
      </div>
    </Html>
  );
}

// Componente principal del visor 3D actualizado
function Model3DViewer({ modelPath, isOpen, onClose, itemName }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isARMode, setIsARMode] = useState(false);
  const [arSupported, setARSupported] = useState(false);

  // Verificar soporte AR
  useEffect(() => {
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
        setARSupported(supported);
        console.log('AR Support:', supported);
      }).catch((err) => {
        console.log('AR Support Check Error:', err);
        setARSupported(false);
      });
    } else {
      console.log('WebXR not available');
      setARSupported(false);
    }
  }, []);

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

  const handleEnterAR = () => {
    if (arSupported) {
      setIsARMode(true);
      // Iniciar sesión AR
      store.enterAR();
    }
  };

  const handleExitAR = () => {
    setIsARMode(false);
    store.exitAR();
  };

  if (!isOpen) return null;

  if (isARMode) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {/* Botón para salir AR */}
        <button
          onClick={handleExitAR}
          className="absolute top-4 right-4 z-10 bg-red-500 hover:bg-red-600 text-white font-poppins px-4 py-2 rounded-md transition-colors duration-200"
          style={{ pointerEvents: 'auto' }}
        >
          Salir AR
        </button>

        <Canvas
          style={{ width: '100%', height: '100%' }}
          dpr={[1, 2]}
          gl={{ 
            preserveDrawingBuffer: true,
            alpha: true,
            antialias: true
          }}
        >
          <XR store={store}>
            {/* Luces optimizadas para AR */}
            <ambientLight intensity={0.8} />
            <directionalLight 
              position={[5, 5, 5]} 
              intensity={1.5}
              castShadow
              shadow-mapSize={[1024, 1024]}
            />
            
            <Environment preset="park" />
            
            {/* Modelo AR con hit testing real */}
            <ARModel 
              modelPath={modelPath}
              onPlaced={(model) => console.log('Model placed:', model)}
            />
            
            {/* Instrucciones */}
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
              {!arSupported && (
                <p className="text-orange-600 mt-1">⚠️ AR no disponible en este dispositivo</p>
              )}
              {arSupported && (
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
                  arSupported 
                    ? 'bg-primary-500 hover:bg-primary-600 text-white' 
                    : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                }`}
                onClick={handleEnterAR}
                disabled={!arSupported}
                title={!arSupported ? 'AR no soportado en este dispositivo' : 'Activar modo AR'}
              >
                🥽 Modo AR Real
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Model3DViewer;