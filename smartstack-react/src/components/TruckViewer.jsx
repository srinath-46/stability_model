import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { TRUCKS } from '../data/trucks';

// Box component with drop animation
function Box({ item, container, animate = true }) {
  const meshRef = useRef();
  const targetY = item.y + item.h / 2 + 12;
  const initialY = animate ? targetY + 100 : targetY;
  
  useFrame(() => {
    if (meshRef.current && meshRef.current.position.y > targetY) {
      meshRef.current.position.y -= 5;
      if (meshRef.current.position.y < targetY) {
        meshRef.current.position.y = targetY;
      }
    }
  });

  const x = item.x + item.l / 2 - container.w / 2;
  const z = item.z + item.w / 2 - container.d / 2;

  return (
    <mesh
      ref={meshRef}
      position={[x, initialY, z]}
      castShadow
      receiveShadow
      userData={item}
      onClick={(e) => {
        e.stopPropagation();
        if (item.onClick) item.onClick(item, e);
      }}
    >
      <boxGeometry args={[item.l, item.h, item.w]} />
      <meshStandardMaterial 
        color={item.color} 
        transparent 
        opacity={0.9}
        metalness={0.3}
        roughness={0.4}
      />
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(item.l, item.h, item.w)]} />
        <lineBasicMaterial color="black" />
      </lineSegments>
    </mesh>
  );
}

// Truck model component
function TruckModel({ truckKey, container }) {
  const truck = TRUCKS[truckKey];
  const { w: W, h: H, d: D, color, scale: cabScale } = truck;
  const truckColor = new THREE.Color(color);
  
  const cabW = 35 * cabScale;
  const cabH = 45 * cabScale;
  const cabD = 50 * cabScale;

  return (
    <group>
      {/* Cab */}
      <mesh position={[-W/2 - cabW/2 - 5, cabH/2 + 5, 0]} castShadow>
        <boxGeometry args={[cabW, cabH, cabD]} />
        <meshStandardMaterial color={truckColor} metalness={0.6} roughness={0.3} />
      </mesh>
      
      {/* Nose */}
      <mesh position={[-W/2 - cabW - cabW * 0.25, cabH * 0.35, 0]} castShadow>
        <boxGeometry args={[cabW * 0.5, cabH * 0.6, cabD * 0.9]} />
        <meshStandardMaterial color={truckColor} metalness={0.6} roughness={0.3} />
      </mesh>
      
      {/* Windshield */}
      <mesh position={[-W/2 - cabW/2, cabH * 0.75, 0]}>
        <boxGeometry args={[3, cabH * 0.5, cabD * 0.75]} />
        <meshStandardMaterial color="#334455" transparent opacity={0.7} metalness={0.9} />
      </mesh>
      
      {/* Grille */}
      <mesh position={[-W/2 - cabW - cabW * 0.5, cabH * 0.35, 0]}>
        <boxGeometry args={[4, cabH * 0.4, cabD * 0.7]} />
        <meshStandardMaterial color="#cccccc" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Headlights */}
      {[-1, 1].map(side => (
        <mesh key={`headlight-${side}`} position={[-W/2 - cabW - cabW * 0.45, cabH * 0.4, side * cabD * 0.35]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[3 * cabScale, 3 * cabScale, 2, 16]} />
          <meshStandardMaterial color="#ffff99" emissive="#ffff44" emissiveIntensity={0.5} />
        </mesh>
      ))}
      
      {/* Wheels */}
      {[
        [-W/2 - cabW * 0.7],
        [-W/2 - cabW * 0.2],
        [W/2 - 25 * cabScale],
        [W/2 - 8 * cabScale]
      ].map(([xPos], i) => (
        [-1, 1].map(side => (
          <group key={`wheel-${i}-${side}`}>
            <mesh position={[xPos, 10 * cabScale, side * (D/2 + 5)]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[10 * cabScale, 10 * cabScale, 8 * cabScale, 24]} />
              <meshStandardMaterial color="#111111" roughness={0.9} />
            </mesh>
            <mesh position={[xPos, 10 * cabScale, side * (D/2 + 5)]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[4 * cabScale, 4 * cabScale, 9 * cabScale, 16]} />
              <meshStandardMaterial color="#cccccc" metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
        ))
      ))}
      
      {/* Container outline */}
      <lineSegments position={[0, H/2 + 12, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(W, H, D)]} />
        <lineBasicMaterial color={truckColor} />
      </lineSegments>
      
      {/* Container floor */}
      <mesh position={[0, 11, 0]} receiveShadow>
        <boxGeometry args={[W, 3, D]} />
        <meshStandardMaterial color={truckColor} metalness={0.4} roughness={0.5} />
      </mesh>
      
      {/* Transparent walls */}
      <mesh position={[-W/2, H/2 + 12, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color={truckColor} transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      
      {[-1, 1].map(side => (
        <mesh key={`wall-${side}`} position={[0, H/2 + 12, side * D/2]}>
          <planeGeometry args={[W, H]} />
          <meshStandardMaterial color={truckColor} transparent opacity={0.12} side={THREE.DoubleSide} />
        </mesh>
      ))}
      
      <mesh position={[0, H + 12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color={truckColor} transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// Main TruckViewer component
export default function TruckViewer({ truckKey = 'medium', packedItems = [], onBoxClick, animate = true }) {
  const truck = TRUCKS[truckKey];
  const container = { w: truck.w, h: truck.h, d: truck.d };
  const cameraDistance = 280 * truck.scale;
  
  const handleItemClick = (item, event) => {
    if (onBoxClick) {
      onBoxClick(item, event);
    }
  };

  return (
    <Canvas
      shadows
      camera={{ position: [cameraDistance, cameraDistance * 0.7, cameraDistance * 0.8], fov: 50 }}
      style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 100%)' }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[100, 200, 100]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-150, 100, 0]} color="#ff3333" intensity={0.4} distance={400} />
      <pointLight position={[150, 80, 100]} color="#3366ff" intensity={0.3} distance={400} />
      
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[800, 800]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.8} />
      </mesh>
      
      {/* Grid */}
      <gridHelper args={[500, 50, '#333355', '#222233']} />
      
      {/* Truck */}
      <TruckModel truckKey={truckKey} container={container} />
      
      {/* Packed boxes */}
      {packedItems.map((item, i) => (
        <Box 
          key={item.id ?? i} 
          item={{ ...item, onClick: handleItemClick }} 
          container={container}
          animate={animate}
        />
      ))}
      
      {/* Controls */}
      <OrbitControls 
        enableDamping 
        dampingFactor={0.05} 
        target={[0, 40 * truck.scale, 0]} 
      />
    </Canvas>
  );
}
