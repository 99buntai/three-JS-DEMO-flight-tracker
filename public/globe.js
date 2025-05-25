/**
 * 3D Globe Flight Tracker
 * 
 * An interactive 3D globe application built with Three.js that visualizes
 * flight paths between any two points on Earth with realistic airplane animations.
 * 
 * Features:
 * - Interactive pin placement on globe surface
 * - Great circle route calculation and visualization
 * - Realistic 3D airplane model with proper flight orientation
 * - Real Earth textures with fallback support
 * - Animated sun with corona effects
 * - Starfield background for immersive space environment
 * - Mobile-responsive touch controls
 * - Smooth 60fps animations
 * 
 * @author 3D Globe Flight Tracker Team
 * @version 1.0.0
 */

// ============================================================================
// DEPENDENCY CHECKING AND INITIALIZATION
// ============================================================================

/**
 * Check if Three.js library is properly loaded
 * This is critical as the entire application depends on Three.js
 */
if (typeof THREE === 'undefined') {
    console.error('Three.js failed to load. Please check your internet connection.');
    document.addEventListener('DOMContentLoaded', () => {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.innerHTML = '<div style="color: #ff4444; text-align: center;"><h2>⚠️ Loading Error</h2><p>Three.js failed to load. Please refresh the page or check your internet connection.</p></div>';
        }
    });
} else {
    // Three.js loaded successfully - prepare for initialization
    // Check for OrbitControls availability (can be THREE.OrbitControls or global)
    const OrbitControlsClass = THREE.OrbitControls || window.OrbitControls;
    const hasOrbitControls = typeof OrbitControlsClass !== 'undefined';
}

// ============================================================================
// GLOBAL VARIABLES AND CONSTANTS
// ============================================================================

/**
 * Core Three.js objects - these form the foundation of our 3D scene
 */
let scene;              // The 3D scene container
let camera;             // Perspective camera for viewing the scene
let renderer;           // WebGL renderer for drawing to canvas
let globe;              // The main Earth sphere mesh
let controls;           // Camera controls (orbit or fallback)

/**
 * Interactive elements for flight visualization
 */
let pins = [];          // Array to store placed location pins (max 2)
let flightPath = null;  // The flight path line connecting pins
let animatedParticle = null; // The airplane that flies along the path
let isRotating = true;  // Flag to control automatic globe rotation

/**
 * Input handling objects for mouse/touch interaction
 */
const mouse = new THREE.Vector2();     // Normalized mouse coordinates (-1 to 1)
const raycaster = new THREE.Raycaster(); // For detecting mouse intersections with 3D objects

/**
 * Globe and animation configuration constants
 * These values control the visual appearance and behavior
 */
const GLOBE_RADIUS = 2;      // Radius of the Earth sphere in 3D units
const PIN_HEIGHT = 0.01;     // How far pins extend above Earth surface
const ARC_SEGMENTS = 64;     // Number of segments in flight path arcs (higher = smoother)

// ============================================================================
// MAIN INITIALIZATION FUNCTION
// ============================================================================

/**
 * Initialize the entire 3D globe application
 * This function sets up the scene, camera, renderer, controls, and all 3D objects
 * Called once when the page loads and Three.js is confirmed available
 */
function init() {
    // Verify Three.js is available before proceeding
    if (typeof THREE === 'undefined') {
        console.error('Three.js is not loaded');
        return;
    }
    
    // Determine which camera controls to use (Three.js OrbitControls or fallback)
    const OrbitControlsClass = THREE.OrbitControls || window.OrbitControls;
    const hasOrbitControls = typeof OrbitControlsClass !== 'undefined';
    
    if (!hasOrbitControls) {
        // Using fallback orbit controls implementation
        // This ensures the app works even if OrbitControls fails to load
    }

    // ========================================================================
    // SCENE SETUP
    // ========================================================================
    
    /**
     * Create the main 3D scene
     * The scene is the container for all 3D objects, lights, and cameras
     */
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000511); // Deep space blue-black color

    /**
     * Create perspective camera
     * FOV: 75 degrees (good balance between wide view and distortion)
     * Aspect: matches window dimensions
     * Near/Far: 0.1 to 1000 units (defines visible range)
     */
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5); // Position camera 5 units away from origin

    /**
     * Create WebGL renderer with antialiasing for smooth edges
     * Shadows enabled for realistic lighting effects
     */
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadow algorithm
    
    // Add renderer canvas to the DOM container
    document.getElementById('container').appendChild(renderer.domElement);

    // ========================================================================
    // CAMERA CONTROLS SETUP
    // ========================================================================
    
    /**
     * Set up camera controls for user interaction
     * Prefer Three.js OrbitControls if available, otherwise use custom fallback
     */
    if (hasOrbitControls) {
        // Use official Three.js OrbitControls
        controls = new OrbitControlsClass(camera, renderer.domElement);
        controls.enableDamping = true;      // Smooth camera movement
        controls.dampingFactor = 0.1;       // How much damping to apply
        controls.enableZoom = true;         // Allow zoom in/out
        controls.enablePan = false;         // Disable panning (only rotate and zoom)
        controls.minDistance = 3;           // Closest zoom level
        controls.maxDistance = 10;          // Farthest zoom level
        
        // Reduce zoom sensitivity for better user experience
        controls.zoomSpeed = 0.3; // Default is 1.0, making it much less sensitive
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,   // Left mouse button rotates
            MIDDLE: THREE.MOUSE.DOLLY,  // Middle mouse button zooms
            RIGHT: THREE.MOUSE.PAN      // Right mouse button pans (disabled above)
        };
    } else {
        // Use custom fallback controls if OrbitControls unavailable
        controls = createFallbackOrbitControls(camera, renderer.domElement);
    }

    // ========================================================================
    // 3D WORLD CREATION
    // ========================================================================
    
    // Create lighting system (sun, ambient light, etc.)
    createLighting();

    // Create the main Earth globe with realistic textures
    createGlobe();

    // Add starfield background for space environment
    createStarField();

    // Set up all user interaction event listeners
    setupEventListeners();

    // Start the main animation loop
    animate();

    // ========================================================================
    // LOADING COMPLETION
    // ========================================================================
    
    /**
     * Hide loading screen after a brief delay
     * This gives time for textures to load and scene to stabilize
     */
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 1000);
}

