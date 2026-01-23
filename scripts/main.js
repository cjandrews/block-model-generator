/**
 * Main application controller
 * Wires UI to block model and visualization modules
 * Supports large models with localStorage caching
 */

let currentBlocks = [];
let currentParams = null;
const STORAGE_KEY_PREFIX = 'blockModel_';
const STORAGE_KEY_PARAMS = 'blockModel_params';
const LARGE_MODEL_THRESHOLD = 50000; // Use caching for models with > 50K blocks

/**
 * Generate a cache key from parameters
 * @param {Object} params - Model parameters
 * @returns {string} Cache key
 */
function generateCacheKey(params) {
    return `${params.originX}_${params.originY}_${params.originZ}_` +
           `${params.cellSizeX}_${params.cellSizeY}_${params.cellSizeZ}_` +
           `${params.cellsX}_${params.cellsY}_${params.cellsZ}_${params.patternType}`;
}

/**
 * Save blocks to localStorage
 * @param {string} cacheKey - Cache key
 * @param {Array} blocks - Blocks to cache
 */
function saveBlocksToCache(cacheKey, blocks) {
    try {
        const data = {
            blocks: blocks,
            timestamp: Date.now()
        };
        const json = JSON.stringify(data);
        
        // Check size (localStorage has ~5-10MB limit)
        const sizeInMB = new Blob([json]).size / (1024 * 1024);
        if (sizeInMB > 8) {
            console.warn('Model too large for localStorage, not caching');
            return false;
        }
        
        localStorage.setItem(STORAGE_KEY_PREFIX + cacheKey, json);
        localStorage.setItem(STORAGE_KEY_PARAMS, JSON.stringify(currentParams));
        return true;
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            console.warn('localStorage quota exceeded, clearing old cache');
            clearOldCache();
            // Try once more
            try {
                localStorage.setItem(STORAGE_KEY_PREFIX + cacheKey, JSON.stringify({
                    blocks: blocks,
                    timestamp: Date.now()
                }));
                return true;
            } catch (e2) {
                console.error('Failed to cache blocks:', e2);
                return false;
            }
        }
        console.error('Error caching blocks:', e);
        return false;
    }
}

/**
 * Load blocks from localStorage
 * @param {string} cacheKey - Cache key
 * @returns {Array|null} Cached blocks or null
 */
function loadBlocksFromCache(cacheKey) {
    try {
        const cached = localStorage.getItem(STORAGE_KEY_PREFIX + cacheKey);
        if (!cached) {
            return null;
        }
        
        const data = JSON.parse(cached);
        // Cache is valid for 24 hours
        const age = Date.now() - data.timestamp;
        if (age > 24 * 60 * 60 * 1000) {
            localStorage.removeItem(STORAGE_KEY_PREFIX + cacheKey);
            return null;
        }
        
        return data.blocks;
    } catch (e) {
        console.error('Error loading cached blocks:', e);
        return null;
    }
}

/**
 * Clear old cache entries
 */
function clearOldCache() {
    try {
        const keys = Object.keys(localStorage);
        const now = Date.now();
        let cleared = 0;
        
        keys.forEach(key => {
            if (key.startsWith(STORAGE_KEY_PREFIX)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    const age = now - data.timestamp;
                    // Remove entries older than 7 days
                    if (age > 7 * 24 * 60 * 60 * 1000) {
                        localStorage.removeItem(key);
                        cleared++;
                    }
                } catch (e) {
                    // Invalid entry, remove it
                    localStorage.removeItem(key);
                    cleared++;
                }
            }
        });
        
        if (cleared > 0) {
            console.log(`Cleared ${cleared} old cache entries`);
        }
    } catch (e) {
        console.error('Error clearing cache:', e);
    }
}

/**
 * Initialize application
 */
