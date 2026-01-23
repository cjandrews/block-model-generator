/**
 * Block Model Generator
 * Generates regular grid of blocks with material patterns
 * Integrated with standardized block model schema (blockModelStandard.js)
 */

// ============================================================================
// Standard Block Model Functions (from blockModelStandard.js)
// ============================================================================

/**
 * Generate a regular grid of blocks following standard conventions
 * Uses origin + indices to compute centroids
 * 
 * @param {Object} params - Grid parameters
 * @param {number} params.xmOrig - X model origin
 * @param {number} params.ymOrig - Y model origin
 * @param {number} params.zmOrig - Z model origin
 * @param {number} params.xInc - X cell increment
 * @param {number} params.yInc - Y cell increment
 * @param {number} params.zInc - Z cell increment
 * @param {number} params.nx - Number of cells in X
 * @param {number} params.ny - Number of cells in Y
 * @param {number} params.nz - Number of cells in Z
 * @returns {Array} Array of block objects in standard format
 */
function generateRegularGrid(params) {
    const {
        xmOrig, ymOrig, zmOrig,
        xInc, yInc, zInc,
        nx, ny, nz
    } = params;
    
    const blocks = [];
    
    // Validate parameters
    if (xInc <= 0 || yInc <= 0 || zInc <= 0) {
        throw new Error('Cell increments must be greater than 0');
    }
    if (nx <= 0 || ny <= 0 || nz <= 0) {
        throw new Error('Cell counts must be greater than 0');
    }
    
    // Generate blocks using nested loops (I, J, K indices)
    for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
            for (let k = 0; k < nz; k++) {
                // Calculate centroid coordinates
                // For mining convention: Z goes downward (negative) from ground surface (zmOrig)
                // When zmOrig = 0, blocks go from 0 downward (negative values)
                const x = xmOrig + (i + 0.5) * xInc;
                const y = ymOrig + (j + 0.5) * yInc;
                const z = zmOrig - (k + 0.5) * zInc;
                
                // Create standard block object
                const block = {
                    x: x,
                    y: y,
                    z: z,
                    i: i,
                    j: j,
                    k: k,
                    rockType: 'Waste', // Default to waste
                    density: 2.5, // Default density (tonnes/m³)
                    zone: undefined,
                    gradeAu: undefined,
                    gradeCu: undefined,
                    econValue: undefined
                };
                
                blocks.push(block);
            }
        }
    }
    
    return blocks;
}

/**
 * Format coordinate value (4 decimal places, standard for mining)
 * @param {number} value - Coordinate value
 * @returns {string} Formatted string
 */
function formatCoordinate(value) {
    if (value === undefined || value === null || isNaN(value)) {
        return '0.0000';
    }
    return value.toFixed(4);
}

/**
 * Format numeric value (4 decimal places)
 * @param {number} value - Numeric value
 * @returns {string} Formatted string
 */
function formatNumber(value) {
    if (value === undefined || value === null || isNaN(value)) {
        return '0.0000';
    }
    return value.toFixed(4);
}

/**
 * Convert blocks array to CSV string following MiningMath formatting rules
 * 
 * @param {Array} blocks - Array of block objects
 * @param {Object} options - Export options
 * @param {number} [options.cellSizeX] - Cell size in X direction (for dX field)
 * @param {number} [options.cellSizeY] - Cell size in Y direction (for dY field)
 * @param {number} [options.cellSizeZ] - Cell size in Z direction (for dZ field)
 * @returns {string} CSV text with headers
 */
function blocksToCsv(blocks, options = {}) {
    const {
        includeIndices = false,
        includeZone = true,
        includeGrades = true,
        includeEconValue = true,
        filterAirBlocks = true,
        cellSizeX = undefined,
        cellSizeY = undefined,
        cellSizeZ = undefined
    } = options;
    
    if (!blocks || blocks.length === 0) {
        return '';
    }
    
    // Filter out air blocks if requested
    let filteredBlocks = blocks;
    if (filterAirBlocks) {
        filteredBlocks = blocks.filter(block => block.density > 0);
    }
    
    if (filteredBlocks.length === 0) {
        return '';
    }
    
    // Determine which fields are present in the data
    const hasZone = includeZone && filteredBlocks.some(b => b.zone !== undefined && b.zone !== null);
    const hasGradeAu = includeGrades && filteredBlocks.some(b => b.gradeAu !== undefined && b.gradeAu !== null);
    const hasGradeCu = includeGrades && filteredBlocks.some(b => b.gradeCu !== undefined && b.gradeCu !== null);
    const hasEconValue = includeEconValue && filteredBlocks.some(b => b.econValue !== undefined && b.econValue !== null);
    
    // Build header row (short names, uppercase, no spaces)
    const headers = ['X', 'Y', 'Z'];
    
    if (includeIndices) {
        headers.push('I', 'J', 'K');
    }
    
    // Add block dimensions if provided
    const includeDimensions = cellSizeX !== undefined && cellSizeY !== undefined && cellSizeZ !== undefined;
    if (includeDimensions) {
        headers.push('dX', 'dY', 'dZ');
    }
    
    headers.push('ROCKTYPE', 'DENSITY');
    
    if (hasZone) {
        headers.push('ZONE');
    }
    
    if (hasGradeCu) {
        headers.push('GRADE_CU');
    }
    
    if (hasGradeAu) {
        headers.push('GRADE_AU');
    }
    
    if (hasEconValue) {
        headers.push('ECON_VALUE');
    }
    
    // Build data rows
    const rows = filteredBlocks.map(block => {
        const row = [
            formatCoordinate(block.x),
            formatCoordinate(block.y),
            formatCoordinate(block.z)
        ];
        
        if (includeIndices) {
            row.push(block.i, block.j, block.k);
        }
        
        // Add block dimensions if provided
        if (includeDimensions) {
            row.push(
                formatNumber(cellSizeX),
                formatNumber(cellSizeY),
                formatNumber(cellSizeZ)
            );
        }
        
        row.push(
            block.rockType || 'Waste',
            formatNumber(block.density)
        );
        
        if (hasZone) {
            row.push(block.zone !== undefined && block.zone !== null ? String(block.zone) : '');
        }
        
        if (hasGradeCu) {
            row.push(block.gradeCu !== undefined && block.gradeCu !== null ? formatNumber(block.gradeCu) : '0.0000');
        }
        
        if (hasGradeAu) {
            row.push(block.gradeAu !== undefined && block.gradeAu !== null ? formatNumber(block.gradeAu) : '0.0000');
        }
        
        if (hasEconValue) {
            row.push(block.econValue !== undefined && block.econValue !== null ? formatNumber(block.econValue) : '0.0000');
        }
        
        return row.join(',');
    });
    
    // Combine header and rows
    return [headers.join(','), ...rows].join('\n');
}

