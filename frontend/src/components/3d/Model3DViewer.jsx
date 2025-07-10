import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';

// Hook para precargar modelos 3D
function usePreloadModel(modelPath) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (modelPath) {
      useGLTF.preload(modelPath); // ✅ DEBE estar siempre en tope del useEffect

      const timer = setTimeout(() => {
        setLoaded(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [modelPath]);

  return { loaded };
}


// Detector de planos mejorado
function ARPlaneDetector({ onPlaneDetected, isActive }) {
  const { gl, camera } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const [hasDetected, setHasDetected] = useState(false);

  const handleTouch = useCallback((event) => {
    if (!isActive) return;
    
    const rect = gl.domElement.getBoundingClientRect();
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, camera);
    
    // Crear un plano invisible para detectar toques (simula la mesa)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.5);
    const intersection = new THREE.Vector3();
    
    if (raycaster.current.ray.intersectPlane(plane, intersection)) {
      intersection.y = -0.5; // Altura fija de la mesa
      onPlaneDetected(intersection);
      setHasDetected(true);
    }
  }, [camera, gl, isActive, onPlaneDetected]);

  useEffect(() => {
    if (isActive && gl.domElement) {
      gl.domElement.addEventListener('click', handleTouch);
      gl.domElement.addEventListener('touchend', handleTouch);
      
      return () => {
        gl.domElement.removeEventListener('click', handleTouch);
        gl.domElement.removeEventListener('touchend', handleTouch);
      };
    }
  }, [gl, handleTouch, isActive]);

  return null;
}

// Modelo AR mejorado
function ARModel3D({ 
  modelPath, 
  scale = 0.3, 
  position = [0, -0.5, -1], 
  onLoad, 
  onError,
  isPlaced = false 
}) {
  const { scene, error } = useGLTF(modelPath, true);

  const modelRef = useRef();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (scene && !error && !isReady) {
      try {
        const cloned = scene.clone(true);
        
        // Centrar el modelo
        const box = new THREE.Box3().setFromObject(cloned);
        const center = box.getCenter(new THREE.Vector3());
        cloned.position.sub(center);
        
        // Optimizar el modelo
        cloned.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.frustumCulled = false;
            
            if (child.material) {
              child.material = child.material.clone();
              child.material.needsUpdate = true;
              
              // Optimizar texturas
              if (child.material.map) {
                child.material.map.minFilter = THREE.LinearFilter;
                child.material.map.magFilter = THREE.LinearFilter;
                child.material.map.generateMipmaps = false;
              }
            }
          }
        });
        
        if (modelRef.current) {
          while (modelRef.current.children.length) {
            modelRef.current.remove(modelRef.current.children[0]);
          }

          modelRef.current.add(cloned);
          modelRef.current.scale.set(scale, scale, scale);
          modelRef.current.position.set(...position);
          setIsReady(true);
          if (onLoad) onLoad(); // ✅ Llamalo apenas está listo
        }
        
        setIsReady(true);
        if (onLoad) onLoad();
      } catch (e) {
        console.error('Error cargando modelo:', e);
        if (onError) onError(e);
      }
    }
  }, [scene, error, scale, position, isReady, onLoad, onError]);

  useFrame((state) => {
    if (modelRef.current && isReady && isPlaced) {
      // Rotación suave
      modelRef.current.rotation.y += 0.003;
      
      // Animación flotante muy sutil
      const baseY = position[1];
      modelRef.current.position.y = baseY + Math.sin(state.clock.elapsedTime * 2) * 0.008;
    }
  });

  return (
    <group ref={modelRef}>
      {/* Sombra circular debajo del modelo */}
      {isReady && (
        <mesh position={[0, -0.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <circleGeometry args={[scale * 0.6, 32]} />
          <meshLambertMaterial 
            color="#000000" 
            transparent 
            opacity={0.2} 
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

// Componente principal
function Model3DViewer({ modelPath, isOpen, onClose, itemName }) {
  const [arActive, setArActive] = useState(false);
  const [showARView, setShowARView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelPosition, setModelPosition] = useState([0, -0.5, -1]);
  const [modelPlaced, setModelPlaced] = useState(false);
  const videoRef = useRef();
  
  // Precargar el modelo
  const { loaded: modelPreloaded, error: preloadError } = usePreloadModel(modelPath);

  // Inicializar cámara
  const initCamera = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Tu navegador no soporta acceso a la cámara');
      }
      
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error('La funcionalidad AR requiere conexión HTTPS');
      }
      
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, min: 20 }
        },
        audio: false
      };
      console.log('Solicitando acceso a la cámara con:', constraints);
      navigator.permissions?.query({ name: 'camera' }).then((result) => {
        console.log('Estado del permiso de cámara:', result.state);
      });

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
        };
      }
      
      setArActive(true);
      setModelPlaced(false);
      
    } catch (err) {
      console.error('Error iniciando cámara:', err);
      setError(err.message || 'Error al acceder a la cámara');
    } finally {
      setLoading(false);
    }
  }, []);

  // Detener cámara
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setArActive(false);
    setModelLoaded(false);
    setModelPlaced(false);
  }, [cameraStream]);

  // Manejar detección de plano
  const handlePlaneDetected = useCallback((position) => {
    console.log('Superficie detectada en:', position);
    setModelPosition([position.x, position.y, position.z]);
    setModelPlaced(true);
  }, []);

  // Manejar carga del modelo
  const handleModelLoad = useCallback(() => {
    console.log('Modelo 3D cargado correctamente');
    setModelLoaded(true);
  }, []);

  // Manejar error del modelo
  const handleModelError = useCallback((err) => {
    console.error('Error cargando modelo 3D:', err);
    setError('No se pudo cargar el modelo 3D');
  }, []);

  // Limpiar recursos al desmontar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Manejar errores de precarga
  useEffect(() => {
    if (preloadError) {
      setError('Error cargando el modelo 3D');
    }
  }, [preloadError]);

  if (!isOpen) return null;

  return showARView ? (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Video de cámara */}
      <video 
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
        style={{ transform: 'scaleX(-1)' }}
      />
      
      {/* Canvas 3D */}
      <div className="absolute inset-0 w-full h-full">
        <Canvas
          camera={{ 
            position: [0, 0, 2], 
            fov: 75, 
            near: 0.1, 
            far: 100
          }}
          gl={{ 
            alpha: true, 
            antialias: true,
            powerPreference: 'high-performance'
          }}
        >
          {/* Iluminación */}
          <ambientLight intensity={0.8} />
          <directionalLight 
            position={[5, 5, 5]} 
            intensity={1} 
            castShadow
          />
          <pointLight position={[-5, 5, 5]} intensity={0.5} />
          
          {/* Modelo 3D */}
          {modelPreloaded && (
            <ARModel3D
              modelPath={modelPath}
              scale={0.25}
              position={modelPosition}
              onLoad={handleModelLoad}
              onError={handleModelError}
              isPlaced={modelPlaced}
            />
          )}

          
          {/* Detector de planos */}
          <ARPlaneDetector 
            onPlaneDetected={handlePlaneDetected}
            isActive={arActive}
          />
          
          {/* Indicador de carga */}
          {!modelLoaded && (
            <Html center>
              <div className="bg-black/80 text-white px-6 py-4 rounded-xl backdrop-blur-sm">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div>
                  <div>
                    <p className="font-medium">Cargando modelo 3D...</p>
                    <p className="text-sm text-gray-300">Espera un momento</p>
                  </div>
                </div>
              </div>
            </Html>
          )}
        </Canvas>
      </div>
      
      {/* Controles superiores */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
        <button
          onClick={() => {
            stopCamera();
            setShowARView(false);
          }}
          className="bg-red-500/90 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg"
        >
          ← Salir AR
        </button>
        
        <div className="bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
          <span className="text-sm">📱 {itemName}</span>
        </div>
      </div>
      
      {/* Instrucciones */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="bg-black/80 text-white p-4 rounded-xl backdrop-blur-sm">
          <h3 className="font-semibold mb-2 text-center">
            {modelPlaced ? '✅ Plato colocado en la mesa' : '🎯 Coloca el plato'}
          </h3>
          
          {!modelPlaced ? (
            <div className="text-sm space-y-1 text-center">
              <p>• Apunta la cámara hacia tu mesa</p>
              <p>• Toca la pantalla donde quieres el plato</p>
              <p>• El modelo aparecerá en tamaño real</p>
            </div>
          ) : (
            <div className="text-sm text-center">
              <p className="text-green-400">¡Perfecto! Ahora puedes ver el plato en tu mesa</p>
              <p className="text-xs mt-1">Muévete para verlo desde diferentes ángulos</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Modal de error */}
      {error && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="font-bold text-lg mb-2">Error AR</h3>
            <p className="text-gray-600 mb-4 text-sm">{error}</p>
            <div className="flex gap-2">
              <button 
                onClick={() => setError(null)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex-1 transition-colors"
              >
                Cerrar
              </button>
              <button 
                onClick={() => {
                  setError(null);
                  initCamera();
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex-1 transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : (
    // Vista previa normal
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">Vista 3D: {itemName}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Visualiza el plato en realidad aumentada en tu mesa
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-3xl transition-colors"
          >
            ×
          </button>
        </div>
        
        {/* Preview 3D */}
        <div className="relative h-96 md:h-[500px] bg-gray-50">
          <Canvas camera={{ position: [0, 2, 4], fov: 45 }} shadows>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
            <pointLight position={[-10, -10, -5]} intensity={0.4} />
            
            <ARModel3D 
              modelPath={modelPath} 
              scale={0.4} 
              position={[0, -0.5, 0]}
              isPlaced={true}
            />
            
            {/* Superficie de la mesa */}
            <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
              <planeGeometry args={[20, 20]} />
              <meshLambertMaterial color="#f8f9fa" transparent opacity={0.8} />
            </mesh>
          </Canvas>
          
          {/* Overlay de carga */}
          {!modelPreloaded && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-gray-600 font-medium">Cargando modelo 3D...</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm">
              <p className="font-medium text-gray-800 mb-1">
                📱 <span className="text-blue-600">AR disponible</span>: Ve el plato en tu mesa real
              </p>
              <p className="text-xs text-gray-500">
                Estado: {modelPreloaded ? '✅ Modelo listo' : '⏳ Cargando modelo...'}
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
              >
                Cerrar
              </button>
              <button 
                onClick={async () => {
                  await initCamera();     // ✅ Inicia la cámara
                  setShowARView(true);    // ✅ Luego muestra la vista AR
                }}
                disabled={!modelPreloaded || loading}
                className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors font-medium"
              >
                {loading ? 'Iniciando...' : '📱 Abrir AR'}
              </button>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Model3DViewer;