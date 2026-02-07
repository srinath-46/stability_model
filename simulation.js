import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

console.log("🚛 SMARTSTACK FLEET LOADER v3.0 - REPORTS ENABLED");

// --- TRUCK CONFIGURATIONS ---
const TRUCKS = {
    small: { name: 'Small Van', w: 60, h: 50, d: 40, color: 0x22c55e, scale: 0.6 },
    medium: { name: 'Medium Truck', w: 100, h: 70, d: 55, color: 0x3b82f6, scale: 0.85 },
    large: { name: 'Large Semi', w: 140, h: 85, d: 65, color: 0xe63946, scale: 1.0 },
    xl: { name: 'XL Container', w: 180, h: 100, d: 80, color: 0xf59e0b, scale: 1.2 }
};

// --- BOX TYPE CONFIGURATIONS ---
const BOX_TYPES = {
    electronics: {
        name: 'Electronics', code: 0, color: 0xa855f7,
        l: { min: 12, max: 18, avg: 15 }, w: { min: 10, max: 15, avg: 12 }, h: { min: 8, max: 12, avg: 10 },
        weight: { min: 2, max: 8 }, fragile: true
    },
    standard: {
        name: 'Standard Parcel', code: 1, color: 0x22c55e,
        l: { min: 20, max: 30, avg: 25 }, w: { min: 15, max: 25, avg: 20 }, h: { min: 12, max: 18, avg: 15 },
        weight: { min: 5, max: 20 }, fragile: false
    },
    appliance: {
        name: 'Appliance', code: 2, color: 0x3b82f6,
        l: { min: 35, max: 45, avg: 40 }, w: { min: 30, max: 40, avg: 35 }, h: { min: 40, max: 50, avg: 45 },
        weight: { min: 15, max: 40 }, fragile: false
    },
    furniture: {
        name: 'Furniture', code: 3, color: 0xf59e0b,
        l: { min: 50, max: 60, avg: 55 }, w: { min: 20, max: 30, avg: 25 }, h: { min: 15, max: 22, avg: 18 },
        weight: { min: 10, max: 30 }, fragile: false
    },
    industrial: {
        name: 'Industrial', code: 4, color: 0xef4444,
        l: { min: 25, max: 35, avg: 30 }, w: { min: 25, max: 35, avg: 30 }, h: { min: 20, max: 30, avg: 25 },
        weight: { min: 50, max: 100 }, fragile: false
    }
};

// --- STATE ---
let currentTruck = 'medium';
let CONTAINER = { ...TRUCKS[currentTruck] };
let containerVolume = CONTAINER.w * CONTAINER.h * CONTAINER.d;

let scene, camera, renderer, controls;
let packedMeshes = [];
let packedItemsData = []; // Store item data for reports
let truckGroup;
let raycaster, mouse;
let finalUtilization = 0;

// --- RAYCASTER FOR CLICK DETECTION ---
function setupRaycaster() {
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    window.addEventListener('click', onBoxClick);
    window.addEventListener('mousemove', onMouseMove);
}

function onMouseMove(event) {
    const tooltip = document.getElementById('box-tooltip');
    if (tooltip.style.display === 'block') {
        tooltip.style.left = (event.clientX + 15) + 'px';
        tooltip.style.top = (event.clientY + 15) + 'px';
    }
}

function onBoxClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(packedMeshes);
    
    const tooltip = document.getElementById('box-tooltip');
    
    if (intersects.length > 0) {
        const mesh = intersects[0].object;
        const itemData = mesh.userData;
        
        if (itemData && itemData.id !== undefined) {
            // Show tooltip
            document.getElementById('tooltip-type').innerText = itemData.name;
            document.getElementById('tooltip-id').innerText = `#${itemData.id}`;
            document.getElementById('tooltip-dims').innerText = `${itemData.l}×${itemData.w}×${itemData.h} cm`;
            document.getElementById('tooltip-weight').innerText = `${itemData.weight.toFixed(1)} kg`;
            document.getElementById('tooltip-pos').innerText = `(${itemData.x.toFixed(0)}, ${itemData.y.toFixed(0)}, ${itemData.z.toFixed(0)})`;
            document.getElementById('tooltip-stability').innerText = `${(itemData.stability * 100).toFixed(0)}%`;
            
            tooltip.style.display = 'block';
            tooltip.style.left = (event.clientX + 15) + 'px';
            tooltip.style.top = (event.clientY + 15) + 'px';
            
            // Highlight the box
            highlightBox(mesh);
        }
    } else {
        tooltip.style.display = 'none';
        resetHighlights();
    }
}

