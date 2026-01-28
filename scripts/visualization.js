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
let currentViewMode = 'solid'; // 'solid', 'points', 'transparent', 'squares', 'slicesX', 'slicesY', 'slicesZ'
let currentVisualizationField = 'rockType'; // Field to visualize
let vizCurrentBlocks = []; // Blocks currently in visualization (renamed to avoid conflict with main.js)
let currentCellSizes = { x: 10, y: 10, z: 10 };

// Cache for field value ranges (to avoid recalculating min/max for each block)
let fieldValueRanges = {
    econValue: { min: 0, max: 1, cached: false }
};

// Slice tool
let slicePlane = null;
let slicePlaneHelper = null;
let sliceHandle = null; // Interactive handle for dragging the slice plane
let sliceEnabled = false;
let sliceAxis = 'z'; // 'x', 'y', or 'z'
let slicePosition = 0;
let isDraggingSliceHandle = false; // Track if user is dragging the slice handle
let sliceDragStartPos = null; // Starting position when dragging begins
let sliceDragStartSlicePos = 0; // Starting slice position when dragging begins
let isHoveringSliceHandle = false; // Track if mouse is hovering over handle
let modelBounds = { minX: -100, maxX: 100, minY: -100, maxY: 100, minZ: -100, maxZ: 100 };

// Value-based visibility
let valueVisibilityEnabled = false;
let valueVisibilityThreshold = 0;
let valueVisibilityMode = 'above'; // 'above' or 'below'
let blockValueAttributes = new Map(); // Map of mesh UUID to value attribute buffer
let valueFilterUpdatePending = false; // Flag to throttle uniform updates
let valueVisibilityShaderMaterial = null; // Custom shader material for value filtering

// Categorical filter (for rockType and other categorical fields)
let categoryFilterEnabled = false;
let visibleCategories = new Set(); // Set of category values to show (empty = show all)

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
    
    // Add mouse move listener for tooltip and handle dragging
    // Use both mouse and pointer events for better compatibility
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('pointermove', onMouseMove);
    renderer.domElement.addEventListener('mouseout', onMouseOut);
    renderer.domElement.addEventListener('pointerout', onMouseOut);
    
    // Hide tooltip when dragging (camera controls)
    // Use capture phase to intercept clicks before OrbitControls
    // Also listen to pointer events which OrbitControls might use
    if (controls) {
        renderer.domElement.addEventListener('mousedown', onMouseDown, true); // true = capture phase
        renderer.domElement.addEventListener('mouseup', onMouseUp, true);
        renderer.domElement.addEventListener('pointerdown', onMouseDown, true); // Pointer events
        renderer.domElement.addEventListener('pointerup', onMouseUp, true);
    }
    
    // Start animation loop
    animate();
}

/**
 * Manually merge multiple BufferGeometries into one
 * @param {Array<THREE.BufferGeometry>} geometries - Array of geometries to merge
 * @returns {THREE.BufferGeometry} Merged geometry
 */
function mergeGeometries(geometries) {
    if (geometries.length === 0) return new THREE.BufferGeometry();
    if (geometries.length === 1) return geometries[0].clone();
    
    const merged = new THREE.BufferGeometry();
    const positions = [];
    const normals = [];
    const uvs = [];
    const allIndices = [];
    let vertexOffset = 0;
    
    geometries.forEach(geometry => {
        const pos = geometry.attributes.position;
        const norm = geometry.attributes.normal;
        const uv = geometry.attributes.uv;
        
        if (pos) {
            for (let i = 0; i < pos.count; i++) {
                positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
            }
        }
        
        if (norm) {
            for (let i = 0; i < norm.count; i++) {
                normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
            }
        }
        
        if (uv) {
            for (let i = 0; i < uv.count; i++) {
                uvs.push(uv.getX(i), uv.getY(i));
            }
        }
        
        // Merge indices
        if (geometry.index) {
            for (let i = 0; i < geometry.index.count; i++) {
                allIndices.push(geometry.index.getX(i) + vertexOffset);
            }
        } else {
            // Non-indexed geometry - create indices sequentially
            const vertexCount = pos ? pos.count : 0;
            for (let i = 0; i < vertexCount; i++) {
                allIndices.push(vertexOffset + i);
            }
        }
        
        vertexOffset += pos ? pos.count : 0;
    });
    
    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (normals.length > 0) {
        merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    }
    if (uvs.length > 0) {
        merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    }
    
    if (allIndices.length > 0) {
        merged.setIndex(allIndices);
    }
    
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    
    return merged;
}

/**
 * Create a bidirectional arrow as a Group with separate colored parts
 * @param {number} length - Total length of the arrow
 * @param {number} shaftRadius - Radius of the shaft
 * @param {number} headLength - Length of each arrowhead
 * @param {number} headRadius - Radius of each arrowhead base
 * @returns {THREE.Group} Arrow group with shaft and two arrowheads
 */
