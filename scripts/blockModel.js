/**
 * Block Model Generator
 * Generates regular grid of blocks with material patterns
 * Integrated with standardized block model schema (blockModelStandard.js)
 * 
 * @license MIT License
 * @copyright Copyright (c) 2026 BuildIT Design Labs, LLC
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
    
    // Build CSV content using chunked approach to avoid string length limits
    // JavaScript strings have a maximum length of ~2^28-1 characters
    // For very large models, we need to build the CSV in chunks
    const MAX_CHUNK_SIZE = 100000; // Process 100K blocks at a time
    const headerRow = headers.join(',');
    const chunks = [headerRow];
    
    // Process blocks in chunks to avoid memory issues
    for (let i = 0; i < filteredBlocks.length; i += MAX_CHUNK_SIZE) {
        const chunk = filteredBlocks.slice(i, i + MAX_CHUNK_SIZE);
        const chunkRows = chunk.map(block => {
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
        
        chunks.push(chunkRows.join('\n'));
    }
    
    // Combine all chunks
    return chunks.join('\n');
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
        econValue: -15.0  // Negative value represents mining/haulage/disposal costs (typically -10 to -30 per tonne)
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
    },
    // Salt Dome / Petroleum Geology Materials
    'Salt': {
        color: 0xffffff,  // White for salt
        density: 2.2,
        gradeCu: 0,      // No oil/gas in salt
        gradeAu: 0,
        econValue: -10.0
    },
    'CapRock': {
        color: 0x8b7355,  // Brown/tan for cap rock
        density: 2.6,
        gradeCu: 0,
        gradeAu: 0,
        econValue: -10.0
    },
    'OilSand': {
        color: 0x000000,  // Black for oil sand
        density: 2.2,
        gradeCu: 70.0,    // Oil saturation (%)
        gradeAu: 5.0,     // Gas saturation (%)
        econValue: 50.0
    },
    'GasSand': {
        color: 0x00ffff,  // Cyan for gas sand
        density: 2.1,
        gradeCu: 0,       // Oil saturation (%)
        gradeAu: 75.0,    // Gas saturation (%)
        econValue: 30.0
    },
    'WaterSand': {
        color: 0x0066cc,  // Blue for water sand
        density: 2.3,
        gradeCu: 0,
        gradeAu: 0,
        econValue: -5.0
    },
    'Shale': {
        color: 0x4a4a4a,  // Dark gray for shale
        density: 2.4,
        gradeCu: 0,
        gradeAu: 0,
        econValue: -10.0
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
    // Calculate model bounds to work in coordinate space
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
    
    const modelSizeX = maxX - minX;
    const modelSizeY = maxY - minY;
    const modelSizeZ = maxZ - minZ;
    const modelCenterX = (minX + maxX) / 2;
    const modelCenterY = (minY + maxY) / 2;
    const modelCenterZ = (minZ + maxZ) / 2;
    
    // Add time-based random component for variation between generations
    const timeSeed = Date.now() % 1000000;
    const randomComponent = Math.random() * 10000;
    
    // Randomization helper function
    const rand = (seed, min, max) => {
        const combinedSeed = (seed * 9301 + 49297 + timeSeed + randomComponent) % 233280;
        const hash = combinedSeed / 233280;
        return min + hash * (max - min);
    };
    
    // Seeds for randomization
    const seed1 = (Math.floor((minX + minY) * 100) + timeSeed) % 10000;
    const seed2 = (Math.floor((minY + minZ) * 100) + timeSeed * 3) % 10000;
    const seed3 = (Math.floor((minZ + minX) * 100) + timeSeed * 7) % 10000;
    
    // Randomize center position (offset from model center by up to 20% of model size)
    const centerOffsetX = rand(seed1, -0.2, 0.2) * modelSizeX;
    const centerOffsetY = rand(seed2, -0.2, 0.2) * modelSizeY;
    const centerOffsetZ = rand(seed3, -0.2, 0.2) * modelSizeZ;
    
    const centerX = modelCenterX + centerOffsetX;
    const centerY = modelCenterY + centerOffsetY;
    const centerZ = modelCenterZ + centerOffsetZ;
    
    // Randomize gradient direction (which axis has more influence)
    const gradientDirX = rand(seed1 * 2, 0.5, 1.5);
    const gradientDirY = rand(seed2 * 2, 0.5, 1.5);
    const gradientDirZ = rand(seed3 * 2, 0.5, 1.5);
    
    // Randomize thresholds for different rock types
    const thresholdHigh = rand(seed1 * 3, 0.25, 0.35);  // 0.25-0.35
    const thresholdMed = rand(seed2 * 3, 0.55, 0.65);  // 0.55-0.65
    const thresholdLow = rand(seed3 * 3, 0.75, 0.85);  // 0.75-0.85
    
    return blocks.map(block => {
        // Calculate weighted distance from randomized center using COORDINATES (not indices)
        const distX = Math.abs(block.x - centerX) / (modelSizeX / 2) * gradientDirX;
        const distY = Math.abs(block.y - centerY) / (modelSizeY / 2) * gradientDirY;
        const distZ = Math.abs(block.z - centerZ) / (modelSizeZ / 2) * gradientDirZ;
        
        const distance = Math.sqrt(distX * distX + distY * distY + distZ * distZ);
        const normalizedDist = Math.min(distance, 1.0);
        
        let rockType;
        if (normalizedDist < thresholdHigh) {
            rockType = 'Ore_High';
        } else if (normalizedDist < thresholdMed) {
            rockType = 'Ore_Med';
        } else if (normalizedDist < thresholdLow) {
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
    
    const modelSizeX = maxX - minX;
    const modelSizeY = maxY - minY;
    const modelSizeZ = maxZ - minZ;
    
    // Add time-based random component for variation between generations
    const timeSeed = Date.now() % 1000000;
    const randomComponent = Math.random() * 10000;
    
    // Randomization helper function
    const rand = (seed, min, max) => {
        const combinedSeed = (seed * 9301 + 49297 + timeSeed + randomComponent) % 233280;
        const hash = combinedSeed / 233280;
        return min + hash * (max - min);
    };
    
    // Seeds for randomization
    const seed1 = (Math.floor((minX + minY) * 100) + timeSeed) % 10000;
    const seed2 = (Math.floor((minY + minZ) * 100) + timeSeed * 3) % 10000;
    const seed3 = (Math.floor((minZ + minX) * 100) + timeSeed * 7) % 10000;
    
    // Randomize plane center position (offset from model center by up to 30%)
    const centerOffsetX = rand(seed1, -0.3, 0.3);
    const centerOffsetY = rand(seed2, -0.3, 0.3);
    const centerOffsetZ = rand(seed3, -0.3, 0.3);
    
    const centerX = (minX + maxX) / 2 + centerOffsetX * modelSizeX;
    const centerY = (minY + maxY) / 2 + centerOffsetY * modelSizeY;
    const centerZ = (minZ + maxZ) / 2 + centerOffsetZ * modelSizeZ;
    
    // Randomize strike angle (0-360 degrees, full rotation)
    const randomStrikeAngle = rand(seed1 * 2, 0, 360) * Math.PI / 180;
    
    // Randomize dip angle (30-75 degrees, typical for vein deposits)
    const randomDipAngle = rand(seed2 * 2, 30, 75) * Math.PI / 180;
    
    // Normal vector for plane using randomized strike and dip
    const nx = Math.sin(randomStrikeAngle) * Math.sin(randomDipAngle);
    const ny = -Math.cos(randomStrikeAngle) * Math.sin(randomDipAngle);
    const nz = Math.cos(randomDipAngle);
    
    // Normalize the normal vector
    const norm = Math.sqrt(nx * nx + ny * ny + nz * nz);
    const nNormX = nx / norm;
    const nNormY = ny / norm;
    const nNormZ = nz / norm;
    
    // Calculate d: d = -(ax0 + by0 + cz0) where (x0, y0, z0) is a point on the plane
    const d = -(nNormX * centerX + nNormY * centerY + nNormZ * centerZ);
    
    // Randomize vein thickness (1.5-3.5 cell widths)
    const avgCellSize = ((maxX - minX) / cellsX + (maxY - minY) / cellsY + (maxZ - minZ) / cellsZ) / 3;
    const veinThickness = avgCellSize * rand(seed3, 1.5, 3.5);
    
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
    
    const modelSizeX = maxX - minX;
    const modelSizeY = maxY - minY;
    const modelSizeZ = maxZ - minZ;
    
    // Calculate average cell size from blocks (for scaling minimum sizes)
    // Find adjacent blocks to estimate cell size
    let avgCellSizeX = modelSizeX / 100; // Default fallback
    let avgCellSizeY = modelSizeY / 100;
    let avgCellSizeZ = modelSizeZ / 100;
    
    // Try to find actual cell size from block spacing
    if (blocks.length > 1) {
        // Sort blocks by x, y, z to find adjacent blocks
        const sortedByX = [...blocks].sort((a, b) => a.x - b.x);
        const sortedByY = [...blocks].sort((a, b) => a.y - b.y);
        const sortedByZ = [...blocks].sort((a, b) => a.z - b.z);
        
        // Find minimum non-zero differences (cell sizes)
        let minDiffX = Infinity, minDiffY = Infinity, minDiffZ = Infinity;
        for (let i = 1; i < Math.min(100, sortedByX.length); i++) {
            const diff = Math.abs(sortedByX[i].x - sortedByX[i-1].x);
            if (diff > 0.0001 && diff < minDiffX) minDiffX = diff;
        }
        for (let i = 1; i < Math.min(100, sortedByY.length); i++) {
            const diff = Math.abs(sortedByY[i].y - sortedByY[i-1].y);
            if (diff > 0.0001 && diff < minDiffY) minDiffY = diff;
        }
        for (let i = 1; i < Math.min(100, sortedByZ.length); i++) {
            const diff = Math.abs(sortedByZ[i].z - sortedByZ[i-1].z);
            if (diff > 0.0001 && diff < minDiffZ) minDiffZ = diff;
        }
        
        if (minDiffX < Infinity) avgCellSizeX = minDiffX;
        if (minDiffY < Infinity) avgCellSizeY = minDiffY;
        if (minDiffZ < Infinity) avgCellSizeZ = minDiffZ;
    }
    
    const avgCellSize = (avgCellSizeX + avgCellSizeY + avgCellSizeZ) / 3;
    
    // Add time-based random component for variation between generations
    const timeSeed = Date.now() % 1000000;
    const randomComponent = Math.random() * 10000;
    
    // Randomization helper function
    const rand = (seed, min, max) => {
        const combinedSeed = (seed * 9301 + 49297 + timeSeed + randomComponent) % 233280;
        const hash = combinedSeed / 233280;
        return min + hash * (max - min);
    };
    
    // Seeds for randomization
    const seed1 = (Math.floor((minX + minY) * 100) + timeSeed) % 10000;
    const seed2 = (Math.floor((minY + minZ) * 100) + timeSeed * 3) % 10000;
    const seed3 = (Math.floor((minZ + minX) * 100) + timeSeed * 7) % 10000;
    
    // Randomize center position (40-60% of range to keep it near center but varied)
    const randomCenterX = params.centerX !== undefined ? params.centerX : 
        minX + modelSizeX * (0.4 + rand(seed1, 0, 0.2));
    const randomCenterY = params.centerY !== undefined ? params.centerY : 
        minY + modelSizeY * (0.4 + rand(seed2, 0, 0.2));
    const randomCenterZ = params.centerZ !== undefined ? params.centerZ : 
        minZ + modelSizeZ * (0.4 + rand(seed3, 0, 0.2));
    
    // Randomize radii (15-25% of model size for each axis)
    const randomRadiusX = params.radiusX !== undefined ? params.radiusX : 
        modelSizeX * rand(seed1 * 2, 0.15, 0.25);
    const randomRadiusY = params.radiusY !== undefined ? params.radiusY : 
        modelSizeY * rand(seed2 * 2, 0.15, 0.25);
    const randomRadiusZ = params.radiusZ !== undefined ? params.radiusZ : 
        modelSizeZ * rand(seed3 * 2, 0.15, 0.25);
    
    // Randomize plunge angle (0-60 degrees) and azimuth (0-360 degrees)
    const randomPlungeAngle = params.plungeAngle !== undefined ? params.plungeAngle : 
        rand(seed1 * 5, 0, 60);
    const randomPlungeAzimuth = params.plungeAzimuth !== undefined ? params.plungeAzimuth : 
        rand(seed2 * 5, 0, 360);
    
    // Randomize grades (typical ranges for massive sulfide/skarn deposits)
    const randomMaxGradeCu = params.maxGradeCu !== undefined ? params.maxGradeCu : 
        rand(seed1 * 7, 0.8, 1.8);  // 0.8-1.8% Cu
    const randomMaxGradeAu = params.maxGradeAu !== undefined ? params.maxGradeAu : 
        rand(seed2 * 7, 1.5, 4.0);  // 1.5-4.0 g/t Au
    
    // Randomize grade decay (0.2-0.5, lower = sharper falloff)
    const randomGradeDecay = params.gradeDecay !== undefined ? params.gradeDecay : 
        rand(seed3, 0.2, 0.5);
    
    // Randomize Cu:Au ratio (30:1 to 80:1)
    const randomCuAuRatio = params.cuAuRatio !== undefined ? params.cuAuRatio : 
        rand(seed1 * 11, 30, 80);
    
    // Randomize grade variation (0.05-0.15)
    const randomGradeVariation = params.gradeVariation !== undefined ? params.gradeVariation : 
        rand(seed2 * 11, 0.05, 0.15);
    
    // Default parameters (now randomized)
    const centerX = randomCenterX;
    const centerY = randomCenterY;
    const centerZ = randomCenterZ;
    const radiusX = randomRadiusX;
    const radiusY = randomRadiusY;
    const radiusZ = randomRadiusZ;
    const plungeAngle = randomPlungeAngle * Math.PI / 180; // Convert to radians
    const plungeAzimuth = randomPlungeAzimuth * Math.PI / 180; // Convert to radians
    const maxGradeCu = randomMaxGradeCu;
    const maxGradeAu = randomMaxGradeAu;
    const gradeDecay = randomGradeDecay;
    const cuAuRatio = randomCuAuRatio;
    const gradeVariation = randomGradeVariation;
    
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
        
        // Add spatial correlation using noise (scale adapts to model size)
        // Noise scale should be inversely proportional to model size
        // For a 100-unit model, use ~0.01; for 1000-unit model, use ~0.001
        const noiseScale = 1.0 / Math.max(modelSizeX, modelSizeY, modelSizeZ, 1.0);
        const noise = simpleNoise3D(
            block.x * noiseScale,
            block.y * noiseScale,
            block.z * noiseScale,
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
        
        // Calculate economic value: positive for ore (revenue - costs), negative for waste (costs only)
        let econValue;
        if (rockType === 'Waste') {
            econValue = -15.0; // Waste mining/haulage/disposal costs (typically -10 to -30 per tonne)
        } else {
            // Ore value: revenue from metals minus processing costs
            // Simplified: (Cu% * price_factor + Au_g/t * price_factor) - processing_cost
            econValue = (gradeCu * 20 + gradeAu * 50) - 10; // Revenue minus processing cost
        }
        
        return {
            ...block,
            rockType: rockType,
            gradeCu: Math.max(0, gradeCu),
            gradeAu: Math.max(0, gradeAu),
            density: block.density || 2.5,
            econValue: block.econValue !== undefined ? block.econValue : econValue
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
    
    const modelSizeX = maxX - minX;
    const modelSizeY = maxY - minY;
    const modelSizeZ = maxZ - minZ;
    
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
        
        // Add spatial noise for variation (scale adapts to model size)
        const veinNoiseScale = 2.0 / Math.max(modelSizeX, modelSizeY, modelSizeZ, 1.0);
        const noise = simpleNoise3D(
            block.x * veinNoiseScale,
            block.y * veinNoiseScale,
            block.z * veinNoiseScale,
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
        
        // Calculate economic value: positive for ore (revenue - costs), negative for waste (costs only)
        let econValue;
        if (rockType === 'Waste') {
            econValue = -15.0; // Waste mining/haulage/disposal costs (typically -10 to -30 per tonne)
        } else {
            // Ore value: revenue from metals minus processing costs
            econValue = (gradeCu * 20 + gradeAu * 50) - 10; // Revenue minus processing cost
        }
        
        return {
            ...block,
            rockType: rockType,
            gradeCu: Math.max(0, gradeCu),
            gradeAu: Math.max(0, gradeAu),
            density: block.density || 2.5,
            econValue: block.econValue !== undefined ? block.econValue : econValue
        };
    });
}

/**
 * Algorithm 3: Porphyry-Style Zoning (Improved)
 * Creates realistic zoned ore bodies with ellipsoidal shapes, irregular boundaries, and structural controls
 * Based on real porphyry deposit characteristics:
 * - Ellipsoidal (not spherical) zones with different X/Y/Z radii
 * - Irregular boundaries with natural variation
 * - Vertical zonation patterns (core more vertical, halo more horizontal)
 * - Structural controls (faults/fractures modify pattern)
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
    
    const modelSizeX = maxX - minX;
    const modelSizeY = maxY - minY;
    const modelSizeZ = maxZ - minZ;
    
    // Add time-based random component to ensure variation between generations
    // This makes each Generate button press produce a different ore body
    const timeSeed = Date.now() % 1000000; // Use timestamp for variation
    const randomComponent = Math.random() * 10000; // Additional random component
    
    // Randomize center position if not provided (closer to center but still randomized)
    // Combine model bounds with time-based seed for variation
    const centerSeed = ((minX + minY + minZ) * 100 + timeSeed + randomComponent) % 10000;
    // Randomize within 40-60% of range (closer to center) to ensure body stays within bounds
    const randomCenterX = minX + (maxX - minX) * (0.4 + (centerSeed % 20) / 100); // 40-60% of range
    const randomCenterY = minY + (maxY - minY) * (0.4 + ((centerSeed * 7) % 20) / 100);
    const randomCenterZ = minZ + (maxZ - minZ) * (0.35 + ((centerSeed * 13) % 30) / 100); // 35-65% of range (slightly more vertical variation)
    
    // Default parameters with randomization
    const centerX = params.centerX !== undefined ? params.centerX : randomCenterX;
    const centerY = params.centerY !== undefined ? params.centerY : randomCenterY;
    const centerZ = params.centerZ !== undefined ? params.centerZ : randomCenterZ;
    
    // Randomization helper function (now includes time-based variation)
    const rand = (seed, min, max) => {
        // Combine seed with time-based component for variation
        const combinedSeed = (seed * 9301 + 49297 + timeSeed + randomComponent) % 233280;
        const hash = combinedSeed / 233280;
        return min + hash * (max - min);
    };
    
    // Seeds now include time-based component for variation
    const seed1 = (Math.floor((minX + minY) * 100) + timeSeed) % 10000;
    const seed2 = (Math.floor((minY + minZ) * 100) + timeSeed * 3) % 10000;
    const seed3 = (Math.floor((minZ + minX) * 100) + timeSeed * 7) % 10000;
    
    // Calculate average cell size from blocks (for scaling minimum sizes)
    let avgCellSizeX = modelSizeX / 100; // Default fallback
    let avgCellSizeY = modelSizeY / 100;
    let avgCellSizeZ = modelSizeZ / 100;
    
    // Try to find actual cell size from block spacing
    if (blocks.length > 1) {
        const sortedByX = [...blocks].sort((a, b) => a.x - b.x);
        const sortedByY = [...blocks].sort((a, b) => a.y - b.y);
        const sortedByZ = [...blocks].sort((a, b) => a.z - b.z);
        
        let minDiffX = Infinity, minDiffY = Infinity, minDiffZ = Infinity;
        for (let i = 1; i < Math.min(100, sortedByX.length); i++) {
            const diff = Math.abs(sortedByX[i].x - sortedByX[i-1].x);
            if (diff > 0.0001 && diff < minDiffX) minDiffX = diff;
        }
        for (let i = 1; i < Math.min(100, sortedByY.length); i++) {
            const diff = Math.abs(sortedByY[i].y - sortedByY[i-1].y);
            if (diff > 0.0001 && diff < minDiffY) minDiffY = diff;
        }
        for (let i = 1; i < Math.min(100, sortedByZ.length); i++) {
            const diff = Math.abs(sortedByZ[i].z - sortedByZ[i-1].z);
            if (diff > 0.0001 && diff < minDiffZ) minDiffZ = diff;
        }
        
        if (minDiffX < Infinity) avgCellSizeX = minDiffX;
        if (minDiffY < Infinity) avgCellSizeY = minDiffY;
        if (minDiffZ < Infinity) avgCellSizeZ = minDiffZ;
    }
    
    const avgCellSize = (avgCellSizeX + avgCellSizeY + avgCellSizeZ) / 3;
    
    // Minimum absolute sizes (scaled with cell size) to ensure body is always visible
    // Use 5-15 cell widths as minimum, ensuring meaningful ore bodies even in small models
    const MIN_CORE_RADIUS = Math.max(avgCellSize * 5, Math.min(modelSizeX, modelSizeY, modelSizeZ) * 0.05);
    const MIN_SHELL_RADIUS = Math.max(avgCellSize * 10, Math.min(modelSizeX, modelSizeY, modelSizeZ) * 0.10);
    const MIN_HALO_RADIUS = Math.max(avgCellSize * 15, Math.min(modelSizeX, modelSizeY, modelSizeZ) * 0.15);
    
    // Ellipsoidal radii (different for each axis - more realistic than spherical)
    // Core: more vertical (taller than wide), typical of porphyry intrusions
    // Randomize radii within reasonable ranges, but enforce minimums
    const coreRadiusXBase = rand(seed1, 0.08, 0.16); // 8-16% of model size
    const coreRadiusYBase = rand(seed1 * 3, 0.08, 0.16);
    const coreRadiusZBase = rand(seed1 * 7, 0.15, 0.25); // Taller core: 15-25%
    const coreRadiusX = params.coreRadiusX !== undefined ? params.coreRadiusX : Math.max(MIN_CORE_RADIUS, modelSizeX * coreRadiusXBase);
    const coreRadiusY = params.coreRadiusY !== undefined ? params.coreRadiusY : Math.max(MIN_CORE_RADIUS, modelSizeY * coreRadiusYBase);
    const coreRadiusZ = params.coreRadiusZ !== undefined ? params.coreRadiusZ : Math.max(MIN_CORE_RADIUS * 1.5, modelSizeZ * coreRadiusZBase); // Core is taller
    
    // Shell: intermediate shape
    // Ensure shell is always larger than core
    const shellRadiusXBase = rand(seed2, 0.20, 0.30); // 20-30% of model size
    const shellRadiusYBase = rand(seed2 * 3, 0.20, 0.30);
    const shellRadiusZBase = rand(seed2 * 7, 0.25, 0.35);
    const shellRadiusX = params.shellRadiusX !== undefined ? params.shellRadiusX : Math.max(MIN_SHELL_RADIUS, Math.max(coreRadiusX * 1.5, modelSizeX * shellRadiusXBase));
    const shellRadiusY = params.shellRadiusY !== undefined ? params.shellRadiusY : Math.max(MIN_SHELL_RADIUS, Math.max(coreRadiusY * 1.5, modelSizeY * shellRadiusYBase));
    const shellRadiusZ = params.shellRadiusZ !== undefined ? params.shellRadiusZ : Math.max(MIN_SHELL_RADIUS, Math.max(coreRadiusZ * 1.3, modelSizeZ * shellRadiusZBase));
    
    // Halo: more horizontal (wider than tall), typical of distal alteration
    // Keep radii smaller to ensure body stays within bounds (center is 40-60%, so max radius should be ~40%)
    // Ensure halo is always larger than shell
    const haloRadiusXBase = rand(seed3, 0.30, 0.40); // 30-40% of model size (reduced to fit within bounds)
    const haloRadiusYBase = rand(seed3 * 3, 0.30, 0.40);
    const haloRadiusZBase = rand(seed3 * 7, 0.25, 0.35); // Flatter halo: 25-35% (reduced)
    const haloRadiusX = params.haloRadiusX !== undefined ? params.haloRadiusX : Math.max(MIN_HALO_RADIUS, Math.max(shellRadiusX * 1.3, modelSizeX * haloRadiusXBase));
    const haloRadiusY = params.haloRadiusY !== undefined ? params.haloRadiusY : Math.max(MIN_HALO_RADIUS, Math.max(shellRadiusY * 1.3, modelSizeY * haloRadiusYBase));
    const haloRadiusZ = params.haloRadiusZ !== undefined ? params.haloRadiusZ : Math.max(MIN_HALO_RADIUS, Math.max(shellRadiusZ * 1.1, modelSizeZ * haloRadiusZBase)); // Halo is flatter
    
    // Randomize grades within realistic porphyry ranges
    const coreGradeCu = params.coreGradeCu !== undefined ? params.coreGradeCu : rand(seed1 * 11, 0.8, 1.6); // 0.8-1.6% Cu
    const coreGradeAu = params.coreGradeAu !== undefined ? params.coreGradeAu : rand(seed1 * 13, 2.0, 4.0); // 2.0-4.0 g/t Au
    const shellGradeCu = params.shellGradeCu !== undefined ? params.shellGradeCu : rand(seed2 * 11, 0.4, 0.8); // 0.4-0.8% Cu
    const shellGradeAu = params.shellGradeAu !== undefined ? params.shellGradeAu : rand(seed2 * 13, 1.0, 2.0); // 1.0-2.0 g/t Au
    const haloGradeCu = params.haloGradeCu !== undefined ? params.haloGradeCu : rand(seed3 * 11, 0.2, 0.4); // 0.2-0.4% Cu
    const haloGradeAu = params.haloGradeAu !== undefined ? params.haloGradeAu : rand(seed3 * 13, 0.4, 0.8); // 0.4-0.8 g/t Au
    
    // Randomize gradients
    const verticalGradient = params.verticalGradient !== undefined ? params.verticalGradient : rand(seed1 * 17, 0.05, 0.15);
    const horizontalGradient = params.horizontalGradient !== undefined ? params.horizontalGradient : rand(seed2 * 17, 0.3, 0.7);
    
    // Randomize enrichment parameters
    const enrichmentDepth = params.enrichmentDepth !== undefined ? params.enrichmentDepth : rand(seed1 * 19, 50, 150);
    const enrichmentFactor = params.enrichmentFactor !== undefined ? params.enrichmentFactor : rand(seed2 * 19, 1.5, 2.5);
    
    // Randomize boundary and local variation
    const boundaryIrregularity = params.boundaryIrregularity !== undefined ? params.boundaryIrregularity : rand(seed3 * 17, 0.10, 0.25);
    const localVariation = params.localVariation !== undefined ? params.localVariation : rand(seed1 * 23, 0.10, 0.20);
    
    // Structural controls (optional fault/fracture influence)
    const structuralInfluence = params.structuralInfluence !== undefined ? params.structuralInfluence : rand(seed2 * 23, 0.05, 0.20);
    const faultStrikeDeg = params.faultStrike !== undefined ? params.faultStrike : rand(seed3 * 19, 0, 360);
    const faultStrike = faultStrikeDeg * Math.PI / 180;
    const faultDipDeg = params.faultDip !== undefined ? params.faultDip : rand(seed1 * 29, 15, 60);
    const faultDip = faultDipDeg * Math.PI / 180;
    
    // Find ground surface
    const groundSurface = maxZ;
    
    return blocks.map(block => {
        // Calculate ellipsoidal distance (not spherical) - more realistic shape
        const dx = (block.x - centerX) / coreRadiusX;
        const dy = (block.y - centerY) / coreRadiusY;
        const dz = (block.z - centerZ) / coreRadiusZ;
        const coreDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        const dxShell = (block.x - centerX) / shellRadiusX;
        const dyShell = (block.y - centerY) / shellRadiusY;
        const dzShell = (block.z - centerZ) / shellRadiusZ;
        const shellDist = Math.sqrt(dxShell * dxShell + dyShell * dyShell + dzShell * dzShell);
        
        const dxHalo = (block.x - centerX) / haloRadiusX;
        const dyHalo = (block.y - centerY) / haloRadiusY;
        const dzHalo = (block.z - centerZ) / haloRadiusZ;
        const haloDist = Math.sqrt(dxHalo * dxHalo + dyHalo * dyHalo + dzHalo * dzHalo);
        
        // Add boundary irregularity using noise (breaks up perfect ellipsoids)
        // Noise scale adapts to model size
        const boundaryNoiseScale = 2.0 / Math.max(modelSizeX, modelSizeY, modelSizeZ, 1.0);
        const boundaryNoise = simpleNoise3D(
            block.x * boundaryNoiseScale,
            block.y * boundaryNoiseScale,
            block.z * boundaryNoiseScale,
            1.0
        );
        const irregularityFactor = 1.0 + (boundaryNoise - 0.5) * boundaryIrregularity;
        
        // Apply irregularity to distances
        const adjustedCoreDist = coreDist / irregularityFactor;
        const adjustedShellDist = shellDist / irregularityFactor;
        const adjustedHaloDist = haloDist / irregularityFactor;
        
        // Structural control: modify distances based on proximity to structural features
        // Blocks near faults/fractures may have enhanced mineralization
        let structuralFactor = 1.0;
        if (structuralInfluence > 0) {
            // Calculate distance to a hypothetical fault plane
            // Fault position scales with model size (30% of average model dimension)
            const faultDistance = Math.max(modelSizeX, modelSizeY) * 0.3;
            const faultX = centerX + Math.cos(faultStrike) * faultDistance;
            const faultY = centerY + Math.sin(faultStrike) * faultDistance;
            const faultDist = Math.sqrt(
                Math.pow(block.x - faultX, 2) + 
                Math.pow(block.y - faultY, 2)
            );
            const normalizedFaultDist = Math.min(1.0, faultDist / (Math.max(modelSizeX, modelSizeY) * 0.3));
            // Enhance grades near structural features
            structuralFactor = 1.0 + structuralInfluence * (1.0 - normalizedFaultDist) * 0.3;
        }
        
        // Determine zone based on adjusted ellipsoidal distances
        let baseGradeCu, baseGradeAu;
        let zone = 'Waste';
        
        if (adjustedCoreDist < 1.0) {
            baseGradeCu = coreGradeCu * structuralFactor;
            baseGradeAu = coreGradeAu * structuralFactor;
            zone = 'Core';
        } else if (adjustedShellDist < 1.0) {
            // Smooth transition from core to shell
            const t = (adjustedCoreDist - 1.0) / (adjustedShellDist - adjustedCoreDist + 0.1);
            const smoothT = Math.max(0, Math.min(1, t * t * (3 - 2 * t)));
            baseGradeCu = (coreGradeCu * (1 - smoothT) + shellGradeCu * smoothT) * structuralFactor;
            baseGradeAu = (coreGradeAu * (1 - smoothT) + shellGradeAu * smoothT) * structuralFactor;
            zone = 'Shell';
        } else if (adjustedHaloDist < 1.0) {
            // Smooth transition from shell to halo
            const t = (adjustedShellDist - 1.0) / (adjustedHaloDist - adjustedShellDist + 0.1);
            const smoothT = Math.max(0, Math.min(1, t * t * (3 - 2 * t)));
            baseGradeCu = (shellGradeCu * (1 - smoothT) + haloGradeCu * smoothT) * structuralFactor;
            baseGradeAu = (shellGradeAu * (1 - smoothT) + haloGradeAu * smoothT) * structuralFactor;
            zone = 'Halo';
        } else {
            baseGradeCu = 0;
            baseGradeAu = 0;
            zone = 'Waste';
        }
        
        // Apply horizontal gradient (distance from center within zone)
        const horizontalDist = Math.sqrt(
            Math.pow((block.x - centerX) / haloRadiusX, 2) +
            Math.pow((block.y - centerY) / haloRadiusY, 2)
        );
        let horizontalFactor = 1.0;
        if (horizontalDist > 0) {
            const normalizedDist = Math.min(1.0, horizontalDist);
            horizontalFactor = 1.0 - (normalizedDist * horizontalGradient);
        }
        
        // Apply vertical gradient (depth-related)
        const depth = groundSurface - block.z; // Positive = deeper
        const verticalFactor = 1.0 + (depth / 1000) * verticalGradient;
        
        // Apply supergene enrichment
        let enrichmentMultiplier = 1.0;
        if (depth < enrichmentDepth && depth > 0) {
            const enrichmentT = depth / enrichmentDepth;
            enrichmentMultiplier = 1.0 + (enrichmentFactor - 1.0) * (1.0 - enrichmentT);
        }
        
        // Add local variation (fine-scale noise)
        // Noise scale adapts to model size
        const localNoiseScale = 1.5 / Math.max(modelSizeX, modelSizeY, modelSizeZ, 1.0);
        const noise = simpleNoise3D(
            block.x * localNoiseScale,
            block.y * localNoiseScale,
            block.z * localNoiseScale,
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
        
        // Calculate economic value: positive for ore (revenue - costs), negative for waste (costs only)
        let econValue;
        if (rockType === 'Waste') {
            econValue = -15.0; // Waste mining/haulage/disposal costs (typically -10 to -30 per tonne)
        } else {
            // Ore value: revenue from metals minus processing costs
            econValue = (gradeCu * 20 + gradeAu * 50) - 10; // Revenue minus processing cost
        }
        
        return {
            ...block,
            rockType: rockType,
            gradeCu: Math.max(0, gradeCu),
            gradeAu: Math.max(0, gradeAu),
            density: block.density || 2.5,
            econValue: block.econValue !== undefined ? block.econValue : econValue,
            zone: zone !== 'Waste' ? zone : block.zone
        };
    });
}

/**
 * Salt Dome Reservoir Pattern (Petroleum Geology Demonstration)
 * Models a salt dome structure with oil/gas traps
 * Field mapping for petroleum:
 *   - gradeCu = Oil Saturation (%)
 *   - gradeAu = Gas Saturation (%)
 *   - density = Porosity (%)
 *   - rockType = Material type (Salt, CapRock, OilSand, WaterSand, Shale)
 * @param {Array} blocks - Array of block objects
 * @param {number} cellsX - Number of cells in X direction
 * @param {number} cellsY - Number of cells in Y direction
 * @param {number} cellsZ - Number of cells in Z direction
 * @returns {Array} Blocks with material assigned
 */