function init() {
    const canvasContainer = document.getElementById('canvasContainer');
    const generateBtn = document.getElementById('generateBtn');
    const exportBtn = document.getElementById('exportBtn');
    const zoomResetBtn = document.getElementById('zoomResetBtn');
    const modelForm = document.getElementById('modelForm');
    const viewModeSelect = document.getElementById('viewMode');
    const visualizationFieldSelect = document.getElementById('visualizationField');
    
    // Slice tool controls
    const sliceEnabledCheckbox = document.getElementById('sliceEnabled');
    const sliceAxisSelect = document.getElementById('sliceAxis');
    const slicePositionSlider = document.getElementById('slicePosition');
    const slicePositionValue = document.getElementById('slicePositionValue');
    
    // Value visibility controls
    const valueVisibilityEnabledCheckbox = document.getElementById('valueVisibilityEnabled');
    const valueVisibilityModeSelect = document.getElementById('valueVisibilityMode');
    const valueVisibilityThresholdSlider = document.getElementById('valueVisibilityThreshold');
    const valueVisibilityThresholdValue = document.getElementById('valueVisibilityThresholdValue');
    
    // Ground layer controls
    const groundEnabledCheckbox = document.getElementById('groundEnabled');
    
    // Initialize visualization
    initVisualization(canvasContainer);
    
    // Set up event listeners
    generateBtn.addEventListener('click', handleGenerate);
    exportBtn.addEventListener('click', handleExport);
    if (zoomResetBtn) {
        zoomResetBtn.addEventListener('click', () => {
            zoomToFit();
        });
    }
    
    // Prevent form submission
    modelForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleGenerate();
    });
    
    // Visualization controls
    if (viewModeSelect) {
        viewModeSelect.addEventListener('change', (e) => {
            setViewMode(e.target.value);
        });
    }
    
    if (visualizationFieldSelect) {
        visualizationFieldSelect.addEventListener('change', (e) => {
            setVisualizationField(e.target.value);
        });
    }
    
    // Slice tool controls
    if (sliceEnabledCheckbox) {
        sliceEnabledCheckbox.addEventListener('change', (e) => {
            setSliceEnabled(e.target.checked);
        });
    }
    
    if (sliceAxisSelect) {
        sliceAxisSelect.addEventListener('change', (e) => {
            setSliceAxis(e.target.value);
        });
    }
    
    if (slicePositionSlider) {
        slicePositionSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (slicePositionValue) {
                slicePositionValue.textContent = value.toFixed(1);
            }
            setSlicePosition(value);
        });
    }
    
    // Value visibility controls
    if (valueVisibilityEnabledCheckbox) {
        valueVisibilityEnabledCheckbox.addEventListener('change', (e) => {
            setValueVisibilityEnabled(e.target.checked);
            // Enable/disable related controls
            if (valueVisibilityModeSelect) {
                valueVisibilityModeSelect.disabled = !e.target.checked;
            }
            if (valueVisibilityThresholdSlider) {
                valueVisibilityThresholdSlider.disabled = !e.target.checked;
            }
        });
    }
    
    if (valueVisibilityModeSelect) {
        valueVisibilityModeSelect.addEventListener('change', (e) => {
            setValueVisibilityMode(e.target.value);
        });
        valueVisibilityModeSelect.disabled = true; // Disabled by default
    }
    
    if (valueVisibilityThresholdSlider) {
        valueVisibilityThresholdSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (valueVisibilityThresholdValue) {
                valueVisibilityThresholdValue.textContent = value.toFixed(2);
            }
            setValueVisibilityThreshold(value);
        });
        valueVisibilityThresholdSlider.disabled = true; // Disabled by default
    }
    
    // Ground layer controls
    if (groundEnabledCheckbox) {
        groundEnabledCheckbox.addEventListener('change', (e) => {
            setGroundEnabled(e.target.checked);
        });
    }
    
    // Clear old cache on startup (this will clear models with old Z-axis convention)
    clearOldCache();
    
    // Clear all cached models to ensure fresh generation with new Z-axis convention
    // This is important because cached models may have been generated with the old formula
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(STORAGE_KEY_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
        console.log('Cleared cached block models to ensure fresh generation with correct Z-axis convention.');
    } catch (e) {
        console.warn('Could not clear cache:', e);
    }
    
    updateStatus('Generating initial model...');
    
    // Automatically generate a model on initial load
    // Use setTimeout to ensure DOM is fully ready
    setTimeout(() => {
        handleGenerate();
    }, 100);
}

