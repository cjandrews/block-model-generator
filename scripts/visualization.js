/**
 * 3D Visualization using Three.js
 * Sets up scene and renders blocks
 * 
 * @license MIT License
 * @copyright Copyright (c) 2026 BuildIT Design Labs, LLC
 */

let scene, camera, renderer, controls;
let blockMeshes = [];
let pointCloud = null;
let instancedMesh = null;
let currentViewMode = 'solid'; // 'solid', 'points', 'transparent'
let currentVisualizationField = 'rockType'; // Field to visualize
let vizCurrentBlocks = []; // Blocks currently in visualization (renamed to avoid conflict with main.js)
let currentCellSizes = { x: 10, y: 10, z: 10 };

// Slice tool
let slicePlane = null;
let slicePlaneHelper = null;
let sliceEnabled = false;
let sliceAxis = 'z'; // 'x', 'y', or 'z'
let slicePosition = 0;
let modelBounds = { minX: -100, maxX: 100, minY: -100, maxY: 100, minZ: -100, maxZ: 100 };

// Value-based visibility
let valueVisibilityEnabled = false;
let valueVisibilityThreshold = 0;
let valueVisibilityMode = 'above'; // 'above' or 'below'
let blockValueAttributes = new Map(); // Map of mesh UUID to value attribute buffer
let valueFilterUpdatePending = false; // Flag to throttle uniform updates
let valueVisibilityShaderMaterial = null; // Custom shader material for value filtering

// Ground layer
let groundMesh = null;
let groundEnabled = false;

// Tooltip
let tooltipElement = null;
let raycaster = null;
let mouse = new THREE.Vector2();
let hoveredBlock = null;
let blockDataMap = new Map(); // Maps mesh instances to block data
let isDragging = false;

/**
 * Initialize Three.js scene
 * @param {HTMLElement} container - Container element for the canvas
 */
function initVisualization(container) {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    
    // Make scene accessible globally for memory monitoring
    window.scene = scene;
    
    // Camera setup
    const width = container.clientWidth;
    const height = container.clientHeight;
    const aspect = width / height;
    
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);
    camera.position.set(100, 100, 100);
    camera.lookAt(0, 0, 0);
    
    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.localClippingEnabled = true; // Enable local clipping for slice tool
    container.appendChild(renderer.domElement);
    
    // Controls setup (using OrbitControls)
    // Try different ways OrbitControls might be loaded
    let OrbitControlsClass = null;
    if (typeof THREE.OrbitControls !== 'undefined') {
        OrbitControlsClass = THREE.OrbitControls;
    } else if (typeof OrbitControls !== 'undefined') {
        OrbitControlsClass = OrbitControls;
    }
    
    if (OrbitControlsClass) {
        controls = new OrbitControlsClass(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        // Initial zoom limits - will be updated when model is loaded
        controls.minDistance = 0.1;
        controls.maxDistance = 10000;
    } else {
        console.warn('OrbitControls not found. Camera controls will be limited.');
    }
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(50, 50, 50);
    scene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-50, -50, -50);
    scene.add(directionalLight2);
    
    // Add axes helper
    const axesHelper = new THREE.AxesHelper(50);
    scene.add(axesHelper);
    
    // Add grid helper
    const gridHelper = new THREE.GridHelper(200, 20, 0x444444, 0x222222);
    scene.add(gridHelper);
    
    // Initialize slice plane (hidden by default)
    initSlicePlane();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Initialize raycasting for tooltip
    raycaster = new THREE.Raycaster();
    
    // Get tooltip element
    tooltipElement = document.getElementById('blockTooltip');
    
    // Add mouse move listener for tooltip
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseout', onMouseOut);
    
    // Hide tooltip when dragging (camera controls)
    if (controls) {
        renderer.domElement.addEventListener('mousedown', () => {
            isDragging = true;
            hideTooltip();
        });
        renderer.domElement.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }
    
    // Start animation loop
    animate();
}

/**
 * Initialize slice plane for cutting through the model
 */
function initSlicePlane() {
    // Create a wireframe rectangle using EdgesGeometry
    // We'll update the size when model bounds are known
    const planeGeometry = new THREE.PlaneGeometry(1000, 1000);
    const edgesGeometry = new THREE.EdgesGeometry(planeGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00ff00,
        linewidth: 2,
        transparent: true,
        opacity: 0.8
    });
    
    slicePlaneHelper = new THREE.LineSegments(edgesGeometry, lineMaterial);
    slicePlaneHelper.visible = false;
    scene.add(slicePlaneHelper);
    
    // Create the actual clipping plane
    slicePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
}

/**
 * Handle window resize
 */
