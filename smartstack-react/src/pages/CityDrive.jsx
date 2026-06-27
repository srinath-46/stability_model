import { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import './CityDrive.css';

// ─────────────────────────────────────────────
// CITY DATA  (computed once at module level)
// ─────────────────────────────────────────────
function seeded(n) {
  const x = Math.sin(n + 1) * 10000;
  return x - Math.floor(x);
}

const BLDG_COLORS = [
  '#4a6fa5','#6b8cba','#8fa3c0',
  '#6b7280','#9ca3af','#c0c8d4',
  '#7c8fa0','#5a6b7d','#8b9eb0',
  '#a08090','#8b7fa0','#b4a8c0',
  '#5d7a6a','#4a6b5d','#7a9e8a',
];

function buildCity() {
  const buildings = [];
  const trees     = [];
  const parked    = [];

  // 4×4 grid of city blocks centred at ±25 and ±75
  const bx_list = [-75, -25, 25, 75];
  const bz_list = [-75, -25, 25, 75];

  bx_list.forEach((cx, bi) => {
    bz_list.forEach((cz, bj) => {
      const blk = bi * 4 + bj;
      // 4–6 buildings per block in fixed quarter-slots
      const slots = [
        [-12,-12],[-12, 4],[ 4,-12],[ 4, 4],
        [-12, -4],[ 4, -4],
      ];
      slots.slice(0, 4 + (blk % 3)).forEach(([ox, oz], s) => {
        const seed = blk * 20 + s;
        const h  = 6 + seeded(seed)    * 20;
        const w  = 7 + seeded(seed+1)  * 5;
        const d  = 7 + seeded(seed+2)  * 5;
        const ci = Math.floor(seeded(seed+3) * BLDG_COLORS.length);
        buildings.push({ x: cx+ox, z: cz+oz, h, w, d, color: BLDG_COLORS[ci] });
      });

      // Two trees per block
      trees.push({ x: cx-17, z: cz-17 });
      trees.push({ x: cx+17, z: cz+17 });
    });
  });

  // Parked cars along roads (visual only)
  const roadPos = [-50, 0, 50];
  roadPos.forEach(rz => {
    for (let px = -90; px <= 90; px += 30) {
      parked.push({ x: px, z: rz + 7.5, angle: 0,      color: ['#dc2626','#16a34a','#ca8a04','#7c3aed'][Math.floor(seeded(px*rz) * 4)] });
      parked.push({ x: px, z: rz - 7.5, angle: Math.PI, color: ['#2563eb','#0891b2','#9333ea','#c2410c'][Math.floor(seeded(px+rz) * 4)] });
    }
  });
  roadPos.forEach(rx => {
    for (let pz = -90; pz <= 90; pz += 30) {
      parked.push({ x: rx + 7.5, z: pz, angle: Math.PI/2, color: ['#be185d','#0f766e','#92400e','#1e40af'][Math.floor(seeded(rx*pz+1) * 4)] });
    }
  });

  return { buildings, trees, parked };
}

const CITY = buildCity();

// ─────────────────────────────────────────────
// SCENE COMPONENTS
// ─────────────────────────────────────────────

function Ground() {
  return (
    <>
      {/* Grass/ground base */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0,0]} receiveShadow>
        <planeGeometry args={[240,240]} />
        <meshStandardMaterial color="#2d4a1e" roughness={1} />
      </mesh>

      {/* Asphalt – horizontal roads */}
      {[-50,0,50].map(z => (
        <mesh key={`rh${z}`} rotation={[-Math.PI/2,0,0]} position={[0,0.01,z]} receiveShadow>
          <planeGeometry args={[240,10]} />
          <meshStandardMaterial color="#1c1c1c" roughness={0.95} />
        </mesh>
      ))}
      {/* Asphalt – vertical roads */}
      {[-50,0,50].map(x => (
        <mesh key={`rv${x}`} rotation={[-Math.PI/2,0,0]} position={[x,0.01,0]} receiveShadow>
          <planeGeometry args={[10,240]} />
          <meshStandardMaterial color="#1c1c1c" roughness={0.95} />
        </mesh>
      ))}

      {/* Road centre dashes – horizontal */}
      {[-50,0,50].map(z =>
        Array.from({length:11},(_,i)=>(
          <mesh key={`dh${z}-${i}`} rotation={[-Math.PI/2,0,0]} position={[-110+i*22,0.02,z]} receiveShadow>
            <planeGeometry args={[9,0.35]} />
            <meshStandardMaterial color="#f0f0f0" opacity={0.65} transparent />
          </mesh>
        ))
      )}
      {/* Road centre dashes – vertical */}
      {[-50,0,50].map(x =>
        Array.from({length:11},(_,i)=>(
          <mesh key={`dv${x}-${i}`} rotation={[-Math.PI/2,0,0]} position={[x,0.02,-110+i*22]} receiveShadow>
            <planeGeometry args={[0.35,9]} />
            <meshStandardMaterial color="#f0f0f0" opacity={0.65} transparent />
          </mesh>
        ))
      )}

      {/* Sidewalks */}
      {[-50,0,50].map(z=>[1,-1].map(s=>(
        <mesh key={`swh${z}${s}`} rotation={[-Math.PI/2,0,0]} position={[0,0.015,z+s*6.5]} receiveShadow>
          <planeGeometry args={[240,3]} />
          <meshStandardMaterial color="#3d3d3d" />
        </mesh>
      )))}
      {[-50,0,50].map(x=>[1,-1].map(s=>(
        <mesh key={`swv${x}${s}`} rotation={[-Math.PI/2,0,0]} position={[x+s*6.5,0.015,0]} receiveShadow>
          <planeGeometry args={[3,240]} />
          <meshStandardMaterial color="#3d3d3d" />
        </mesh>
      )))}

      {/* Intersection boxes (same colour as road) */}
      {[-50,0,50].map(x=>[-50,0,50].map(z=>(
        <mesh key={`ix${x}${z}`} rotation={[-Math.PI/2,0,0]} position={[x,0.025,z]} receiveShadow>
          <planeGeometry args={[10.5,10.5]} />
          <meshStandardMaterial color="#1c1c1c" />
        </mesh>
      )))}
    </>
  );
}

