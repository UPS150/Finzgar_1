import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);

const canvasContainer = document.getElementById('canvas-container');
canvasContainer.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

const flavorsData = [
    { name: 'Domaci_Gozdni_Med', color: '#8B4513', prices: { '900g': 12.99, '450g': 7.49, '250g': 4.99 } },
    { name: 'Domaci_Akacijev_Med', color: '#FFD700', prices: { '900g': 14.99, '450g': 8.49, '250g': 5.49 } },
    { name: 'Domaci_Cvetlicni_Med', color: '#FF69B4', prices: { '900g': 13.49, '450g': 7.99, '250g': 5.29 } },
    { name: 'Domaci_Lipov_Med', color: '#ADFF2F', prices: { '900g': 13.99, '450g': 8.29, '250g': 5.39 } },
    { name: 'Domaci_Kostanjev_Med', color: '#8A2BE2', prices: { '900g': 15.99, '450g': 9.49, '250g': 6.49 } }
];
const sizes = ['900g', '450g', '250g'];
let currentFlavorIndex = 0;
let currentSizeIndex = 0;
let currentModel = null;
let hasScrolledToObject = false;

const priceContainer = document.getElementById('price-container');
const priceElement = document.getElementById('price');
const introSection = document.getElementById('intro');

function createFallbackPyramid() {
    const geometry = new THREE.TetrahedronGeometry(2);
    const material = new THREE.MeshStandardMaterial({
        color: 0x666666,
        transparent: true,
        opacity: 0.5,
        roughness: 0.7,
        metalness: 0.1
    });
    const pyramid = new THREE.Mesh(geometry, material);
    pyramid.userData = { rotate: true };
    return pyramid;
}

function animateModelTransition(oldModel, newModel, direction) {
    let exitTarget, enterStart;
    switch (direction) {
        case 'left':
            exitTarget = new THREE.Vector3(20, 0, 0);
            enterStart = new THREE.Vector3(-20, 0, 0);
            break;
        case 'right':
            exitTarget = new THREE.Vector3(-20, 0, 0);
            enterStart = new THREE.Vector3(20, 0, 0);
            break;
        case 'size':
            exitTarget = new THREE.Vector3(0, 20, 0);
            enterStart = new THREE.Vector3(0, -20, 0);
            break;
        default:
            enterStart = new THREE.Vector3(0, -20, 0);
            exitTarget = null;
    }

    let progress = 0;
    const animate = () => {
        progress += 0.03;
        if (oldModel && exitTarget) {
            oldModel.position.lerp(exitTarget, progress);
        }
        newModel.position.lerp(new THREE.Vector3(0, 0, 0), progress);
        if (progress >= 1) {
            if (oldModel) scene.remove(oldModel);
        } else {
            requestAnimationFrame(animate);
        }
    };
    newModel.position.copy(enterStart);
    animate();
}