function onWindowResize() {
    const container = renderer.domElement.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

/**
 * Animation loop
 */
function animate() {
    requestAnimationFrame(animate);
    
    if (controls) {
        controls.update();
    }
    
    renderer.render(scene, camera);
}

/**
 * Clear all block meshes from scene
 */
function clearBlocks() {
    // Clear value attribute map
    blockValueAttributes.clear();
    
    // Clear individual meshes
    blockMeshes.forEach(mesh => {
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
    });
    blockMeshes = [];
    
    // Clear instanced mesh
    if (instancedMesh) {
        scene.remove(instancedMesh);
        instancedMesh.geometry.dispose();
        instancedMesh.material.dispose();
        instancedMesh = null;
    }
    
    // Clear point cloud
    if (pointCloud) {
        scene.remove(pointCloud);
        pointCloud.geometry.dispose();
        pointCloud.material.dispose();
        pointCloud = null;
    }
}

/**
 * Get color for a block based on the visualization field
 * @param {Object} block - Block object
 * @param {string} field - Field name to visualize
 * @returns {number} Hex color value
 */
function getBlockColor(block, field) {
    if (field === 'rockType') {
        return getMaterialColor(block.rockType || block.material || 'Waste');
    }
    
    // For numeric fields, use a color scale
    let value = block[field];
    if (value === undefined || value === null || isNaN(value)) {
        return 0x808080; // Gray for missing values
    }
    
    // Normalize value to 0-1 range based on field
    let normalized = 0;
    let min = 0, max = 1;
    
    switch (field) {
        case 'density':
            min = 0;
            max = 5.0; // Typical density range
            break;
        case 'gradeCu':
            min = 0;
            max = 5.0; // Typical grade range
            break;
        case 'gradeAu':
            min = 0;
            max = 10.0; // Typical grade range
            break;
        case 'econValue':
            // Find min/max from all blocks
            const values = vizCurrentBlocks.map(b => b[field]).filter(v => v !== undefined && !isNaN(v));
            if (values.length > 0) {
                min = Math.min(...values);
                max = Math.max(...values);
            }
            break;
    }
    
    normalized = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
    
    // Use a color scale (blue -> green -> yellow -> red)
    return getColorFromValue(normalized);
}

/**
 * Get color from normalized value (0-1) using a color scale
 * @param {number} value - Normalized value between 0 and 1
 * @returns {number} Hex color value
 */
function getColorFromValue(value) {
    // Color scale: blue (low) -> cyan -> green -> yellow -> red (high)
    let r, g, b;
    
    if (value < 0.25) {
        // Blue to cyan
        const t = value / 0.25;
        r = 0;
        g = Math.floor(t * 255);
        b = 255;
    } else if (value < 0.5) {
        // Cyan to green
        const t = (value - 0.25) / 0.25;
        r = 0;
        g = 255;
        b = Math.floor((1 - t) * 255);
    } else if (value < 0.75) {
        // Green to yellow
        const t = (value - 0.5) / 0.25;
        r = Math.floor(t * 255);
        g = 255;
        b = 0;
    } else {
        // Yellow to red
        const t = (value - 0.75) / 0.25;
        r = 255;
        g = Math.floor((1 - t) * 255);
        b = 0;
    }
    
    return (r << 16) | (g << 8) | b;
}

/**
 * Filter blocks based on value visibility
 * NOTE: With shader-based filtering, we no longer filter blocks here for value visibility.
 * The shader handles filtering. We only filter for other purposes if needed.
 * @param {Array} blocks - Array of block objects
 * @returns {Array} Filtered blocks
 */
function filterBlocks(blocks) {
    // With shader-based value filtering, we don't need to filter blocks here
    // The shader will handle visibility based on instance attributes
    // This function is kept for compatibility but returns all blocks
    return blocks;
}

/**
 * Render blocks in 3D using optimized methods
 * @param {Array} blocks - Array of block objects
 * @param {number} cellSizeX - Size of each cell in X direction
 * @param {number} cellSizeY - Size of each cell in Y direction
 * @param {number} cellSizeZ - Size of each cell in Z direction
 * @param {boolean} centerCamera - Whether to center camera on model (default: true)
 */
function renderBlocks(blocks, cellSizeX, cellSizeY, cellSizeZ, centerCamera = true) {
    // Store current data
    vizCurrentBlocks = blocks;
    currentCellSizes = { x: cellSizeX, y: cellSizeY, z: cellSizeZ };
    
    // Calculate model bounds
    calculateModelBounds(blocks);
    
    // Update value visibility slider when blocks change (preserve enabled state if user is interacting)
    updateValueVisibilitySliderRange(true);
    
    // Clear existing blocks
    clearBlocks();
    
    if (blocks.length === 0) {
        return;
    }
    
    // Filter blocks based on slice and value visibility
    const filteredBlocks = filterBlocks(blocks);
    
    // Render based on current view mode
    switch (currentViewMode) {
        case 'points':
            renderAsPoints(filteredBlocks, cellSizeX, cellSizeY, cellSizeZ);
            break;
        case 'transparent':
            renderAsCubes(filteredBlocks, cellSizeX, cellSizeY, cellSizeZ, true);
            break;
        case 'solid':
        default:
            renderAsCubes(filteredBlocks, cellSizeX, cellSizeY, cellSizeZ, false);
            break;
    }
    
    // Update clipping planes AFTER meshes are created
    updateClippingPlanes();
    
    // Update ground layer if enabled
    updateGroundLayer(blocks);
    
    // Center camera on model only if requested (e.g., on initial load or new model generation)
    if (centerCamera) {
        centerCameraOnModel(blocks);
    }
}

/**
 * Render blocks as points (centroids)
 * For points, we still need to filter blocks since PointsMaterial doesn't support instance attributes easily
 * @param {Array} blocks - Array of block objects
 * @param {number} cellSizeX - Size of each cell in X direction
 * @param {number} cellSizeY - Size of each cell in Y direction
 * @param {number} cellSizeZ - Size of each cell in Z direction
 */
function renderAsPoints(blocks, cellSizeX, cellSizeY, cellSizeZ) {
    // Filter blocks for value visibility (points don't use shader-based filtering)
    let filteredBlocks = blocks;
    if (valueVisibilityEnabled && currentVisualizationField !== 'rockType') {
        filteredBlocks = blocks.filter(block => {
            const value = block[currentVisualizationField];
            if (value === undefined || value === null || isNaN(value)) {
                return false;
            }
            if (valueVisibilityMode === 'above') {
                return value >= valueVisibilityThreshold;
            } else {
                return value <= valueVisibilityThreshold;
            }
        });
    }
    
    const positions = new Float32Array(filteredBlocks.length * 3);
    const colors = new Float32Array(filteredBlocks.length * 3);
    
    // Clear block data map
    blockDataMap.clear();
    
    filteredBlocks.forEach((block, index) => {
        const i = index * 3;
        // Transform mining coordinates to Three.js coordinates:
        // Mining: X=easting, Y=northing, Z=depth (negative = below ground)
        // Three.js: X=right, Y=up, Z=forward
        // Transformation: (x, z, y) so depth (mining Z) maps to vertical (Three.js Y)
        // Note: mining Z is negative below ground, so it maps to negative Three.js Y (down)
        positions[i] = block.x;        // X stays X
        positions[i + 1] = block.z;    // Mining Z (depth) -> Three.js Y (vertical, negative = down)
        positions[i + 2] = block.y;    // Mining Y (northing) -> Three.js Z (forward)
        
        const color = getBlockColor(block, currentVisualizationField);
        const r = ((color >> 16) & 0xff) / 255;
        const g = ((color >> 8) & 0xff) / 255;
        const b = (color & 0xff) / 255;
        
        colors[i] = r;
        colors[i + 1] = g;
        colors[i + 2] = b;
        
        // Store block data for tooltip (using index as key)
        blockDataMap.set(`point_${index}`, block);
    });
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: Math.max(cellSizeX, cellSizeY, cellSizeZ) * 0.5,
        vertexColors: true,
        sizeAttenuation: true,
        clippingPlanes: sliceEnabled ? [slicePlane] : []
    });
    
    pointCloud = new THREE.Points(geometry, material);
    pointCloud.userData.blocks = filteredBlocks; // Store filtered blocks array for tooltip
    scene.add(pointCloud);
}

/**
 * Update clipping planes for all meshes
 */