// ============================================================================
// LIGHTING SYSTEM
// ============================================================================

/**
 * Create the lighting system for realistic Earth illumination
 * This includes ambient light, directional light (sun), and specialized lighting for pins
 * Proper lighting is crucial for realistic 3D appearance and day/night effects
 */
function createLighting() {
    /**
     * Ambient Light - provides overall base illumination
     * Without this, areas not directly lit by the sun would be completely black
     * Color: Neutral gray (0x404040)
     * Intensity: 0.3 (30% - subtle base lighting)
     */
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    /**
     * Directional Light - simulates the Sun
     * This creates realistic day/night lighting on Earth's surface
     * Position represents the sun's location relative to Earth
     * Shadows enabled for realistic depth perception
     */
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 5); // Sun position in 3D space
    directionalLight.castShadow = true;       // Enable shadow casting
    
    // Configure shadow quality and coverage
    directionalLight.shadow.mapSize.width = 2048;  // Shadow resolution (higher = better quality)
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Create visual representation of the sun at the light's position
    createSun(directionalLight.position);

    /**
     * Point Light - specialized lighting for pins and UI elements
     * Provides a subtle cyan glow around interactive elements
     * Color: Cyan (0x64ffda) - matches UI accent color
     * Intensity: 0.5, Range: 10 units
     */
    const pointLight = new THREE.PointLight(0x64ffda, 0.5, 10);
    pointLight.position.set(0, 0, 4); // Position near camera for UI lighting
    scene.add(pointLight);
}

// ============================================================================
// SUN VISUALIZATION
// ============================================================================

/**
 * Create a realistic visual representation of the Sun
 * This includes multiple layers for realistic glow effects and animated corona
 * 
 * @param {THREE.Vector3} sunPosition - 3D position where the sun should be placed
 * @returns {THREE.Group} - The complete sun object with all effects
 */
function createSun(sunPosition) {
    /**
     * Group container for all sun components
     * Using a group allows us to position and animate all sun elements together
     */
    const sunGroup = new THREE.Group();
    
    /**
     * Main Sun Sphere - the bright core of the sun
     * Uses MeshBasicMaterial because the sun generates its own light
     * Emissive properties make it glow independently of scene lighting
     */
    const sunGeometry = new THREE.SphereGeometry(0.3, 32, 32); // Radius: 0.3, high detail
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,           // Bright yellow base color
        emissive: 0xffaa00,        // Orange emissive glow
        emissiveIntensity: 1.5     // High intensity for bright appearance
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sunGroup.add(sun);
    
    /**
     * Inner Glow Layer - creates heat distortion effect
     * Slightly larger than main sun, orange color, semi-transparent
     * BackSide rendering creates glow effect when viewed from outside
     */
    const innerGlowGeometry = new THREE.SphereGeometry(0.4, 32, 32);
    const innerGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6600,        // Bright orange
        transparent: true,
        opacity: 0.6,          // 60% opacity for layering effect
        side: THREE.BackSide   // Render inside faces for glow effect
    });
    const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    sunGroup.add(innerGlow);
    
    /**
     * Outer Glow Layer - extends the sun's radiance
     * Yellow-white color simulates the sun's outer atmosphere
     * Lower opacity for subtle effect
     */
    const outerGlowGeometry = new THREE.SphereGeometry(0.6, 32, 32);
    const outerGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff88,        // Light yellow-white
        transparent: true,
        opacity: 0.3,          // 30% opacity
        side: THREE.BackSide
    });
    const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
    sunGroup.add(outerGlow);
    
    /**
     * Far Glow Layer - creates distant radiance effect
     * Very subtle white glow that extends far from the sun
     * Simulates how the sun appears to have a large bright area in space
     */
    const farGlowGeometry = new THREE.SphereGeometry(0.9, 32, 32);
    const farGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,        // Pure white
        transparent: true,
        opacity: 0.1,          // Very subtle - 10% opacity
        side: THREE.BackSide
    });
    const farGlow = new THREE.Mesh(farGlowGeometry, farGlowMaterial);
    sunGroup.add(farGlow);
    
    /**
     * Corona Effect - simulates solar magnetic field lines
     * Wireframe sphere creates spiky appearance like real solar corona
     * Will be animated to rotate and pulse for dynamic effect
     */
    const coronaGeometry = new THREE.SphereGeometry(0.8, 16, 16); // Lower detail for wireframe
    const coronaMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,        // Bright yellow
        transparent: true,
        opacity: 0.2,          // Subtle wireframe effect
        wireframe: true        // Show only the edges/lines
    });
    const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
    sunGroup.add(corona);
    
    // Position the entire sun group at the specified location
    sunGroup.position.copy(sunPosition);
    scene.add(sunGroup);
    
    /**
     * Store references globally for animation access
     * These will be used in the main animation loop to create dynamic effects
     */
    window.sunGroup = sunGroup;   // Complete sun object
    window.sunCorona = corona;    // Corona for rotation animation
    
    return sunGroup;
}

// ============================================================================
// EARTH GLOBE CREATION
// ============================================================================