function Buildings() {
  return (
    <>
      {CITY.buildings.map((b,i)=>(
        <group key={i} position={[b.x,0,b.z]}>
          {/* Main block */}
          <mesh position={[0,b.h/2,0]} castShadow receiveShadow>
            <boxGeometry args={[b.w,b.h,b.d]} />
            <meshStandardMaterial color={b.color} roughness={0.75} metalness={0.05} />
          </mesh>
          {/* Rooftop ledge */}
          <mesh position={[0,b.h+0.35,0]}>
            <boxGeometry args={[b.w*0.9,0.7,b.d*0.9]} />
            <meshStandardMaterial color={b.color} roughness={0.6} metalness={0.1} />
          </mesh>
          {/* Window strip – front face */}
          <mesh position={[0,b.h*0.55,b.d/2+0.05]}>
            <boxGeometry args={[b.w*0.65,b.h*0.55,0.06]} />
            <meshStandardMaterial color="#93c5fd" transparent opacity={0.35} metalness={0.3} />
          </mesh>
          {/* Window strip – side face */}
          <mesh position={[b.w/2+0.05,b.h*0.55,0]}>
            <boxGeometry args={[0.06,b.h*0.55,b.d*0.65]} />
            <meshStandardMaterial color="#93c5fd" transparent opacity={0.3} metalness={0.3} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Trees() {
  return (
    <>
      {CITY.trees.map((t,i)=>(
        <group key={i} position={[t.x,0,t.z]}>
          <mesh position={[0,1,0]} castShadow>
            <cylinderGeometry args={[0.18,0.28,2,6]} />
            <meshStandardMaterial color="#5d4037" roughness={1} />
          </mesh>
          <mesh position={[0,2.2,0]} castShadow>
            <coneGeometry args={[1.8,2.8,8]} />
            <meshStandardMaterial color="#3a7a2a" roughness={0.9} />
          </mesh>
          <mesh position={[0,3.8,0]} castShadow>
            <coneGeometry args={[1.3,2.2,8]} />
            <meshStandardMaterial color="#2d6a1f" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function ParkedCars() {
  return (
    <>
      {CITY.parked.map((c,i)=>(
        <group key={i} position={[c.x,0.3,c.z]} rotation={[0,c.angle,0]}>
          {/* Body */}
          <mesh position={[0,0.3,0]} castShadow>
            <boxGeometry args={[1.0,0.55,2.0]} />
            <meshStandardMaterial color={c.color} metalness={0.3} roughness={0.5} />
          </mesh>
          {/* Roof */}
          <mesh position={[0,0.7,-0.1]}>
            <boxGeometry args={[0.95,0.45,1.1]} />
            <meshStandardMaterial color={c.color} metalness={0.3} roughness={0.5} />
          </mesh>
          {/* Windows */}
          <mesh position={[0,0.75,0.56]}>
            <boxGeometry args={[0.85,0.32,0.04]} />
            <meshStandardMaterial color="#87ceeb" transparent opacity={0.5} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function LampPosts() {
  const positions = [];
  [-50,0,50].forEach(r=>{
    for(let p=-90;p<=90;p+=25){
      positions.push([r-7, p]);
      positions.push([r+7, p]);
    }
  });
  return (
    <>
      {positions.map(([x,z],i)=>(
        <group key={i} position={[x,0,z]}>
          <mesh position={[0,2.8,0]}>
            <cylinderGeometry args={[0.07,0.11,5.6,6]} />
            <meshStandardMaterial color="#64748b" metalness={0.75} roughness={0.25} />
          </mesh>
          <mesh position={[0,5.6,0.35]}>
            <boxGeometry args={[0.22,0.22,0.7]} />
            <meshStandardMaterial color="#94a3b8" emissive="#fef08a" emissiveIntensity={0.4} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────
// TRUCK
// ─────────────────────────────────────────────
const WHEEL_POS = [
  [-1.12, 0.36,  1.55],   // front-left
  [ 1.12, 0.36,  1.55],   // front-right
  [-1.12, 0.36, -1.7 ],   // rear-left
  [ 1.12, 0.36, -1.7 ],   // rear-right
];

function Truck({ truckRef, controlsRef, speedRef }) {
  const vel   = useRef(0);
  const angle = useRef(0);

  useFrame((_, dt) => {
    const c = controlsRef.current;
    const ACCEL = 14, MAX = 20, TURN = 2.0;

    if (c.forward)      vel.current = Math.min(vel.current + ACCEL*dt, MAX);
    else if (c.back)    vel.current = Math.max(vel.current - ACCEL*dt, -MAX*0.5);
    else { vel.current *= 0.86; if(Math.abs(vel.current)<0.05) vel.current=0; }

    if (Math.abs(vel.current) > 0.4) {
      const sign = Math.sign(vel.current);
      if (c.left)  angle.current += TURN * dt * sign;
      if (c.right) angle.current -= TURN * dt * sign;
    }

    if (speedRef) speedRef.current = vel.current;

    const t = truckRef.current;
    if (!t) return;
    t.rotation.y = angle.current;
    t.position.x = Math.max(-108, Math.min(108, t.position.x + Math.sin(angle.current) * vel.current * dt));
    t.position.z = Math.max(-108, Math.min(108, t.position.z + Math.cos(angle.current) * vel.current * dt));
  });

  return (
    <group ref={truckRef} position={[0, 0, 5]}>
      {/* ── Cargo container ── */}
      <mesh position={[0, 1.25, -0.55]} castShadow receiveShadow>
        <boxGeometry args={[2.25, 2.0, 3.8]} />
        <meshStandardMaterial color="#2563eb" metalness={0.15} roughness={0.65} />
      </mesh>
      {/* Container rear door line */}
      <mesh position={[0, 1.25, -2.46]}>
        <boxGeometry args={[2.27, 2.02, 0.05]} />
        <meshStandardMaterial color="#1d4ed8" metalness={0.2} />
      </mesh>
      {/* Container roof rack */}
      <mesh position={[0, 2.28, -0.55]}>
        <boxGeometry args={[2.3, 0.08, 3.9]} />
        <meshStandardMaterial color="#1e40af" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* ── Cab ── */}
      <mesh position={[0, 1.1, 1.85]} castShadow receiveShadow>
        <boxGeometry args={[2.25, 1.7, 1.65]} />
        <meshStandardMaterial color="#1e40af" metalness={0.25} roughness={0.55} />
      </mesh>
      {/* Windshield */}
      <mesh position={[0, 1.42, 2.67]}>
        <boxGeometry args={[1.88, 0.88, 0.06]} />
        <meshStandardMaterial color="#bae6fd" transparent opacity={0.55} roughness={0.05} metalness={0.15} />
      </mesh>
      {/* Side windows */}
      {[-1,1].map(s=>(
        <mesh key={s} position={[s*1.14, 1.38, 1.85]}>
          <boxGeometry args={[0.06, 0.62, 1.1]} />
          <meshStandardMaterial color="#bae6fd" transparent opacity={0.45} roughness={0.1} />
        </mesh>
      ))}
      {/* Cab roof vent */}
      <mesh position={[0, 1.97, 1.55]}>
        <boxGeometry args={[1.6, 0.15, 0.8]} />
        <meshStandardMaterial color="#172554" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* ── Front end ── */}
      {/* Grille */}
      <mesh position={[0, 1.0, 2.69]}>
        <boxGeometry args={[1.7, 0.65, 0.06]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Bumper */}
      <mesh position={[0, 0.48, 2.7]}>
        <boxGeometry args={[2.28, 0.42, 0.18]} />
        <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Headlights */}
      {[-0.68, 0.68].map(x=>(
        <mesh key={x} position={[x, 0.88, 2.7]}>
          <boxGeometry args={[0.5, 0.28, 0.06]} />
          <meshStandardMaterial color="#fffde7" emissive="#fde68a" emissiveIntensity={1.5} />
        </mesh>
      ))}
      <pointLight position={[0, 0.88, 3.2]} intensity={3} distance={14} color="#ffe566" />

      {/* Taillights */}
      {[-0.68, 0.68].map(x=>(
        <mesh key={x} position={[x, 0.92, -2.48]}>
          <boxGeometry args={[0.5, 0.24, 0.06]} />
          <meshStandardMaterial color="#ff1111" emissive="#ef4444" emissiveIntensity={0.9} />
        </mesh>
      ))}

      {/* Exhaust stack */}
      <mesh position={[1.18, 1.4, 0.8]}>
        <cylinderGeometry args={[0.06, 0.09, 2.5, 6]} />
        <meshStandardMaterial color="#334155" metalness={0.75} roughness={0.25} />
      </mesh>

      {/* Chassis */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[2.0, 0.26, 5.8]} />
        <meshStandardMaterial color="#0a0a1a" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Wheels */}
      {WHEEL_POS.map(([x,y,z], i) => (
        <group key={i} position={[x,y,z]}>
          <mesh rotation={[0,0,Math.PI/2]} castShadow>
            <cylinderGeometry args={[0.37, 0.37, 0.32, 12]} />
            <meshStandardMaterial color="#0f172a" roughness={0.95} />
          </mesh>
          <mesh rotation={[0,0,Math.PI/2]}>
            <cylinderGeometry args={[0.23, 0.23, 0.34, 6]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Lug nut circles (just visual dots) */}
          <mesh rotation={[0,0,Math.PI/2]} position={[0.168,0,0]}>
            <cylinderGeometry args={[0.04,0.04,0.05,5]} />
            <meshStandardMaterial color="#64748b" metalness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────
// CAMERA FOLLOW
// ─────────────────────────────────────────────
function CameraFollow({ truckRef }) {
  const { camera } = useThree();
  const smoothPos = useRef(new THREE.Vector3(0, 8, -12));
  const lookTarget = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!truckRef.current) return;
    const t = truckRef.current;
    const ay = t.rotation.y;

    const offset = new THREE.Vector3(
      -Math.sin(ay) * 13,
      5.5,
      -Math.cos(ay) * 13
    );
    const desired = t.position.clone().add(offset);
    smoothPos.current.lerp(desired, 0.07);
    camera.position.copy(smoothPos.current);

    lookTarget.current.lerp(
      new THREE.Vector3(t.position.x, t.position.y + 1.2, t.position.z),
      0.1
    );
    camera.lookAt(lookTarget.current);
  });

  return null;
}

// ─────────────────────────────────────────────
// LIGHTS
// ─────────────────────────────────────────────
function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.55} color="#b0c4de" />
      <directionalLight
        position={[60, 90, 40]}
        intensity={1.3}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={250}
        shadow-camera-left={-130}
        shadow-camera-right={130}
        shadow-camera-top={130}
        shadow-camera-bottom={-130}
        color="#fff8e8"
      />
      <hemisphereLight args={['#87ceeb','#2d4a1e', 0.38]} />
    </>
  );
}

// ─────────────────────────────────────────────
// SPEEDOMETER – reads from DOM, no setState
// ─────────────────────────────────────────────
function SpeedReader({ speedRef, domRef }) {
  useFrame(() => {
    if (!domRef.current) return;
    const kmh = Math.abs(Math.round(speedRef.current * 3.6));
    domRef.current.textContent = kmh;
  });
  return null;
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function CityDrive() {
  const navigate    = useNavigate();
  const truckRef    = useRef();
  const speedRef    = useRef(0);
  const speedDomRef = useRef();
  const controlsRef = useRef({ forward: false, back: false, left: false, right: false });

  // Keyboard input
  useEffect(() => {
    const MAP = {
      ArrowUp:'forward', KeyW:'forward',
      ArrowDown:'back',  KeyS:'back',
      ArrowLeft:'left',  KeyA:'left',
      ArrowRight:'right',KeyD:'right',
    };
    const dn = e => { if(MAP[e.code]) { e.preventDefault(); controlsRef.current[MAP[e.code]]=true; }};
    const up = e => { if(MAP[e.code]) controlsRef.current[MAP[e.code]]=false; };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown',dn); window.removeEventListener('keyup',up); };
  }, []);

  const press   = useCallback((a, v) => { controlsRef.current[a] = v; }, []);
  const mkProps = useCallback((action) => ({
    onPointerDown:  () => press(action, true),
    onPointerUp:    () => press(action, false),
    onPointerLeave: () => press(action, false),
    onContextMenu:  e  => e.preventDefault(),
  }), [press]);

  return (
    <div className="cd-page">

      {/* ── Header ── */}
      <header className="cd-header">
        <button className="cd-back" onClick={() => navigate(-1)}>← Back</button>
        <span className="cd-title">🚛 City Drive</span>
        <span className="cd-hint">WASD / Arrow keys or on-screen D-pad</span>
      </header>

      {/* ── 3-D Canvas ── */}
      <div className="cd-canvas">
        <Canvas
          shadows
          camera={{ fov: 58, near: 0.1, far: 500, position: [0, 8, -12] }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <fog   attach="fog"        args={['#b0d4ef', 90, 220]} />
          <color attach="background" args={['#87ceeb']} />
          <SceneLights />
          <Ground />
          <Buildings />
          <Trees />
          <ParkedCars />
          <LampPosts />
          <Truck truckRef={truckRef} controlsRef={controlsRef} speedRef={speedRef} />
          <CameraFollow truckRef={truckRef} />
          <SpeedReader speedRef={speedRef} domRef={speedDomRef} />
        </Canvas>
      </div>

      {/* ── Speed HUD ── */}
      <div className="cd-hud">
        <div className="cd-speedo">
          <span className="cd-speed-val" ref={speedDomRef}>0</span>
          <span className="cd-speed-unit">km/h</span>
        </div>
      </div>

      {/* ── D-Pad Controls ── */}
      <div className="cd-controls">
        <div className="cd-dpad">
          <button className="dp-btn dp-up"    {...mkProps('forward')}>▲</button>
          <button className="dp-btn dp-left"  {...mkProps('left')}>◀</button>
          <div className="dp-center" />
          <button className="dp-btn dp-right" {...mkProps('right')}>▶</button>
          <button className="dp-btn dp-down"  {...mkProps('back')}>▼</button>
        </div>
      </div>
    </div>
  );
}