function loadModel(flavorIndex, sizeIndex, direction = '') {
    const flavor = flavorsData[flavorIndex].name;
    const size = sizes[sizeIndex];
    const baseColor = flavorsData[flavorIndex].color;
    const intensity = 1 - (currentSizeIndex * 0.2);
    const color = new THREE.Color(baseColor).lerp(new THREE.Color('#ffffff'), 1 - intensity).getStyle();

    priceElement.classList.remove('visible');
    setTimeout(() => {
        priceElement.textContent = `${flavor} (${size}) - €${flavorsData[flavorIndex].prices[size].toFixed(2)}`;
        priceElement.classList.add('visible');
    }, 50);

    if (canvasContainer.classList.contains('visible')) {
        document.body.style.background = color;
    }

    const loader = new GLTFLoader();
    const filePath = `./models/${flavor}_${size}.glb`;
    loader.load(
        filePath,
        (gltf) => {
            const newModel = gltf.scene;
            const box = new THREE.Box3().setFromObject(newModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            newModel.position.sub(center);
            const maxDim = Math.max(size.x, size.y, size.z);
            const desiredSize = 5;
            const scale = desiredSize / maxDim;
            newModel.scale.set(scale, scale, scale);

            newModel.traverse((child) => {
                if (child.isMesh) {
                    child.material.transparent = false;
                    child.material.opacity = 1.0;
                }
            });

            scene.add(newModel);
            animateModelTransition(currentModel, newModel, direction);
            currentModel = newModel;
            console.log(`Loaded: ${flavor}_${size}`);
        },
        (xhr) => { console.log((xhr.loaded / xhr.total * 100) + '% loaded'); },
        (error) => {
            console.error('Error loading model:', error);
            const newModel = createFallbackPyramid();
            scene.add(newModel);
            animateModelTransition(currentModel, newModel, direction);
            currentModel = newModel;
        }
    );
}

loadModel(currentFlavorIndex, currentSizeIndex);

camera.position.set(0, 0, 10);

let isDragging = false;
let previousX = 0;

canvasContainer.addEventListener('mousedown', (event) => {
    isDragging = true;
    previousX = event.clientX;
});

canvasContainer.addEventListener('mousemove', (event) => {
    if (isDragging && currentModel) {
        const deltaX = event.clientX - previousX;
        currentModel.rotation.z += deltaX * 0.01;
        previousX = event.clientX;
    }
});

canvasContainer.addEventListener('mouseup', () => {
    isDragging = false;
});

canvasContainer.addEventListener('mouseleave', () => {
    isDragging = false;
});

const arrowUp = document.getElementById('arrow-up');
const arrowDown = document.getElementById('arrow-down');
const arrowLeft = document.getElementById('arrow-left');
const arrowRight = document.getElementById('arrow-right');

arrowLeft.addEventListener('click', () => {
    currentFlavorIndex = (currentFlavorIndex - 1 + flavorsData.length) % flavorsData.length;
    loadModel(currentFlavorIndex, currentSizeIndex, 'left');
});

arrowRight.addEventListener('click', () => {
    currentFlavorIndex = (currentFlavorIndex + 1) % flavorsData.length;
    loadModel(currentFlavorIndex, currentSizeIndex, 'right');
});

arrowUp.addEventListener('click', () => {
    document.getElementById('intro').scrollIntoView({ behavior: 'smooth' });
});

arrowDown.addEventListener('click', () => {
    currentSizeIndex = (currentSizeIndex + 1) % sizes.length;
    loadModel(currentFlavorIndex, currentSizeIndex, 'size');
});

document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowLeft':
            currentFlavorIndex = (currentFlavorIndex - 1 + flavorsData.length) % flavorsData.length;
            loadModel(currentFlavorIndex, currentSizeIndex, 'left');
            break;
        case 'ArrowRight':
            currentFlavorIndex = (currentFlavorIndex + 1) % flavorsData.length;
            loadModel(currentFlavorIndex, currentSizeIndex, 'right');
            break;
        case 'ArrowUp':
            document.getElementById('intro').scrollIntoView({ behavior: 'smooth' });
            break;
        case 'ArrowDown':
            currentSizeIndex = (currentSizeIndex + 1) % sizes.length;
            loadModel(currentFlavorIndex, currentSizeIndex, 'size');
            break;
    }
});

function animate() {
    requestAnimationFrame(animate);
    if (currentModel && currentModel.userData.rotate) {
        currentModel.rotation.y += 0.02;
    }
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const canvasObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            [arrowUp, arrowDown, arrowLeft, arrowRight, priceContainer].forEach(el => {
                el.classList.add('visible');
            });
            if (!hasScrolledToObject) {
                loadModel(currentFlavorIndex, currentSizeIndex, 'size');
                hasScrolledToObject = true;
            }
        } else {
            entry.target.classList.remove('visible');
            [arrowUp, arrowDown, arrowLeft, arrowRight, priceContainer].forEach(el => {
                el.classList.remove('visible');
            });
        }
    });
}, { threshold: 0.5 });

canvasObserver.observe(canvasContainer);

const introObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            document.body.style.background = '#ffffff';
        }
    });
}, { threshold: 0.5 });

introObserver.observe(introSection);