/**
 * Handle generate button click
 */
async function handleGenerate() {
    try {
        updateStatus('Generating block model...');
        
        // Get form values
        const params = {
            originX: parseFloat(document.getElementById('originX').value),
            originY: parseFloat(document.getElementById('originY').value),
            originZ: parseFloat(document.getElementById('originZ').value),
            cellSizeX: parseFloat(document.getElementById('cellSizeX').value),
            cellSizeY: parseFloat(document.getElementById('cellSizeY').value),
            cellSizeZ: parseFloat(document.getElementById('cellSizeZ').value),
            cellsX: parseInt(document.getElementById('cellsX').value),
            cellsY: parseInt(document.getElementById('cellsY').value),
            cellsZ: parseInt(document.getElementById('cellsZ').value),
            patternType: document.getElementById('patternType').value
        };
        
        // Validate inputs
        if (params.cellSizeX <= 0 || params.cellSizeY <= 0 || params.cellSizeZ <= 0) {
            throw new Error('Cell sizes must be greater than 0');
        }
        
        if (params.cellsX <= 0 || params.cellsY <= 0 || params.cellsZ <= 0) {
            throw new Error('Number of cells must be greater than 0');
        }
        
        const totalCells = params.cellsX * params.cellsY * params.cellsZ;
        
        // Check cache first for large models
        const cacheKey = generateCacheKey(params);
        let blocks = null;
        
        if (totalCells >= LARGE_MODEL_THRESHOLD) {
            updateStatus('Checking cache for large model...');
            blocks = loadBlocksFromCache(cacheKey);
            if (blocks) {
                updateStatus(`Loaded ${blocks.length} blocks from cache.`, 'success');
                currentBlocks = blocks;
                currentParams = params;
                
                // Update visualization (may need to limit for very large models)
                const blocksToVisualize = totalCells > 200000 
                    ? blocks.filter((_, idx) => idx % Math.ceil(totalCells / 200000) === 0)
                    : blocks;
                
                updateVisualization(
                    blocksToVisualize,
                    params.cellSizeX,
                    params.cellSizeY,
                    params.cellSizeZ
                );
                
                document.getElementById('exportBtn').disabled = false;
                
                if (totalCells > 200000) {
                    updateStatus(
                        `Model loaded from cache: ${blocks.length} blocks. ` +
                        `Visualizing sample for performance. Full model available for export.`,
                        'success'
                    );
                } else {
                    updateStatus(
                        `Model loaded from cache: ${blocks.length} blocks. Ready to export.`,
                        'success'
                    );
                }
                return;
            }
        }
        
        // Generate blocks using standard format
        updateStatus(`Generating ${totalCells.toLocaleString()} blocks...`);
        
        const gridParams = {
            xmOrig: params.originX,
            ymOrig: params.originY,
            zmOrig: params.originZ,
            xInc: params.cellSizeX,
            yInc: params.cellSizeY,
            zInc: params.cellSizeZ,
            nx: params.cellsX,
            ny: params.cellsY,
            nz: params.cellsZ
        };
        
        // Generate in chunks for very large models to avoid blocking
        if (totalCells > 500000) {
            updateStatus('Generating large model in chunks (this may take a while)...');
            blocks = await generateLargeModel(gridParams);
        } else {
            blocks = generateRegularGrid(gridParams);
        }
        
        // Apply material pattern
        updateStatus('Applying material pattern...');
        const blocksWithMaterials = applyMaterialPattern(
            blocks,
            params.patternType,
            params.cellsX,
            params.cellsY,
            params.cellsZ
        );
        
        // Store current blocks and params
        currentBlocks = blocksWithMaterials;
        currentParams = params;
        
        // Cache large models
        if (totalCells >= LARGE_MODEL_THRESHOLD) {
            updateStatus('Caching model data...');
            saveBlocksToCache(cacheKey, blocksWithMaterials);
        }
        
        // Update visualization (limit for very large models)
        const blocksToVisualize = totalCells > 200000 
            ? blocksWithMaterials.filter((_, idx) => idx % Math.ceil(totalCells / 200000) === 0)
            : blocksWithMaterials;
        
        updateVisualization(
            blocksToVisualize,
            params.cellSizeX,
            params.cellSizeY,
            params.cellSizeZ
        );
        
        // Enable export button
        document.getElementById('exportBtn').disabled = false;
        
        // Update status
        if (totalCells > 200000) {
            updateStatus(
                `Model generated: ${currentBlocks.length.toLocaleString()} blocks. ` +
                `Pattern: ${params.patternType}. ` +
                `Visualizing sample for performance. Full model available for export.`,
                'success'
            );
        } else {
            updateStatus(
                `Model generated: ${currentBlocks.length.toLocaleString()} blocks. ` +
                `Pattern: ${params.patternType}. Ready to export.`,
                'success'
            );
        }
        
    } catch (error) {
        updateStatus(`Error: ${error.message}`, 'error');
        console.error('Generation error:', error);
    }
}