/**
 * Create the main Earth globe with realistic textures and atmosphere
 * This is the centerpiece of the application - a detailed, interactive Earth
 * Includes texture loading with fallbacks and atmospheric effects
 */
function createGlobe() {
    /**
     * Globe Geometry - high-detail sphere for smooth Earth surface
     * Radius: GLOBE_RADIUS (2 units)
     * Segments: 64x64 for smooth curvature (higher = smoother but slower)
     */
    const geometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);

    /**
     * Fallback Texture Generator
     * Creates a procedural Earth-like texture if real textures fail to load
     * Uses HTML5 Canvas to draw a simple blue ocean with green landmasses
     * 
     * @returns {THREE.CanvasTexture} - Procedurally generated Earth texture
     */
    function createFallbackTexture() {
        // Create canvas for texture generation
        const canvas = document.createElement('canvas');
        canvas.width = 512;   // Texture width in pixels
        canvas.height = 256;  // Texture height (2:1 ratio for sphere mapping)
        const ctx = canvas.getContext('2d');

        /**
         * Create ocean base using gradient
         * Simulates the varying blue colors of Earth's oceans
         */
        const gradient = ctx.createLinearGradient(0, 0, 512, 256);
        gradient.addColorStop(0, '#1e3c72');    // Deep ocean blue
        gradient.addColorStop(0.5, '#2a5298');  // Medium ocean blue
        gradient.addColorStop(1, '#1e3c72');    // Deep ocean blue
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 256);

        /**
         * Add landmass shapes
         * Random circular shapes in green to simulate continents and islands
         */
        ctx.fillStyle = '#228B22'; // Forest green for land
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 512;      // Random X position
            const y = Math.random() * 256;      // Random Y position
            const size = Math.random() * 30 + 10; // Random size (10-40 pixels)
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Globe Material - defines how the Earth surface appears
     * Uses Phong shading for realistic lighting interaction
     * Initially uses fallback texture, will be replaced with real Earth texture
     */
    const material = new THREE.MeshPhongMaterial({
        map: createFallbackTexture(),  // Start with procedural texture
        shininess: 100,                // Moderate shininess for ocean reflection
        transparent: true,             // Allow transparency effects
        opacity: 0.9                   // Slightly transparent for atmosphere blending
    });

    /**
     * Create the main globe mesh and add to scene
     * This is the primary interactive object users will click on
     */
    globe = new THREE.Mesh(geometry, material);
    globe.receiveShadow = true;  // Allow shadows to be cast on Earth surface
    scene.add(globe);

    // ========================================================================
    // REAL EARTH TEXTURE LOADING
    // ========================================================================
    
    /**
     * Load high-quality real Earth textures from reliable sources
     * Uses progressive fallback system - tries multiple sources until one works
     * All sources are CORS-friendly to avoid browser security issues
     */
    const textureLoader = new THREE.TextureLoader();
    
    /**
     * Array of Earth texture sources in order of preference
     * All URLs point to high-quality satellite imagery of Earth
     * Sources chosen for reliability and CORS compatibility
     */
    const earthTextureSources = [
        // High quality Earth textures from CORS-friendly sources
        'https://raw.githubusercontent.com/turban/webgl-earth/master/images/2_no_clouds_4k.jpg',  // 4K no clouds
        'https://raw.githubusercontent.com/turban/webgl-earth/master/images/1_earth_8k.jpg',     // 8K with clouds
        // Alternative sources from Three.js examples
        'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',  // Atmospheric view
        'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg'  // Normal map version
    ];

    let textureIndex = 0; // Track which texture source we're currently trying
    
    /**
     * Recursive function to try loading textures from different sources
     * If one source fails, automatically tries the next one
     * Provides graceful degradation if all sources fail
     */
    function tryLoadTexture() {
        // If we've exhausted all sources, stick with fallback texture
        if (textureIndex >= earthTextureSources.length) {
            // Using fallback Earth texture - all remote sources failed
            return;
        }

        /**
         * Attempt to load texture from current source
         * Three.js TextureLoader handles the HTTP request and image processing
         */
        textureLoader.load(
            earthTextureSources[textureIndex],
            
            /**
             * Success callback - texture loaded successfully
             * @param {THREE.Texture} texture - The loaded texture object
             */
            (texture) => {
                // Configure texture wrapping for proper sphere mapping
                texture.wrapS = THREE.RepeatWrapping;  // Horizontal wrapping
                texture.wrapT = THREE.RepeatWrapping;  // Vertical wrapping
                
                // Apply the new texture to the globe material
                material.map = texture;
                material.needsUpdate = true;  // Tell Three.js to update the material
            },
            
            // Progress callback - not used (silent loading)
            undefined,
            
            /**
             * Error callback - texture failed to load
             * @param {Error} error - The error that occurred
             */
            (error) => {
                // Move to next texture source and try again
                textureIndex++;
                tryLoadTexture(); // Recursive call to try next source
            }
        );
    }

    // Start the texture loading process
    tryLoadTexture();

    // Add atmospheric glow effect around Earth
    createAtmosphere();
}

// ============================================================================
// ATMOSPHERIC EFFECTS
// ============================================================================

/**
 * Create Earth's atmospheric glow effect
 * This adds a subtle blue glow around the planet to simulate the atmosphere
 * Uses a slightly larger sphere with back-side rendering for the glow effect
 */