function updateClippingPlanes() {
    if (!sliceEnabled || !slicePlane) {
        // Disable clipping
        blockMeshes.forEach(mesh => {
            if (mesh.material) {
                mesh.material.clippingPlanes = [];
            }
        });
        if (pointCloud && pointCloud.material) {
            pointCloud.material.clippingPlanes = [];
        }
        if (slicePlaneHelper) {
            slicePlaneHelper.visible = false;
        }
        return;
    }
    
    // Calculate rectangle position and size first (needed for both clipping and non-clipping cases)
    // Also determine max/min values for the current axis
    let rectangleWidth, rectangleHeight, rectangleCenterX, rectangleCenterY, rectangleCenterZ, rectangleRotation;
    let maxValue, minValue;
    switch (sliceAxis) {
        case 'x':
            maxValue = modelBounds.maxX;
            minValue = modelBounds.minX;
            // Mining X -> Three.js X: Rectangle in YZ plane (perpendicular to X axis)
            // Blocks are at (block.x, block.z, block.y) in Three.js coords
            // So Y extent is from block.z (minY to maxY), Z extent is from block.y (minZ to maxZ)
            rectangleWidth = (modelBounds.maxY - modelBounds.minY) * 1.1;  // Y extent (vertical in Three.js)
            rectangleHeight = (modelBounds.maxZ - modelBounds.minZ) * 1.1; // Z extent (forward in Three.js)
            rectangleCenterX = slicePosition;  // X position of slice plane
            rectangleCenterY = (modelBounds.minY + modelBounds.maxY) / 2;  // Center in Y (vertical)
            rectangleCenterZ = (modelBounds.minZ + modelBounds.maxZ) / 2;  // Center in Z (forward)
            // PlaneGeometry is in XY plane by default (width=X, height=Y)
            // To put it in YZ plane (perpendicular to X), rotate 90° around Y axis
            rectangleRotation = { x: 0, y: Math.PI / 2, z: 0 };
            break;
        case 'y':
            maxValue = modelBounds.maxZ;
            minValue = modelBounds.minZ;
            // Mining Y -> Three.js Z: Rectangle in XY plane
            rectangleWidth = (modelBounds.maxX - modelBounds.minX) * 1.1;
            rectangleHeight = (modelBounds.maxY - modelBounds.minY) * 1.1;
            rectangleCenterX = (modelBounds.minX + modelBounds.maxX) / 2;
            rectangleCenterY = (modelBounds.minY + modelBounds.maxY) / 2;
            rectangleCenterZ = slicePosition;
            rectangleRotation = { x: 0, y: 0, z: Math.PI / 2 };
            break;
        case 'z':
        default:
            maxValue = modelBounds.maxY;
            minValue = modelBounds.minY;
            // Mining Z -> Three.js Y: Rectangle in XZ plane (horizontal)
            rectangleWidth = (modelBounds.maxX - modelBounds.minX) * 1.1;
            rectangleHeight = (modelBounds.maxZ - modelBounds.minZ) * 1.1;
            rectangleCenterX = (modelBounds.minX + modelBounds.maxX) / 2;
            rectangleCenterY = slicePosition;
            rectangleCenterZ = (modelBounds.minZ + modelBounds.maxZ) / 2;
            rectangleRotation = { x: -Math.PI / 2, y: 0, z: 0 };
            break;
    }
    
    // Update rectangle helper
    if (slicePlaneHelper) {
        slicePlaneHelper.visible = true;
        slicePlaneHelper.geometry.dispose();
        const planeGeometry = new THREE.PlaneGeometry(rectangleWidth, rectangleHeight);
        const edgesGeometry = new THREE.EdgesGeometry(planeGeometry);
        slicePlaneHelper.geometry = edgesGeometry;
        slicePlaneHelper.position.set(rectangleCenterX, rectangleCenterY, rectangleCenterZ);
        slicePlaneHelper.rotation.set(rectangleRotation.x, rectangleRotation.y, rectangleRotation.z);
    }
    
    // If slice position is at or very close to the top, disable clipping to show full volume
    const epsilon = (maxValue - minValue) * 0.001;
    if (slicePosition >= maxValue - epsilon) {
        // At the top - show everything (no clipping)
        blockMeshes.forEach(mesh => {
            if (mesh.material) {
                mesh.material.clippingPlanes = [];
            }
        });
        if (pointCloud && pointCloud.material) {
            pointCloud.material.clippingPlanes = [];
        }
        return;
    }
    
    // Update slice plane based on axis and position
    // Transform mining axes to Three.js axes:
    // Mining X -> Three.js X (same)
    // Mining Y -> Three.js Z (forward)
    // Mining Z -> Three.js Y (vertical)
    // 
    // IMPORTANT: In Three.js, the normal points toward the side that is KEPT (not clipped)
    // We want to clip everything ABOVE the slice position (show everything below)
    // So the normal must point DOWN (negative direction) to keep the below side
    let normal = new THREE.Vector3();
    switch (sliceAxis) {
        case 'x':
            // Mining X -> Three.js X: Clip everything to the right (positive X), keep left (negative X)
            // Normal points left (negative X) to keep left side
            normal.set(-1, 0, 0);
            break;
        case 'y':
            // Mining Y -> Three.js Z: Clip everything forward (positive Z), keep backward (negative Z)
            // Normal points backward (negative Z) to keep backward side
            normal.set(0, 0, -1);
            break;
        case 'z':
        default:
            // Mining Z (depth) -> Three.js Y (vertical): Clip everything above (positive Y), keep below (negative Y)
            // Normal points down (negative Y) to keep below side
            normal.set(0, -1, 0);
            break;
    }
    
    // Plane equation: normal · point + constant = 0
    // For plane at y = slicePosition with normal (0, -1, 0):
    // -y + constant = 0 → constant = slicePosition
    slicePlane.normal.copy(normal);
    slicePlane.constant = slicePosition;
    
    // Apply clipping to materials (local clipping)
    blockMeshes.forEach(mesh => {
        if (mesh.material) {
            mesh.material.clippingPlanes = sliceEnabled ? [slicePlane] : [];
            mesh.material.needsUpdate = true; // Force material update
            // Update shader material if it exists
            if (mesh.material.uniforms) {
                // Shader materials handle clipping planes automatically
            }
        }
    });
    if (pointCloud && pointCloud.material) {
        pointCloud.material.clippingPlanes = sliceEnabled ? [slicePlane] : [];
        pointCloud.material.needsUpdate = true; // Force material update
    }
}

/**
 * Create material with value-based filtering using onBeforeCompile
 * This approach modifies the existing MeshLambertMaterial shader to add filtering
 * @param {boolean} transparent - Whether material should be transparent
 * @param {number} color - Base color
 * @returns {THREE.MeshLambertMaterial} Material with shader modifications
 */