/**
 * Generate large model in chunks to avoid blocking
 * @param {Object} gridParams - Grid parameters
 * @returns {Promise<Array>} Array of blocks
 */
function generateLargeModel(gridParams) {
    return new Promise((resolve) => {
        const blocks = [];
        const { nx, ny, nz, xmOrig, ymOrig, zmOrig, xInc, yInc, zInc } = gridParams;
        const total = nx * ny * nz;
        let processed = 0;
        const chunkSize = 10000; // Process 10K blocks at a time
        
        function processChunk() {
            const startTime = performance.now();
            let chunkProcessed = 0;
            
            while (processed < total && chunkProcessed < chunkSize) {
                const i = Math.floor(processed / (ny * nz));
                const remainder = processed % (ny * nz);
                const j = Math.floor(remainder / nz);
                const k = remainder % nz;
                
                if (i < nx && j < ny && k < nz) {
                    // For mining convention: Z goes downward (negative) from ground surface (zmOrig)
                    const x = xmOrig + (i + 0.5) * xInc;
                    const y = ymOrig + (j + 0.5) * yInc;
                    const z = zmOrig - (k + 0.5) * zInc;
                    
                    blocks.push({
                        x, y, z,
                        i, j, k,
                        rockType: 'Waste',
                        density: 2.5,
                        zone: undefined,
                        gradeAu: undefined,
                        gradeCu: undefined,
                        econValue: undefined
                    });
                }
                
                processed++;
                chunkProcessed++;
            }
            
            // Update progress
            const progress = Math.floor((processed / total) * 100);
            updateStatus(`Generating blocks: ${progress}% (${processed.toLocaleString()}/${total.toLocaleString()})...`);
            
            if (processed < total) {
                // Use setTimeout to allow UI updates
                setTimeout(processChunk, 0);
            } else {
                resolve(blocks);
            }
        }
        
        processChunk();
    });
}

/**
 * Handle export button click
 */
function handleExport() {
    if (currentBlocks.length === 0) {
        updateStatus('No blocks to export. Please generate a model first.', 'error');
        return;
    }
    
    try {
        updateStatus('Exporting to CSV (this may take a moment for large models)...');
        
        // Use standard CSV export
        const csvContent = blocksToCsv(currentBlocks, {
            includeIndices: false,
            includeZone: true,
            includeGrades: true,
            includeEconValue: true,
            filterAirBlocks: true,
            cellSizeX: currentParams ? currentParams.cellSizeX : undefined,
            cellSizeY: currentParams ? currentParams.cellSizeY : undefined,
            cellSizeZ: currentParams ? currentParams.cellSizeZ : undefined
        });
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `block_model_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        updateStatus(
            `CSV exported successfully: ${currentBlocks.length.toLocaleString()} blocks.`,
            'success'
        );
        
    } catch (error) {
        updateStatus(`Export error: ${error.message}`, 'error');
        console.error('Export error:', error);
    }
}

/**
 * Update status message
 * @param {string} message - Status message
 * @param {string} type - Message type: 'info', 'success', 'error'
 */
function updateStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