function createAtmosphere() {
    /**
     * Atmosphere Geometry - slightly larger than Earth
     * Radius: 110% of globe radius to create thin atmosphere layer
     * Same detail level as Earth for consistent appearance
     */
    const atmosphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.1, 64, 64);
    
    /**
     * Atmosphere Material - creates the blue glow effect
     * BackSide rendering makes it glow when viewed from outside
     * Cyan color matches the natural blue of Earth's atmosphere
     */
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
        color: 0x64ffda,        // Cyan blue - matches UI accent color
        transparent: true,      // Must be transparent for glow effect
        opacity: 0.1,          // Very subtle - 10% opacity
        side: THREE.BackSide   // Render inside faces for glow effect
    });
    
    /**
     * Create atmosphere mesh and add to scene
     * This creates a subtle blue halo around Earth
     */
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);
}

// ============================================================================
// STARFIELD BACKGROUND
// ============================================================================

/**
 * Create a realistic starfield background for space environment
 * Generates thousands of randomly positioned stars to simulate deep space
 * Uses BufferGeometry for optimal performance with large numbers of points
 */
function createStarField() {
    /**
     * Star Geometry Setup
     * BufferGeometry is more efficient than regular geometry for many points
     * Each star is just a point in 3D space with position coordinates
     */
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 10000;  // Total number of stars to generate
    
    /**
     * Position Array - stores XYZ coordinates for all stars
     * Float32Array is memory-efficient for large datasets
     * 3 values per star (x, y, z) = starCount * 3 total values
     */
    const positions = new Float32Array(starCount * 3);

    /**
     * Generate random star positions
     * Creates a cube of stars around the entire scene
     * Range: -1000 to +1000 units in all directions
     */
    for (let i = 0; i < starCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 2000;     // X coordinate
        positions[i + 1] = (Math.random() - 0.5) * 2000; // Y coordinate  
        positions[i + 2] = (Math.random() - 0.5) * 2000; // Z coordinate
    }

    /**
     * Apply position data to geometry
     * 'position' is a special attribute name that Three.js recognizes
     * 3 indicates each position has 3 components (x, y, z)
     */
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    /**
     * Star Material - defines how stars appear
     * PointsMaterial is specifically designed for point clouds
     * White color with fixed size for consistent star appearance
     */
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,        // Pure white stars
        size: 2,               // Star size in pixels
        sizeAttenuation: false // Stars stay same size regardless of distance
    });

    /**
     * Create star field and add to scene
     * Points object renders each position as a small square point
     */
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}

// ============================================================================
// EVENT HANDLING SYSTEM
// ============================================================================

/**
 * Set up all user interaction event listeners
 * Handles mouse, touch, keyboard, and UI interactions
 * Provides comprehensive input support for all devices
 */
function setupEventListeners() {
    // ========================================================================
    // MOUSE INTERACTION EVENTS
    // ========================================================================
    
    /**
     * Mouse click handler for pin placement
     * Detects clicks on globe surface and places location pins
     */
    renderer.domElement.addEventListener('click', onMouseClick);
    
    /**
     * Mouse move handler for cursor feedback
     * Changes cursor appearance when hovering over interactive areas
     */
    renderer.domElement.addEventListener('mousemove', onMouseMove);

    // ========================================================================
    // TOUCH INTERACTION EVENTS
    // ========================================================================
    
    /**
     * Touch end handler for mobile pin placement
     * Handles single-tap gestures on touch devices
     */
    renderer.domElement.addEventListener('touchend', onTouchEnd);

    // ========================================================================
    // UI CONTROL EVENTS
    // ========================================================================
    
    /**
     * Clear pins button - removes all pins and flight paths
     */
    document.getElementById('clear-pins').addEventListener('click', clearPins);
    
    /**
     * Rotation toggle button - starts/stops automatic globe rotation
     */
    document.getElementById('toggle-rotation').addEventListener('click', toggleRotation);
    
    // ========================================================================
    // MOBILE MENU EVENTS
    // ========================================================================
    
    /**
     * Mobile menu toggle - opens/closes hamburger menu on mobile devices
     */
    document.getElementById('menu-toggle').addEventListener('click', toggleMobileMenu);
    
    /**
     * Close panel button - closes mobile menu
     */
    document.getElementById('close-panel').addEventListener('click', closeMobileMenu);
    
    /**
     * Overlay click - closes mobile menu when clicking outside
     */
    document.getElementById('overlay').addEventListener('click', closeMobileMenu);

    // ========================================================================
    // WINDOW EVENTS
    // ========================================================================
    
    /**
     * Window resize handler - maintains proper aspect ratio and canvas size
     */
    window.addEventListener('resize', onWindowResize);
}

// ============================================================================
// INPUT PROCESSING UTILITIES
// ============================================================================

/**
 * Extract pointer position from mouse or touch events
 * Provides unified handling for both mouse and touch input
 * 
 * @param {Event} event - Mouse or touch event object
 * @returns {Object} - Object with x, y coordinates in pixels
 */
function getPointerPosition(event) {
    // Handle touch events (mobile devices)
    if (event.touches && event.touches.length > 0) {
        return {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY
        };
    }
    
    // Handle touch end events (when finger lifts)
    if (event.changedTouches && event.changedTouches.length > 0) {
        return {
            x: event.changedTouches[0].clientX,
            y: event.changedTouches[0].clientY
        };
    }
    
    // Handle mouse events (desktop)
    return {
        x: event.clientX,
        y: event.clientY
    };
}

/**
 * Handle pin placement logic for both mouse and touch input
 * Converts screen coordinates to 3D world coordinates and places pins
 * 
 * @param {number} clientX - X coordinate in pixels from left edge of viewport
 * @param {number} clientY - Y coordinate in pixels from top edge of viewport
 */