function createValueFilterMaterial(transparent, color) {
    const material = new THREE.MeshLambertMaterial({
        transparent: transparent,
        opacity: transparent ? 0.3 : 1.0,
        color: color,
        clippingPlanes: sliceEnabled ? [slicePlane] : []
    });
    
    // Add custom uniforms for value filtering
    material.userData.valueFilterUniforms = {
        valueThreshold: { value: valueVisibilityThreshold },
        valueMode: { value: valueVisibilityMode === 'above' ? 0 : 1 },
        valueFilterEnabled: { value: valueVisibilityEnabled ? 1 : 0 }
    };
    
    // Inject shader code using onBeforeCompile
    // This runs when Three.js compiles the shader
    material.onBeforeCompile = function(shader) {
        // Add instance value attribute declaration at the top of vertex shader
        // Find where attributes/varyings are declared and add ours
        if (!shader.vertexShader.includes('attribute float instanceValue')) {
            shader.vertexShader = `
                attribute float instanceValue;
                varying float vInstanceValue;
                ${shader.vertexShader}
            `;
        }
        
        // Pass instance value through in vertex shader
        // Insert before the final gl_Position assignment
        shader.vertexShader = shader.vertexShader.replace(
            '#include <project_vertex>',
            `
            vInstanceValue = instanceValue;
            #include <project_vertex>
            `
        );
        
        // Add varying and uniforms to fragment shader
        if (!shader.fragmentShader.includes('varying float vInstanceValue')) {
            shader.fragmentShader = `
                uniform float valueThreshold;
                uniform int valueMode;
                uniform int valueFilterEnabled;
                varying float vInstanceValue;
                ${shader.fragmentShader}
            `;
        }
        
        // Add discard logic in fragment shader before final color output
        // Insert after color calculation but before final output
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `
            #include <dithering_fragment>
            
            // Value-based filtering (check before final output)
            if (valueFilterEnabled == 1) {
                // Hide blocks with missing values (sentinel value -9999)
                if (vInstanceValue < -9998.0) {
                    discard;
                }
                
                if (valueMode == 0) {
                    // Above mode: hide if value < threshold
                    if (vInstanceValue < valueThreshold) {
                        discard;
                    }
                } else {
                    // Below mode: hide if value > threshold
                    if (vInstanceValue > valueThreshold) {
                        discard;
                    }
                }
            }
            `
        );
        
        // If dithering_fragment doesn't exist, try inserting before the final gl_FragColor
        if (!shader.fragmentShader.includes('Value-based filtering')) {
            shader.fragmentShader = shader.fragmentShader.replace(
                /gl_FragColor\s*=/,
                `
            // Value-based filtering
            if (valueFilterEnabled == 1) {
                if (vInstanceValue < -9998.0) {
                    discard;
                }
                if (valueMode == 0) {
                    if (vInstanceValue < valueThreshold) {
                        discard;
                    }
                } else {
                    if (vInstanceValue > valueThreshold) {
                        discard;
                    }
                }
            }
            gl_FragColor = `
            );
        }
        
        // Merge our custom uniforms with the shader's uniforms
        Object.assign(shader.uniforms, material.userData.valueFilterUniforms);
        
        // Store reference to shader for uniform updates
        material.userData.shader = shader;
    };
    
    // Force shader recompilation by marking material as needing update
    material.needsUpdate = true;
    
    return material;
}

/**
 * Render blocks as cubes (solid or transparent)
 * @param {Array} blocks - Array of block objects
 * @param {number} cellSizeX - Size of each cell in X direction
 * @param {number} cellSizeY - Size of each cell in Y direction
 * @param {number} cellSizeZ - Size of each cell in Z direction
 * @param {boolean} transparent - Whether to render as transparent
 */
function renderAsCubes(blocks, cellSizeX, cellSizeY, cellSizeZ, transparent) {
    // Use InstancedMesh for better performance with many blocks
    const geometry = new THREE.BoxGeometry(cellSizeX, cellSizeY, cellSizeZ);
    
    // Determine if we need value-based filtering
    const needsValueFilter = valueVisibilityEnabled && currentVisualizationField !== 'rockType';
    
    // Group blocks by color for instancing
    const colorGroups = {};
    
    blocks.forEach((block, index) => {
        const color = getBlockColor(block, currentVisualizationField);
        const colorKey = color.toString();
        
        if (!colorGroups[colorKey]) {
            colorGroups[colorKey] = {
                color: color,
                indices: []
            };
        }
        
        colorGroups[colorKey].indices.push(index);
    });
    
    // Create instanced meshes for each color group
    Object.keys(colorGroups).forEach(colorKey => {
        const group = colorGroups[colorKey];
        const count = group.indices.length;
        
        // Choose material based on whether value filtering is needed
        let material;
        if (needsValueFilter) {
            material = createValueFilterMaterial(transparent, group.color);
        } else {
            material = new THREE.MeshLambertMaterial({
                transparent: transparent,
                opacity: transparent ? 0.3 : 1.0,
                vertexColors: false,
                clippingPlanes: sliceEnabled ? [slicePlane] : [],
                color: group.color
            });
        }
        
        const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
        instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        
        // Create instance value attribute if value filtering is enabled
        if (needsValueFilter) {
            const values = new Float32Array(count);
            group.indices.forEach((blockIndex, instanceIndex) => {
                const block = blocks[blockIndex];
                const value = block[currentVisualizationField];
                // Use -9999 as sentinel for missing values (will be filtered out)
                values[instanceIndex] = (value !== undefined && value !== null && !isNaN(value)) ? value : -9999;
            });
            
            const valueAttribute = new THREE.InstancedBufferAttribute(values, 1);
            instancedMesh.geometry.setAttribute('instanceValue', valueAttribute);
            
            // Store reference to attribute for updates
            blockValueAttributes.set(instancedMesh.uuid, valueAttribute);
        }
        
        const matrix = new THREE.Matrix4();
        group.indices.forEach((blockIndex, instanceIndex) => {
            const block = blocks[blockIndex];
            // Transform mining coordinates to Three.js coordinates:
            // (x, z, y) - depth maps to vertical axis
            matrix.makeTranslation(block.x, block.z, block.y);
            instancedMesh.setMatrixAt(instanceIndex, matrix);
            
            // Store block data for tooltip (using instance index as key)
            blockDataMap.set(`${instancedMesh.uuid}_${instanceIndex}`, block);
        });
        
        instancedMesh.instanceMatrix.needsUpdate = true;
        instancedMesh.userData.blocks = blocks; // Store blocks array for reference
        instancedMesh.userData.groupIndices = group.indices; // Store indices mapping
        scene.add(instancedMesh);
        blockMeshes.push(instancedMesh);
    });
}

/**
 * Calculate and store model bounds
 * @param {Array} blocks - Array of block objects
 */
function calculateModelBounds(blocks) {
    if (blocks.length === 0) {
        return;
    }
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    blocks.forEach(block => {
        // After transformation: Mining (x, y, z) -> Three.js (x, z, y)
        minX = Math.min(minX, block.x);
        maxX = Math.max(maxX, block.x);
        minY = Math.min(minY, block.z); // Mining Z (depth) -> Three.js Y (vertical, negative = down)
        maxY = Math.max(maxY, block.z); // maxY will be closest to zero (shallowest, at ground)
        minZ = Math.min(minZ, block.y); // Mining Y (northing) -> Three.js Z (forward)
        maxZ = Math.max(maxZ, block.y);
    });
    
    modelBounds = { minX, maxX, minY, maxY, minZ, maxZ };
    
    // Update slice position slider range
    updateSliceSliderRange();
    
    // Update value visibility slider range if needed
    updateValueVisibilitySliderRange();
}

/**
 * Update slice slider range based on model bounds
 * Slider starts at top of volume and slices downward
 */