function createBidirectionalArrowGroup(length, shaftRadius, headLength, headRadius) {
    const group = new THREE.Group();
    
    // Create shaft (cylinder in the middle) - GREEN
    const shaftLength = Math.max(0.1, length - 2 * headLength);
    const shaftGeometry = new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLength, 16);
    const shaftMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00, // Green
        transparent: false,
        opacity: 1.0,
        depthTest: true,
        depthWrite: true
    });
    const shaftMesh = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaftMesh.position.y = 0; // Center at origin
    group.add(shaftMesh);
    
    // Create first arrowhead (pointing in positive Y direction) - RED
    const head1Geometry = new THREE.ConeGeometry(headRadius, headLength, 16);
    const head1Material = new THREE.MeshBasicMaterial({
        color: 0xff0000, // Red
        transparent: false,
        opacity: 1.0,
        depthTest: true,
        depthWrite: true
    });
    const head1Mesh = new THREE.Mesh(head1Geometry, head1Material);
    // Position at top of shaft: shaft extends from -shaftLength/2 to +shaftLength/2
    // Arrowhead tip should be at +length/2, base at +shaftLength/2
    head1Mesh.position.y = shaftLength / 2 + headLength / 2;
    group.add(head1Mesh);
    
    // Create second arrowhead (pointing in negative Y direction) - BLUE
    const head2Geometry = new THREE.ConeGeometry(headRadius, headLength, 16);
    const head2Material = new THREE.MeshBasicMaterial({
        color: 0x0000ff, // Blue
        transparent: false,
        opacity: 1.0,
        depthTest: true,
        depthWrite: true
    });
    const head2Mesh = new THREE.Mesh(head2Geometry, head2Material);
    // Rotate 180 degrees around X axis to point downward (not Z!)
    // ConeGeometry points up (+Y) by default, so rotate around X to flip it
    head2Mesh.rotation.x = Math.PI;
    // Position at bottom of shaft: 
    // Shaft center is at y=0, extends from -shaftLength/2 to +shaftLength/2
    // Arrowhead base should be at -shaftLength/2, tip at -shaftLength/2 - headLength
    // So arrowhead center (which is at headLength/2 from base) should be at -shaftLength/2 - headLength/2
    head2Mesh.position.y = -shaftLength / 2 - headLength / 2;
    group.add(head2Mesh);
    
    return group;
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
    
    // Create interactive handle (bidirectional arrow) - size will be updated based on model scale
    // Start with reasonable default dimensions (will be scaled 2x in updateClippingPlanes)
    const defaultLength = 10;
    const defaultShaftRadius = 0.3;
    const defaultHeadLength = 2;
    const defaultHeadRadius = 0.8;
    
    // Create arrow as a Group (allows different colors for shaft and heads)
    try {
        sliceHandle = createBidirectionalArrowGroup(
            defaultLength, 
            defaultShaftRadius, 
            defaultHeadLength, 
            defaultHeadRadius
        );
        sliceHandle.visible = false;
        sliceHandle.userData.isSliceHandle = true; // Mark for raycasting
        sliceHandle.userData.arrowParams = {
            length: defaultLength,
            shaftRadius: defaultShaftRadius,
            headLength: defaultHeadLength,
            headRadius: defaultHeadRadius
        };
        sliceHandle.renderOrder = 9999; // Very high render order to render on top
        sliceHandle.frustumCulled = false; // Always visible to raycasting
        
        // Custom raycast for Group - check all children
        sliceHandle.raycast = function(raycaster, intersects) {
            const children = this.children;
            for (let i = 0; i < children.length; i++) {
                children[i].raycast(raycaster, intersects);
            }
        };
        
        scene.add(sliceHandle);
    } catch (e) {
        // Fallback to sphere if arrow creation fails
        console.warn('Could not create arrow group, using sphere:', e);
        const handleGeometry = new THREE.SphereGeometry(2, 16, 16);
        const handleMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: false,
            opacity: 1.0,
            depthTest: true,
            depthWrite: true,
            side: THREE.DoubleSide
        });
        sliceHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        sliceHandle.visible = false;
        sliceHandle.userData.isSliceHandle = true;
        sliceHandle.renderOrder = 9999;
        sliceHandle.frustumCulled = false;
        sliceHandle.raycast = THREE.Mesh.prototype.raycast;
        scene.add(sliceHandle);
    }
    
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
    
    // Clear individual meshes and sprites
    blockMeshes.forEach(mesh => {
        scene.remove(mesh);
        // Sprites don't have geometry
        if (mesh.geometry) {
            mesh.geometry.dispose();
        }
        // Dispose material and texture
        if (mesh.material) {
            if (mesh.material.map) {
                mesh.material.map.dispose();
            }
            mesh.material.dispose();
        }
    });
    blockMeshes = [];
    
    // Clear instanced mesh
    if (instancedMesh) {
        scene.remove(instancedMesh);
        instancedMesh.geometry.dispose();
        instancedMesh.material.dispose();
        instancedMesh = null;
    }
    
    // Clear point cloud (no longer used, but keep for compatibility)
    if (pointCloud) {
        scene.remove(pointCloud);
        pointCloud.geometry.dispose();
        pointCloud.material.dispose();
        pointCloud = null;
    }
    
    // Note: sliceHandle is kept alive - it's part of the slice tool, not block visualization
}

/**
 * Get color for a block based on the visualization field
 * @param {Object} block - Block object
 * @param {string} field - Field name to visualize
 * @returns {number} Hex color value
 */
/**
 * Update cached value ranges for fields that need dynamic min/max calculation
 * This is called once when blocks are rendered, not for each block
 */