function handlePinPlacement(clientX, clientY) {
    /**
     * Convert screen coordinates to normalized device coordinates (NDC)
     * NDC range from -1 to +1 in both X and Y directions
     * This is required for raycasting calculations
     */
    mouse.x = (clientX / window.innerWidth) * 2 - 1;   // Convert to -1 to +1 range
    mouse.y = -(clientY / window.innerHeight) * 2 + 1; // Convert and flip Y (screen Y is inverted)

    /**
     * Raycasting - find intersection between mouse ray and 3D objects
     * Creates a ray from camera through the mouse position into 3D space
     * Tests intersection with globe surface
     */
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(globe);

    /**
     * Process intersection results
     * Only place pin if we hit the globe and haven't reached the 2-pin limit
     */
    if (intersects.length > 0 && pins.length < 2) {
        /**
         * Get the 3D world position where the ray hit the globe
         * This is the exact point on Earth's surface that was clicked
         */
        const worldPoint = intersects[0].point;
        
        /**
         * Transform world coordinates to globe local coordinates
         * Since pins are children of globe, we need to account for globe's rotation
         * This ensures pins stay attached to the correct Earth location
         */
        const globeInverse = new THREE.Matrix4().copy(globe.matrixWorld).invert();
        const localPoint = worldPoint.clone().applyMatrix4(globeInverse);
        
        // Create and place the pin at the calculated position
        addPin(localPoint);
        
        // Update UI to show current pin count
        updatePinCounter();

        /**
         * Create flight path when we have exactly 2 pins
         * This automatically generates the great circle route
         */
        if (pins.length === 2) {
            createFlightPath();
        }
    }
}

function onMouseClick(event) {
    const pointer = getPointerPosition(event);
    handlePinPlacement(pointer.x, pointer.y);
}

function onTouchEnd(event) {
    // Only handle single touch for pin placement
    if (event.changedTouches.length === 1) {
        event.preventDefault();
        const pointer = getPointerPosition(event);
        handlePinPlacement(pointer.x, pointer.y);
    }
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(globe);

    if (intersects.length > 0 && pins.length < 2) {
        renderer.domElement.style.cursor = 'pointer';
    } else {
        renderer.domElement.style.cursor = 'default';
    }
}

function addPin(position) {
    // Ensure the position is exactly on the globe surface
    const surfacePosition = position.clone().normalize().multiplyScalar(GLOBE_RADIUS);
    const pinPosition = surfacePosition.clone().normalize().multiplyScalar(GLOBE_RADIUS + PIN_HEIGHT);

    // Create pin geometry
    const pinGeometry = new THREE.ConeGeometry(0.02, 0.1, 8);
    const pinMaterial = new THREE.MeshPhongMaterial({
        color: pins.length === 0 ? 0xff4444 : 0x44ff44,
        emissive: pins.length === 0 ? 0x220000 : 0x002200
    });

    const pin = new THREE.Mesh(pinGeometry, pinMaterial);
    pin.position.copy(pinPosition);
    
    // Make pin point outward from globe center
    pin.lookAt(pinPosition.clone().multiplyScalar(2));
    pin.castShadow = true;

    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: pins.length === 0 ? 0xff4444 : 0x44ff44,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(pinPosition);

    // Group pin and glow
    const pinGroup = new THREE.Group();
    pinGroup.add(pin);
    pinGroup.add(glow);

    // Add pin to globe instead of scene so it rotates with the globe
    globe.add(pinGroup);
    pins.push({
        group: pinGroup,
        position: pinPosition.clone(),
        surfacePosition: surfacePosition.clone(), // Store the exact surface position
        originalPosition: surfacePosition.clone().normalize() // Normalized for flight path calculation
    });

    // Add placement animation
    pinGroup.scale.set(0, 0, 0);
    const tween = new TWEEN.Tween(pinGroup.scale)
        .to({ x: 1, y: 1, z: 1 }, 500)
        .easing(TWEEN.Easing.Elastic.Out)
        .start();
}

function createFlightPath() {
    if (pins.length !== 2) return;

    const start = pins[0].originalPosition;
    const end = pins[1].originalPosition;

    // Calculate the great circle arc
    const arcPoints = calculateGreatCircleArc(start, end, ARC_SEGMENTS);

    // Create the arc geometry
    const arcGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
    const arcMaterial = new THREE.LineBasicMaterial({
        color: 0x64ffda,
        linewidth: 3,
        transparent: true,
        opacity: 0.8
    });

    flightPath = new THREE.Line(arcGeometry, arcMaterial);
    // Add flight path to globe instead of scene so it rotates with the globe
    globe.add(flightPath);

    // Add animated particles along the path
    createPathAnimation(arcPoints);
}

function calculateGreatCircleArc(start, end, segments) {
    const points = [];
    const angle = start.angleTo(end);

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        
        // Spherical linear interpolation (slerp)
        let point;
        if (angle === 0) {
            // Handle case where start and end are the same
            point = start.clone();
        } else {
            point = new THREE.Vector3()
                .addVectors(
                    start.clone().multiplyScalar(Math.sin((1 - t) * angle)),
                    end.clone().multiplyScalar(Math.sin(t * angle))
                )
                .divideScalar(Math.sin(angle))
                .normalize();
        }
        
        // Create arc height - starts and ends at surface level, peaks in middle
        const arcHeight = Math.sin(t * Math.PI) * 0.2; // Reduced height for more realistic arc
        const finalPoint = point.multiplyScalar(GLOBE_RADIUS + 0.02 + arcHeight); // Start closer to surface
        
        points.push(finalPoint);
    }

    return points;
}