function updateSliceSliderRange() {
    const slider = document.getElementById('slicePosition');
    if (!slider) return;
    
    let min, max;
    // modelBounds are in Three.js coordinates after transformation
    switch (sliceAxis) {
        case 'x':
            // Mining X -> Three.js X
            min = modelBounds.minX;
            max = modelBounds.maxX;
            break;
        case 'y':
            // Mining Y -> Three.js Z
            min = modelBounds.minZ;
            max = modelBounds.maxZ;
            break;
        case 'z':
        default:
            // Mining Z (depth) -> Three.js Y (vertical)
            // maxY is top (shallowest, closest to ground), minY is bottom (deepest)
            min = modelBounds.minY;
            max = modelBounds.maxY;
            break;
    }
    
    // Keep slider normal (min to max) but start at max position
    // This way the slider moves from top (right side) to bottom (left side)
    slider.min = min;
    slider.max = max;
    
    // Start at the top (max value) - this shows the whole volume initially
    // As you move the slider left (toward min), it slices away top layers
    // For Z-axis: maxY is top (shallowest, closest to ground), minY is bottom (deepest)
    // When slicePosition = maxY: clips where y > maxY (nothing, shows all)
    // When slicePosition moves toward minY: progressively clips more from top
    const initialPosition = max;
    slider.value = slicePosition = initialPosition;
    
    // Update the clipping plane immediately with the initial position
    // This ensures the whole volume is visible when slice is first enabled
    updateClippingPlanes();
    
    const valueDisplay = document.getElementById('slicePositionValue');
    if (valueDisplay) {
        valueDisplay.textContent = slicePosition.toFixed(1);
    }
}

/**
 * Update value visibility slider range based on current field
 * @param {boolean} preserveEnabledState - If true, don't change the disabled state
 */
function updateValueVisibilitySliderRange(preserveEnabledState = false) {
    const slider = document.getElementById('valueVisibilityThreshold');
    const checkbox = document.getElementById('valueVisibilityEnabled');
    if (!slider) return;
    
    // Store current disabled state if we need to preserve it
    const wasEnabled = !slider.disabled;
    
    // If preserving state and slider is enabled, don't disable it
    if (preserveEnabledState && wasEnabled) {
        // Just update range and bounds, don't touch disabled state or value
        if (currentVisualizationField === 'rockType' || vizCurrentBlocks.length === 0) {
            return;
        }
        
        const values = vizCurrentBlocks
            .map(b => b[currentVisualizationField])
            .filter(v => v !== undefined && !isNaN(v));
        
        if (values.length === 0) {
            return;
        }
        
        const min = Math.min(...values);
        const max = Math.max(...values);
        slider.min = min;
        slider.max = max;
        
        // Ensure current value is within bounds
        const currentValue = parseFloat(slider.value);
        if (currentValue < min || currentValue > max) {
            slider.value = Math.max(min, Math.min(max, currentValue));
        }
        
        return;
    }
    
    // Normal update path (not preserving state)
    // Disable slider if field is rockType or no blocks
    if (currentVisualizationField === 'rockType' || vizCurrentBlocks.length === 0) {
        slider.disabled = true;
        return;
    }
    
    const values = vizCurrentBlocks
        .map(b => b[currentVisualizationField])
        .filter(v => v !== undefined && !isNaN(v));
    
    if (values.length === 0) {
        slider.disabled = true;
        return;
    }
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Only update if range actually changed to avoid slider jumping
    const currentMin = parseFloat(slider.min) || min;
    const currentMax = parseFloat(slider.max) || max;
    const rangeChanged = Math.abs(currentMin - min) > 0.01 || Math.abs(currentMax - max) > 0.01;
    
    slider.min = min;
    slider.max = max;
    
    // Only update value if range changed or value is out of bounds
    const currentValue = parseFloat(slider.value) || valueVisibilityThreshold;
    if (rangeChanged || currentValue < min || currentValue > max) {
        slider.value = valueVisibilityThreshold = Math.max(min, Math.min(max, (min + max) / 2));
    } else {
        // Keep current value but ensure it's within bounds
        slider.value = valueVisibilityThreshold = Math.max(min, Math.min(max, currentValue));
    }
    
    // Enable/disable based on checkbox state
    if (checkbox) {
        slider.disabled = !checkbox.checked;
    }
    
    const valueDisplay = document.getElementById('valueVisibilityThresholdValue');
    if (valueDisplay) {
        valueDisplay.textContent = valueVisibilityThreshold.toFixed(2);
    }
}

/**
 * Center camera on the model
 * @param {Array} blocks - Array of block objects
 */
function centerCameraOnModel(blocks) {
    if (blocks.length === 0) {
        return;
    }
    
    // Calculate bounding box
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    blocks.forEach(block => {
        // After transformation: Mining (x, y, z) -> Three.js (x, z, y)
        minX = Math.min(minX, block.x);
        maxX = Math.max(maxX, block.x);
        minY = Math.min(minY, block.z); // Mining Z -> Three.js Y
        maxY = Math.max(maxY, block.z);
        minZ = Math.min(minZ, block.y); // Mining Y -> Three.js Z
        maxZ = Math.max(maxZ, block.y);
    });
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2; // Three.js Y (vertical)
    const centerZ = (minZ + maxZ) / 2;
    
    const extentX = maxX - minX;
    const extentY = maxY - minY; // Vertical extent
    const extentZ = maxZ - minZ;
    const maxExtent = Math.max(extentX, extentY, extentZ);
    
    const distance = maxExtent * 1.5;
    camera.position.set(centerX + distance, centerY + distance, centerZ + distance);
    camera.lookAt(centerX, centerY, centerZ);
    
    if (controls) {
        controls.target.set(centerX, centerY, centerZ);
        controls.update();
    }
    
    // Store bounds for slice tool
    modelBounds = { minX, maxX, minY, maxY, minZ, maxZ };
    updateSliceSliderRange();
    
    // Update zoom limits based on model size
    // Allow zooming in to 1% of smallest dimension, and out to 10x largest dimension
    const smallestDim = Math.min(extentX, extentY, extentZ);
    const largestDim = Math.max(extentX, extentY, extentZ);
    if (controls) {
        controls.minDistance = Math.max(0.01, smallestDim * 0.01); // Can zoom to 1% of smallest dimension
        controls.maxDistance = Math.max(100, largestDim * 10); // Can zoom out to 10x largest dimension
    }
}

/**
 * Zoom to fit the model extent, keeping current camera angle
 * If model is not in view, point camera toward model center first
 */