/**
 * Convert legacy block format to standard format
 * @param {Object} legacyBlock - Block in old format
 * @returns {Object} Block in standard format
 */
function convertLegacyBlock(legacyBlock) {
    return {
        x: legacyBlock.x,
        y: legacyBlock.y,
        z: legacyBlock.z,
        i: legacyBlock.i,
        j: legacyBlock.j,
        k: legacyBlock.k,
        rockType: legacyBlock.material || legacyBlock.rockType || 'Waste',
        density: legacyBlock.density || 0,
        zone: legacyBlock.zone,
        gradeAu: legacyBlock.gradeAu,
        gradeCu: legacyBlock.gradeCu || legacyBlock.grade,
        econValue: legacyBlock.econValue || legacyBlock.value
    };
}

/**
 * Apply material properties to blocks based on rock type
 * @param {Array} blocks - Array of blocks
 * @param {Object} materialDefinitions - Material property definitions
 * @returns {Array} Blocks with properties applied
 */
function applyMaterialProperties(blocks, materialDefinitions) {
    return blocks.map(block => {
        const material = materialDefinitions[block.rockType];
        if (material) {
            return {
                ...block,
                density: material.density !== undefined ? material.density : block.density,
                gradeAu: material.gradeAu !== undefined ? material.gradeAu : block.gradeAu,
                gradeCu: material.gradeCu !== undefined ? material.gradeCu : block.gradeCu,
                econValue: material.econValue !== undefined ? material.econValue : block.econValue,
                zone: material.zone !== undefined ? material.zone : block.zone
            };
        }
        return block;
    });
}

// ============================================================================
// Material Definitions (Standard Format)
// ============================================================================

/**
 * Material definitions with properties (standard format)
 * Uses rockType, gradeCu, gradeAu, econValue
 */
const MATERIALS = {
    'Waste': { 
        color: 0x808080, 
        density: 2.5, 
        gradeCu: 0.05,  // Background Cu (<0.1% typical for waste)
        gradeAu: 0.05,  // Background Au (<0.1 g/t typical for waste)
        econValue: -100.0 
    },
    'Ore_Low': { 
        color: 0xffa500, 
        density: 3.0, 
        gradeCu: 0.4,   // Low-grade ore: 0.3-0.5% Cu (typical cutoff ~0.3%)
        gradeAu: 0.7,   // Low-grade ore: 0.5-1.0 g/t Au
        econValue: 10.0 
    },
    'Ore_Med': { 
        color: 0xff6600, 
        density: 3.2, 
        gradeCu: 0.8,   // Medium-grade ore: 0.5-1.0% Cu (typical porphyry range)
        gradeAu: 1.5,   // Medium-grade ore: 1.0-2.5 g/t Au
        econValue: 25.0 
    },
    'Ore_High': { 
        color: 0xff0000, 
        density: 3.5, 
        gradeCu: 1.5,   // High-grade ore: 1.0-2.0% Cu
        gradeAu: 3.5,   // High-grade ore: 2.5-5.0 g/t Au
        econValue: 50.0 
    },
    'Magnetite': {
        color: 0x4a90e2,
        density: 3.2,
        gradeCu: 0.55,  // Moderate Cu grade
        gradeAu: 0.8,   // Moderate Au grade
        econValue: 300.0,
        zone: 'Zone1'
    },
    'Hematite': {
        color: 0xe24a4a,
        density: 3.0,
        gradeCu: 0.60,  // Moderate Cu grade
        gradeAu: 0.9,   // Moderate Au grade
        econValue: 280.0,
        zone: 'Zone1'
    },
    'Ore': {
        color: 0xff0000,
        density: 3.5,
        gradeCu: 0.9,   // Typical porphyry Cu-Au ore: 0.5-1.5% Cu
        gradeAu: 1.8,   // Typical porphyry Cu-Au ore: 1.0-3.0 g/t Au
        econValue: 350.0,
        zone: 'Zone2'
    }
};

// ============================================================================
// Material Pattern Functions (Updated to Standard Format)
// ============================================================================

/**
 * Apply uniform material pattern (single material)
 * @param {Array} blocks - Array of block objects
 * @returns {Array} Blocks with material assigned
 */
function applyUniformPattern(blocks) {
    return blocks.map(block => {
        const material = MATERIALS['Ore_Med'];
        return {
            ...block,
            rockType: 'Ore_Med',
            density: material.density,
            gradeCu: material.gradeCu,
            gradeAu: material.gradeAu,
            econValue: material.econValue,
            zone: material.zone
        };
    });
}

/**
 * Apply layered material pattern (horizontal layers with random tilt)
 * @param {Array} blocks - Array of block objects
 * @param {number} cellsX - Number of cells in X direction
 * @param {number} cellsY - Number of cells in Y direction
 * @param {number} cellsZ - Number of cells in Z direction
 * @returns {Array} Blocks with material assigned
 */