function createPathAnimation(arcPoints) {
    // Create airplane geometry
    const airplane = createAirplane();
    
    // Add airplane to globe instead of scene so it rotates with the globe
    globe.add(airplane);
    animatedParticle = airplane; // Store reference for cleanup

    // Animation variables for smooth movement
    let pathIndex = 0;
    let progress = 0;
    const speed = 0.32; // Controls how fast the airplane moves along the path
    let isAnimating = true;
    
    function animateAirplane() {
        if (!animatedParticle || !isAnimating) return;
        
        if (pathIndex < arcPoints.length - 1) {
            const currentPoint = arcPoints[pathIndex];
            const nextPoint = arcPoints[pathIndex + 1];
            
            // Smooth interpolation between points
            const interpolatedPosition = new THREE.Vector3().lerpVectors(currentPoint, nextPoint, progress);
            animatedParticle.position.copy(interpolatedPosition);
            
            // Calculate direction for orientation
            const direction = new THREE.Vector3().subVectors(nextPoint, currentPoint).normalize();
            
            // Create a proper orientation matrix for the airplane
            const up = interpolatedPosition.clone().normalize(); // Point away from Earth center
            const forward = direction;
            const right = new THREE.Vector3().crossVectors(forward, up).normalize();
            const correctedUp = new THREE.Vector3().crossVectors(right, forward).normalize();
            
            // Apply the orientation to the airplane
            const matrix = new THREE.Matrix4();
            matrix.makeBasis(forward, correctedUp, right);
            animatedParticle.setRotationFromMatrix(matrix);
            
            // Update progress
            progress += speed;
            
            if (progress >= 1) {
                progress = 0;
                pathIndex++;
            }
        } else {
            // Reset to beginning immediately (no delay)
            pathIndex = 0;
            progress = 0;
        }
        
        // Continue animation
        requestAnimationFrame(animateAirplane);
    }
    
    // Start the animation
    animateAirplane();
    
    // Store cleanup function
    animatedParticle.stopAnimation = () => {
        isAnimating = false;
    };
}

function createAirplane() {
    const airplane = new THREE.Group();
    
    // Main fuselage (oriented along X-axis for forward direction)
    const fuselageGeometry = new THREE.CylinderGeometry(0.012, 0.008, 0.15, 12);
    const fuselageMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xf8f8ff, // Off-white
        shininess: 100
    });
    const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
    fuselage.rotation.z = Math.PI / 2; // Rotate to align with X-axis (forward)
    airplane.add(fuselage);
    
    // Nose cone (pointed forward along X-axis)
    const noseGeometry = new THREE.ConeGeometry(0.012, 0.04, 8);
    const noseMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xe6e6fa,
        shininess: 120
    });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.rotation.z = -Math.PI / 2; // Point along positive X-axis
    nose.position.set(0.095, 0, 0);
    airplane.add(nose);
    
    // Main wings (swept back design, extending along Z-axis)
    const wingGeometry = new THREE.BoxGeometry(0.025, 0.003, 0.08);
    const wingMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xf0f0f0,
        shininess: 90
    });
    
    // Left wing (negative Z)
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(0.02, -0.002, -0.04);
    leftWing.rotation.y = 0.2; // Swept back
    airplane.add(leftWing);
    
    // Right wing (positive Z)
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(0.02, -0.002, 0.04);
    rightWing.rotation.y = -0.2; // Swept back
    airplane.add(rightWing);
    
    // Wing tips
    const wingtipGeometry = new THREE.BoxGeometry(0.003, 0.008, 0.015);
    const wingtipMaterial = new THREE.MeshPhongMaterial({ color: 0xff4444 });
    
    const leftWingtip = new THREE.Mesh(wingtipGeometry, wingtipMaterial);
    leftWingtip.position.set(0.06, 0, -0.065);
    airplane.add(leftWingtip);
    
    const rightWingtip = new THREE.Mesh(wingtipGeometry, wingtipMaterial);
    rightWingtip.position.set(0.06, 0, 0.065);
    airplane.add(rightWingtip);
    
    // Engines under wings
    const engineGeometry = new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8);
    const engineMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2c3e50,
        shininess: 120
    });
    
    // Left engine
    const leftEngine = new THREE.Mesh(engineGeometry, engineMaterial);
    leftEngine.rotation.z = Math.PI / 2; // Align with fuselage
    leftEngine.position.set(0.03, -0.015, -0.03);
    airplane.add(leftEngine);
    
    // Right engine
    const rightEngine = new THREE.Mesh(engineGeometry, engineMaterial);
    rightEngine.rotation.z = Math.PI / 2; // Align with fuselage
    rightEngine.position.set(0.03, -0.015, 0.03);
    airplane.add(rightEngine);
    
    // Engine intakes (front)
    const intakeGeometry = new THREE.CylinderGeometry(0.009, 0.007, 0.008, 8);
    const intakeMaterial = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
    
    const leftIntake = new THREE.Mesh(intakeGeometry, intakeMaterial);
    leftIntake.rotation.z = Math.PI / 2;
    leftIntake.position.set(0.049, -0.015, -0.03);
    airplane.add(leftIntake);
    
    const rightIntake = new THREE.Mesh(intakeGeometry, intakeMaterial);
    rightIntake.rotation.z = Math.PI / 2;
    rightIntake.position.set(0.049, -0.015, 0.03);
    airplane.add(rightIntake);
    
    // Horizontal stabilizer (tail wings, extending along Z-axis)
    const hstabGeometry = new THREE.BoxGeometry(0.015, 0.002, 0.04);
    const hstabMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xf0f0f0,
        shininess: 90
    });
    const hstab = new THREE.Mesh(hstabGeometry, hstabMaterial);
    hstab.position.set(-0.06, 0, 0);
    airplane.add(hstab);
    
    // Vertical stabilizer (tail fin, extending along Y-axis)
    const vstabGeometry = new THREE.BoxGeometry(0.025, 0.025, 0.003);
    const vstabMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xe6e6fa,
        shininess: 90
    });
    const vstab = new THREE.Mesh(vstabGeometry, vstabMaterial);
    vstab.position.set(-0.06, 0.015, 0);
    airplane.add(vstab);
    
    // Airline livery stripe
    const stripeGeometry = new THREE.BoxGeometry(0.12, 0.005, 0.001);
    const stripeMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x3498db, // Blue stripe
        shininess: 100
    });
    const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
    stripe.position.set(0.01, 0.013, 0);
    airplane.add(stripe);
    
    // Windows (small details)
    const windowGeometry = new THREE.BoxGeometry(0.08, 0.003, 0.001);
    const windowMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x87ceeb, // Sky blue for windows
        transparent: true,
        opacity: 0.7
    });
    
    // Left side windows
    const leftWindows = new THREE.Mesh(windowGeometry, windowMaterial);
    leftWindows.position.set(0.02, 0.012, -0.012);
    airplane.add(leftWindows);
    
    // Right side windows
    const rightWindows = new THREE.Mesh(windowGeometry, windowMaterial);
    rightWindows.position.set(0.02, 0.012, 0.012);
    airplane.add(rightWindows);
    
    // Cockpit windows
    const cockpitGeometry = new THREE.BoxGeometry(0.02, 0.008, 0.001);
    const cockpitMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x191970, // Dark blue
        transparent: true,
        opacity: 0.8
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0.08, 0.008, 0);
    airplane.add(cockpit);
    
    // Scale the entire airplane to be more visible
    airplane.scale.setScalar(1.8);
    
    return airplane;
}

