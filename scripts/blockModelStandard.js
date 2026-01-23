/**
 * Standardized Block Model Module
 * Implements industry-standard block model schema compatible with MiningMath and common mining software
 * 
 * Standard Field Schema:
 * - Coordinates: X, Y, Z (centroids in metric units)
 * - Required: ROCKTYPE, DENSITY
 * - Optional: ZONE, GRADE_AU, GRADE_CU, ECON_VALUE
 * - Grid indices: I, J, K (for internal tracking)
 */

/**
 * Standard Block Interface
 * @typedef {Object} Block
 * @property {number} x - X coordinate (centroid, metric)
 * @property {number} y - Y coordinate (centroid, metric)
 * @property {number} z - Z coordinate (centroid, metric)
 * @property {number} i - I index (grid position in X)
 * @property {number} j - J index (grid position in Y)
 * @property {number} k - K index (grid position in Z)
 * @property {string} rockType - Rock type classification (e.g., 'Waste', 'Ore', 'Magnetite', 'Hematite')
 * @property {number} density - Density in tonnes/m³ (metric)
 * @property {string} [zone] - Optional zone identifier
 * @property {number} [gradeAu] - Gold grade (optional, in g/t or %)
 * @property {number} [gradeCu] - Copper grade (optional, in %)
 * @property {number} [econValue] - Economic value (optional, currency units)
 */

/**
 * Grid Parameters Interface
 * @typedef {Object} GridParams
 * @property {number} xmOrig - X model origin (XMORIG)
 * @property {number} ymOrig - Y model origin (YMORIG)
 * @property {number} zmOrig - Z model origin (ZMORIG)
 * @property {number} xInc - X cell increment (XINC)
 * @property {number} yInc - Y cell increment (YINC)
 * @property {number} zInc - Z cell increment (ZINC)
 * @property {number} nx - Number of cells in X (NX)
 * @property {number} ny - Number of cells in Y (NY)
 * @property {number} nz - Number of cells in Z (NZ)
 */

/**
 * Column Mapping from Sample CSVs to Standard Schema
 * 
 * mining_block_model.csv mapping:
 *   Block_ID -> (internal tracking, not in standard)
 *   X, Y, Z -> x, y, z (centroids) ✓
 *   Rock_Type -> rockType ✓
 *   Ore_Grade (%) -> gradeCu (or generic grade)
 *   Tonnage -> (derived from density * volume)
 *   Ore_Value -> econValue ✓
 *   Mining_Cost, Processing_Cost -> (economic fields, optional)
 *   Waste_Flag -> (derived from rockType === 'Waste')
 *   Profit -> econValue ✓
 *   Target -> (optimization field, optional)
 * 
 * Marvin_Strategy_Optimization.CSV mapping:
 *   X, Y, Z -> x, y, z (centroids) ✓
 *   @CU -> gradeCu ✓
 *   @AU -> gradeAu ✓
 *   /Slope -> (geotechnical, optional)
 *   %Density -> density ✓
 *   $Process1, $P1 Cu +5, etc. -> econValue (various scenarios)
 *   $Waste -> econValue (waste scenario)
 *   +Proc Hours -> (processing time, optional)
 */

/**
 * Generate a regular grid of blocks following standard conventions
 * Uses origin + indices to compute centroids
 * 
 * @param {GridParams} params - Grid parameters
 * @returns {Block[]} Array of block objects
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
                // Centroid = origin + (index + 0.5) * increment
                const x = xmOrig + (i + 0.5) * xInc;
                const y = ymOrig + (j + 0.5) * yInc;
                const z = zmOrig + (k + 0.5) * zInc;
                
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
                    // Optional fields initialized to undefined (will be omitted in CSV if not set)
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
 * Convert blocks array to CSV string following MiningMath formatting rules:
 * - Comma separator
 * - Metric units
 * - Short header names (uppercase, no spaces)
 * - No air blocks (filter out if needed)
 * - Coordinates as centroids
 * 
 * @param {Block[]} blocks - Array of block objects
 * @param {Object} options - Export options
 * @param {boolean} options.includeIndices - Include I, J, K indices (default: false)
 * @param {boolean} options.includeZone - Include ZONE field if present (default: true)
 * @param {boolean} options.includeGrades - Include grade fields if present (default: true)
 * @param {boolean} options.includeEconValue - Include economic value if present (default: true)
 * @param {boolean} options.filterAirBlocks - Filter out air blocks (density = 0) (default: true)
 * @returns {string} CSV text with headers
 */
function blocksToCsv(blocks, options = {}) {
    const {
        includeIndices = false,
        includeZone = true,
        includeGrades = true,
        includeEconValue = true,
        filterAirBlocks = true
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
 * Convert legacy block format to standard format
 * Maps old block structure to new standardized structure
 * 
 * @param {Object} legacyBlock - Block in old format
 * @returns {Block} Block in standard format
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
 * Can be used to populate density, grades, and economic values
 * 
 * @param {Block[]} blocks - Array of blocks
 * @param {Object} materialDefinitions - Material property definitions
 * @returns {Block[]} Blocks with properties applied
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

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateRegularGrid,
        blocksToCsv,
        convertLegacyBlock,
        applyMaterialProperties,
        formatCoordinate,
        formatNumber
    };
}