function generateSaltDomeReservoir(blocks, cellsX, cellsY, cellsZ) {
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
    
    const modelSizeX = maxX - minX;
    const modelSizeY = maxY - minY;
    const modelSizeZ = maxZ - minZ;
    
    // Add time-based random component to ensure variation between generations
    const timeSeed = Date.now() % 1000000;
    const randomComponent = Math.random() * 10000;
    
    // Randomization helper function (deterministic based on seed)
    const rand = (seed, min, max) => {
        const combinedSeed = (seed * 9301 + 49297 + timeSeed + randomComponent) % 233280;
        const hash = combinedSeed / 233280;
        return min + hash * (max - min);
    };
    
    const seed1 = (Math.floor((minX + minY) * 100) + timeSeed) % 10000;
    const seed2 = (Math.floor((minY + minZ) * 100) + timeSeed * 3) % 10000;
    const seed3 = (Math.floor((minZ + minX) * 100) + timeSeed * 7) % 10000;
    
    // Salt dome center (randomized but near center, similar to porphyry)
    const centerSeed = ((minX + minY + minZ) * 100 + timeSeed + randomComponent) % 10000;
    const centerX = minX + (maxX - minX) * rand(centerSeed, 0.4, 0.6); // 40-60% of range
    const centerY = minY + (maxY - minY) * rand(centerSeed * 7, 0.4, 0.6);
    
    // Randomize dome vertical position and height
    const domeTopZBase = rand(seed1, 0.05, 0.15); // 5-15% from top
    const domeBaseZBase = rand(seed1 * 3, 0.25, 0.40); // 25-40% from bottom
    const domeTopZ = maxZ - modelSizeZ * domeTopZBase;
    const domeBaseZ = minZ + modelSizeZ * domeBaseZBase;
    const domeHeight = domeTopZ - domeBaseZ;
    
    // Salt dome dimensions (elliptical in plan, randomized)
    const domeRadiusXBase = rand(seed2, 0.12, 0.22); // 12-22% of model
    const domeRadiusYBase = rand(seed2 * 3, 0.12, 0.22);
    const domeRadiusX = modelSizeX * domeRadiusXBase;
    const domeRadiusY = modelSizeY * domeRadiusYBase;
    
    // Cap rock thickness (randomized)
    const capRockThickness = modelSizeZ * rand(seed2 * 5, 0.03, 0.08); // 3-8% of model height
    
    // Oil trap zone (around salt dome, above oil-water contact)
    const trapWidth = modelSizeX * rand(seed3, 0.20, 0.35); // 20-35% of model width
    const oilWaterContactBase = rand(seed3 * 3, 0.15, 0.30); // 15-30% from dome base
    const oilWaterContact = domeBaseZ + modelSizeZ * oilWaterContactBase;
    
    // Gas cap (above oil)
    const gasOilContactBase = rand(seed3 * 7, 0.10, 0.25); // 10-25% from dome top
    const gasOilContact = domeTopZ - modelSizeZ * gasOilContactBase;
    
    return blocks.map(block => {
        // Calculate distance from dome center (horizontal)
        const dx = block.x - centerX;
        const dy = block.y - centerY;
        const horizontalDist = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate normalized distance from dome center (for elliptical shape)
        const normalizedDistX = Math.abs(dx) / domeRadiusX;
        const normalizedDistY = Math.abs(dy) / domeRadiusY;
        const normalizedDist = Math.sqrt(normalizedDistX * normalizedDistX + normalizedDistY * normalizedDistY);
        
        // Salt dome shape (parabolic in vertical section)
        // Dome top is at domeTopZ, base at domeBaseZ
        const relativeZ = (block.z - domeBaseZ) / domeHeight; // 0 at base, 1 at top
        // Radius at this Z level (narrower at top, wider at base)
        const domeRadiusAtZ = 1.0 - relativeZ * 0.3; // 1.0 at base, 0.7 at top
        
        let rockType = 'Shale'; // Default: surrounding shale
        let oilSaturation = 0; // Oil saturation (%)
        let gasSaturation = 0; // Gas saturation (%)
        let porosity = 0.15; // Porosity (%) - default for shale
        let density = 2.4; // Density (tonnes/m³) - default for shale
        
        // Determine if block is in salt dome
        if (normalizedDist < domeRadiusAtZ && block.z >= domeBaseZ && block.z <= domeTopZ) {
            // Inside salt dome
            rockType = 'Salt';
            porosity = rand(seed1 * 11, 0.005, 0.015); // Salt has very low porosity (0.5-1.5%)
            density = rand(seed1 * 13, 2.15, 2.25); // Salt density (2.15-2.25 tonnes/m³)
            oilSaturation = 0;
            gasSaturation = 0;
        } else if (normalizedDist < domeRadiusAtZ && block.z > domeTopZ && block.z <= domeTopZ + capRockThickness) {
            // Cap rock (impermeable layer on top of salt)
            rockType = 'CapRock';
            porosity = rand(seed2 * 11, 0.03, 0.07); // Very low porosity (3-7%)
            density = rand(seed2 * 13, 2.5, 2.7); // Dense cap rock (2.5-2.7 tonnes/m³)
            oilSaturation = 0;
            gasSaturation = 0;
        } else if (normalizedDist < domeRadiusAtZ + (trapWidth / Math.max(domeRadiusX, domeRadiusY)) && 
                   block.z < oilWaterContact && block.z > domeBaseZ) {
            // Oil/gas trap zone (around salt dome, above oil-water contact)
            // Normalize trap width to match normalized distance units
            const normalizedTrapWidth = trapWidth / Math.max(domeRadiusX, domeRadiusY);
            const trapDist = Math.max(0, (normalizedDist - domeRadiusAtZ) / normalizedTrapWidth);
            const trapFactor = Math.max(0, 1.0 - trapDist); // Decreases away from dome
            
            if (block.z > gasOilContact) {
                // Gas cap zone
                rockType = 'GasSand';
                // Randomize base porosity and saturation ranges
                const basePorosity = rand(seed1 * 19, 0.18, 0.25);
                const baseGasSat = rand(seed1 * 23, 55, 70);
                porosity = basePorosity + trapFactor * rand(seed1 * 27, 0.08, 0.12); // 18-30% porosity
                density = 2.1; // Lower density with gas
                oilSaturation = 0;
                gasSaturation = baseGasSat + trapFactor * rand(seed1 * 29, 25, 35); // 55-90% gas saturation
            } else {
                // Oil zone
                rockType = 'OilSand';
                // Randomize base porosity and saturation ranges
                const basePorosity = rand(seed2 * 19, 0.16, 0.22);
                const baseOilSat = rand(seed2 * 23, 45, 60);
                porosity = basePorosity + trapFactor * rand(seed2 * 27, 0.10, 0.14); // 16-30% porosity
                density = 2.2; // Slightly higher with oil
                oilSaturation = baseOilSat + trapFactor * rand(seed2 * 29, 35, 45); // 45-90% oil saturation
                gasSaturation = rand(seed2 * 31, 3, 8) + trapFactor * rand(seed2 * 33, 3, 7); // 3-15% gas saturation (solution gas)
            }
        } else if (block.z < oilWaterContact && block.z > domeBaseZ) {
            // Water zone (below oil-water contact)
            rockType = 'WaterSand';
            // Use deterministic randomization for consistency
            const waterSeed = Math.floor((block.x + block.y + block.z) * 100) % 10000;
            porosity = rand(waterSeed, 0.15, 0.25); // 15-25% porosity
            density = 2.3; // Higher with water
            oilSaturation = 0;
            gasSaturation = 0;
        } else {
            // Surrounding shale/rock
            rockType = 'Shale';
            // Use deterministic randomization for consistency
            const shaleSeed = Math.floor((block.x + block.y + block.z) * 100) % 10000;
            porosity = rand(shaleSeed, 0.10, 0.15); // 10-15% porosity
            density = rand(shaleSeed * 3, 2.4, 2.6); // 2.4-2.6 tonnes/m³
            oilSaturation = 0;
            gasSaturation = 0;
        }
        
        // Add some natural variation using noise
        // Noise scale adapts to model size
        const noiseScale = 1.0 / Math.max(modelSizeX, modelSizeY, modelSizeZ, 1.0);
        const noise = simpleNoise3D(
            block.x * noiseScale,
            block.y * noiseScale,
            block.z * noiseScale,
            1.0
        );
        const variation = 0.9 + (noise - 0.5) * 0.2; // ±10% variation
        
        // Apply variation to saturations and porosity
        oilSaturation = Math.max(0, Math.min(100, oilSaturation * variation));
        gasSaturation = Math.max(0, Math.min(100, gasSaturation * variation));
        porosity = Math.max(0.01, Math.min(0.35, porosity * variation));
        
        // Calculate economic value (for petroleum: $/barrel equivalent)
        // Simplified: oil value ~$50/barrel, gas value ~$3/MCF
        // Using density to estimate barrels per tonne
        let econValue = 0;
        if (rockType === 'OilSand' && oilSaturation > 10) {
            const barrelsPerTonne = (porosity * oilSaturation / 100) * 6.29; // Approximate conversion
            econValue = barrelsPerTonne * 50 - 20; // Revenue minus extraction cost
        } else if (rockType === 'GasSand' && gasSaturation > 10) {
            const mcfPerTonne = (porosity * gasSaturation / 100) * 35; // Approximate conversion
            econValue = mcfPerTonne * 3 - 15; // Revenue minus extraction cost
        } else if (rockType === 'Salt' || rockType === 'CapRock' || rockType === 'Shale') {
            econValue = -10; // Negative value (no economic resource)
        } else {
            econValue = -5; // Water zone or low saturation
        }
        
        return {
            ...block,
            rockType: rockType,
            density: density,
            gradeCu: oilSaturation, // Using gradeCu field for oil saturation
            gradeAu: gasSaturation, // Using gradeAu field for gas saturation
            // Note: porosity could be stored in a custom field, but we'll use density as a proxy
            // In a real implementation, you'd add a porosity field
            econValue: econValue,
            zone: rockType // Use rockType as zone identifier
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
        case 'salt_dome':
            return generateSaltDomeReservoir(blocks, cellsX, cellsY, cellsZ);
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