function clearPins() {
    // Remove pins from globe
    for (const pin of pins) {
        globe.remove(pin.group);
    }
    pins = [];

    // Remove flight path from globe
    if (flightPath) {
        globe.remove(flightPath);
        flightPath = null;
    }

    // Stop and remove animated airplane from globe
    if (animatedParticle) {
        if (animatedParticle.stopAnimation) {
            animatedParticle.stopAnimation();
        }
        globe.remove(animatedParticle);
        animatedParticle = null;
    }

    updatePinCounter();
}

function toggleMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const panel = document.getElementById('ui-panel');
    const overlay = document.getElementById('overlay');
    
    menuToggle.classList.toggle('active');
    panel.classList.toggle('active');
    overlay.classList.toggle('active');
}

function closeMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const panel = document.getElementById('ui-panel');
    const overlay = document.getElementById('overlay');
    
    menuToggle.classList.remove('active');
    panel.classList.remove('active');
    overlay.classList.remove('active');
}

function updatePinCounter() {
    const counter = document.getElementById('pin-count');
    const flightStatus = document.getElementById('flight-status');
    
    counter.textContent = `${pins.length}/2 Pins`;
    
    if (pins.length === 2) {
        flightStatus.style.display = 'flex';
    } else {
        flightStatus.style.display = 'none';
    }
}