function zoomToFit() {
    if (vizCurrentBlocks.length === 0) {
        return;
    }
    
    // Calculate bounding box
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    vizCurrentBlocks.forEach(block => {
        // After transformation: Mining (x, y, z) -> Three.js (x, z, y)
        minX = Math.min(minX, block.x);
        maxX = Math.max(maxX, block.x);
        minY = Math.min(minY, block.z); // Mining Z -> Three.js Y
        maxY = Math.max(maxY, block.z);
        minZ = Math.min(minZ, block.y); // Mining Y -> Three.js Z
        maxZ = Math.max(maxZ, block.y);
    });
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2; // This is the vertical center (Three.js Y)
    const centerZ = (minZ + maxZ) / 2;
    
    const extentX = maxX - minX;
    const extentY = maxY - minY;
    const extentZ = maxZ - minZ;
    const maxExtent = Math.max(extentX, extentY, extentZ);
    
    // Check if model center is in view
    const modelCenter = new THREE.Vector3(centerX, centerY, centerZ);
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    const toModel = new THREE.Vector3().subVectors(modelCenter, camera.position).normalize();
    const dot = cameraDirection.dot(toModel);
    
    // If model is not in view (camera not pointing toward it), adjust camera
    if (dot < 0.5) {
        // Point camera toward model center
        const distance = maxExtent * 1.5;
        const currentDistance = camera.position.distanceTo(modelCenter);
        const direction = new THREE.Vector3().subVectors(modelCenter, camera.position).normalize();
        camera.position.copy(modelCenter).addScaledVector(direction, -distance);
        camera.lookAt(centerX, centerY, centerZ);
        
        if (controls) {
            controls.target.set(centerX, centerY, centerZ);
            controls.update();
        }
    }
    
    // Calculate distance needed to fit model
    // Account for diagonal view - use bounding sphere radius instead of just max extent
    const fov = camera.fov * (Math.PI / 180);
    const boundingSphereRadius = Math.sqrt(
        Math.pow(extentX / 2, 2) + 
        Math.pow(extentY / 2, 2) + 
        Math.pow(extentZ / 2, 2)
    );
    // Calculate distance to fit bounding sphere with padding
    // Use larger padding factor (2.0) to ensure model is fully visible and not too close
    const distance = boundingSphereRadius / Math.tan(fov / 2) * 2.0;
    
    // Move camera to fit model while keeping direction
    const currentDirection = new THREE.Vector3().subVectors(camera.position, modelCenter).normalize();
    camera.position.copy(modelCenter).addScaledVector(currentDirection, distance);
    camera.lookAt(centerX, centerY, centerZ);
    
    if (controls) {
        controls.target.set(centerX, centerY, centerZ);
        controls.update();
        
        // Update zoom limits based on model size
        const smallestDim = Math.min(extentX, extentY, extentZ);
        const largestDim = Math.max(extentX, extentY, extentZ);
        controls.minDistance = Math.max(0.01, smallestDim * 0.01); // Can zoom to 1% of smallest dimension
        controls.maxDistance = Math.max(100, largestDim * 10); // Can zoom out to 10x largest dimension
    }
}

/**
 * Update visualization when blocks change
 * @param {Array} blocks - Array of block objects
 * @param {number} cellSizeX - Size of each cell in X direction
 * @param {number} cellSizeY - Size of each cell in Y direction
 * @param {number} cellSizeZ - Size of each cell in Z direction
 */
function updateVisualization(blocks, cellSizeX, cellSizeY, cellSizeZ) {
    renderBlocks(blocks, cellSizeX, cellSizeY, cellSizeZ);
}

/**
 * Set the view mode (solid, points, transparent)
 * @param {string} mode - View mode: 'solid', 'points', or 'transparent'
 */
function setViewMode(mode) {
    if (['solid', 'points', 'transparent'].includes(mode)) {
        currentViewMode = mode;
        if (vizCurrentBlocks.length > 0) {
            renderBlocks(
                vizCurrentBlocks,
                currentCellSizes.x,
                currentCellSizes.y,
                currentCellSizes.z,
                false // Don't center camera on dropdown change
            );
        }
    }
}

/**
 * Set the field to visualize
 * @param {string} field - Field name: 'rockType', 'density', 'gradeCu', 'gradeAu', 'econValue'
 */
function setVisualizationField(field) {
    if (['rockType', 'density', 'gradeCu', 'gradeAu', 'econValue'].includes(field)) {
        const previousField = currentVisualizationField;
        currentVisualizationField = field;
        
        // Update value visibility slider range and state
        updateValueVisibilitySliderRange();
        
        // Update mode selector state
        const modeSelect = document.getElementById('valueVisibilityMode');
        if (modeSelect) {
            modeSelect.disabled = (field === 'rockType' || !document.getElementById('valueVisibilityEnabled')?.checked);
        }
        
        if (vizCurrentBlocks.length > 0) {
            // Always re-render when field changes because colors are based on the field
            // The only exception is if we're using shader-based value filtering and only
            // need to update the value attribute (but colors still need to update)
            // So we always re-render to ensure colors are correct
            renderBlocks(
                vizCurrentBlocks,
                currentCellSizes.x,
                currentCellSizes.y,
                currentCellSizes.z,
                false // Don't center camera on dropdown change
            );
        }
    }
}

/**
 * Set slice tool enabled state
 * @param {boolean} enabled - Whether slice tool is enabled
 */
function setSliceEnabled(enabled) {
    sliceEnabled = enabled;
    if (slicePlaneHelper) {
        slicePlaneHelper.visible = enabled;
    }
    if (vizCurrentBlocks.length > 0) {
        // Always re-render when toggling slice tool to ensure all blocks are visible when disabled
        // This preserves view mode and field settings while resetting visibility
        renderBlocks(
            vizCurrentBlocks,
            currentCellSizes.x,
            currentCellSizes.y,
            currentCellSizes.z,
            false // Don't center camera on dropdown change
        );
    }
}

/**
 * Set slice axis
 * @param {string} axis - Axis: 'x', 'y', or 'z'
 */
function setSliceAxis(axis) {
    if (['x', 'y', 'z'].includes(axis)) {
        sliceAxis = axis;
        updateSliceSliderRange();
        if (vizCurrentBlocks.length > 0) {
            // Trigger a re-render to ensure visual state is updated immediately
            // renderBlocks() will call updateClippingPlanes() after meshes are created
            renderBlocks(
                vizCurrentBlocks,
                currentCellSizes.x,
                currentCellSizes.y,
                currentCellSizes.z,
                false // Don't center camera on dropdown change
            );
        }
    }
}

/**
 * Set slice position
 * @param {number} position - Position along the axis
 */
function setSlicePosition(position) {
    slicePosition = position;
    // Only update clipping planes, no need to re-render
    updateClippingPlanes();
}

/**
 * Set value-based visibility enabled state
 * @param {boolean} enabled - Whether value visibility is enabled
 */
function setValueVisibilityEnabled(enabled) {
    valueVisibilityEnabled = enabled;
    
    // Update slider and mode selector state
    const slider = document.getElementById('valueVisibilityThreshold');
    const modeSelect = document.getElementById('valueVisibilityMode');
    
    if (slider) {
        // Only enable if field is numeric and checkbox is checked
        const isNumericField = currentVisualizationField !== 'rockType';
        slider.disabled = !enabled || !isNumericField;
    }
    
    if (modeSelect) {
        const isNumericField = currentVisualizationField !== 'rockType';
        modeSelect.disabled = !enabled || !isNumericField;
    }
    
    // When disabling the filter, always re-render to ensure all blocks are visible
    // When enabling, re-render if needed to add shader attributes, otherwise update uniforms
    if (vizCurrentBlocks.length > 0) {
        const needsValueFilter = enabled && currentVisualizationField !== 'rockType';
        const hasShaderMaterials = blockMeshes.some(m => m.material && m.material.uniforms);
        
        // If disabling filter, always re-render to show all blocks
        // If enabling and switching between shader and non-shader, need full re-render
        if (!enabled || needsValueFilter !== hasShaderMaterials) {
            // Re-render to ensure all blocks are visible (preserves view mode and field)
            renderBlocks(
                vizCurrentBlocks,
                currentCellSizes.x,
                currentCellSizes.y,
                currentCellSizes.z,
                false // Don't center camera on slider/checkbox change
            );
        } else {
            // Just update uniforms if already using shaders and enabling
            updateValueFilterUniforms();
        }
    }
}