function applyLayeredPattern(blocks, cellsX, cellsY, cellsZ) {
    // Calculate model bounds for tilt calculation
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    blocks.forEach(block => {
        minX = Math.min(minX, block.x);
        maxX = Math.max(maxX, block.x);
        minY = Math.min(minY, block.y);
        maxY = Math.max(maxY, block.y);
        minZ = Math.min(minZ, block.z);
        maxZ = Math.max(maxZ, block.z);
    });
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const depthRange = maxZ - minZ; // Should be negative to positive (e.g., -2.5 to 0)
    
    // Generate random tilt angles (in radians)
    const tiltX = (Math.random() - 0.5) * 0.3; // ±15 degrees
    const tiltY = (Math.random() - 0.5) * 0.3; // ±15 degrees
    
    // Calculate tilt offsets at model center
    const tiltOffsetX = Math.tan(tiltX) * depthRange;
    const tiltOffsetY = Math.tan(tiltY) * depthRange;
    
    return blocks.map(block => {
        // Calculate normalized depth based on Z coordinate (0 = ground, 1 = deepest)
        // Since Z goes downward (negative), we normalize from maxZ (shallowest, closest to 0) to minZ (deepest)
        const normalizedDepth = (block.z - maxZ) / (minZ - maxZ); // 0 to 1, where 0 is shallowest
        
        // Apply tilt: adjust depth based on position relative to center
        const offsetX = (block.x - centerX) / (maxX - minX || 1);
        const offsetY = (block.y - centerY) / (maxY - minY || 1);
        const tiltedDepth = normalizedDepth + (offsetX * tiltOffsetX / depthRange) + (offsetY * tiltOffsetY / depthRange);
        const clampedDepth = Math.max(0, Math.min(1, tiltedDepth));
        
        let rockType;
        if (clampedDepth < 0.2) {
            rockType = 'Waste';
        } else if (clampedDepth < 0.4) {
            rockType = 'Ore_Low';
        } else if (clampedDepth < 0.7) {
            rockType = 'Ore_Med';
        } else {
            rockType = 'Ore_High';
        }
        
        const material = MATERIALS[rockType];
        return {
            ...block,
            rockType: rockType,
            density: material.density,
            gradeCu: material.gradeCu,
            gradeAu: material.gradeAu,
            econValue: material.econValue,
            zone: material.zone
        };
    });
}

/**
 * Apply gradient material pattern (vertical gradient)
 * @param {Array} blocks - Array of block objects
 * @param {number} cellsX - Number of cells in X direction
 * @param {number} cellsY - Number of cells in Y direction
 * @param {number} cellsZ - Number of cells in Z direction
 * @returns {Array} Blocks with material assigned
 */
function applyGradientPattern(blocks, cellsX, cellsY, cellsZ) {
    return blocks.map(block => {
        // Calculate distance from center
        const centerX = cellsX / 2;
        const centerY = cellsY / 2;
        const centerZ = cellsZ / 2;
        
        const distX = Math.abs(block.i - centerX) / centerX;
        const distY = Math.abs(block.j - centerY) / centerY;
        const distZ = Math.abs(block.k - centerZ) / centerZ;
        
        const distance = Math.sqrt(distX * distX + distY * distY + distZ * distZ);
        const normalizedDist = Math.min(distance, 1.0);
        
        let rockType;
        if (normalizedDist < 0.3) {
            rockType = 'Ore_High';
        } else if (normalizedDist < 0.6) {
            rockType = 'Ore_Med';
        } else if (normalizedDist < 0.8) {
            rockType = 'Ore_Low';
        } else {
            rockType = 'Waste';
        }
        
        const material = MATERIALS[rockType];
        return {
            ...block,
            rockType: rockType,
            density: material.density,
            gradeCu: material.gradeCu,
            gradeAu: material.gradeAu,
            econValue: material.econValue,
            zone: material.zone
        };
    });
}

/**
 * Apply checkerboard material pattern
 * @param {Array} blocks - Array of block objects
 * @returns {Array} Blocks with material assigned
 */
function applyCheckerboardPattern(blocks) {
    return blocks.map(block => {
        const isEven = (block.i + block.j + block.k) % 2 === 0;
        const rockType = isEven ? 'Ore_Med' : 'Waste';
        const material = MATERIALS[rockType];
        
        return {
            ...block,
            rockType: rockType,
            density: material.density,
            gradeCu: material.gradeCu,
            gradeAu: material.gradeAu,
            econValue: material.econValue,
            zone: material.zone
        };
    });
}

/**
 * Apply random material pattern
 * @param {Array} blocks - Array of block objects
 * @returns {Array} Blocks with material assigned
 */
function applyRandomPattern(blocks) {
    const rockTypes = ['Waste', 'Ore_Low', 'Ore_Med', 'Ore_High'];
    
    return blocks.map(block => {
        const randomIndex = Math.floor(Math.random() * rockTypes.length);
        const rockType = rockTypes[randomIndex];
        const material = MATERIALS[rockType];
        
        return {
            ...block,
            rockType: rockType,
            density: material.density + (Math.random() - 0.5) * 0.2,
            gradeCu: material.gradeCu * (0.8 + Math.random() * 0.4),
            gradeAu: material.gradeAu * (0.8 + Math.random() * 0.4),
            econValue: material.econValue * (0.8 + Math.random() * 0.4),
            zone: material.zone
        };
    });
}

/**
 * Apply single ore horizon pattern (ORE when within specified Z bounds, else WASTE)
 * @param {Array} blocks - Array of block objects
 * @param {number} cellsX - Number of cells in X direction
 * @param {number} cellsY - Number of cells in Y direction
 * @param {number} cellsZ - Number of cells in Z direction
 * @returns {Array} Blocks with material assigned
 */
function applyOreHorizonPattern(blocks, cellsX, cellsY, cellsZ) {
    // Calculate model bounds to determine default horizon position
    let minZ = Infinity, maxZ = -Infinity;
    blocks.forEach(block => {
        minZ = Math.min(minZ, block.z);
        maxZ = Math.max(maxZ, block.z);
    });
    
    // Default: horizon in middle 20% of Z range
    const zRange = maxZ - minZ;
    const horizonCenter = (minZ + maxZ) / 2;
    const horizonThickness = zRange * 0.2; // 20% of total depth
    const horizonMin = horizonCenter - horizonThickness / 2;
    const horizonMax = horizonCenter + horizonThickness / 2;
    
    return blocks.map(block => {
        const isInHorizon = block.z >= horizonMin && block.z <= horizonMax;
        const rockType = isInHorizon ? 'Ore' : 'Waste';
        const material = MATERIALS[rockType];
        
        return {
            ...block,
            rockType: rockType,
            density: material.density,
            gradeCu: material.gradeCu,
            gradeAu: material.gradeAu,
            econValue: material.econValue,
            zone: material.zone
        };
    });
}

/**
 * Apply inclined vein pattern (ORE when distance to plane < threshold)
 * @param {Array} blocks - Array of block objects
 * @param {number} cellsX - Number of cells in X direction
 * @param {number} cellsY - Number of cells in Y direction
 * @param {number} cellsZ - Number of cells in Z direction
 * @returns {Array} Blocks with material assigned
 */