function updateFieldValueRanges(blocks, field) {
    if (field === 'econValue') {
        // Only recalculate if not cached or blocks changed
        if (!fieldValueRanges.econValue.cached || fieldValueRanges.econValue.blockCount !== blocks.length) {
            const values = blocks.map(b => b[field]).filter(v => v !== undefined && !isNaN(v));
            if (values.length > 0) {
                fieldValueRanges.econValue.min = Math.min(...values);
                fieldValueRanges.econValue.max = Math.max(...values);
            } else {
                fieldValueRanges.econValue.min = 0;
                fieldValueRanges.econValue.max = 1;
            }
            fieldValueRanges.econValue.blockCount = blocks.length;
            fieldValueRanges.econValue.cached = true;
        }
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
            // Use cached min/max (calculated once per render, not per block)
            min = fieldValueRanges.econValue.min;
            max = fieldValueRanges.econValue.max;
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
    let filtered = blocks;
    
    // Apply categorical filter if enabled and field is categorical (rockType)
    // Empty visibleCategories set means show all (filter disabled)
    if (categoryFilterEnabled && currentVisualizationField === 'rockType' && visibleCategories.size > 0) {
        filtered = filtered.filter(block => {
            const category = block.rockType || block.material || 'Waste';
            return visibleCategories.has(category);
        });
    }
    
    // With shader-based value filtering, we don't need to filter numeric values here
    // The shader will handle visibility based on instance attributes
    // For points mode, value filtering is done in renderAsPoints
    
    return filtered;
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
    
    // Update cached value ranges for fields that need dynamic min/max (like econValue)
    // This must be done before getBlockColor is called for each block
    updateFieldValueRanges(filteredBlocks, currentVisualizationField);
    
    // Update category filter UI when blocks change (if rockType is selected)
    // This will be called after renderBlocks completes, so we use setTimeout to avoid blocking
    if (currentVisualizationField === 'rockType') {
        setTimeout(() => updateCategoryFilterUI(), 0);
    }
    
    // Render based on current view mode
    // Note: Slice modes use the full blocks array for slice calculation, then filter
    switch (currentViewMode) {
        case 'points':
            renderAsPoints(filteredBlocks, cellSizeX, cellSizeY, cellSizeZ);
            break;
        case 'transparent':
            renderAsCubes(filteredBlocks, cellSizeX, cellSizeY, cellSizeZ, true);
            break;
        case 'squares':
            renderAsSquares(filteredBlocks, cellSizeX, cellSizeY, cellSizeZ);
            break;
        case 'slicesX':
            renderAsSlicesX(blocks, filteredBlocks, cellSizeX, cellSizeY, cellSizeZ);
            break;
        case 'slicesY':
            renderAsSlicesY(blocks, filteredBlocks, cellSizeX, cellSizeY, cellSizeZ);
            break;
        case 'slicesZ':
            renderAsSlicesZ(blocks, filteredBlocks, cellSizeX, cellSizeY, cellSizeZ);
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
 * Render blocks as small instanced spheres (centroids)
 * @param {Array} blocks - Array of block objects
 * @param {number} cellSizeX - Size of each cell in X direction
 * @param {number} cellSizeY - Size of each cell in Y direction
 * @param {number} cellSizeZ - Size of each cell in Z direction
 */
function renderAsPoints(blocks, cellSizeX, cellSizeY, cellSizeZ) {
    // Filter blocks for slice and value visibility
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
    
    if (filteredBlocks.length === 0) {
        return;
    }
    
    // Calculate sphere size based on cell size (smaller than cubes)
    const sphereRadius = Math.min(cellSizeX, cellSizeY, cellSizeZ) * 0.12;
    
    // Create sphere geometry (reusable for all instances)
    const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 8, 6);
    
    // Group blocks by color for instanced rendering
    const colorGroups = {};
    const needsValueFilter = valueVisibilityEnabled && currentVisualizationField !== 'rockType';
    
    filteredBlocks.forEach((block, blockIndex) => {
        const color = getBlockColor(block, currentVisualizationField);
        const colorKey = color.toString();
        
        if (!colorGroups[colorKey]) {
            colorGroups[colorKey] = {
                color: color,
                indices: []
            };
        }
        colorGroups[colorKey].indices.push(blockIndex);
    });
    
    // Clear block data map
    blockDataMap.clear();
    
    // Create instanced meshes for each color group
    Object.keys(colorGroups).forEach(colorKey => {
        const group = colorGroups[colorKey];
        const count = group.indices.length;
        
        // Choose material based on whether value filtering is needed
        let material;
        if (needsValueFilter) {
            material = createValueFilterMaterial(false, group.color);
        } else {
            material = new THREE.MeshLambertMaterial({
                transparent: false,
                opacity: 1.0,
                vertexColors: false,
                clippingPlanes: sliceEnabled ? [slicePlane] : [],
                color: group.color
            });
        }
        
        const instancedMesh = new THREE.InstancedMesh(sphereGeometry, material, count);
        instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        
        // Create instance value attribute if value filtering is enabled
        if (needsValueFilter) {
            const values = new Float32Array(count);
            group.indices.forEach((blockIndex, instanceIndex) => {
                const block = filteredBlocks[blockIndex];
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
            const block = filteredBlocks[blockIndex];
            // Transform mining coordinates to Three.js coordinates:
            // (x, z, y) - depth maps to vertical axis
            matrix.makeTranslation(block.x, block.z, block.y);
            instancedMesh.setMatrixAt(instanceIndex, matrix);
            
            // Store block data for tooltip (using instance index as key)
            blockDataMap.set(`${instancedMesh.uuid}_${instanceIndex}`, block);
        });
        
        instancedMesh.instanceMatrix.needsUpdate = true;
        instancedMesh.userData.blocks = filteredBlocks; // Store blocks array for reference
        instancedMesh.userData.groupIndices = group.indices; // Store indices mapping
        scene.add(instancedMesh);
        blockMeshes.push(instancedMesh);
    });
}

/**
 * Render blocks as billboarded squares using Points with custom shader
 * This is much more efficient than individual sprites
 * @param {Array} blocks - Array of block objects
 * @param {number} cellSizeX - Size of each cell in X direction
 * @param {number} cellSizeY - Size of each cell in Y direction
 * @param {number} cellSizeZ - Size of each cell in Z direction
 */
function renderAsSquares(blocks, cellSizeX, cellSizeY, cellSizeZ) {
    // Filter blocks for slice and value visibility
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
    
    if (filteredBlocks.length === 0) {
        return;
    }
    
    // Calculate square size based on cell size
    const squareSize = Math.min(cellSizeX, cellSizeY, cellSizeZ) * 0.25;
    
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
        blockDataMap.set(`square_${index}`, block);
    });
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Custom shader material to render squares instead of points
    // Use onBeforeCompile to modify the built-in PointsMaterial shader
    const baseMaterial = new THREE.PointsMaterial({
        size: squareSize,
        vertexColors: true,
        sizeAttenuation: true,
        clippingPlanes: sliceEnabled ? [slicePlane] : []
    });
    
    // Modify the fragment shader to draw squares
    baseMaterial.onBeforeCompile = function(shader) {
        shader.fragmentShader = shader.fragmentShader.replace(
            'gl_FragColor = vec4( diffuse, opacity );',
            `
            // Draw a square instead of a circle
            vec2 coord = gl_PointCoord - vec2(0.5);
            if (abs(coord.x) > 0.5 || abs(coord.y) > 0.5) {
                discard;
            }
            gl_FragColor = vec4( diffuse, opacity );
            `
        );
    };
    
    const material = baseMaterial;
    
    pointCloud = new THREE.Points(geometry, material);
    pointCloud.userData.blocks = filteredBlocks; // Store filtered blocks array for tooltip
    scene.add(pointCloud);
}

/**
 * Calculate optimal number of slices based on model dimensions and total blocks
 * @param {Array} blocks - Array of block objects
 * @param {string} axis - Axis to slice along: 'x', 'y', or 'z'
 * @returns {number} Number of slices (1-5)
 */
function calculateOptimalSliceCount(blocks, axis) {
    if (blocks.length === 0) return 1;
    
    // Get unique coordinate values along the axis
    const coordSet = new Set();
    blocks.forEach(block => {
        let coord;
        if (axis === 'x') coord = block.x;
        else if (axis === 'y') coord = block.y;
        else coord = block.z;
        coordSet.add(coord);
    });
    
    const uniqueCoords = coordSet.size;
    const totalBlocks = blocks.length;
    
    // Calculate based on dimensionality (more unique positions = more slices)
    // And total blocks (more blocks = can show more slices)
    // Use logarithmic scaling to avoid too many slices for very large models
    const dimensionFactor = Math.min(uniqueCoords / 10, 1); // Normalize to 0-1
    const blockCountFactor = Math.min(Math.log10(totalBlocks / 100) / 2, 1); // Normalize to 0-1
    
    // Combine factors: more unique positions and more blocks = more slices
    const combinedFactor = (dimensionFactor * 0.6 + blockCountFactor * 0.4);
    
    // Calculate slices: minimum 2, maximum 5
    const slices = Math.max(2, Math.min(5, Math.round(2 + combinedFactor * 3)));
    
    // But don't exceed the number of unique coordinates
    return Math.min(slices, uniqueCoords);
}

/**
 * Calculate evenly spaced slice positions along an axis
 * Uses actual block coordinates to ensure slices are exactly 1 block wide
 * @param {Array} blocks - Array of block objects
 * @param {string} axis - Axis to slice along: 'x', 'y', or 'z'
 * @param {number} numSlices - Number of slices to create
 * @returns {Array<number>} Array of slice positions (actual block coordinates)
 */
function calculateSlicePositions(blocks, axis, numSlices) {
    if (blocks.length === 0 || numSlices < 1) return [];
    
    // Get all unique coordinate values along the axis (sorted)
    const coordSet = new Set();
    blocks.forEach(block => {
        let coord;
        if (axis === 'x') coord = block.x;
        else if (axis === 'y') coord = block.y;
        else coord = block.z;
        coordSet.add(coord);
    });
    
    const uniqueCoords = Array.from(coordSet).sort((a, b) => a - b);
    
    if (uniqueCoords.length === 0) return [];
    
    // Select evenly spaced coordinates from the unique values
    // This ensures slices are exactly 1 block wide (one coordinate value each)
    const positions = [];
    if (numSlices >= uniqueCoords.length) {
        // If we want more slices than unique coordinates, return all
        return uniqueCoords;
    }
    
    if (numSlices === 1) {
        // Return the middle coordinate
        positions.push(uniqueCoords[Math.floor(uniqueCoords.length / 2)]);
    } else {
        // Select evenly spaced indices
        const step = (uniqueCoords.length - 1) / (numSlices - 1);
        for (let i = 0; i < numSlices; i++) {
            const index = Math.round(i * step);
            positions.push(uniqueCoords[index]);
        }
    }
    
    return positions;
}

/**
 * Filter blocks to only those on slice planes (exactly 1 block wide)
 * @param {Array} blocks - Array of block objects
 * @param {string} axis - Axis to slice along: 'x', 'y', or 'z'
 * @param {Array<number>} slicePositions - Array of slice positions (actual block coordinates)
 * @param {number} cellSize - Cell size along the axis (for floating point tolerance)
 * @returns {Array} Filtered blocks on slice planes
 */
function filterBlocksOnSlices(blocks, axis, slicePositions, cellSize) {
    if (slicePositions.length === 0) return [];
    
    // Exact matching: block is on slice if its coordinate exactly matches a slice position
    // Use very small tolerance for floating point precision (1/10000th of cell size)
    // Since slice positions are actual block coordinates, this should match exactly
    const tolerance = cellSize * 0.0001;
    
    // Create a Set for O(1) lookup instead of O(n) array.some()
    // Normalize positions to tolerance units for exact matching
    const slicePosSet = new Set();
    slicePositions.forEach(pos => {
        // Round to tolerance precision to handle floating point issues
        const normalized = Math.round(pos / tolerance) * tolerance;
        slicePosSet.add(normalized);
    });
    
    return blocks.filter(block => {
        let coord;
        if (axis === 'x') coord = block.x;
        else if (axis === 'y') coord = block.y;
        else coord = block.z;
        
        // Normalize coordinate to same precision and check Set (O(1) lookup)
        const normalizedCoord = Math.round(coord / tolerance) * tolerance;
        return slicePosSet.has(normalizedCoord);
    });
}

/**
 * Render blocks as slices along X axis
 * @param {Array} allBlocks - All block objects (for slice calculation)
 * @param {Array} filteredBlocks - Pre-filtered blocks (for value visibility)
 * @param {number} cellSizeX - Size of each cell in X direction
 * @param {number} cellSizeY - Size of each cell in Y direction
 * @param {number} cellSizeZ - Size of each cell in Z direction
 */
function renderAsSlicesX(allBlocks, filteredBlocks, cellSizeX, cellSizeY, cellSizeZ) {
    // Calculate optimal number of slices based on full model
    const numSlices = calculateOptimalSliceCount(allBlocks, 'x');
    const slicePositions = calculateSlicePositions(allBlocks, 'x', numSlices);
    
    // Filter pre-filtered blocks to only those on slice planes
    const sliceBlocks = filterBlocksOnSlices(filteredBlocks, 'x', slicePositions, cellSizeX);
    
    if (sliceBlocks.length === 0) {
        return;
    }
    
    // Render using cubes (same as solid mode)
    renderAsCubes(sliceBlocks, cellSizeX, cellSizeY, cellSizeZ, false);
}

/**
 * Render blocks as slices along Y axis
 * @param {Array} allBlocks - All block objects (for slice calculation)
 * @param {Array} filteredBlocks - Pre-filtered blocks (for value visibility)
 * @param {number} cellSizeX - Size of each cell in X direction
 * @param {number} cellSizeY - Size of each cell in Y direction
 * @param {number} cellSizeZ - Size of each cell in Z direction
 */
function renderAsSlicesY(allBlocks, filteredBlocks, cellSizeX, cellSizeY, cellSizeZ) {
    // Calculate optimal number of slices based on full model
    const numSlices = calculateOptimalSliceCount(allBlocks, 'y');
    const slicePositions = calculateSlicePositions(allBlocks, 'y', numSlices);
    
    // Filter pre-filtered blocks to only those on slice planes
    const sliceBlocks = filterBlocksOnSlices(filteredBlocks, 'y', slicePositions, cellSizeY);
    
    if (sliceBlocks.length === 0) {
        return;
    }
    
    // Render using cubes (same as solid mode)
    renderAsCubes(sliceBlocks, cellSizeX, cellSizeY, cellSizeZ, false);
}

/**
 * Render blocks as slices along Z axis
 * @param {Array} allBlocks - All block objects (for slice calculation)
 * @param {Array} filteredBlocks - Pre-filtered blocks (for value visibility)
 * @param {number} cellSizeX - Size of each cell in X direction
 * @param {number} cellSizeY - Size of each cell in Y direction
 * @param {number} cellSizeZ - Size of each cell in Z direction
 */
function renderAsSlicesZ(allBlocks, filteredBlocks, cellSizeX, cellSizeY, cellSizeZ) {
    // Calculate optimal number of slices based on full model
    const numSlices = calculateOptimalSliceCount(allBlocks, 'z');
    const slicePositions = calculateSlicePositions(allBlocks, 'z', numSlices);
    
    // Filter pre-filtered blocks to only those on slice planes
    const sliceBlocks = filterBlocksOnSlices(filteredBlocks, 'z', slicePositions, cellSizeZ);
    
    if (sliceBlocks.length === 0) {
        return;
    }
    
    // Render using cubes (same as solid mode)
    renderAsCubes(sliceBlocks, cellSizeX, cellSizeY, cellSizeZ, false);
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
        // Handle point cloud (used for squares view mode)
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
    
    // Update handle position and size - place handle at rectangle edge in the same plane
    // Handle should be positioned at the edge of the rectangle (outside, next to it)
    if (sliceHandle && sliceEnabled) {
        sliceHandle.visible = true;
        
        // Calculate handle size based on model scale (use smallest cell size or model extent)
        const modelExtentX = modelBounds.maxX - modelBounds.minX;
        const modelExtentY = modelBounds.maxY - modelBounds.minY;
        const modelExtentZ = modelBounds.maxZ - modelBounds.minZ;
        const minExtent = Math.min(modelExtentX, modelExtentY, modelExtentZ);
        const avgCellSize = Math.min(currentCellSizes.x, currentCellSizes.y, currentCellSizes.z);
        
        // Handle size: 2-5% of smallest model extent, or 1-2 cell sizes, whichever is larger
        // But cap at reasonable min/max for visibility
        const handleSize = Math.max(
            Math.min(minExtent * 0.03, avgCellSize * 1.5), // 3% of extent or 1.5 cell sizes
            Math.min(minExtent * 0.01, avgCellSize * 0.5)  // Minimum: 1% of extent or 0.5 cell sizes
        );
        const handleRadius = Math.max(0.5, Math.min(handleSize, 5)); // Clamp between 0.5 and 5 units
        
        // Calculate arrow dimensions based on handle size
        // Make it 2x bigger/thicker as requested
        const arrowLength = handleRadius * 8; // 2x: was 4, now 8
        const arrowShaftRadius = handleRadius * 0.3; // 2x: was 0.15, now 0.3
        const arrowHeadLength = handleRadius * 1.6; // 2x: was 0.8, now 1.6
        const arrowHeadRadius = handleRadius * 0.8; // 2x: was 0.4, now 0.8
        
        // Update handle geometry if size changed significantly or if it's not an arrow group yet
        const params = sliceHandle.userData.arrowParams || {};
        const sizeChanged = !params.length || 
            Math.abs(params.length - arrowLength) > 0.5 ||
            Math.abs(params.shaftRadius - arrowShaftRadius) > 0.05;
        
        if (sizeChanged && sliceHandle instanceof THREE.Group) {
            // Remove old children
            sliceHandle.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                sliceHandle.remove(child);
            });
            
            // Create new arrow group with updated size
            try {
                const newArrowGroup = createBidirectionalArrowGroup(
                    arrowLength,
                    arrowShaftRadius,
                    arrowHeadLength,
                    arrowHeadRadius
                );
                
                // Copy properties from old handle
                newArrowGroup.visible = sliceHandle.visible;
                newArrowGroup.userData = sliceHandle.userData;
                newArrowGroup.renderOrder = sliceHandle.renderOrder;
                newArrowGroup.frustumCulled = sliceHandle.frustumCulled;
                newArrowGroup.raycast = sliceHandle.raycast;
                newArrowGroup.position.copy(sliceHandle.position);
                newArrowGroup.quaternion.copy(sliceHandle.quaternion);
                
                // Replace in scene
                scene.remove(sliceHandle);
                sliceHandle = newArrowGroup;
                scene.add(sliceHandle);
                
                sliceHandle.userData.arrowParams = {
                    length: arrowLength,
                    shaftRadius: arrowShaftRadius,
                    headLength: arrowHeadLength,
                    headRadius: arrowHeadRadius
                };
            } catch (e) {
                console.warn('Could not update arrow group:', e);
            }
        } else if (!(sliceHandle instanceof THREE.Group)) {
            // Handle is not a Group (fallback sphere), try to convert it
            console.warn('Slice handle is not an arrow group, cannot update');
        }
        
        // Calculate edge offset based on handle size (so handle is clearly outside rectangle)
        const edgeOffset = handleRadius * 2; // Place handle 2 radii away from rectangle edge
        
        // Position handle at the edge of the rectangle in the rectangle's local coordinate system
        // Rectangle's local X is width, local Y is height
        // Place handle at the midpoint of one edge (along local X, at edge of local Y)
        const localOffsetX = rectangleWidth * 0.5 + edgeOffset; // Right edge + offset
        const localOffsetY = rectangleHeight * 0.5; // Top edge (midpoint)
        const localOffsetZ = 0; // In plane (no depth)
        
        // Create offset vector in rectangle's local space
        const localOffset = new THREE.Vector3(localOffsetX, localOffsetY, localOffsetZ);
        
        // Transform to world space using rectangle's rotation
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationFromEuler(
            new THREE.Euler(rectangleRotation.x, rectangleRotation.y, rectangleRotation.z)
        );
        
        // Apply rotation to offset vector
        const worldOffset = localOffset.applyMatrix4(rotationMatrix);
        
        // Position handle at rectangle center + rotated offset
        sliceHandle.position.set(
            rectangleCenterX + worldOffset.x,
            rectangleCenterY + worldOffset.y,
            rectangleCenterZ + worldOffset.z
        );
        
        // Calculate arrow direction based on slice axis
        // The arrow should point along the direction of slice movement
        let arrowDirection = new THREE.Vector3();
        switch (sliceAxis) {
            case 'x':
                // Movement along X axis: arrow points along X (left-right)
                arrowDirection.set(1, 0, 0);
                break;
            case 'y':
                // Movement along Z axis (mining Y -> Three.js Z): arrow points along Z (forward-backward)
                arrowDirection.set(0, 0, 1);
                break;
            case 'z':
            default:
                // Movement along Y axis (mining Z -> Three.js Y): arrow points along Y (up-down)
                arrowDirection.set(0, 1, 0);
                break;
        }
        
        // Rotate arrow to point along the movement direction
        // First, apply rectangle rotation to align with the slice plane
        const rectangleEuler = new THREE.Euler(rectangleRotation.x, rectangleRotation.y, rectangleRotation.z);
        const rectangleQuaternion = new THREE.Quaternion().setFromEuler(rectangleEuler);
        
        // Transform arrow direction by rectangle rotation
        arrowDirection.applyQuaternion(rectangleQuaternion);
        
        // Calculate rotation to align arrow's Y-axis (default direction) with arrowDirection
        // Default arrow points along +Y, so we need to rotate to point along arrowDirection
        const defaultDirection = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultDirection, arrowDirection);
        
        // Combine rectangle rotation with arrow direction rotation
        const finalQuaternion = rectangleQuaternion.clone().multiply(quaternion);
        sliceHandle.quaternion.copy(finalQuaternion);
        
    } else if (sliceHandle) {
        sliceHandle.visible = false;
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
        // Handle point cloud (used for squares view mode)
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
    
    // Handle point cloud (used for squares view mode)
    if (pointCloud && pointCloud.material) {
        pointCloud.material.clippingPlanes = sliceEnabled ? [slicePlane] : [];
        pointCloud.material.needsUpdate = true;
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
        // Update label text with translation
        const label = document.querySelector('label[for="slicePosition"]');
        if (label && typeof t === 'function') {
            const labelText = t('sliceTool.position', { value: slicePosition.toFixed(1) });
            label.innerHTML = labelText;
        }
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
        // Update label text with translation
        const label = document.querySelector('label[for="valueVisibilityThreshold"]');
        if (label && typeof t === 'function') {
            const labelText = t('valueFilter.threshold', { value: valueVisibilityThreshold.toFixed(2) });
            label.innerHTML = labelText;
        }
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
    
    // Use a smaller distance multiplier for a more zoomed-in view
    // Calculate distance using bounding sphere for better fit
    const boundingSphereRadius = Math.sqrt(
        Math.pow(extentX / 2, 2) + 
        Math.pow(extentY / 2, 2) + 
        Math.pow(extentZ / 2, 2)
    );
    const fov = camera.fov * (Math.PI / 180);
    // Use smaller padding (1.2 instead of 2.0) for more zoomed-in view
    const distance = boundingSphereRadius / Math.tan(fov / 2) * 1.2;
    
    // Position camera slightly above and to the side (diagonal view from above)
    // Keep the same viewing angle but closer
    const offset = distance * 0.577; // 1/sqrt(3) for equal offsets in all directions
    camera.position.set(centerX + offset, centerY + offset * 1.2, centerZ + offset);
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
 * @param {boolean} centerCamera - Whether to center camera on model (default: false)
 */
function updateVisualization(blocks, cellSizeX, cellSizeY, cellSizeZ, centerCamera = false) {
    renderBlocks(blocks, cellSizeX, cellSizeY, cellSizeZ, centerCamera);
}

/**
 * Set the view mode (solid, points, transparent)
 * @param {string} mode - View mode: 'solid', 'points', or 'transparent'
 */
function setViewMode(mode) {
    if (['solid', 'points', 'transparent', 'squares', 'slicesX', 'slicesY', 'slicesZ'].includes(mode)) {
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
        
        // Update category filter UI when field changes
        updateCategoryFilterUI();
        
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
    if (sliceHandle) {
        sliceHandle.visible = enabled;
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
        // Update clipping planes (and handle position) after rendering
        if (enabled) {
            updateClippingPlanes();
        }
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
            // Ensure handle position is updated after axis change
            if (sliceEnabled) {
                updateClippingPlanes();
            }
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
        // Update label text with translation
        const label = document.querySelector('label[for="valueVisibilityThreshold"]');
        if (label && typeof t === 'function') {
            const labelText = t('valueFilter.threshold', { value: threshold.toFixed(2) });
            label.innerHTML = labelText;
        }
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
 * Update category filter UI based on current field and available categories
 */
function updateCategoryFilterUI() {
    const container = document.getElementById('categoryFilterCheckboxes');
    if (!container) return;
    
    // Only show category filter for rockType field
    if (currentVisualizationField !== 'rockType') {
        container.innerHTML = `<p style="font-size: 0.85em; opacity: 0.7; margin: 8px 0;">${t('categoryFilter.selectField')}</p>`;
        return;
    }
    
    // Get all unique rock types from current blocks
    if (vizCurrentBlocks.length === 0) {
        container.innerHTML = `<p style="font-size: 0.85em; opacity: 0.7; margin: 8px 0;">${t('categoryFilter.noBlocks')}</p>`;
        return;
    }
    
    const categories = new Set();
    vizCurrentBlocks.forEach(block => {
        const category = block.rockType || block.material || 'Waste';
        categories.add(category);
    });
    
    const sortedCategories = Array.from(categories).sort();
    
    // Clear and rebuild checkboxes
    container.innerHTML = '';
    
    sortedCategories.forEach(category => {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.marginBottom = '6px';
        label.style.cursor = 'pointer';
        label.style.fontSize = '0.9em';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = category;
        checkbox.checked = visibleCategories.size === 0 || visibleCategories.has(category);
        checkbox.style.width = 'auto';
        checkbox.style.marginRight = '8px';
        checkbox.style.cursor = 'pointer';
        
        // Update visibleCategories when checkbox changes
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                visibleCategories.add(category);
            } else {
                visibleCategories.delete(category);
            }
            
            // If all categories are unchecked, show all (empty set = show all)
            // This is handled by filterBlocks - empty set means show all
            // But we need to ensure at least one is checked for the filter to work
            const allCheckboxes = container.querySelectorAll('input[type="checkbox"]');
            const checkedCount = Array.from(allCheckboxes).filter(cb => cb.checked).length;
            
            // If all unchecked, re-check all (show everything)
            if (checkedCount === 0) {
                allCheckboxes.forEach(cb => {
                    cb.checked = true;
                    const cat = cb.value;
                    visibleCategories.add(cat);
                });
            }
            
            // Re-render with updated filter
            if (vizCurrentBlocks.length > 0 && categoryFilterEnabled) {
                renderBlocks(
                    vizCurrentBlocks,
                    currentCellSizes.x,
                    currentCellSizes.y,
                    currentCellSizes.z,
                    false // Don't center camera
                );
            }
        });
        
        const span = document.createElement('span');
        span.textContent = category;
        span.style.color = '#e0e0e0';
        
        label.appendChild(checkbox);
        label.appendChild(span);
        container.appendChild(label);
    });
    
    // If visibleCategories is empty, initialize with all categories
    if (visibleCategories.size === 0) {
        sortedCategories.forEach(cat => visibleCategories.add(cat));
        // Update checkboxes to reflect all selected
        container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = true;
        });
    }
}