function toggleRotation() {
    isRotating = !isRotating;
    const button = document.getElementById('toggle-rotation');
    const icon = button.querySelector('.btn-icon');
    
    if (isRotating) {
        button.innerHTML = '<span class="btn-icon">⏸️</span>Pause Rotation';
    } else {
        button.innerHTML = '<span class="btn-icon">▶️</span>Resume Rotation';
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    // Auto-rotate globe
    if (isRotating) {
        globe.rotation.y += 0.005;
    }

    // Animate sun corona (if sun exists)
    if (window.sunCorona) {
        window.sunCorona.rotation.x += 0.01;
        window.sunCorona.rotation.y += 0.015;
        window.sunCorona.rotation.z += 0.008;
        
        // Pulsing effect for corona
        const time = Date.now() * 0.002;
        window.sunCorona.material.opacity = 0.15 + Math.sin(time) * 0.1;
    }

    // Update controls
    controls.update();

    // Update TWEEN animations
    if (typeof TWEEN !== 'undefined') {
        TWEEN.update();
    }

    // Render scene
    renderer.render(scene, camera);
}

// Simple TWEEN implementation for animations
const TWEEN = {
    _tweens: [],
    
    Tween: function(object) {
        this._object = object;
        this._valuesStart = {};
        this._valuesEnd = {};
        this._duration = 1000;
        this._easingFunction = TWEEN.Easing.Linear.None;
        this._startTime = null;
        
        this.to = (properties, duration) => {
            this._valuesEnd = properties;
            if (duration !== undefined) {
                this._duration = duration;
            }
            return this;
        };
        
        this.easing = (easing) => {
            this._easingFunction = easing;
            return this;
        };
        
        this.start = () => {
            TWEEN._tweens.push(this);
            this._startTime = performance.now();
            
            for (const property in this._valuesEnd) {
                this._valuesStart[property] = this._object[property];
            }
            
            return this;
        };
        
        return this;
    },
    
    update: () => {
        const time = performance.now();
        
        for (let i = TWEEN._tweens.length - 1; i >= 0; i--) {
            const tween = TWEEN._tweens[i];
            const elapsed = time - tween._startTime;
            const t = Math.min(elapsed / tween._duration, 1);
            const easedT = tween._easingFunction(t);
            
            for (const property in tween._valuesEnd) {
                const start = tween._valuesStart[property];
                const end = tween._valuesEnd[property];
                tween._object[property] = start + (end - start) * easedT;
            }
            
            if (t >= 1) {
                TWEEN._tweens.splice(i, 1);
            }
        }
    },
    
    Easing: {
        Linear: {
            None: (t) => t
        },
        Elastic: {
            Out: (t) => {
                return t === 0 ? 0 : t === 1 ? 1 : (2 ** (-10 * t)) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
            }
        }
    }
};

// Simple fallback OrbitControls implementation
function createFallbackOrbitControls(camera, domElement) {
    const controls = {
        enableDamping: true,
        dampingFactor: 0.1,
        enableZoom: true,
        enablePan: false,
        minDistance: 3,
        maxDistance: 10,
        
        // Spherical coordinates for proper orbiting
        spherical: {
            radius: camera.position.length(),
            theta: Math.atan2(camera.position.x, camera.position.z), // horizontal angle
            phi: Math.acos(camera.position.y / camera.position.length()) // vertical angle
        },
        
        // Mouse tracking
        isMouseDown: false,
        mouseX: 0,
        mouseY: 0,
        
        // Touch tracking
        isTouching: false,
        touchX: 0,
        touchY: 0,
        lastTouchDistance: 0,
        
        update: function() {
            // Update camera position based on spherical coordinates
            camera.position.x = this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);
            camera.position.y = this.spherical.radius * Math.cos(this.spherical.phi);
            camera.position.z = this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);
            
            // Always look at the center
            camera.lookAt(0, 0, 0);
        }
    };
    
    // Mouse event handlers
    domElement.addEventListener('mousedown', (event) => {
        controls.isMouseDown = true;
        controls.mouseX = event.clientX;
        controls.mouseY = event.clientY;
        domElement.style.cursor = 'grabbing';
    });
    
    domElement.addEventListener('mouseup', () => {
        controls.isMouseDown = false;
        domElement.style.cursor = 'grab';
    });
    
    domElement.addEventListener('mouseleave', () => {
        controls.isMouseDown = false;
        domElement.style.cursor = 'default';
    });
    
    domElement.addEventListener('mousemove', (event) => {
        if (!controls.isMouseDown) return;
        
        const deltaX = event.clientX - controls.mouseX;
        const deltaY = event.clientY - controls.mouseY;
        
        // Update spherical coordinates for proper orbiting (reduced sensitivity)
        controls.spherical.theta -= deltaX * 0.005; // horizontal rotation (less sensitive)
        controls.spherical.phi -= deltaY * 0.005;   // vertical rotation (less sensitive)
        
        // Clamp phi to prevent flipping
        controls.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, controls.spherical.phi));
        
        controls.mouseX = event.clientX;
        controls.mouseY = event.clientY;
    });
    
    // Touch event handlers for mobile
    domElement.addEventListener('touchstart', (event) => {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            // Single touch - rotation
            controls.isTouching = true;
            controls.touchX = event.touches[0].clientX;
            controls.touchY = event.touches[0].clientY;
        } else if (event.touches.length === 2) {
            // Two finger touch - zoom
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const distance = Math.sqrt(
                (touch2.clientX - touch1.clientX) ** 2 +
                (touch2.clientY - touch1.clientY) ** 2
            );
            controls.lastTouchDistance = distance;
        }
    });
    
    domElement.addEventListener('touchend', (event) => {
        event.preventDefault();
        controls.isTouching = false;
        controls.lastTouchDistance = 0;
    });
    
    domElement.addEventListener('touchmove', (event) => {
        event.preventDefault();
        
        if (event.touches.length === 1 && controls.isTouching) {
            // Single touch - rotation
            const deltaX = event.touches[0].clientX - controls.touchX;
            const deltaY = event.touches[0].clientY - controls.touchY;
            
            // Update spherical coordinates (same sensitivity as mouse)
            controls.spherical.theta -= deltaX * 0.005;
            controls.spherical.phi -= deltaY * 0.005;
            
            // Clamp phi to prevent flipping
            controls.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, controls.spherical.phi));
            
            controls.touchX = event.touches[0].clientX;
            controls.touchY = event.touches[0].clientY;
        } else if (event.touches.length === 2) {
            // Two finger touch - pinch to zoom
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const distance = Math.sqrt(
                (touch2.clientX - touch1.clientX) ** 2 +
                (touch2.clientY - touch1.clientY) ** 2
            );
            
            if (controls.lastTouchDistance > 0) {
                const scale = controls.lastTouchDistance / distance;
                // Dampen the zoom sensitivity much more for smoother control
                const dampedScale = 1 + (scale - 1) * 0.2; // Increased dampening from 0.5 to 0.2
                controls.spherical.radius *= dampedScale;
                
                // Enforce distance limits
                controls.spherical.radius = Math.max(controls.minDistance, Math.min(controls.maxDistance, controls.spherical.radius));
            }
            
            controls.lastTouchDistance = distance;
        }
    });
    
    // Zoom handling (mouse wheel)
    domElement.addEventListener('wheel', (event) => {
        event.preventDefault();
        const scale = event.deltaY > 0 ? 1.02 : 0.98; // Further reduced from 1.05/0.95 to 1.02/0.98
        controls.spherical.radius *= scale;
        
        // Enforce distance limits
        controls.spherical.radius = Math.max(controls.minDistance, Math.min(controls.maxDistance, controls.spherical.radius));
    });
    
    // Set initial cursor style
    domElement.style.cursor = 'grab';
    
    return controls;
}

// Start the application
window.addEventListener('load', () => {
    // Small delay to ensure all scripts are loaded
    setTimeout(() => {
        if (typeof THREE !== 'undefined') {
            init();
        } else {
            // Retry once after delay
            setTimeout(() => {
                if (typeof THREE !== 'undefined') {
                    init();
                } else {
                    const loading = document.getElementById('loading');
                    if (loading) {
                        loading.innerHTML = '<div style="color: #ff4444; text-align: center;"><h2>⚠️ Loading Error</h2><p>Failed to load Three.js. Please refresh the page.</p><button onclick="location.reload()" style="margin-top: 10px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">Refresh Page</button></div>';
                    }
                }
            }, 1000);
        }
    }, 100);
}); 