function applyInclinedVeinPattern(blocks, cellsX, cellsY, cellsZ) {
    // Calculate model bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    blocks.forEach(block => {
        minX = Math.min(minX, block.x);
        maxX = Math.max(maxX, block.x);
        minY = Math.min(minY, block.y);
        maxY = Math.max(maxY, block.y);
        minZ = Math.min(minZ, block.z);
        maxZ = Math.max(maxZ, block.z);
    });
    
    // Define a plane through the model center
    // Plane equation: ax + by + cz + d = 0
    // Using a plane that dips at 45° and strikes NE-SW
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    
    // Normal vector for plane (dipping 45° to SE, striking NE-SW)
    // Normalized vector pointing down and to the SE
    const strikeAngle = Math.PI / 4; // 45 degrees (NE-SW)
    const dipAngle = Math.PI / 4; // 45 degrees dip
    const nx = Math.sin(strikeAngle) * Math.sin(dipAngle);
    const ny = -Math.cos(strikeAngle) * Math.sin(dipAngle);
    const nz = Math.cos(dipAngle);
    
    // Normalize the normal vector
    const norm = Math.sqrt(nx * nx + ny * ny + nz * nz);
    const nNormX = nx / norm;
    const nNormY = ny / norm;
    const nNormZ = nz / norm;
    
    // Calculate d: d = -(ax0 + by0 + cz0) where (x0, y0, z0) is a point on the plane
    const d = -(nNormX * centerX + nNormY * centerY + nNormZ * centerZ);
    
    // Vein thickness threshold (default: 10% of average cell size)
    const avgCellSize = ((maxX - minX) / cellsX + (maxY - minY) / cellsY + (maxZ - minZ) / cellsZ) / 3;
    const veinThickness = avgCellSize * 2; // 2 cell widths
    
    return blocks.map(block => {
        // Calculate distance from block to plane
        // Distance = |ax + by + cz + d| (normal vector is already normalized)
        const distance = Math.abs(nNormX * block.x + nNormY * block.y + nNormZ * block.z + d);
        
        const isInVein = distance < veinThickness;
        const rockType = isInVein ? 'Ore' : 'Waste';
        const material = MATERIALS[rockType];
        
        // Optionally vary grade based on distance from plane center
        let gradeCu = material.gradeCu;
        let gradeAu = material.gradeAu;
        if (isInVein) {
            // Higher grade at center, decreasing toward edges
            const normalizedDist = distance / veinThickness;
            const gradeFactor = 1.0 - (normalizedDist * 0.5); // 50% reduction at edge
            gradeCu = material.gradeCu * gradeFactor;
            gradeAu = material.gradeAu * gradeFactor;
        }
        
        return {
            ...block,
            rockType: rockType,
            density: material.density,
            gradeCu: gradeCu,
            gradeAu: gradeAu,
            econValue: material.econValue,
            zone: material.zone
        };
    });
}

/**
 * Simple Perlin-like noise function for random clusters
 * Uses a reliable hash-based approach for consistent, well-distributed noise
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} z - Z coordinate
 * @param {number} scale - Noise scale factor
 * @returns {number} Noise value between 0 and 1
 */
function simpleNoise3D(x, y, z, scale) {
    // Scale coordinates
    const sx = x * scale;
    const sy = y * scale;
    const sz = z * scale;
    
    // Get integer grid coordinates
    const fx = Math.floor(sx);
    const fy = Math.floor(sy);
    const fz = Math.floor(sz);
    
    // Get fractional parts for interpolation
    const dx = sx - fx;
    const dy = sy - fy;
    const dz = sz - fz;
    
    // Smooth step function for smooth interpolation
    const smooth = (t) => {
        return t * t * (3 - 2 * t);
    };
    const sx_smooth = smooth(dx);
    const sy_smooth = smooth(dy);
    const sz_smooth = smooth(dz);
    
    // Hash function for integer coordinates - produces value in [-1, 1]
    // Using a more reliable approach that works well with JavaScript numbers
    const hash = (ix, iy, iz) => {
        // Ensure integers
        ix = Math.floor(ix) | 0;
        iy = Math.floor(iy) | 0;
        iz = Math.floor(iz) | 0;
        
        // Combine coordinates using multiplication with primes
        // Use smaller primes to avoid JavaScript number precision issues
        let h = ((ix * 73856093) | 0) ^ ((iy * 19349663) | 0) ^ ((iz * 83492791) | 0);
        
        // Mix bits using operations that work well in JavaScript
        h = ((h << 13) | (h >>> 19)) ^ h; // Rotate and XOR
        h = h ^ (h >>> 7);
        h = h ^ (h << 17);
        
        // Ensure positive and convert to float in range [-1, 1]
        h = h & 0x7fffffff; // Make positive
        // Use modulo with a prime to ensure good distribution
        h = h % 2147483647;
        const normalized = h / 2147483647.0;
        return normalized * 2.0 - 1.0; // Map to [-1, 1]
    };
    
    // Get noise values at 8 corners of cube
    const n000 = hash(fx, fy, fz);
    const n001 = hash(fx, fy, fz + 1);
    const n010 = hash(fx, fy + 1, fz);
    const n011 = hash(fx, fy + 1, fz + 1);
    const n100 = hash(fx + 1, fy, fz);
    const n101 = hash(fx + 1, fy, fz + 1);
    const n110 = hash(fx + 1, fy + 1, fz);
    const n111 = hash(fx + 1, fy + 1, fz + 1);
    
    // Trilinear interpolation
    const n00 = n000 * (1 - sx_smooth) + n100 * sx_smooth;
    const n01 = n001 * (1 - sx_smooth) + n101 * sx_smooth;
    const n10 = n010 * (1 - sx_smooth) + n110 * sx_smooth;
    const n11 = n011 * (1 - sx_smooth) + n111 * sx_smooth;
    
    const n0 = n00 * (1 - sy_smooth) + n10 * sy_smooth;
    const n1 = n01 * (1 - sy_smooth) + n11 * sy_smooth;
    
    const n = n0 * (1 - sz_smooth) + n1 * sz_smooth;
    
    // Normalize to 0-1 range
    return (n + 1) / 2;
}

/**
 * Apply random clusters pattern using Perlin-like noise
 * @param {Array} blocks - Array of block objects
 * @param {number} cellsX - Number of cells in X direction
 * @param {number} cellsY - Number of cells in Y direction
 * @param {number} cellsZ - Number of cells in Z direction
 * @returns {Array} Blocks with material assigned
 */