/**
 * Update shader uniforms for value filtering (fast - no mesh recreation)
 * Uses requestAnimationFrame to throttle updates during slider dragging
 */
function updateValueFilterUniforms() {
    if (valueFilterUpdatePending) {
        return; // Already scheduled
    }
    
    valueFilterUpdatePending = true;
    requestAnimationFrame(() => {
        valueFilterUpdatePending = false;
        
        blockMeshes.forEach(mesh => {
            if (mesh.material) {
                // Check if material has value filter uniforms (from onBeforeCompile)
                if (mesh.material.userData && mesh.material.userData.valueFilterUniforms) {
                    const uniforms = mesh.material.userData.valueFilterUniforms;
                    uniforms.valueThreshold.value = valueVisibilityThreshold;
                    uniforms.valueMode.value = valueVisibilityMode === 'above' ? 0 : 1;
                    uniforms.valueFilterEnabled.value = valueVisibilityEnabled ? 1 : 0;
                    
                    // Also update the compiled shader uniforms if they exist
                    if (mesh.material.userData.shader && mesh.material.userData.shader.uniforms) {
                        const shaderUniforms = mesh.material.userData.shader.uniforms;
                        if (shaderUniforms.valueThreshold) {
                            shaderUniforms.valueThreshold.value = valueVisibilityThreshold;
                        }
                        if (shaderUniforms.valueMode) {
                            shaderUniforms.valueMode.value = valueVisibilityMode === 'above' ? 0 : 1;
                        }
                        if (shaderUniforms.valueFilterEnabled) {
                            shaderUniforms.valueFilterEnabled.value = valueVisibilityEnabled ? 1 : 0;
                        }
                    }
                }
                // Also check for direct ShaderMaterial (fallback)
                else if (mesh.material.uniforms) {
                    if (mesh.material.uniforms.valueThreshold) {
                        mesh.material.uniforms.valueThreshold.value = valueVisibilityThreshold;
                    }
                    if (mesh.material.uniforms.valueMode) {
                        mesh.material.uniforms.valueMode.value = valueVisibilityMode === 'above' ? 0 : 1;
                    }
                    if (mesh.material.uniforms.valueFilterEnabled) {
                        mesh.material.uniforms.valueFilterEnabled.value = valueVisibilityEnabled ? 1 : 0;
                    }
                }
            }
        });
    });
}

/**
 * Set value visibility threshold
 * @param {number} threshold - Threshold value
 */
function setValueVisibilityThreshold(threshold) {
    valueVisibilityThreshold = threshold;
    
    // Update display value immediately
    const valueDisplay = document.getElementById('valueVisibilityThresholdValue');
    if (valueDisplay) {
        valueDisplay.textContent = threshold.toFixed(2);
    }
    
    // Update shader uniforms instead of re-rendering (much faster!)
    if (valueVisibilityEnabled && vizCurrentBlocks.length > 0) {
        // Check if we have shader materials, if not we need to re-render
        const hasShaderMaterials = blockMeshes.some(m => 
            m.material && 
            (m.material.userData?.valueFilterUniforms || m.material.uniforms?.valueThreshold)
        );
        
        if (hasShaderMaterials) {
            updateValueFilterUniforms();
        } else {
            // Need to re-render to create shader materials
            renderBlocks(
                vizCurrentBlocks,
                currentCellSizes.x,
                currentCellSizes.y,
                currentCellSizes.z,
                false // Don't center camera on slider change
            );
        }
    }
}

/**
 * Set value visibility mode
 * @param {string} mode - Mode: 'above' or 'below'
 */
function setValueVisibilityMode(mode) {
    if (['above', 'below'].includes(mode)) {
        valueVisibilityMode = mode;
        // Update shader uniforms instead of re-rendering (much faster!)
        if (valueVisibilityEnabled && vizCurrentBlocks.length > 0) {
            const hasShaderMaterials = blockMeshes.some(m => 
                m.material && 
                (m.material.userData?.valueFilterUniforms || m.material.uniforms?.valueThreshold)
            );
            
            if (hasShaderMaterials) {
                updateValueFilterUniforms();
            } else {
                // Need to re-render to create shader materials
                renderBlocks(
                    vizCurrentBlocks,
                    currentCellSizes.x,
                    currentCellSizes.y,
                    currentCellSizes.z,
                    false // Don't center camera on dropdown change
                );
            }
        }
    }
}

/**
 * Update or create ground layer mesh
 * @param {Array} blocks - Array of block objects to calculate ground bounds
 */