/**
 * Set category filter enabled state
 * @param {boolean} enabled - Whether category filter is enabled
 */
function setCategoryFilterEnabled(enabled) {
    categoryFilterEnabled = enabled;
    
    if (vizCurrentBlocks.length > 0) {
        // Re-render to apply filter
        renderBlocks(
            vizCurrentBlocks,
            currentCellSizes.x,
            currentCellSizes.y,
            currentCellSizes.z,
            false // Don't center camera
        );
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
 * Handle mouse down - check for slice handle interaction
 * @param {MouseEvent} event - Mouse event
 */
function onMouseDown(event) {
    // Only handle left mouse button (button 0) or primary pointer
    const isLeftButton = event.button === 0 || event.button === undefined;
    if (!isLeftButton) {
        return; // Let OrbitControls handle right/middle mouse
    }
    
    // Always update mouse position first
    if (!renderer) {
        isDragging = true;
        hideTooltip();
        return;
    }
    
    // Handle both mouse and pointer events
    const clientX = event.clientX !== undefined ? event.clientX : (event.pointerId !== undefined ? event.clientX : 0);
    const clientY = event.clientY !== undefined ? event.clientY : (event.pointerId !== undefined ? event.clientY : 0);
    
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    
    // Check if we're hovering over the handle (set by mousemove)
    // OR check handle directly if hover flag isn't set
    let handleClicked = isHoveringSliceHandle;
    
    if (!handleClicked && sliceHandle && sliceHandle.visible && sliceEnabled && raycaster) {
        raycaster.setFromCamera(mouse, camera);
        const handleIntersects = raycaster.intersectObject(sliceHandle, false);
        handleClicked = handleIntersects.length > 0;
    }
    
    if (handleClicked) {
        // User clicked on slice handle - start dragging
        isDraggingSliceHandle = true;
        isDragging = true; // Prevent camera controls
        
        // CRITICAL: Disable OrbitControls BEFORE it processes the event
        if (controls) {
            controls.enabled = false;
            // Don't call reset() - that causes the view to jump
        }
        
        sliceDragStartPos = new THREE.Vector2(mouse.x, mouse.y);
        sliceDragStartSlicePos = slicePosition;
        hideTooltip();
        
        // Stop all event propagation - MUST be done in capture phase
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        // For pointer events, also set pointer capture to ensure we get all move events
        if (event.pointerId !== undefined && renderer.domElement.setPointerCapture) {
            try {
                renderer.domElement.setPointerCapture(event.pointerId);
            } catch (e) {
                // Ignore errors if pointer capture fails
            }
        }
        
        // Also ensure mousemove events will be captured
        renderer.domElement.style.userSelect = 'none'; // Prevent text selection during drag
        
        return; // Exit early, don't trigger camera drag
    }
    
    // Normal camera drag (if handle wasn't clicked)
    // Re-enable controls if they were disabled
    if (controls && !controls.enabled && !isDraggingSliceHandle) {
        controls.enabled = true;
    }
    isDragging = true;
    hideTooltip();
}

/**
 * Handle mouse up - stop dragging slice handle
 * @param {MouseEvent} event - Mouse event
 */
function onMouseUp(event) {
    // Handle both mouse and pointer events
    if (isDraggingSliceHandle) {
        isDraggingSliceHandle = false;
        sliceDragStartPos = null;
        
        // Re-enable OrbitControls after dragging handle
        if (controls) {
            controls.enabled = true;
        }
        
        // Release pointer capture if it was set
        if (event.pointerId !== undefined && renderer.domElement.releasePointerCapture) {
            try {
                renderer.domElement.releasePointerCapture(event.pointerId);
            } catch (e) {
                // Ignore errors if pointer release fails
            }
        }
        
        // Restore user selection
        if (renderer && renderer.domElement) {
            renderer.domElement.style.userSelect = '';
        }
        
        // Stop event propagation
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }
    isDragging = false;
}

/**
 * Handle mouse move for tooltip and slice handle dragging
 * @param {MouseEvent} event - Mouse event
 */
function onMouseMove(event) {
    // Update mouse position for raycasting
    if (!renderer) return;
    
    // Handle both mouse and pointer events
    const clientX = event.clientX !== undefined ? event.clientX : 0;
    const clientY = event.clientY !== undefined ? event.clientY : 0;
    
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    
    // Handle slice handle dragging FIRST (before cursor checks)
    if (isDraggingSliceHandle && sliceHandle && sliceEnabled && sliceDragStartPos) {
        // Prevent OrbitControls from interfering during drag
        if (controls && controls.enabled) {
            controls.enabled = false;
        }
        
        // Prevent default to stop any other handlers
        event.preventDefault();
        event.stopPropagation();
        
        // Calculate mouse movement delta
        const deltaX = mouse.x - sliceDragStartPos.x;
        const deltaY = mouse.y - sliceDragStartPos.y;
        
        // Debug: Log deltas to verify both are being calculated
        // console.log('Deltas - X:', deltaX.toFixed(4), 'Y:', deltaY.toFixed(4));
        
        // Get bounds for the current axis
        let min, max, range;
        switch (sliceAxis) {
            case 'x':
                min = modelBounds.minX;
                max = modelBounds.maxX;
                break;
            case 'y':
                min = modelBounds.minZ;
                max = modelBounds.maxZ;
                break;
            case 'z':
            default:
                min = modelBounds.minY;
                max = modelBounds.maxY;
                break;
        }
        range = max - min;
        
        // Calculate linear drag: map mouse movement directly to slice range
        // Use camera-aware projection: project slice axis direction to screen space
        // Then project mouse movement onto that screen-space direction
        
        // Get the slice axis direction in world space
        let axisDirection = new THREE.Vector3();
        switch (sliceAxis) {
            case 'x':
                axisDirection.set(1, 0, 0); // X axis direction
                break;
            case 'y':
                axisDirection.set(0, 0, 1); // Z axis direction (mining Y -> Three.js Z)
                break;
            case 'z':
            default:
                axisDirection.set(0, 1, 0); // Y axis direction (mining Z -> Three.js Y)
                break;
        }
        
        // Get model center for more accurate projection
        const modelCenter = new THREE.Vector3(
            (modelBounds.minX + modelBounds.maxX) / 2,
            (modelBounds.minY + modelBounds.maxY) / 2,
            (modelBounds.minZ + modelBounds.maxZ) / 2
        );
        
        // Transform axis direction to screen space
        // Get two points along the axis direction from model center
        const worldPoint1 = modelCenter.clone();
        const worldPoint2 = modelCenter.clone().add(axisDirection.clone().multiplyScalar(range));
        
        // Project to screen space (normalized device coordinates)
        const screenPoint1 = worldPoint1.clone().project(camera);
        const screenPoint2 = worldPoint2.clone().project(camera);
        
        // Calculate screen-space direction vector
        const screenDirection = new THREE.Vector2(
            screenPoint2.x - screenPoint1.x,
            screenPoint2.y - screenPoint1.y
        );
        const screenDirLength = screenDirection.length();
        
        // Normalize screen direction
        if (screenDirLength > 0.0001) {
            screenDirection.normalize();
        } else {
            // Axis is perpendicular to view (edge case), use default direction
            switch (sliceAxis) {
                case 'x':
                    screenDirection.set(1, 0); // Horizontal
                    break;
                case 'y':
                case 'z':
                default:
                    screenDirection.set(0, 1); // Vertical
                    break;
            }
        }
        
        // Project mouse movement onto screen-space axis direction
        // This gives us how much the mouse moved along the slice axis direction on screen
        const mouseMovement = new THREE.Vector2(deltaX, deltaY);
        const projectedMovement = mouseMovement.dot(screenDirection);
        
        // Map projected movement to slice range linearly
        // The screen-space length of the axis direction tells us how much screen space = full range
        // screenDirection points from min to max in screen space
        // So positive projectedMovement = dragging in direction of max = move toward max
        // Negative projectedMovement = dragging opposite = move toward min
        let movement = 0;
        if (screenDirLength > 0.0001) {
            // Linear mapping: mouse movement fraction of screen = slice movement fraction of range
            // screenDirLength is the NDC distance for the full range
            // projectedMovement / screenDirLength gives us the fraction of range to move
            movement = (projectedMovement / screenDirLength) * range;
        } else {
            // Fallback: use simple scaling if axis is perpendicular to view
            movement = projectedMovement * (range / 2.0);
        }
        
        // Debug: Log screen direction and projection
        console.log('Screen projection:', {
            axis: sliceAxis,
            screenDir: `(${screenDirection.x.toFixed(3)}, ${screenDirection.y.toFixed(3)})`,
            screenDirLength: screenDirLength.toFixed(3),
            mouseDelta: `(${deltaX.toFixed(3)}, ${deltaY.toFixed(3)})`,
            projectedMovement: projectedMovement.toFixed(4),
            movement: movement.toFixed(4)
        });
        
        // Calculate new position
        const newPos = Math.max(min, Math.min(max, sliceDragStartSlicePos + movement));
        
        // Debug: Log the calculation details
        const calculatedPos = sliceDragStartSlicePos + movement;
        const diff = Math.abs(newPos - slicePosition);
        const willUpdate = diff > 0.001;
        
        // Log key values separately for easier debugging
        console.log(`Drag [${sliceAxis}]: deltaX=${deltaX.toFixed(4)}, deltaY=${deltaY.toFixed(4)}, movement=${movement.toFixed(4)}, pos=${newPos.toFixed(4)}, update=${willUpdate}`);
        
        // Only update if position actually changed (avoid unnecessary updates)
        // Lower threshold to 0.001 to allow smaller movements
        if (Math.abs(newPos - slicePosition) > 0.001) {
            console.log('Updating slice position from', slicePosition.toFixed(4), 'to', newPos.toFixed(4));
            
            // Use setSlicePosition to ensure all updates happen correctly
            setSlicePosition(newPos);
            
            // Also update slider value and UI elements
            const slider = document.getElementById('slicePosition');
            if (slider) {
                slider.value = newPos;
                console.log('Slider value set to:', newPos);
            }
            const valueDisplay = document.getElementById('slicePositionValue');
            if (valueDisplay) {
                valueDisplay.textContent = newPos.toFixed(1);
                // Update label text with translation
                const label = document.querySelector('label[for="slicePosition"]');
                if (label && typeof t === 'function') {
                    const labelText = t('sliceTool.position', { value: newPos.toFixed(1) });
                    label.innerHTML = labelText;
                }
            }
            
            console.log('Slice position updated, clipping planes should be updated');
        } else {
            console.warn('Update skipped - diff too small:', diff.toFixed(6), '< 0.001');
        }
        
        // Set cursor and return - don't check blocks or tooltip while dragging
        renderer.domElement.style.cursor = 'grabbing';
        
        // Stop event propagation to prevent OrbitControls from handling it
        event.stopPropagation();
        return;
    }
    
    // Change cursor when hovering over slice handle (only when not dragging)
    // Check handle FIRST before checking blocks (handle has priority)
    isHoveringSliceHandle = false; // Reset flag
    
    if (sliceHandle && sliceHandle.visible && sliceEnabled && raycaster) {
        raycaster.setFromCamera(mouse, camera);
        // Check handle (no children, so use false)
        const handleIntersects = raycaster.intersectObject(sliceHandle, false);
        if (handleIntersects.length > 0) {
            isHoveringSliceHandle = true; // Set flag for mousedown handler
            renderer.domElement.style.cursor = 'grab';
            return; // Don't check blocks if hovering over handle
        } else {
            renderer.domElement.style.cursor = '';
        }
    }
    
    if (!tooltipElement || !raycaster || !renderer || isDragging) return;
    
    // Mouse position already updated above
    // Update raycaster
    raycaster.setFromCamera(mouse, camera);
    
    // Find intersections
    const intersects = [];
    
    // Point cloud replaced with instanced spheres (handled by blockMeshes below)
    
    // Check instanced meshes and sprites
    blockMeshes.forEach(mesh => {
        if (!mesh.visible) return;
        
        if (mesh instanceof THREE.InstancedMesh) {
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
    
    // Check point cloud (used for squares view mode)
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
 * Escape HTML to prevent XSS attacks
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

/**
 * Show tooltip with block data
 * @param {MouseEvent} event - Mouse event
 * @param {Object} block - Block object
 */
function showTooltip(event, block) {
    if (!tooltipElement) return;
    
    // Sanitize string values from block data to prevent XSS
    const safeRockType = escapeHtml(block.rockType || block.material || t('tooltip.notAvailable'));
    const safeZone = block.zone !== undefined && block.zone !== null ? escapeHtml(String(block.zone)) : '';
    
    // Build tooltip content (numeric values are safe, but string values are sanitized)
    let content = `<div class="tooltip-header">${escapeHtml(t('tooltip.title'))}</div>`;
    content += `<div class="tooltip-row"><span class="tooltip-label">${escapeHtml(t('tooltip.position'))}</span> <span class="tooltip-value">(${block.x.toFixed(2)}, ${block.y.toFixed(2)}, ${block.z.toFixed(2)})</span></div>`;
    content += `<div class="tooltip-row"><span class="tooltip-label">${escapeHtml(t('tooltip.indices'))}</span> <span class="tooltip-value">I=${block.i}, J=${block.j}, K=${block.k}</span></div>`;
    content += `<div class="tooltip-row"><span class="tooltip-label">${escapeHtml(t('tooltip.rockType'))}</span> <span class="tooltip-value">${safeRockType}</span></div>`;
    
    if (block.density !== undefined && block.density !== null) {
        content += `<div class="tooltip-row"><span class="tooltip-label">${escapeHtml(t('tooltip.density'))}</span> <span class="tooltip-value">${block.density.toFixed(2)} ${escapeHtml(t('tooltip.units.density'))}</span></div>`;
    }
    
    if (block.gradeCu !== undefined && block.gradeCu !== null) {
        content += `<div class="tooltip-row"><span class="tooltip-label">${escapeHtml(t('tooltip.cuGrade'))}</span> <span class="tooltip-value">${block.gradeCu.toFixed(2)}${escapeHtml(t('tooltip.units.cuGrade'))}</span></div>`;
    }
    
    if (block.gradeAu !== undefined && block.gradeAu !== null) {
        content += `<div class="tooltip-row"><span class="tooltip-label">${escapeHtml(t('tooltip.auGrade'))}</span> <span class="tooltip-value">${block.gradeAu.toFixed(2)} ${escapeHtml(t('tooltip.units.auGrade'))}</span></div>`;
    }
    
    if (block.econValue !== undefined && block.econValue !== null) {
        content += `<div class="tooltip-row"><span class="tooltip-label">${escapeHtml(t('tooltip.econValue'))}</span> <span class="tooltip-value">${block.econValue.toFixed(2)}</span></div>`;
    }
    
    if (block.zone !== undefined && block.zone !== null) {
        content += `<div class="tooltip-row"><span class="tooltip-label">${escapeHtml(t('tooltip.zone'))}</span> <span class="tooltip-value">${safeZone}</span></div>`;
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