function applyRandomClustersPattern(blocks, cellsX, cellsY, cellsZ) {
    // Calculate model bounds for noise scaling
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    blocks.forEach(block => {
        minX = Math.min(minX, block.x);
        maxX = Math.max(maxX, block.x);
        minY = Math.min(minY, block.y);
        maxY = Math.max(maxY, block.y);
        minZ = Math.min(minZ, block.z);
        maxZ = Math.max(maxZ, block.z);
    });
    
    // Normalize coordinates to 0-1 range for noise
    const xRange = maxX - minX || 1;
    const yRange = maxY - minY || 1;
    const zRange = maxZ - minZ || 1;
    
    // Generate random seed offsets for this generation
    // This ensures different cluster patterns each time
    const seedOffsetX = Math.random() * 10000;
    const seedOffsetY = Math.random() * 10000;
    const seedOffsetZ = Math.random() * 10000;
    
    // Use multiple octaves for better cluster distribution
    // Base scale - creates larger clusters (lower = larger clusters)
    const baseScale = 2.0;
    // Detail scale - adds smaller variations
    const detailScale = 6.0;
    
    // Threshold for ore classification (0-1, higher = less ore, creates clusters)
    // Lower threshold to create more visible clusters
    const oreThreshold = 0.45;
    
    return blocks.map(block => {
        // Normalize block coordinates to 0-1 range
        const nx = (block.x - minX) / xRange;
        const ny = (block.y - minY) / yRange;
        const nz = (block.z - minZ) / zRange;
        
        // Add random seed offsets to sample different parts of noise space
        const noiseX = nx + seedOffsetX;
        const noiseY = ny + seedOffsetY;
        const noiseZ = nz + seedOffsetZ;
        
        // Get noise value using multiple octaves for better distribution
        const noise1 = simpleNoise3D(noiseX, noiseY, noiseZ, baseScale);
        const noise2 = simpleNoise3D(noiseX * 2.3, noiseY * 2.3, noiseZ * 2.3, detailScale) * 0.25; // Slightly different scale for detail
        const noiseValue = Math.min(1.0, Math.max(0.0, noise1 * 0.75 + noise2));
        
        // Determine rock type based on noise threshold
        let rockType;
        if (noiseValue > oreThreshold) {
            // High noise = ore cluster
            if (noiseValue > 0.7) {
                rockType = 'Ore_High';
            } else if (noiseValue > 0.55) {
                rockType = 'Ore_Med';
            } else {
                rockType = 'Ore_Low';
            }
        } else {
            rockType = 'Waste';
        }
        
        const material = MATERIALS[rockType];
        
        // Vary grades based on noise value for more realistic distribution
        const gradeVariation = 0.8 + (noiseValue * 0.4); // 0.8 to 1.2 multiplier
        
        return {
            ...block,
            rockType: rockType,
            density: material.density,
            gradeCu: material.gradeCu * gradeVariation,
            gradeAu: material.gradeAu * gradeVariation,
            econValue: material.econValue * gradeVariation,
            zone: material.zone
        };
    });
}

// ============================================================================
// Ore Body Generation Algorithms (from ORE_BODY_ALGORITHMS.md)
// ============================================================================

/**
 * Algorithm 1: Ellipsoid/Plunging Ore Body
 * Creates ellipsoidal ore bodies that can plunge at various angles
 * @param {Array} blocks - Array of block objects
 * @param {Object} params - Ore body parameters
 * @returns {Array} Blocks with grades assigned
 */
function generateEllipsoidOreBody(blocks, params = {}) {
    // Calculate model bounds for default center
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    blocks.forEach(block => {
        minX = Math.min(minX, block.x);
        maxX = Math.max(maxX, block.x);
        minY = Math.min(minY, block.y);
        maxY = Math.max(maxY, block.y);
        minZ = Math.min(minZ, block.z);
        maxZ = Math.max(maxZ, block.z);
    });
    
    // Default parameters
    const centerX = params.centerX !== undefined ? params.centerX : (minX + maxX) / 2;
    const centerY = params.centerY !== undefined ? params.centerY : (minY + maxY) / 2;
    const centerZ = params.centerZ !== undefined ? params.centerZ : (minZ + maxZ) / 2;
    const radiusX = params.radiusX !== undefined ? params.radiusX : (maxX - minX) * 0.2;
    const radiusY = params.radiusY !== undefined ? params.radiusY : (maxY - minY) * 0.2;
    const radiusZ = params.radiusZ !== undefined ? params.radiusZ : (maxZ - minZ) * 0.2;
    const plungeAngle = params.plungeAngle !== undefined ? params.plungeAngle * Math.PI / 180 : 0; // Convert to radians
    const plungeAzimuth = params.plungeAzimuth !== undefined ? params.plungeAzimuth * Math.PI / 180 : 0; // Convert to radians
    const maxGradeCu = params.maxGradeCu !== undefined ? params.maxGradeCu : 1.2;  // Typical porphyry: 0.3-1.5% Cu
    const maxGradeAu = params.maxGradeAu !== undefined ? params.maxGradeAu : 2.5;  // Typical porphyry: 0.5-5 g/t Au
    const gradeDecay = params.gradeDecay !== undefined ? params.gradeDecay : 0.3;
    const cuAuRatio = params.cuAuRatio !== undefined ? params.cuAuRatio : 50;  // Typical Cu:Au ratio for porphyry: 50:1 to 100:1
    const gradeVariation = params.gradeVariation !== undefined ? params.gradeVariation : 0.1;
    
    // Rotation matrix for plunge (simplified - rotation around Y axis then Z axis)
    const cosPlunge = Math.cos(plungeAngle);
    const sinPlunge = Math.sin(plungeAngle);
    const cosAzimuth = Math.cos(plungeAzimuth);
    const sinAzimuth = Math.sin(plungeAzimuth);
    
    return blocks.map(block => {
        // Translate to center
        let dx = block.x - centerX;
        let dy = block.y - centerY;
        let dz = block.z - centerZ;
        
        // Apply plunge rotation (simplified rotation)
        // First rotate around Z axis (azimuth)
        const dxRot = dx * cosAzimuth - dy * sinAzimuth;
        const dyRot = dx * sinAzimuth + dy * cosAzimuth;
        // Then rotate around rotated Y axis (plunge)
        const dxFinal = dxRot * cosPlunge - dz * sinPlunge;
        const dzFinal = dxRot * sinPlunge + dz * cosPlunge;
        
        // Calculate ellipsoid distance
        const ellipsoidDist = Math.sqrt(
            Math.pow(dxFinal / radiusX, 2) +
            Math.pow(dyRot / radiusY, 2) +
            Math.pow(dzFinal / radiusZ, 2)
        );
        
        // Calculate grade using exponential decay
        let gradeFactor = 0;
        if (ellipsoidDist < 1.0) {
            // Inside ellipsoid
            gradeFactor = Math.exp(-gradeDecay * ellipsoidDist * ellipsoidDist);
        }
        
        // Add spatial correlation using noise
        const noise = simpleNoise3D(
            block.x * 0.01,
            block.y * 0.01,
            block.z * 0.01,
            1.0
        );
        const spatialVariation = 1.0 + (noise - 0.5) * gradeVariation;
        
        // Calculate grades
        let gradeCu = maxGradeCu * gradeFactor * spatialVariation;
        let gradeAu = maxGradeAu * gradeFactor * spatialVariation;
        
        // Apply Cu:Au ratio
        if (cuAuRatio > 0) {
            gradeAu = gradeCu / cuAuRatio;
        }
        
        // Ensure minimum thresholds (economic cutoff: 0.3% Cu or 0.5 g/t Au)
        if (gradeCu < 0.3 && gradeAu < 0.5) {
            gradeCu = Math.max(0, gradeCu * 0.1);  // Reduce to background levels
            gradeAu = Math.max(0, gradeAu * 0.1);
        }
        
        // Update rock type based on grades (realistic cutoffs)
        let rockType = block.rockType || 'Waste';
        if (gradeCu >= 1.0 || gradeAu >= 2.5) {
            rockType = 'Ore_High';
        } else if (gradeCu >= 0.5 || gradeAu >= 1.0) {
            rockType = 'Ore_Med';
        } else if (gradeCu >= 0.3 || gradeAu >= 0.5) {
            rockType = 'Ore_Low';
        } else {
            rockType = 'Waste';
        }
        
        return {
            ...block,
            rockType: rockType,
            gradeCu: Math.max(0, gradeCu),
            gradeAu: Math.max(0, gradeAu),
            density: block.density || 2.5,
            econValue: block.econValue || (gradeCu * 20 + gradeAu * 50) // Simple value calculation
        };
    });
}