function updateGroundLayer(blocks) {
    if (!groundEnabled) {
        if (groundMesh) {
            scene.remove(groundMesh);
            groundMesh.geometry.dispose();
            groundMesh.material.dispose();
            groundMesh = null;
        }
        return;
    }
    
    if (blocks.length === 0) {
        return;
    }
    
    // Calculate bounds (X and Y only, for ground plane size)
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    blocks.forEach(block => {
        // After transformation: Mining (x, y, z) -> Three.js (x, z, y)
        // Ground uses X and Z (northing), Y is vertical
        minX = Math.min(minX, block.x);
        maxX = Math.max(maxX, block.x);
        minY = Math.min(minY, block.y); // Mining Y (northing) -> Three.js Z
        maxY = Math.max(maxY, block.y);
    });
    
    // Calculate size with 50% extension beyond model bounds
    const sizeX = (maxX - minX) * 1.5; // 50% extension
    const sizeZ = (maxY - minY) * 1.5; // 50% extension (minY/maxY are mining Y -> Three.js Z)
    
    // Create or update ground mesh
    if (!groundMesh) {
        const groundGeometry = new THREE.PlaneGeometry(sizeX, sizeZ);
        const groundMaterial = new THREE.MeshLambertMaterial({
            color: 0x8B4513, // Brown ground color
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        scene.add(groundMesh);
    }
    
    // Position ground at Y=0 in Three.js (ground surface)
    // After coordinate transformation: Mining (x, y, z) -> Three.js (x, z, y)
    // Ground should be horizontal in XZ plane at Y=0
    const centerX = (minX + maxX) / 2;
    const centerZ = (minY + maxY) / 2; // Mining Y -> Three.js Z
    // Ground plane: rotate -90 degrees around X axis to lie flat in XZ plane
    groundMesh.position.set(centerX, 0, centerZ);
    groundMesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal (XZ plane)
    
    // Update size if needed (with 50% extension)
    groundMesh.geometry.dispose();
    groundMesh.geometry = new THREE.PlaneGeometry(sizeX, sizeZ);
}

/**
 * Set ground layer enabled state
 * @param {boolean} enabled - Whether ground layer is enabled
 */
function setGroundEnabled(enabled) {
    groundEnabled = enabled;
    if (vizCurrentBlocks.length > 0) {
        updateGroundLayer(vizCurrentBlocks);
    }
}

/**
 * Handle mouse move for tooltip
 * @param {MouseEvent} event - Mouse event
 */
function onMouseMove(event) {
    if (!tooltipElement || !raycaster || !renderer || isDragging) return;
    
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Update raycaster
    raycaster.setFromCamera(mouse, camera);
    
    // Find intersections
    const intersects = [];
    
    // Check point cloud
    if (pointCloud && pointCloud.visible) {
            const pointIntersects = raycaster.intersectObject(pointCloud);
            if (pointIntersects.length > 0) {
                const intersect = pointIntersects[0];
                const index = intersect.index;
                if (pointCloud.userData.blocks && pointCloud.userData.blocks[index]) {
                    intersects.push({
                        object: pointCloud,
                        index: index,
                        distance: intersect.distance,
                        block: pointCloud.userData.blocks[index]
                    });
                }
            }
    }
    
    // Check instanced meshes
    blockMeshes.forEach(mesh => {
        if (mesh.visible && mesh instanceof THREE.InstancedMesh) {
            const meshIntersects = raycaster.intersectObject(mesh);
            if (meshIntersects.length > 0) {
                const intersect = meshIntersects[0];
                // Try to get instanceId from intersect (may not be available in older Three.js versions)
                let instanceId = intersect.instanceId;
                
                // If instanceId is not available, find closest instance manually
                if (instanceId === undefined && mesh.userData.groupIndices) {
                    const intersectPoint = intersect.point;
                    let minDistance = Infinity;
                    let closestInstanceId = 0;
                    
                    // Check each instance to find the closest
                    mesh.userData.groupIndices.forEach((blockIndex, idx) => {
                        if (mesh.userData.blocks && mesh.userData.blocks[blockIndex]) {
                            const block = mesh.userData.blocks[blockIndex];
                            // Transform coordinates: Mining (x, y, z) -> Three.js (x, z, y)
                            const blockPos = new THREE.Vector3(block.x, block.z, block.y);
                            const distance = intersectPoint.distanceTo(blockPos);
                            if (distance < minDistance) {
                                minDistance = distance;
                                closestInstanceId = idx;
                            }
                        }
                    });
                    
                    instanceId = closestInstanceId;
                }
                
                if (instanceId !== undefined && mesh.userData.groupIndices && mesh.userData.groupIndices[instanceId] !== undefined) {
                    const blockIndex = mesh.userData.groupIndices[instanceId];
                    if (mesh.userData.blocks && mesh.userData.blocks[blockIndex]) {
                        intersects.push({
                            object: mesh,
                            instanceId: instanceId,
                            distance: intersect.distance,
                            block: mesh.userData.blocks[blockIndex]
                        });
                    }
                }
            }
        }
    });
    
    // Sort by distance and get closest
    if (intersects.length > 0) {
        // Sort by distance if available
        intersects.sort((a, b) => {
            const distA = a.distance !== undefined ? a.distance : (a.index !== undefined ? 0 : Infinity);
            const distB = b.distance !== undefined ? b.distance : (b.index !== undefined ? 0 : Infinity);
            return distA - distB;
        });
        
        const closest = intersects[0];
        hoveredBlock = closest.block;
        showTooltip(event, closest.block);
    } else {
        hoveredBlock = null;
        hideTooltip();
    }
}

/**
 * Handle mouse out to hide tooltip
 */
function onMouseOut() {
    hideTooltip();
    hoveredBlock = null;
}

/**
 * Show tooltip with block data
 * @param {MouseEvent} event - Mouse event
 * @param {Object} block - Block object
 */
function showTooltip(event, block) {
    if (!tooltipElement) return;
    
    // Build tooltip content
    let content = '<div class="tooltip-header">Block Information</div>';
    content += `<div class="tooltip-row"><span class="tooltip-label">Position:</span> <span class="tooltip-value">(${block.x.toFixed(2)}, ${block.y.toFixed(2)}, ${block.z.toFixed(2)})</span></div>`;
    content += `<div class="tooltip-row"><span class="tooltip-label">Indices:</span> <span class="tooltip-value">I=${block.i}, J=${block.j}, K=${block.k}</span></div>`;
    content += `<div class="tooltip-row"><span class="tooltip-label">Rock Type:</span> <span class="tooltip-value">${block.rockType || block.material || 'N/A'}</span></div>`;
    
    if (block.density !== undefined && block.density !== null) {
        content += `<div class="tooltip-row"><span class="tooltip-label">Density:</span> <span class="tooltip-value">${block.density.toFixed(2)} t/m³</span></div>`;
    }
    
    if (block.gradeCu !== undefined && block.gradeCu !== null) {
        content += `<div class="tooltip-row"><span class="tooltip-label">Cu Grade:</span> <span class="tooltip-value">${block.gradeCu.toFixed(2)}%</span></div>`;
    }
    
    if (block.gradeAu !== undefined && block.gradeAu !== null) {
        content += `<div class="tooltip-row"><span class="tooltip-label">Au Grade:</span> <span class="tooltip-value">${block.gradeAu.toFixed(2)} g/t</span></div>`;
    }
    
    if (block.econValue !== undefined && block.econValue !== null) {
        content += `<div class="tooltip-row"><span class="tooltip-label">Economic Value:</span> <span class="tooltip-value">${block.econValue.toFixed(2)}</span></div>`;
    }
    
    if (block.zone !== undefined && block.zone !== null) {
        content += `<div class="tooltip-row"><span class="tooltip-label">Zone:</span> <span class="tooltip-value">${block.zone}</span></div>`;
    }
    
    tooltipElement.innerHTML = content;
    tooltipElement.style.display = 'block';
    
    // Position tooltip near mouse cursor, ensuring it stays on screen
    const offset = 15;
    
    // Get tooltip dimensions (force a layout calculation)
    const tooltipWidth = tooltipElement.offsetWidth || 250; // Default width if not calculated
    const tooltipHeight = tooltipElement.offsetHeight || 200; // Default height if not calculated
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = event.clientX + offset;
    let top = event.clientY + offset;
    
    // Adjust if tooltip would go off right edge
    if (left + tooltipWidth > viewportWidth) {
        left = event.clientX - tooltipWidth - offset;
    }
    
    // Adjust if tooltip would go off bottom edge
    if (top + tooltipHeight > viewportHeight) {
        top = event.clientY - tooltipHeight - offset;
    }
    
    // Ensure tooltip doesn't go off left or top edges
    left = Math.max(offset, left);
    top = Math.max(offset, top);
    
    tooltipElement.style.left = left + 'px';
    tooltipElement.style.top = top + 'px';
}

/**
 * Hide tooltip
 */
function hideTooltip() {
    if (tooltipElement) {
        tooltipElement.style.display = 'none';
    }
}
