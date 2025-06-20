import React, { useRef, useEffect, useState, Suspense, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';

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

// Controles para el modelo 3D
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

// Componente principal del visor 3D
function Model3DViewer({ modelPath, isOpen, onClose, itemName }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isARMode, setIsARMode] = useState(false);

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

  const handleARMode = () => {
    setIsARMode(true);
  };

  if (!isOpen) return null;

  if (isARMode) {
    return (
      <ARViewer
        modelPath={modelPath}
        itemName={itemName}
        isOpen={isOpen}
        onClose={() => {
          setIsARMode(false);
          onClose();
        }}
        onBackToNormal={() => setIsARMode(false)}
      />
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
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="border border-neutral-300 text-neutral-700 hover:bg-neutral-100 font-poppins px-4 py-2 rounded-md transition-colors duration-200"
              >
                Cerrar
              </button>
              <button
                className="bg-primary-500 hover:bg-primary-600 text-white font-poppins px-4 py-2 rounded-md transition-colors duration-200"
                onClick={handleARMode}
              >
                🥽 Modo AR
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente AR completamente rediseñado y corregido
function ARViewer({ modelPath, itemName, onClose, onBackToNormal, isOpen }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const textureRef = useRef(null);
  const mountedRef = useRef(true);
  
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Estados para detección de superficie (simulados)
  const [surfaceData, setSurfaceData] = useState({
    detected: false,
    position: [0, 0, -1],
    confidence: 0,
    dimensions: { width: 0, height: 0 }
  });

  // Estados para el modelo
  const [modelState, setModelState] = useState({
    position: [0, 0, -1],
    scale: 0.3,
    rotation: [0, 0, 0],
    isPlaced: false
  });

  // Función para limpiar recursos
  const cleanupResources = useCallback(() => {
    console.log('ARViewer: Cleaning up resources...');
    
    // Detener stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('ARViewer: Track stopped:', track.kind);
      });
      streamRef.current = null;
    }

    // Limpiar video element
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.load(); // Reset video element
      if (videoRef.current.parentNode) {
        videoRef.current.parentNode.removeChild(videoRef.current);
      }
      videoRef.current = null;
    }

    // Limpiar texture
    if (textureRef.current) {
      textureRef.current.dispose();
      textureRef.current = null;
    }

    setIsReady(false);
    setIsLoading(true);
  }, []);

  // Configuración de la cámara
  const initializeCamera = useCallback(async () => {
    if (!mountedRef.current) return;
    
    console.log('ARViewer: Initializing camera...');
    setIsLoading(true);
    setError(null);

    try {
      // Limpiar recursos previos
      cleanupResources();

      // Crear nuevo elemento video
      const videoElement = document.createElement('video');
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.muted = true;
      videoElement.style.position = 'absolute';
      videoElement.style.top = '-9999px';
      videoElement.style.left = '-9999px';
      videoElement.style.width = '1px';
      videoElement.style.height = '1px';
      
      document.body.appendChild(videoElement);
      videoRef.current = videoElement;

      // Configurar constraints
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30 }
        },
        audio: false,
      };

      // Obtener stream
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (!mountedRef.current) {
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = mediaStream;
      console.log('ARViewer: Stream obtained successfully');

      // Configurar video
      videoElement.srcObject = mediaStream;

      // Esperar a que el video esté listo
      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Video metadata loading timeout'));
        }, 10000);

        const onLoadedMetadata = () => {
          clearTimeout(timeoutId);
          console.log('ARViewer: Video metadata loaded');
          resolve();
        };

        const onError = (err) => {
          clearTimeout(timeoutId);
          console.error('ARViewer: Video error:', err);
          reject(err);
        };

        videoElement.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
        videoElement.addEventListener('error', onError, { once: true });
      });

      // Reproducir video
      await videoElement.play();
      console.log('ARViewer: Video playing successfully');

      if (mountedRef.current) {
        setIsReady(true);
        setIsLoading(false);
        startSurfaceDetection();
      }

    } catch (err) {
      console.error('ARViewer: Camera initialization error:', err);
      
      if (!mountedRef.current) return;

      let errorMessage = 'No se pudo acceder a la cámara.';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Permisos de cámara denegados. Por favor, permite el acceso a la cámara.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No se encontró ninguna cámara disponible.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'La cámara está siendo usada por otra aplicación.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Las restricciones de la cámara no se pueden cumplir.';
      } else if (err.name === 'AbortError') {
        errorMessage = 'La inicialización de la cámara fue interrumpida.';
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [cleanupResources]);

  // Detección de superficie simulada
  const startSurfaceDetection = useCallback(() => {
    let detectionProgress = 0;
    const detectionInterval = setInterval(() => {
      if (!mountedRef.current) {
        clearInterval(detectionInterval);
        return;
      }

      detectionProgress += 0.1;
      
      if (detectionProgress >= 1) {
        setSurfaceData(prev => ({
          ...prev,
          detected: true,
          confidence: 1,
          dimensions: { width: 1.2, height: 0.8 },
          position: [0, -0.5, -1]
        }));
        setModelState(prev => ({
          ...prev,
          position: [0, -0.4, -1],
          scale: 0.2,
          isPlaced: true
        }));
        clearInterval(detectionInterval);
      } else {
        setSurfaceData(prev => ({
          ...prev,
          confidence: detectionProgress
        }));
      }
    }, 200);

    return () => clearInterval(detectionInterval);
  }, []);

  // Componente para manejar el fondo de video
  const VideoBackground = () => {
    const { scene } = useThree();
    
    useEffect(() => {
      if (!videoRef.current || !mountedRef.current) return;
      
      const video = videoRef.current;
      
      const updateTexture = () => {
        if (video.readyState >= video.HAVE_CURRENT_DATA) {
          if (!textureRef.current) {
            textureRef.current = new THREE.VideoTexture(video);
            textureRef.current.minFilter = THREE.LinearFilter;
            textureRef.current.magFilter = THREE.LinearFilter;
            textureRef.current.format = THREE.RGBAFormat;
            scene.background = textureRef.current;
            console.log('ARViewer: Video texture created and set as background');
          }
          textureRef.current.needsUpdate = true;
        }
      };

      // Actualizar inmediatamente si el video ya está listo
      updateTexture();

      // Escuchar eventos del video
      video.addEventListener('loadeddata', updateTexture);
      video.addEventListener('timeupdate', updateTexture);

      return () => {
        video.removeEventListener('loadeddata', updateTexture);
        video.removeEventListener('timeupdate', updateTexture);
      };
    }, [scene]);

    return null;
  };

  // Modelo AR con tracking
  const ARModel = () => {
    const modelRef = useRef();
    const [deviceMotion, setDeviceMotion] = useState({ x: 0, y: 0, z: 0 });
    
    useEffect(() => {
      const handleDeviceMotion = (event) => {
        if (event.accelerationIncludingGravity) {
          setDeviceMotion({
            x: event.accelerationIncludingGravity.x || 0,
            y: event.accelerationIncludingGravity.y || 0,
            z: event.accelerationIncludingGravity.z || 0
          });
        }
      };

      window.addEventListener('devicemotion', handleDeviceMotion);
      return () => window.removeEventListener('devicemotion', handleDeviceMotion);
    }, []);

    useFrame(() => {
      if (modelRef.current && modelState.isPlaced) {
        const dampingFactor = 0.1;
        const motionOffset = {
          x: deviceMotion.x * dampingFactor * 0.01,
          y: deviceMotion.y * dampingFactor * 0.01,
          z: 0
        };

        modelRef.current.position.set(
          modelState.position[0] + motionOffset.x,
          modelState.position[1] + motionOffset.y,
          modelState.position[2]
        );
        modelRef.current.scale.setScalar(modelState.scale);
      }
    });

    return (
      <group ref={modelRef}>
        <Suspense fallback={null}>
          <Model
            modelPath={modelPath}
            scale={1}
            position={[0, 0, 0]}
            onLoaded={() => {}}
            onError={() => {}}
          />
        </Suspense>
      </group>
    );
  };

  // Effect principal para inicializar cuando se abre
  useEffect(() => {
    mountedRef.current = true;
    
    if (isOpen) {
      initializeCamera();
    }

    return () => {
      mountedRef.current = false;
      cleanupResources();
    };
  }, [isOpen]); // Solo depende de isOpen para evitar re-renders

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      console.log('ARViewer: Component unmounting');
      mountedRef.current = false;
      cleanupResources();
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/70 text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-lg font-poppins">Preparando cámara AR...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/70 text-white">
          <div className="text-center p-4">
            <p className="text-lg font-poppins text-red-400">Error en Modo AR:</p>
            <p className="text-md font-poppins mt-2">{error}</p>
            <button
              onClick={onBackToNormal}
              className="mt-6 bg-primary-500 hover:bg-primary-600 text-white font-poppins px-6 py-3 rounded-md transition-colors duration-200"
            >
              Volver
            </button>
          </div>
        </div>
      )}

      {isReady && !error && (
        <div className="w-full h-full relative">
          <Canvas
            ref={canvasRef}
            dpr={[1, 2]}
            camera={{
              position: [0, 0, 0],
              fov: 75,
              near: 0.1,
              far: 1000
            }}
            gl={{
              preserveDrawingBuffer: true,
              antialias: true,
              alpha: true,
              powerPreference: "high-performance"
            }}
            shadows="soft"
            style={{ background: 'transparent' }}
          >
            <VideoBackground />
            
            <ambientLight intensity={0.5} />
            <directionalLight
              position={[10, 10, 5]}
              intensity={1.2}
              castShadow
              shadow-mapSize={[2048, 2048]}
            />
            <pointLight position={[-10, -10, -5]} intensity={0.3} />

            <Environment preset="studio" />

            {surfaceData.detected && modelState.isPlaced && <ARModel />}

            {/* UI para detección de superficie */}
            {!surfaceData.detected && (
              <Html center>
                <div className="text-white text-center p-4 bg-black/50 rounded-lg">
                  <p className="text-lg font-poppins">Buscando superficie...</p>
                  <div className="w-24 h-2 bg-neutral-600 rounded-full mx-auto mt-2">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all duration-300"
                      style={{ width: `${surfaceData.confidence * 100}%` }}
                    ></div>
                  </div>
                </div>
              </Html>
            )}

            {/* Simulación de plano de superficie */}
            {surfaceData.detected && (
              <mesh position={surfaceData.position} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[surfaceData.dimensions.width, surfaceData.dimensions.height]} />
                <meshBasicMaterial color="blue" transparent opacity={0.2} />
              </mesh>
            )}
          </Canvas>

          {/* Botones de control AR */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4 z-20">
            <button
              onClick={onBackToNormal}
              className="bg-neutral-700 hover:bg-neutral-800 text-white font-poppins px-4 py-2 rounded-md transition-colors duration-200"
            >
              Volver
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Model3DViewer;