/**
 * Algorithm 2: Vein/Structural Control
 * Creates linear or planar ore bodies following structural controls
 * @param {Array} blocks - Array of block objects
 * @param {Object} params - Vein parameters
 * @returns {Array} Blocks with grades assigned
 */
function generateVeinOreBody(blocks, params = {}) {
    // Calculate model bounds for default vein position
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    blocks.forEach(block => {
        minX = Math.min(minX, block.x);
        maxX = Math.max(maxX, block.x);
        minY = Math.min(minY, block.y);
        maxY = Math.max(maxY, block.y);
        minZ = Math.min(minZ, block.z);
        maxZ = Math.max(maxZ, block.z);
    });
    
    // Default parameters
    const strike = params.strike !== undefined ? params.strike * Math.PI / 180 : Math.PI / 4; // 45 degrees
    const dip = params.dip !== undefined ? params.dip * Math.PI / 180 : Math.PI / 4; // 45 degrees
    const dipDirection = params.dipDirection !== undefined ? params.dipDirection * Math.PI / 180 : Math.PI / 2; // 90 degrees
    const veinX = params.veinX !== undefined ? params.veinX : (minX + maxX) / 2;
    const veinY = params.veinY !== undefined ? params.veinY : (minY + maxY) / 2;
    const veinZ = params.veinZ !== undefined ? params.veinZ : (minZ + maxZ) / 2;
    const strikeLength = params.strikeLength !== undefined ? params.strikeLength : (maxX - minX) * 0.8;
    const dipLength = params.dipLength !== undefined ? params.dipLength : (maxZ - minZ) * 0.8;
    const width = params.width !== undefined ? params.width : Math.min(maxX - minX, maxY - minY) * 0.05;
    const maxGradeCu = params.maxGradeCu !== undefined ? params.maxGradeCu : 1.2;  // Typical porphyry: 0.3-1.5% Cu
    const maxGradeAu = params.maxGradeAu !== undefined ? params.maxGradeAu : 2.5;  // Typical porphyry: 0.5-5 g/t Au
    const numVeins = params.numVeins !== undefined ? params.numVeins : 1;
    const veinSpacing = params.veinSpacing !== undefined ? params.veinSpacing : width * 3;
    
    // Calculate plane normal vector from strike and dip
    // Strike is direction along the plane, dip is angle down from horizontal
    const strikeX = Math.cos(strike);
    const strikeY = Math.sin(strike);
    const dipX = Math.cos(dipDirection) * Math.sin(dip);
    const dipY = Math.sin(dipDirection) * Math.sin(dip);
    const dipZ = Math.cos(dip);
    
    // Normal vector (perpendicular to plane)
    const nx = strikeY * dipZ - strikeX * dipY;
    const ny = strikeX * dipX - strikeY * dipZ;
    const nz = strikeX * dipY - strikeY * dipX;
    const norm = Math.sqrt(nx * nx + ny * ny + nz * nz);
    const nNormX = nx / norm;
    const nNormY = ny / norm;
    const nNormZ = nz / norm;
    
    // Plane equation: ax + by + cz + d = 0
    // d = -(ax0 + by0 + cz0) where (x0, y0, z0) is a point on the plane
    const d = -(nNormX * veinX + nNormY * veinY + nNormZ * veinZ);
    
    return blocks.map(block => {
        let totalGradeCu = 0;
        let totalGradeAu = 0;
        let maxGradeFactor = 0;
        
        // Handle multiple veins
        for (let v = 0; v < numVeins; v++) {
            // Offset vein position for multiple veins
            const offset = (v - (numVeins - 1) / 2) * veinSpacing;
            const offsetX = offset * Math.cos(strike + Math.PI / 2);
            const offsetY = offset * Math.sin(strike + Math.PI / 2);
            
            const currentVeinX = veinX + offsetX;
            const currentVeinY = veinY + offsetY;
            
            // Calculate distance from block to plane
            const distance = Math.abs(
                nNormX * block.x + nNormY * block.y + nNormZ * block.z + d
            );
            
            // Project block onto plane to find strike/dip coordinates
            const toBlockX = block.x - currentVeinX;
            const toBlockY = block.y - currentVeinY;
            const toBlockZ = block.z - veinZ;
            
            const alongStrike = toBlockX * strikeX + toBlockY * strikeY;
            const downDip = toBlockX * dipX + toBlockY * dipY + toBlockZ * dipZ;
            
            // Check if within vein bounds
            const withinStrike = Math.abs(alongStrike) < strikeLength / 2;
            const withinDip = Math.abs(downDip) < dipLength / 2;
            const withinWidth = distance < width;
            
            if (withinStrike && withinDip && withinWidth) {
                // Calculate grade based on distance from vein center
                const normalizedDist = distance / width;
                const gradeFactor = Math.exp(-2 * normalizedDist * normalizedDist); // Gaussian decay
                
                // Grade variation along strike and dip (optional)
                const strikeFactor = 1.0; // Can be customized
                const dipFactor = 1.0; // Can be customized
                
                const localGradeFactor = gradeFactor * strikeFactor * dipFactor;
                maxGradeFactor = Math.max(maxGradeFactor, localGradeFactor);
            }
        }
        
        // Add spatial noise for variation
        const noise = simpleNoise3D(
            block.x * 0.02,
            block.y * 0.02,
            block.z * 0.02,
            1.0
        );
        const spatialVariation = 0.9 + (noise - 0.5) * 0.2;
        
        // Calculate grades
        let gradeCu = maxGradeCu * maxGradeFactor * spatialVariation;
        let gradeAu = maxGradeAu * maxGradeFactor * spatialVariation;
        
        // Ensure minimum thresholds (economic cutoff: 0.3% Cu or 0.5 g/t Au)
        if (gradeCu < 0.3 && gradeAu < 0.5) {
            gradeCu = Math.max(0, gradeCu * 0.1);  // Reduce to background levels
            gradeAu = Math.max(0, gradeAu * 0.1);
        }
        
        // Update rock type based on grades (realistic cutoffs)
        let rockType = block.rockType || 'Waste';
        if (gradeCu >= 1.0 || gradeAu >= 2.5) {
            rockType = 'Ore_High';
        } else if (gradeCu >= 0.5 || gradeAu >= 1.0) {
            rockType = 'Ore_Med';
        } else if (gradeCu >= 0.3 || gradeAu >= 0.5) {
            rockType = 'Ore_Low';
        } else {
            rockType = 'Waste';
        }
        
        return {
            ...block,
            rockType: rockType,
            gradeCu: Math.max(0, gradeCu),
            gradeAu: Math.max(0, gradeAu),
            density: block.density || 2.5,
            econValue: block.econValue || (gradeCu * 20 + gradeAu * 50)
        };
    });
}

