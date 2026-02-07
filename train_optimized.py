import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

console.log("🚀 SIMULATION.JS IS ALIVE!");

// --- CONFIGURATION ---
const CONTAINER = { w: 100, h: 100, d: 100 }; // Size of the master bin
let scene, camera, renderer, controls;
let items = [];
let packedMeshes = [];

// --- INITIALIZATION ---
function init() {
    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // 2. Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(150, 150, 150);
    camera.lookAt(0, 50, 0);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 5. Wireframe Container (The Bin)
    const geometry = new THREE.BoxGeometry(CONTAINER.w, CONTAINER.h, CONTAINER.d);
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x4cc9f0 }));
    // Shift up so it sits on grid
    line.position.y = CONTAINER.h / 2;
    scene.add(line);

    // 6. Grid Helper
    const grid = new THREE.GridHelper(300, 30, 0x444444, 0x222222);
    scene.add(grid);

    // 7. Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Listeners
    window.addEventListener('resize', onWindowResize);
    document.getElementById('btn-run').addEventListener('click', runSimulation);
    document.getElementById('btn-reset').addEventListener('click', resetSimulation);

    animate();
}

// --- AI LOGIC INTEGRATION ---
async function runSimulation() {
    document.getElementById('status').innerText = "Generating Items...";
    resetSimulation();

    // 1. Generate Random Manifest
    const manifest = generateManifest(40); // Generate 40 items

    document.getElementById('status').innerText = "AI Prioritizing...";
    
    // 2. AI STEP: Priority Sorting
    // We loop through items and ask the AI "How important is this?"
    for (let item of manifest) {
        // --- UPDATE: Added ', 0' at the end for the dummy feature ---
        // Input: [cat_code, l, w, h, weight, dummy]
        const score = window.predictPriority([item.catCode, item.l, item.w, item.h, item.weight, 0]);
        item.priorityScore = score;
    }

    // Sort Descending (Highest Priority First)
    manifest.sort((a, b) => b.priorityScore - a.priorityScore);

    document.getElementById('status').innerText = "AI Packing...";

    // 3. AI STEP: Stability-Check Packing Loop
    // We use a simple "bottom-left-back" placement strategy, but validated by AI.
    let currentY = 0;
    
    for (let i = 0; i < manifest.length; i++) {
        const item = manifest[i];
        
        // Simple Logic: Stack them in a tower for visualization purposes
        // In a real app, you'd calculate complex X/Z coordinates here.
        
        let x = (Math.random() - 0.5) * 10; // Tiny random jitter
        let z = (Math.random() - 0.5) * 10;
        let y = currentY;

        // Check Stability against the item below (if any)
        let stabilityScore = 1.0;
        
        if (i > 0) {
            const itemBelow = manifest[i-1];
            // --- UPDATE: Added ', 0' at the end for the dummy feature ---
            // Input: [l, w, h, weight, bl, bw, bweight, dummy]
            stabilityScore = window.predictStability([
                item.l, item.w, item.h, item.weight,
                itemBelow.l, itemBelow.w, itemBelow.weight,
                0 
            ]);
        }

        // Visualize
        await spawnBox(item, x, y, z, stabilityScore);
        
        // Update stats
        document.getElementById('count').innerText = i + 1;
        document.getElementById('stability').innerText = (stabilityScore * 100).toFixed(1) + "%";

        currentY += item.h;
        
        // Artificial delay so you can watch it happen
        await new Promise(r => setTimeout(r, 200));
        
        if (currentY > CONTAINER.h) break; // Bin full
    }
    
    document.getElementById('status').innerText = "Complete";
}

function generateManifest(count) {
    const list = [];
    const categories = [
        { code: 2, name: 'Heavy', wMin: 30, wMax: 80 },
        { code: 0, name: 'Common', wMin: 5, wMax: 30 },
        { code: 1, name: 'Fragile', wMin: 1, wMax: 10 }
    ];

    for(let i=0; i<count; i++) {
        const cat = categories[Math.floor(Math.random() * categories.length)];
        list.push({
            id: i,
            l: 10 + Math.floor(Math.random() * 20),
            w: 10 + Math.floor(Math.random() * 20),
            h: 5 + Math.floor(Math.random() * 10),
            weight: cat.wMin + Math.random() * (cat.wMax - cat.wMin),
            catCode: cat.code
        });
    }
    return list;
}

function spawnBox(item, x, y, z, stability) {
    return new Promise(resolve => {
        const geometry = new THREE.BoxGeometry(item.l, item.h, item.w);
        
        // Color Logic: AI Stability Score determines color
        // Green (1.0) -> Yellow (0.5) -> Red (0.0)
        const color = new THREE.Color();
        color.setHSL(stability * 0.3, 1.0, 0.5); 

        const material = new THREE.MeshStandardMaterial({ 
            color: color, 
            transparent: true, opacity: 0.9,
            metalness: 0.2, roughness: 0.1
        });
        
        const cube = new THREE.Mesh(geometry, material);
        
        // Three.js pivots from center, so we shift up by half height
        cube.position.set(x, y + item.h/2, z);
        cube.castShadow = true;
        cube.receiveShadow = true;
        
        // Add black outline
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
        cube.add(line);

        scene.add(cube);
        packedMeshes.push(cube);
        resolve();
    });
}

function resetSimulation() {
    packedMeshes.forEach(m => scene.remove(m));
    packedMeshes = [];
    document.getElementById('count').innerText = "0";
    document.getElementById('stability').innerText = "100%";
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Start
init();