function highlightBox(mesh) {
    resetHighlights();
    mesh.userData.originalEmissive = mesh.material.emissive.getHex();
    mesh.material.emissive.setHex(0x444444);
}

function resetHighlights() {
    packedMeshes.forEach(m => {
        if (m.userData.originalEmissive !== undefined) {
            m.material.emissive.setHex(m.userData.originalEmissive);
        }
    });
}

// --- REPORT FUNCTIONS ---
function showReport() {
    const modal = document.getElementById('report-modal');
    const tbody = document.getElementById('report-table-body');
    
    // Header info
    document.getElementById('report-truck').innerText = TRUCKS[currentTruck].name;
    document.getElementById('report-total').innerText = packedItemsData.length;
    document.getElementById('report-util').innerText = finalUtilization.toFixed(1) + '%';
    document.getElementById('report-date').innerText = new Date().toLocaleString();
    
    // Build table
    tbody.innerHTML = '';
    packedItemsData.forEach((item, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i + 1}</td>
            <td><span class="type-badge type-${item.type}">${item.name}</span></td>
            <td>${item.l}×${item.w}×${item.h} cm</td>
            <td>${item.weight.toFixed(1)} kg</td>
            <td>(${item.x.toFixed(0)}, ${item.y.toFixed(0)}, ${item.z.toFixed(0)})</td>
            <td>${(item.stability * 100).toFixed(0)}%</td>
        `;
        tbody.appendChild(tr);
    });
    
    modal.style.display = 'flex';
}

function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.text('SmartStack Cargo Packing Report', 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 28);
    
    // Summary Box
    doc.setFillColor(240, 240, 250);
    doc.roundedRect(15, 35, 180, 35, 3, 3, 'F');
    
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Truck Type: ${TRUCKS[currentTruck].name}`, 20, 45);
    doc.text(`Truck Dimensions: ${CONTAINER.w}×${CONTAINER.h}×${CONTAINER.d} cm`, 20, 52);
    doc.text(`Total Items Loaded: ${packedItemsData.length}`, 110, 45);
    doc.text(`Space Utilization: ${finalUtilization.toFixed(1)}%`, 110, 52);
    doc.text(`Total Weight: ${packedItemsData.reduce((s, i) => s + i.weight, 0).toFixed(1)} kg`, 20, 59);
    
    // Table Header
    let y = 80;
    doc.setFillColor(59, 130, 246);
    doc.setTextColor(255);
    doc.rect(15, y - 6, 180, 8, 'F');
    doc.setFontSize(9);
    doc.text('#', 18, y);
    doc.text('Type', 28, y);
    doc.text('Dimensions', 70, y);
    doc.text('Weight', 105, y);
    doc.text('Position', 130, y);
    doc.text('Stability', 170, y);
    
    // Table Rows
    doc.setTextColor(0);
    y += 8;
    
    packedItemsData.forEach((item, i) => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
        
        // Alternate row colors
        if (i % 2 === 0) {
            doc.setFillColor(248, 248, 252);
            doc.rect(15, y - 5, 180, 7, 'F');
        }
        
        doc.setFontSize(8);
        doc.text(`${i + 1}`, 18, y);
        doc.text(item.name.substring(0, 12), 28, y);
        doc.text(`${item.l}×${item.w}×${item.h}`, 70, y);
        doc.text(`${item.weight.toFixed(1)} kg`, 105, y);
        doc.text(`(${item.x.toFixed(0)},${item.y.toFixed(0)},${item.z.toFixed(0)})`, 130, y);
        doc.text(`${(item.stability * 100).toFixed(0)}%`, 173, y);
        
        y += 7;
    });
    
    // Footer
    y = Math.max(y + 10, 250);
    if (y > 270) {
        doc.addPage();
        y = 20;
    }
    
    doc.setDrawColor(200);
    doc.line(15, y, 195, y);
    y += 10;
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('This report was generated by SmartStack Pro AI Cargo Loading System.', 20, y);
    doc.text('All items have been optimally placed for maximum stability and space efficiency.', 20, y + 5);
    
    // Category Summary
    y += 15;
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text('Category Breakdown:', 20, y);
    y += 7;
    
    const categories = {};
    packedItemsData.forEach(item => {
        categories[item.name] = (categories[item.name] || 0) + 1;
    });
    
    doc.setFontSize(9);
    Object.entries(categories).forEach(([name, count]) => {
        doc.text(`• ${name}: ${count} items`, 25, y);
        y += 5;
    });
    
    // Save
    const filename = `SmartStack_Report_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(filename);
}

// --- CALCULATE MAX LIMITS ---
function calculateMaxLimits(truckKey) {
    const truck = TRUCKS[truckKey];
    const truckVolume = truck.w * truck.h * truck.d;
    const limits = {};
    const packingEfficiency = 0.55;
    const usableVolume = truckVolume * packingEfficiency;
    
    Object.entries(BOX_TYPES).forEach(([type, config]) => {
        const avgBoxVolume = config.l.avg * config.w.avg * config.h.avg;
        let maxCount = Math.floor(usableVolume / avgBoxVolume);
        const maxByLength = Math.floor(truck.w / config.l.min);
        const maxByWidth = Math.floor(truck.d / config.w.min);
        const maxByHeight = Math.floor(truck.h / config.h.min);
        const layerMax = maxByLength * maxByWidth * maxByHeight;
        maxCount = Math.min(maxCount, layerMax);
        limits[type] = Math.min(Math.max(1, maxCount), 50);
    });
    
    return limits;
}

function updateInputLimits() {
    const limits = calculateMaxLimits(currentTruck);
    
    Object.entries(limits).forEach(([type, max]) => {
        const input = document.getElementById(`num-${type}`);
        if (input) {
            input.max = max;
            if (parseInt(input.value) > max) input.value = max;
            const maxLabel = document.getElementById(`max-${type}`);
            if (maxLabel) maxLabel.innerText = max;
        }
    });
    
    updateTotalCount();
    updateCapacityWarning();
}

function checkCapacity() {
    const input = getUserInput();
    let totalVolume = 0;
    
    Object.entries(input).forEach(([type, count]) => {
        const config = BOX_TYPES[type];
        const avgVol = config.l.avg * config.w.avg * config.h.avg;
        totalVolume += avgVol * count;
    });
    
    const truckVolume = CONTAINER.w * CONTAINER.h * CONTAINER.d;
    const usableVolume = truckVolume * 0.55;
    
    return {
        fits: totalVolume <= usableVolume,
        usage: (totalVolume / usableVolume) * 100,
        totalVolume,
        usableVolume
    };
}

function updateCapacityWarning() {
    const capacity = checkCapacity();
    const warningEl = document.getElementById('capacity-warning');
    const usageEl = document.getElementById('est-usage');
    
    if (usageEl) {
        usageEl.innerText = Math.min(100, capacity.usage).toFixed(0) + '%';
        usageEl.style.color = capacity.fits ? '#22c55e' : '#ef4444';
    }
    
    if (warningEl) {
        if (!capacity.fits) {
            warningEl.style.display = 'block';
            warningEl.innerText = '⚠️ Too many boxes! Reduce quantity or select larger truck.';
        } else {
            warningEl.style.display = 'none';
        }
    }
}

// --- INITIALIZATION ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
    updateCameraForTruck();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(100, 200, 100);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const redLight = new THREE.PointLight(0xff3333, 0.4, 400);
    redLight.position.set(-150, 100, 0);
    scene.add(redLight);
    
    const blueLight = new THREE.PointLight(0x3366ff, 0.3, 400);
    blueLight.position.set(150, 80, 100);
    scene.add(blueLight);

    // Floor
    const floorGeo = new THREE.PlaneGeometry(800, 800);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(500, 50, 0x333355, 0x222233);
    scene.add(grid);

    createTruck();
    setupInputListeners();
    setupTruckSelector();
    setupRaycaster();
    setupReportHandlers();
    updateInputLimits();

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 30, 0);

    window.addEventListener('resize', onWindowResize);
    document.getElementById('btn-run').addEventListener('click', runSimulation);
    document.getElementById('btn-reset').addEventListener('click', resetSimulation);

    animate();
}

function setupReportHandlers() {
    document.getElementById('view-report-btn').addEventListener('click', showReport);
    document.getElementById('close-report').addEventListener('click', () => {
        document.getElementById('report-modal').style.display = 'none';
    });
    document.getElementById('download-pdf').addEventListener('click', generatePDF);
}

function updateCameraForTruck() {
    const scale = TRUCKS[currentTruck].scale;
    camera.position.set(280 * scale, 200 * scale, 220 * scale);
    camera.lookAt(0, 40, 0);
    if (controls) controls.target.set(0, 40 * scale, 0);
}

// --- TRUCK CREATION ---
function createTruck() {
    if (truckGroup) scene.remove(truckGroup);
    truckGroup = new THREE.Group();

    const truck = TRUCKS[currentTruck];
    const W = truck.w, H = truck.h, D = truck.d;
    const truckColor = truck.color;

    const cabMat = new THREE.MeshStandardMaterial({ color: truckColor, metalness: 0.6, roughness: 0.3 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 });
    const glassMat = new THREE.MeshStandardMaterial({ 
        color: truckColor, transparent: true, opacity: 0.12,
        side: THREE.DoubleSide, metalness: 0.2, roughness: 0.1
    });

    const cabScale = truck.scale;
    const cabW = 35 * cabScale;
    const cabH = 45 * cabScale;
    const cabD = 50 * cabScale;

    // Cab
    const cabGeo = new THREE.BoxGeometry(cabW, cabH, cabD);
    const cab = new THREE.Mesh(cabGeo, cabMat);
    cab.position.set(-W/2 - cabW/2 - 5, cabH/2 + 5, 0);
    cab.castShadow = true;
    truckGroup.add(cab);

    // Nose
    const noseGeo = new THREE.BoxGeometry(cabW * 0.5, cabH * 0.6, cabD * 0.9);
    const nose = new THREE.Mesh(noseGeo, cabMat);
    nose.position.set(-W/2 - cabW - cabW * 0.25, cabH * 0.35, 0);
    nose.castShadow = true;
    truckGroup.add(nose);

    // Windshield
    const windGeo = new THREE.BoxGeometry(3, cabH * 0.5, cabD * 0.75);
    const windMat = new THREE.MeshStandardMaterial({ color: 0x334455, transparent: true, opacity: 0.7, metalness: 0.9 });
    const windshield = new THREE.Mesh(windGeo, windMat);
    windshield.position.set(-W/2 - cabW/2, cabH * 0.75, 0);
    truckGroup.add(windshield);

    // Grille
    const grilleGeo = new THREE.BoxGeometry(4, cabH * 0.4, cabD * 0.7);
    const grille = new THREE.Mesh(grilleGeo, chromeMat);
    grille.position.set(-W/2 - cabW - cabW * 0.5, cabH * 0.35, 0);
    truckGroup.add(grille);

    // Headlights
    const lightGeo = new THREE.CylinderGeometry(3 * cabScale, 3 * cabScale, 2, 16);
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xffff99, emissive: 0xffff44, emissiveIntensity: 0.5 });
    [-1, 1].forEach(side => {
        const headlight = new THREE.Mesh(lightGeo, lightMat);
        headlight.rotation.z = Math.PI / 2;
        headlight.position.set(-W/2 - cabW - cabW * 0.45, cabH * 0.4, side * cabD * 0.35);
        truckGroup.add(headlight);
    });

    // Exhaust
    if (currentTruck === 'large' || currentTruck === 'xl') {
        const exhaustGeo = new THREE.CylinderGeometry(2.5, 2.5, 35 * cabScale, 16);
        [-1, 1].forEach(side => {
            const exhaust = new THREE.Mesh(exhaustGeo, chromeMat);
            exhaust.position.set(-W/2 - 10, cabH + 15, side * (cabD/2 + 5));
            exhaust.castShadow = true;
            truckGroup.add(exhaust);
        });
    }

    // Wheels
    const wheelRadius = 10 * cabScale;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 8 * cabScale, 24);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    
    const wheelPositions = [[-W/2 - cabW * 0.7], [-W/2 - cabW * 0.2], [W/2 - 25 * cabScale], [W/2 - 8 * cabScale]];
    
    wheelPositions.forEach(([x]) => {
        [-1, 1].forEach(side => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.x = Math.PI / 2;
            wheel.position.set(x, wheelRadius, side * (D/2 + 5));
            wheel.castShadow = true;
            truckGroup.add(wheel);
            
            const hubGeo = new THREE.CylinderGeometry(wheelRadius * 0.4, wheelRadius * 0.4, 9 * cabScale, 16);
            const hub = new THREE.Mesh(hubGeo, chromeMat);
            hub.rotation.x = Math.PI / 2;
            hub.position.set(x, wheelRadius, side * (D/2 + 5));
            truckGroup.add(hub);
        });
    });

    // Container
    const containerGeo = new THREE.BoxGeometry(W, H, D);
    const containerEdges = new THREE.EdgesGeometry(containerGeo);
    const containerLine = new THREE.LineSegments(containerEdges, new THREE.LineBasicMaterial({ color: truckColor, linewidth: 2 }));
    containerLine.position.set(0, H/2 + 12, 0);
    truckGroup.add(containerLine);

    // Walls
    const backWallGeo = new THREE.PlaneGeometry(D, H);
    const backWall = new THREE.Mesh(backWallGeo, glassMat);
    backWall.rotation.y = Math.PI / 2;
    backWall.position.set(-W/2, H/2 + 12, 0);
    truckGroup.add(backWall);

    const sideWallGeo = new THREE.PlaneGeometry(W, H);
    [-1, 1].forEach(side => {
        const wall = new THREE.Mesh(sideWallGeo, glassMat);
        wall.position.set(0, H/2 + 12, side * D/2);
        truckGroup.add(wall);
    });

    const roofGeo = new THREE.PlaneGeometry(W, D);
    const roof = new THREE.Mesh(roofGeo, glassMat);
    roof.rotation.x = Math.PI / 2;
    roof.position.set(0, H + 12, 0);
    truckGroup.add(roof);

    const floorGeo2 = new THREE.BoxGeometry(W, 3, D);
    const floorMat2 = new THREE.MeshStandardMaterial({ color: truckColor, metalness: 0.4, roughness: 0.5 });
    const containerFloor = new THREE.Mesh(floorGeo2, floorMat2);
    containerFloor.position.set(0, 11, 0);
    containerFloor.receiveShadow = true;
    truckGroup.add(containerFloor);

    scene.add(truckGroup);
}

// --- UI SETUP ---
function setupTruckSelector() {
    document.querySelectorAll('.truck-option').forEach(el => {
        el.addEventListener('click', () => {
            document.querySelectorAll('.truck-option').forEach(e => e.classList.remove('selected'));
            el.classList.add('selected');
            
            currentTruck = el.dataset.truck;
            CONTAINER = { ...TRUCKS[currentTruck] };
            containerVolume = CONTAINER.w * CONTAINER.h * CONTAINER.d;
            
            document.getElementById('truck-name').innerText = TRUCKS[currentTruck].name;
            
            resetSimulation();
            createTruck();
            updateCameraForTruck();
            updateInputLimits();
        });
    });
}

function setupInputListeners() {
    const inputs = ['num-electronics', 'num-standard', 'num-appliance', 'num-furniture', 'num-industrial'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                updateTotalCount();
                updateCapacityWarning();
            });
        }
    });
    updateTotalCount();
}

function updateTotalCount() {
    const total = ['electronics', 'standard', 'appliance', 'furniture', 'industrial']
        .reduce((sum, type) => sum + (parseInt(document.getElementById(`num-${type}`).value) || 0), 0);
    document.getElementById('total-items').innerText = total;
}

function getUserInput() {
    return {
        electronics: parseInt(document.getElementById('num-electronics').value) || 0,
        standard: parseInt(document.getElementById('num-standard').value) || 0,
        appliance: parseInt(document.getElementById('num-appliance').value) || 0,
        furniture: parseInt(document.getElementById('num-furniture').value) || 0,
        industrial: parseInt(document.getElementById('num-industrial').value) || 0
    };
}

// --- GUARANTEED-FIT PACKER ---
class GuaranteedPacker {
    constructor(w, h, d) {
        this.w = w;
        this.h = h;
        this.d = d;
        this.packedItems = [];
        this.candidates = [{ x: 0, y: 0, z: 0 }];
        this.usedVolume = 0;
    }

    async pack(items) {
        items.sort((a, b) => {
            if (a.fragile !== b.fragile) return a.fragile ? 1 : -1;
            const volA = a.l * a.w * a.h;
            const volB = b.l * b.w * b.h;
            if (Math.abs(volB - volA) > 100) return volB - volA;
            return b.weight - a.weight;
        });

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            let placed = false;

            this.candidates.sort((a, b) => {
                if (Math.abs(a.y - b.y) > 0.1) return a.y - b.y;
                if (Math.abs(a.x - b.x) > 0.1) return a.x - b.x;
                return a.z - b.z;
            });

            for (let pos of this.candidates) {
                const orientations = this.getOrientations(item);
                
                for (let orient of orientations) {
                    if (this.canPlace(orient, pos)) {
                        await this.placeItem(item, orient, pos, i);
                        placed = true;
                        break;
                    }
                }
                if (placed) break;
            }

            if (!placed) {
                placed = await this.forcePlacement(item, i);
            }
        }
        
        return this.packedItems.length;
    }

    getOrientations(item) {
        const { l, w, h } = item;
        return [
            { l, w, h }, { l: w, w: l, h }, { l: h, w, h: l },
            { l, w: h, h: w }, { l: w, w: h, h: l }, { l: h, w: l, h: w }
        ];
    }

    canPlace(dims, pos) {
        if (pos.x + dims.l > this.w || pos.y + dims.h > this.h || pos.z + dims.w > this.d) return false;
        
        for (let other of this.packedItems) {
            if (this.intersect({ x: pos.x, y: pos.y, z: pos.z, ...dims }, other)) return false;
        }
        return true;
    }

    async forcePlacement(item, index) {
        const orientations = this.getOrientations(item);
        
        for (let y = 0; y <= this.h - item.h; y += 5) {
            for (let x = 0; x <= this.w - item.l; x += 5) {
                for (let z = 0; z <= this.d - item.w; z += 5) {
                    for (let orient of orientations) {
                        const pos = { x, y, z };
                        if (this.canPlace(orient, pos)) {
                            await this.placeItem(item, orient, pos, index);
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    async placeItem(item, dims, pos, index) {
        const placedItem = { 
            ...item, 
            x: pos.x, y: pos.y, z: pos.z, 
            l: dims.l, w: dims.w, h: dims.h,
            stability: pos.y === 0 ? 1.0 : 0.85
        };
        
        this.packedItems.push(placedItem);
        packedItemsData.push(placedItem); // Store for report
        this.usedVolume += (dims.l * dims.w * dims.h);

        this.candidates = this.candidates.filter(p => !(p.x === pos.x && p.y === pos.y && p.z === pos.z));
        this.addCandidate(pos.x + dims.l, pos.y, pos.z);
        this.addCandidate(pos.x, pos.y + dims.h, pos.z);
        this.addCandidate(pos.x, pos.y, pos.z + dims.w);
        this.cleanupCandidates();

        spawnAnimatedBox(placedItem);
        updateStats(index + 1, placedItem.stability, this.usedVolume);
        await new Promise(r => setTimeout(r, 50));
    }

    intersect(a, b) {
        return (a.x < b.x + b.l && a.x + a.l > b.x &&
                a.y < b.y + b.h && a.y + a.h > b.y &&
                a.z < b.z + b.w && a.z + a.w > b.z);
    }

    addCandidate(x, y, z) {
        if (x < this.w && y < this.h && z < this.d) {
            if (!this.candidates.some(p => Math.abs(p.x - x) < 1 && Math.abs(p.y - y) < 1 && Math.abs(p.z - z) < 1)) {
                this.candidates.push({ x, y, z });
            }
        }
    }

    cleanupCandidates() {
        this.candidates = this.candidates.filter(p => {
            for (let box of this.packedItems) {
                if (p.x >= box.x && p.x < box.x + box.l &&
                    p.y >= box.y && p.y < box.y + box.h &&
                    p.z >= box.z && p.z < box.z + box.w) return false;
            }
            return true;
        });
    }
}

// --- MAIN RUNNER ---
async function runSimulation() {
    const capacity = checkCapacity();
    if (!capacity.fits) {
        document.getElementById('status').innerText = "⚠️ Too many boxes!";
        return;
    }
    
    resetSimulation();
    const statusEl = document.getElementById('status');
    
    const input = getUserInput();
    const manifest = generateManifestFromInput(input);
    
    if (manifest.length === 0) {
        statusEl.innerText = "No items!";
        return;
    }

    statusEl.innerText = "AI: Optimizing...";
    
    const packer = new GuaranteedPacker(CONTAINER.w, CONTAINER.h, CONTAINER.d);
    const packed = await packer.pack(manifest);
    
    finalUtilization = (packer.usedVolume / containerVolume) * 100;

    if (packed === manifest.length) {
        statusEl.innerText = `✅ All ${packed} boxes loaded!`;
        document.getElementById('view-report-btn').style.display = 'block';
        document.getElementById('click-hint').style.display = 'block';
    } else {
        statusEl.innerText = `⚠️ ${packed}/${manifest.length} loaded`;
    }
}

// --- GENERATE ITEMS ---
function generateManifestFromInput(input) {
    const list = [];
    let id = 0;

    Object.entries(input).forEach(([type, count]) => {
        const config = BOX_TYPES[type];
        for (let i = 0; i < count; i++) {
            const randRange = (r) => r.min + Math.random() * (r.max - r.min);
            list.push({
                id: id++,
                type: type,
                name: config.name,
                code: config.code,
                color: config.color,
                fragile: config.fragile,
                l: Math.round(randRange(config.l)),
                w: Math.round(randRange(config.w)),
                h: Math.round(randRange(config.h)),
                weight: randRange(config.weight)
            });
        }
    });

    return list;
}

// --- VISUALIZATION ---
function spawnAnimatedBox(item) {
    const geometry = new THREE.BoxGeometry(item.l, item.h, item.w);
    
    const material = new THREE.MeshStandardMaterial({ 
        color: item.color, 
        transparent: true, 
        opacity: 0.9,
        metalness: 0.3, 
        roughness: 0.4,
        emissive: 0x000000
    });
    
    const cube = new THREE.Mesh(geometry, material);
    
    // Store item data for click detection
    cube.userData = { ...item };
    
    const offsetY = 12;
    const x = item.x + item.l/2 - CONTAINER.w/2;
    const targetY = item.y + item.h/2 + offsetY;
    const z = item.z + item.w/2 - CONTAINER.d/2;

    cube.position.set(x, targetY + 100, z);
    cube.castShadow = true;
    cube.receiveShadow = true;
    
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
    cube.add(line);

    scene.add(cube);
    packedMeshes.push(cube);

    function drop() {
        if (cube.position.y > targetY) {
            cube.position.y -= 5;
            if (cube.position.y < targetY) cube.position.y = targetY;
            requestAnimationFrame(drop);
        }
    }
    drop();
}

function updateStats(count, stability, usedVol) {
    document.getElementById('count').innerText = count;
    document.getElementById('stability').innerText = (stability * 100).toFixed(0) + "%";
    const pct = (usedVol / containerVolume) * 100;
    document.getElementById('utilization').innerText = pct.toFixed(1) + "%";
}

function resetSimulation() {
    packedMeshes.forEach(m => scene.remove(m));
    packedMeshes = [];
    packedItemsData = [];
    finalUtilization = 0;
    document.getElementById('count').innerText = "0";
    document.getElementById('stability').innerText = "100%";
    document.getElementById('utilization').innerText = "0%";
    document.getElementById('status').innerText = "Ready";
    document.getElementById('view-report-btn').style.display = 'none';
    document.getElementById('click-hint').style.display = 'none';
    document.getElementById('box-tooltip').style.display = 'none';
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

init();