/**
 * Algorithm 3: Porphyry-Style Zoning
 * Creates zoned ore bodies with concentric zones of different grades
 * @param {Array} blocks - Array of block objects
 * @param {Object} params - Zoning parameters
 * @returns {Array} Blocks with grades assigned
 */
function generatePorphyryOreBody(blocks, params = {}) {
    // Calculate model bounds for default center
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    blocks.forEach(block => {
        minX = Math.min(minX, block.x);
        maxX = Math.max(maxX, block.x);
        minY = Math.min(minY, block.y);
        maxY = Math.max(maxY, block.y);
        minZ = Math.min(minZ, block.z);
        maxZ = Math.max(maxZ, block.z);
    });
    
    // Default parameters
    const centerX = params.centerX !== undefined ? params.centerX : (minX + maxX) / 2;
    const centerY = params.centerY !== undefined ? params.centerY : (minY + maxY) / 2;
    const centerZ = params.centerZ !== undefined ? params.centerZ : (minZ + maxZ) / 2;
    const coreRadius = params.coreRadius !== undefined ? params.coreRadius : (maxX - minX) * 0.15;
    const shellRadius = params.shellRadius !== undefined ? params.shellRadius : (maxX - minX) * 0.3;
    const haloRadius = params.haloRadius !== undefined ? params.haloRadius : (maxX - minX) * 0.5;
    const coreGradeCu = params.coreGradeCu !== undefined ? params.coreGradeCu : 1.2;  // High-grade core: 1.0-1.5% Cu
    const coreGradeAu = params.coreGradeAu !== undefined ? params.coreGradeAu : 3.0;  // High-grade core: 2.5-5.0 g/t Au
    const shellGradeCu = params.shellGradeCu !== undefined ? params.shellGradeCu : 0.6;  // Medium-grade shell: 0.5-0.8% Cu
    const shellGradeAu = params.shellGradeAu !== undefined ? params.shellGradeAu : 1.5;  // Medium-grade shell: 1.0-2.0 g/t Au
    const haloGradeCu = params.haloGradeCu !== undefined ? params.haloGradeCu : 0.3;  // Low-grade halo: 0.3-0.5% Cu (cutoff)
    const haloGradeAu = params.haloGradeAu !== undefined ? params.haloGradeAu : 0.6;  // Low-grade halo: 0.5-1.0 g/t Au
    const verticalGradient = params.verticalGradient !== undefined ? params.verticalGradient : 0.1;
    const horizontalGradient = params.horizontalGradient !== undefined ? params.horizontalGradient : 0.5;
    const enrichmentDepth = params.enrichmentDepth !== undefined ? params.enrichmentDepth : 100;
    const enrichmentFactor = params.enrichmentFactor !== undefined ? params.enrichmentFactor : 2.0;
    const zoneTransition = params.zoneTransition !== undefined ? params.zoneTransition : 0.2;
    const localVariation = params.localVariation !== undefined ? params.localVariation : 0.15;
    
    // Find ground surface (maxZ is typically closest to 0)
    const groundSurface = maxZ;
    
    return blocks.map(block => {
        // Calculate 3D distance from center
        const dx = block.x - centerX;
        const dy = block.y - centerY;
        const dz = block.z - centerZ;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // Determine zone
        let baseGradeCu, baseGradeAu;
        let zone = 'Waste';
        
        if (distance < coreRadius) {
            baseGradeCu = coreGradeCu;
            baseGradeAu = coreGradeAu;
            zone = 'Core';
        } else if (distance < shellRadius) {
            // Smooth transition from core to shell
            const t = (distance - coreRadius) / (shellRadius - coreRadius);
            const smoothT = t * t * (3 - 2 * t); // Smooth step
            baseGradeCu = coreGradeCu * (1 - smoothT) + shellGradeCu * smoothT;
            baseGradeAu = coreGradeAu * (1 - smoothT) + shellGradeAu * smoothT;
            zone = 'Shell';
        } else if (distance < haloRadius) {
            // Smooth transition from shell to halo
            const t = (distance - shellRadius) / (haloRadius - shellRadius);
            const smoothT = t * t * (3 - 2 * t);
            baseGradeCu = shellGradeCu * (1 - smoothT) + haloGradeCu * smoothT;
            baseGradeAu = shellGradeAu * (1 - smoothT) + haloGradeAu * smoothT;
            zone = 'Halo';
        } else {
            baseGradeCu = 0;
            baseGradeAu = 0;
            zone = 'Waste';
        }
        
        // Apply horizontal gradient (distance from center within zone)
        let horizontalFactor = 1.0;
        if (distance > 0) {
            const normalizedDist = Math.min(1.0, distance / haloRadius);
            horizontalFactor = 1.0 - (normalizedDist * horizontalGradient);
        }
        
        // Apply vertical gradient (depth-related)
        const depth = groundSurface - block.z; // Positive = deeper
        const verticalFactor = 1.0 + (depth / 1000) * verticalGradient; // Increase with depth
        
        // Apply supergene enrichment
        let enrichmentMultiplier = 1.0;
        if (depth < enrichmentDepth && depth > 0) {
            // Enrichment zone near surface
            const enrichmentT = depth / enrichmentDepth;
            enrichmentMultiplier = 1.0 + (enrichmentFactor - 1.0) * (1.0 - enrichmentT);
        }
        
        // Add local variation (noise)
        const noise = simpleNoise3D(
            block.x * 0.015,
            block.y * 0.015,
            block.z * 0.015,
            1.0
        );
        const variationFactor = 1.0 + (noise - 0.5) * localVariation;
        
        // Calculate final grades
        let gradeCu = baseGradeCu * horizontalFactor * verticalFactor * enrichmentMultiplier * variationFactor;
        let gradeAu = baseGradeAu * horizontalFactor * verticalFactor * enrichmentMultiplier * variationFactor;
        
        // Ensure minimum thresholds (economic cutoff: 0.3% Cu or 0.5 g/t Au)
        if (gradeCu < 0.3 && gradeAu < 0.5) {
            gradeCu = Math.max(0, gradeCu * 0.1);  // Reduce to background levels
            gradeAu = Math.max(0, gradeAu * 0.1);
            zone = 'Waste';
        }
        
        // Update rock type based on grades (realistic cutoffs)
        let rockType = block.rockType || 'Waste';
        if (gradeCu >= 1.0 || gradeAu >= 2.5) {
            rockType = 'Ore_High';
        } else if (gradeCu >= 0.5 || gradeAu >= 1.0) {
            rockType = 'Ore_Med';
        } else if (gradeCu >= 0.3 || gradeAu >= 0.5) {
            rockType = 'Ore_Low';
        } else {
            rockType = 'Waste';
        }
        
        return {
            ...block,
            rockType: rockType,
            gradeCu: Math.max(0, gradeCu),
            gradeAu: Math.max(0, gradeAu),
            density: block.density || 2.5,
            econValue: block.econValue || (gradeCu * 20 + gradeAu * 50),
            zone: zone !== 'Waste' ? zone : block.zone
        };
    });
}

/**
 * Apply material pattern to blocks
 * @param {Array} blocks - Array of block objects
 * @param {string} patternType - Type of pattern to apply
 * @param {number} cellsX - Number of cells in X direction
 * @param {number} cellsY - Number of cells in Y direction
 * @param {number} cellsZ - Number of cells in Z direction
 * @returns {Array} Blocks with material assigned
 */
function applyMaterialPattern(blocks, patternType, cellsX, cellsY, cellsZ) {
    switch (patternType) {
        case 'uniform':
            return applyUniformPattern(blocks);
        case 'layered':
            return applyLayeredPattern(blocks, cellsX, cellsY, cellsZ);
        case 'gradient':
            return applyGradientPattern(blocks, cellsX, cellsY, cellsZ);
        case 'checkerboard':
            return applyCheckerboardPattern(blocks);
        case 'random':
            return applyRandomPattern(blocks);
        case 'ore_horizon':
            return applyOreHorizonPattern(blocks, cellsX, cellsY, cellsZ);
        case 'inclined_vein':
            return applyInclinedVeinPattern(blocks, cellsX, cellsY, cellsZ);
        case 'random_clusters':
            return applyRandomClustersPattern(blocks, cellsX, cellsY, cellsZ);
        case 'ellipsoid_ore':
            return generateEllipsoidOreBody(blocks);
        case 'vein_ore':
            return generateVeinOreBody(blocks);
        case 'porphyry_ore':
            return generatePorphyryOreBody(blocks);
        default:
            return applyUniformPattern(blocks);
    }
}

// ============================================================================
// Legacy Compatibility Functions
// ============================================================================

/**
 * Legacy function: Generate a regular grid of block objects
 * @deprecated Use generateRegularGrid() with standard format instead
 */
function generateBlockGrid(originX, originY, originZ, cellSizeX, cellSizeY, cellSizeZ, cellsX, cellsY, cellsZ) {
    const params = {
        xmOrig: originX,
        ymOrig: originY,
        zmOrig: originZ,
        xInc: cellSizeX,
        yInc: cellSizeY,
        zInc: cellSizeZ,
        nx: cellsX,
        ny: cellsY,
        nz: cellsZ
    };
    return generateRegularGrid(params);
}

/**
 * Legacy function: Export blocks to CSV format
 * @deprecated Use blocksToCsv() with standard format instead
 */
function exportBlocksToCSV(blocks) {
    // Convert legacy blocks to standard format if needed
    const standardBlocks = blocks.map(block => {
        if (block.material) {
            return convertLegacyBlock(block);
        }
        return block;
    });
    
    return blocksToCsv(standardBlocks, {
        includeIndices: false,
        includeZone: true,
        includeGrades: true,
        includeEconValue: true,
        filterAirBlocks: true
    });
}

/**
 * Get material color for visualization
 * @param {string} rockTypeOrMaterial - Rock type or material name
 * @returns {number} Hex color value
 */
function getMaterialColor(rockTypeOrMaterial) {
    // Support both legacy 'material' and standard 'rockType'
    return MATERIALS[rockTypeOrMaterial]?.color || 0x808080;
}
