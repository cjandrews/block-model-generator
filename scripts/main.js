/**
 * Main application controller
 * Wires UI to block model and visualization modules
 * Supports large models with localStorage caching
 * 
 * @license MIT License
 * @copyright Copyright (c) 2026 BuildIT Design Labs, LLC
 */

let currentBlocks = [];
let currentParams = null;
const STORAGE_KEY_PREFIX = 'blockModel_';
const STORAGE_KEY_PARAMS = 'blockModel_params';
const LARGE_MODEL_THRESHOLD = 50000; // Use caching for models with > 50K blocks
let isFirstGeneration = true; // Track if this is the first model generation on startup

// Gamification: Statistics and Gallery
const STATS_STORAGE_KEY = 'app_stats';
const GALLERY_STORAGE_KEY = 'app_savedModels';

// Track current random seed for deterministic regeneration
let currentRandomSeed = null;
const MAX_SAVED_MODELS = 50; // Limit gallery size
const MAX_MODEL_NAME_LENGTH = 100; // Maximum model name length
const VOLUME_CONVERSION_FACTOR = 1000000; // Convert to million m³
let currentModelStats = null; // Current model statistics

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
        
        // Cache cleared silently (no user notification needed)
    } catch (e) {
        console.error('Error clearing cache:', e);
    }
}

// Flag to prevent multiple initializations
let isInitialized = false;

/**
 * Initialize application
 */
function init() {
    // Prevent multiple initializations
    if (isInitialized) {
        console.warn('init() called multiple times, skipping...');
        return;
    }
    isInitialized = true;
    
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
    
    if (sliceEnabledCheckbox) {
        sliceEnabledCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                trackToolUsage('sliceTool');
            }
        });
    }
    
    // Value visibility controls
    const valueVisibilityEnabledCheckbox = document.getElementById('valueVisibilityEnabled');
    const valueVisibilityModeSelect = document.getElementById('valueVisibilityMode');
    const valueVisibilityThresholdSlider = document.getElementById('valueVisibilityThreshold');
    const valueVisibilityThresholdValue = document.getElementById('valueVisibilityThresholdValue');
    
    if (valueVisibilityEnabledCheckbox) {
        valueVisibilityEnabledCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                trackToolUsage('valueFilter');
            }
        });
    }
    
    // Ground layer controls
    const groundEnabledCheckbox = document.getElementById('groundEnabled');
    
    if (groundEnabledCheckbox) {
        groundEnabledCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                trackToolUsage('groundLayer');
            }
        });
    }
    
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
    
    // Save viewport image button
    const saveImageBtn = document.getElementById('saveImageBtn');
    if (saveImageBtn) {
        // Use a wrapper function to ensure saveViewportImage is available
        saveImageBtn.addEventListener('click', () => {
            if (typeof saveViewportImage === 'function') {
                saveViewportImage();
            } else {
                console.error('saveViewportImage function not available');
                updateStatus(t('status.imageExportError', { message: 'Function not available' }), 'error');
            }
        });
        
        // Update tooltip with translation
        function updateSaveImageTooltip() {
            if (saveImageBtn && typeof t === 'function') {
                const translated = t('buttons.saveImage');
                if (translated && translated !== 'buttons.saveImage') {
                    saveImageBtn.setAttribute('title', translated);
                }
            }
        }
        
        // Initial update
        updateSaveImageTooltip();
        
        // Update on locale change
        window.addEventListener('localeChanged', () => {
            setTimeout(updateSaveImageTooltip, 50);
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
            const mode = e.target.value;
            setViewMode(mode);
            // Track view mode usage for statistics
            trackViewMode(mode);
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
                // Update label text with translation
                const label = document.querySelector('label[for="slicePosition"]');
                if (label) {
                    const labelText = t('sliceTool.position', { value: value.toFixed(1) });
                    label.innerHTML = labelText;
                }
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
                // Update label text with translation
                const label = document.querySelector('label[for="valueVisibilityThreshold"]');
                if (label) {
                    const labelText = t('valueFilter.threshold', { value: value.toFixed(2) });
                    label.innerHTML = labelText;
                }
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
    
    // Category filter controls
    const categoryFilterEnabledCheckbox = document.getElementById('categoryFilterEnabled');
    if (categoryFilterEnabledCheckbox) {
        categoryFilterEnabledCheckbox.addEventListener('change', (e) => {
            setCategoryFilterEnabled(e.target.checked);
            if (e.target.checked) {
                trackToolUsage('categoryFilter');
            }
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
        // Cache cleared to ensure fresh generation
    } catch (e) {
        console.warn('Could not clear cache:', e);
    }
    
    // Initialize modals
    initAboutModal();
    initMemoryModal();
    initDocsButton();
    initStatsPanel();
    initGalleryPanel();
    initModelStatsDisplay();
    
    updateStatus(t('status.generatingInitial'));
    
    // Automatically generate a model on initial load
    // Use setTimeout to ensure DOM is fully ready
    setTimeout(() => {
        if (typeof handleGenerate === 'function') {
            handleGenerate().catch(error => {
                console.error('Error during initial generation:', error);
                updateStatus(t('status.error', { message: error.message }), 'error');
            });
        } else {
            console.warn('handleGenerate function not available yet, retrying...');
            setTimeout(() => {
                if (typeof handleGenerate === 'function') {
                    handleGenerate().catch(error => {
                        console.error('Error during initial generation:', error);
                        updateStatus(t('status.error', { message: error.message }), 'error');
                    });
                }
            }, 300);
        }
    }, 200);
}

/**
 * Handle generate button click
 */
async function handleGenerate() {
    try {
        // Verify form elements exist
        const originXEl = document.getElementById('originX');
        const patternTypeEl = document.getElementById('patternType');
        if (!originXEl || !patternTypeEl) {
            console.warn('Form elements not found, cannot generate model');
            return;
        }
        
        updateStatus(t('status.generating'));
        
        // Get form values
        const params = {
            originX: parseFloat(originXEl.value),
            originY: parseFloat(document.getElementById('originY').value),
            originZ: parseFloat(document.getElementById('originZ').value),
            cellSizeX: parseFloat(document.getElementById('cellSizeX').value),
            cellSizeY: parseFloat(document.getElementById('cellSizeY').value),
            cellSizeZ: parseFloat(document.getElementById('cellSizeZ').value),
            cellsX: parseInt(document.getElementById('cellsX').value),
            cellsY: parseInt(document.getElementById('cellsY').value),
            cellsZ: parseInt(document.getElementById('cellsZ').value),
            patternType: patternTypeEl.value
        };
        
        // Validate inputs - prevent DoS attacks with extremely large numbers
        // Check for NaN, Infinity, or invalid numbers
        const numericFields = ['originX', 'originY', 'originZ', 'cellSizeX', 'cellSizeY', 'cellSizeZ', 'cellsX', 'cellsY', 'cellsZ'];
        for (const field of numericFields) {
            if (!isFinite(params[field]) || isNaN(params[field])) {
                throw new Error(t('errors.invalidNumber', { field: field }));
            }
        }
        
        // Validate cell sizes (must be positive and reasonable)
        const MAX_CELL_SIZE = 10000; // 10km max cell size
        if (params.cellSizeX <= 0 || params.cellSizeX > MAX_CELL_SIZE ||
            params.cellSizeY <= 0 || params.cellSizeY > MAX_CELL_SIZE ||
            params.cellSizeZ <= 0 || params.cellSizeZ > MAX_CELL_SIZE) {
            throw new Error(t('errors.cellSizeInvalid'));
        }
        
        // Validate cell counts (must be positive and reasonable to prevent DoS)
        const MAX_CELLS = 1000; // Maximum 1000 cells per dimension (1 billion total blocks max)
        if (params.cellsX <= 0 || params.cellsX > MAX_CELLS ||
            params.cellsY <= 0 || params.cellsY > MAX_CELLS ||
            params.cellsZ <= 0 || params.cellsZ > MAX_CELLS) {
            throw new Error(t('errors.cellCountInvalid'));
        }
        
        // Validate patternType (whitelist approach to prevent injection)
        const VALID_PATTERNS = [
            'porphyry_ore', 'vein_ore', 'ellipsoid_ore', 'salt_dome',
            'random_clusters', 'inclined_vein', 'ore_horizon',
            'random', 'checkerboard', 'gradient', 'layered', 'uniform'
        ];
        if (!VALID_PATTERNS.includes(params.patternType)) {
            params.patternType = 'random_clusters'; // Default to safe value
        }
        
        const totalCells = params.cellsX * params.cellsY * params.cellsZ;
        
        // Additional safety check: prevent extremely large models that could crash the browser
        const MAX_TOTAL_CELLS = 100000000; // 100 million blocks max
        if (totalCells > MAX_TOTAL_CELLS) {
            throw new Error(t('errors.modelTooLarge', { max: MAX_TOTAL_CELLS.toLocaleString() }));
        }
        
        // Check cache first for large models
        const cacheKey = generateCacheKey(params);
        let blocks = null;
        
        if (totalCells >= LARGE_MODEL_THRESHOLD) {
            updateStatus(t('status.checkingCache'));
            blocks = loadBlocksFromCache(cacheKey);
            if (blocks) {
                updateStatus(t('status.loadedFromCache', { count: blocks.length.toLocaleString() }), 'success');
                currentBlocks = blocks;
                currentParams = params;
                
                // Update visualization (may need to limit for very large models)
                // Skip thinning if slice view mode is selected (slice modes handle their own filtering)
                const viewModeSelect = document.getElementById('viewMode');
                const currentViewMode = viewModeSelect ? viewModeSelect.value : 'solid';
                const isSliceMode = ['slicesX', 'slicesY', 'slicesZ'].includes(currentViewMode);
                
                const blocksToVisualize = (totalCells > 200000 && !isSliceMode)
                    ? blocks.filter((_, idx) => idx % Math.ceil(totalCells / 200000) === 0)
                    : blocks;
                
                updateVisualization(
                    blocksToVisualize,
                    params.cellSizeX,
                    params.cellSizeY,
                    params.cellSizeZ
                );
                
                // Zoom to fit on first generation (startup)
                if (isFirstGeneration && typeof zoomToFit === 'function') {
                    // Use setTimeout to ensure visualization is complete
                    setTimeout(() => {
                        zoomToFit();
                        isFirstGeneration = false;
                    }, 100);
                }
                
                document.getElementById('exportBtn').disabled = false;
                const saveImageBtn = document.getElementById('saveImageBtn');
                if (saveImageBtn) {
                    saveImageBtn.disabled = false;
                }
                
                if (totalCells > 200000) {
                    updateStatus(
                        t('status.modelLoadedLarge', { count: blocks.length.toLocaleString() }),
                        'success'
                    );
                } else {
                    updateStatus(
                        t('status.modelLoaded', { count: blocks.length.toLocaleString() }),
                        'success'
                    );
                }
                return;
            }
        }
        
        // Generate blocks using standard format
        updateStatus(t('status.generatingBlocks', { count: totalCells.toLocaleString() }));
        
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
            updateStatus(t('status.generatingLarge'));
            blocks = await generateLargeModel(gridParams);
        } else {
            blocks = generateRegularGrid(gridParams);
        }
        
        // Generate or use saved random seed
        if (!currentRandomSeed) {
            // Generate new seed values
            currentRandomSeed = {
                timeSeed: Date.now() % 1000000,
                randomComponent: Math.random() * 10000
            };
        }
        
        // Apply material pattern
        updateStatus(t('status.applyingPattern'));
        const blocksWithMaterials = applyMaterialPattern(
            blocks,
            params.patternType,
            params.cellsX,
            params.cellsY,
            params.cellsZ,
            currentRandomSeed // Pass seed for deterministic generation
        );
        
        // Clear seed after use so next generation gets new random values
        // (unless loading from gallery, which will set it before generation)
        if (!currentRandomSeed || !currentRandomSeed.fromGallery) {
            currentRandomSeed = null;
        }
        
        // Store current blocks and params
        currentBlocks = blocksWithMaterials;
        currentParams = params;
        
        // Cache large models
        if (totalCells >= LARGE_MODEL_THRESHOLD) {
            updateStatus(t('status.caching'));
            saveBlocksToCache(cacheKey, blocksWithMaterials);
        }
        
        // Update visualization (limit for very large models)
        // Skip thinning if slice view mode is selected (slice modes handle their own filtering)
        const viewModeSelect = document.getElementById('viewMode');
        const currentViewMode = viewModeSelect ? viewModeSelect.value : 'solid';
        const isSliceMode = ['slicesX', 'slicesY', 'slicesZ'].includes(currentViewMode);
        
        const blocksToVisualize = (totalCells > 200000 && !isSliceMode)
            ? blocksWithMaterials.filter((_, idx) => idx % Math.ceil(totalCells / 200000) === 0)
            : blocksWithMaterials;
        
        updateVisualization(
            blocksToVisualize,
            params.cellSizeX,
            params.cellSizeY,
            params.cellSizeZ
        );
        
        // Zoom to fit on first generation (startup)
        if (isFirstGeneration && typeof zoomToFit === 'function') {
            // Use setTimeout to ensure visualization is complete
            setTimeout(() => {
                zoomToFit();
                isFirstGeneration = false;
            }, 100);
        }
        
        // Enable export button and save button
        document.getElementById('exportBtn').disabled = false;
        const saveModelBtn = document.getElementById('saveModelBtn');
        if (saveModelBtn && currentBlocks.length > 0) {
            saveModelBtn.disabled = false;
        }
        const saveImageBtn = document.getElementById('saveImageBtn');
        if (saveImageBtn && currentBlocks.length > 0) {
            saveImageBtn.disabled = false;
        }
        
        // Track model generation for statistics
        trackModelGeneration(params, currentBlocks);
        
        // Calculate and store model statistics
        currentModelStats = calculateModelStats(currentBlocks, params);
        
        // Display model statistics (use setTimeout to ensure DOM is ready)
        setTimeout(() => {
            if (typeof updateModelStatsDisplay === 'function') {
                updateModelStatsDisplay();
            }
        }, 100);
        
        // Update status
        if (totalCells > 200000) {
            updateStatus(
                t('status.modelGeneratedLarge', { 
                    count: currentBlocks.length.toLocaleString(),
                    pattern: t(`patterns.${params.patternType}`)
                }),
                'success'
            );
        } else {
            updateStatus(
                t('status.modelGenerated', { 
                    count: currentBlocks.length.toLocaleString(),
                    pattern: t(`patterns.${params.patternType}`)
                }),
                'success'
            );
        }
        
    } catch (error) {
        updateStatus(t('status.error', { message: error.message }), 'error');
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
            updateStatus(t('status.generatingProgress', {
                progress: progress,
                processed: processed.toLocaleString(),
                total: total.toLocaleString()
            }));
            
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
async function handleExport() {
    if (currentBlocks.length === 0) {
        updateStatus(t('status.noBlocksToExport'), 'error');
        return;
    }
    
    // Check if JSZip is available
    if (typeof JSZip === 'undefined') {
        updateStatus(t('status.zipNotAvailable'), 'info');
        // Fallback to non-compressed CSV
        exportAsCsv();
        return;
    }
    
    try {
        updateStatus(t('status.exporting'));
        
        // Use standard CSV export (chunked to avoid string length limits)
        // blocksToCsv now handles chunking internally for very large models
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
        
        // Check if CSV content is too large for a single string (safety check)
        if (csvContent.length > 500 * 1024 * 1024) { // 500MB limit
            updateStatus(t('status.csvTooLarge'), 'error');
            return;
        }
        
        // Create ZIP file
        const zip = new JSZip();
        const timestamp = Date.now();
        const csvFileName = `block_model_${timestamp}.csv`;
        
        // Add CSV to ZIP (JSZip handles large content efficiently)
        zip.file(csvFileName, csvContent);
        
        // Generate ZIP file as blob
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 6 // Balance between compression and speed (1-9, 6 is good default)
            }
        });
        
        // Create download link
        const link = document.createElement('a');
        const url = URL.createObjectURL(zipBlob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `block_model_${timestamp}.zip`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        // Calculate compression ratio
        const originalSize = new Blob([csvContent]).size;
        const compressedSize = zipBlob.size;
        const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
        
        // Track export for statistics
        trackExport();
        
        updateStatus(
            t('status.exportSuccess', {
                count: currentBlocks.length.toLocaleString(),
                originalSize: (originalSize / 1024 / 1024).toFixed(2),
                compressedSize: (compressedSize / 1024 / 1024).toFixed(2),
                ratio: compressionRatio
            }),
            'success'
        );
        
    } catch (error) {
        updateStatus(t('status.exportError', { message: error.message }), 'error');
        console.error('ZIP export error:', error);
        // Fallback to non-compressed CSV
        exportAsCsv();
    }
}

/**
 * Save viewport image as PNG
 */
function saveViewportImage() {
    // Access renderer from visualization module
    // Check if renderer is available globally or through window
    let canvas = null;
    if (typeof window !== 'undefined' && window.renderer && window.renderer.domElement) {
        canvas = window.renderer.domElement;
    } else if (typeof renderer !== 'undefined' && renderer && renderer.domElement) {
        canvas = renderer.domElement;
    } else {
        // Try to find canvas element directly
        const canvasContainer = document.getElementById('canvasContainer');
        if (canvasContainer) {
            canvas = canvasContainer.querySelector('canvas');
        }
    }
    
    if (!canvas) {
        updateStatus(t('status.imageExportError', { message: 'Canvas not found' }), 'error');
        return;
    }
    
    try {
        // Ensure the scene is rendered before capturing
        // Access renderer and scene from window (set by visualization.js)
        if (window.renderer && window.scene && window.camera) {
            window.renderer.render(window.scene, window.camera);
        }
        
        // Get image data from canvas
        const imageData = canvas.toDataURL('image/png');
        
        // Create download link
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        link.setAttribute('href', imageData);
        link.setAttribute('download', `block_model_viewport_${timestamp}.png`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        updateStatus(t('status.imageExportSuccess'), 'success');
    } catch (error) {
        updateStatus(t('status.imageExportError', { message: error.message }), 'error');
        console.error('Image export error:', error);
    }
}

/**
 * Fallback function to export as plain CSV (no compression)
 */
function exportAsCsv() {
    try {
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
        
        // Track export for statistics
        trackExport();
        
        updateStatus(
            t('status.csvSuccess', { count: currentBlocks.length.toLocaleString() }),
            'success'
        );
    } catch (error) {
        updateStatus(t('status.csvError', { message: error.message }), 'error');
        console.error('CSV export error:', error);
    }
}

/**
 * Initialize About modal
 */
function initAboutModal() {
    const aboutBtn = document.getElementById('aboutBtn');
    const aboutModal = document.getElementById('aboutModal');
    const aboutClose = aboutModal?.querySelector('.modal-close');
    const githubBtn = document.getElementById('githubBtn');
    
    if (aboutBtn && aboutModal) {
        aboutBtn.addEventListener('click', () => {
            aboutModal.style.display = 'block';
        });
        
        if (aboutClose) {
            aboutClose.addEventListener('click', () => {
                aboutModal.style.display = 'none';
            });
        }
        
        // Close when clicking outside modal
        aboutModal.addEventListener('click', (e) => {
            if (e.target === aboutModal) {
                aboutModal.style.display = 'none';
            }
        });
    }
    
    // GitHub button - open GitHub repository in new tab
    if (githubBtn) {
        githubBtn.addEventListener('click', () => {
            window.open('https://github.com/cjandrews/block-model-generator', '_blank', 'noopener,noreferrer');
        });
    }
}

/**
 * Initialize Documentation button
 */
function initDocsButton() {
    const openDocs = () => {
        // Get current locale to pass to documentation
        let currentLocale = typeof getLocale === 'function' ? getLocale() : 'en';
        
        // Sanitize locale parameter to prevent XSS/URL manipulation
        // Only allow alphanumeric characters (2-5 chars for locale codes)
        const SUPPORTED_LOCALES = ['en', 'es', 'fr'];
        if (!SUPPORTED_LOCALES.includes(currentLocale)) {
            currentLocale = 'en'; // Default to English if invalid
        }
        
        // URL encode the locale parameter (though it should be safe after validation)
        const safeLocale = encodeURIComponent(currentLocale);
        
        // Open documentation in a new window with locale parameter
        const docsWindow = window.open(`docs.html?locale=${safeLocale}`, 'BlockModelDocs', 
            'width=1200,height=800,scrollbars=yes,resizable=yes');
        
        if (docsWindow) {
            docsWindow.focus();
        } else {
            // Fallback if popup is blocked
            window.location.href = `docs.html?locale=${safeLocale}`;
        }
    };
    
    // Handle header button (if it still exists)
    const docsBtn = document.getElementById('docsBtn');
    if (docsBtn) {
        docsBtn.addEventListener('click', openDocs);
    }
    
    // Handle control panel button (for mobile visibility)
    const docsBtnControl = document.getElementById('docsBtnControl');
    if (docsBtnControl) {
        docsBtnControl.addEventListener('click', openDocs);
    }
}

/**
 * Initialize Memory Monitor modal
 */
function initMemoryModal() {
    const memoryBtn = document.getElementById('memoryBtn');
    const memoryPanel = document.getElementById('memoryPanel');
    const memoryClose = memoryPanel?.querySelector('.memory-panel-close');
    const memoryDetails = document.getElementById('memoryDetails');
    
    let memoryUpdateInterval = null;
    
    function formatBytes(bytes) {
        // Use i18n formatBytes function if available, otherwise fallback
        if (typeof formatBytes === 'function' && window.formatBytes) {
            return window.formatBytes(bytes);
        }
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    function updateMemoryInfo() {
        if (!memoryDetails) return;
        
        let info = [];
        
        // Try to get memory info from performance API (Chrome/Edge)
        if (performance.memory) {
            const mem = performance.memory;
            info.push(`${t('memory.usedHeap')}: ${formatBytes(mem.usedJSHeapSize)}`);
            info.push(`${t('memory.totalHeap')}: ${formatBytes(mem.totalJSHeapSize)}`);
            info.push(`${t('memory.heapLimit')}: ${formatBytes(mem.jsHeapSizeLimit)}`);
            
            const percentUsed = ((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100).toFixed(1);
            info.push(`${t('memory.heapUsage')}: ${percentUsed}%`);
        } else {
            info.push(t('memory.note'));
        }
        
        // Try to get memory info from navigator.deviceMemory (if available)
        if (navigator.deviceMemory) {
            info.push(`${t('memory.deviceMemory')}: ${navigator.deviceMemory} GB`);
        }
        
        // Count Three.js objects if available
        if (typeof THREE !== 'undefined' && window.scene) {
            let objectCount = 0;
            let geometryCount = 0;
            let materialCount = 0;
            let textureCount = 0;
            
            try {
                // Add a safety limit to prevent infinite recursion
                let objectCountLimit = 0;
                const MAX_OBJECTS = 100000; // Safety limit
                
                window.scene.traverse((obj) => {
                    objectCountLimit++;
                    if (objectCountLimit > MAX_OBJECTS) {
                        console.warn('Scene object count limit reached, stopping traversal');
                        return;
                    }
                    
                    objectCount++;
                    if (obj.geometry) geometryCount++;
                    if (obj.material) {
                        if (Array.isArray(obj.material)) {
                            materialCount += obj.material.length;
                        } else {
                            materialCount++;
                        }
                    }
                });
                
                // Count textures (approximate)
                // Use a safer approach to avoid stack overflow from Object.values()
                const textures = new Set();
                try {
                    let textureTraverseLimit = 0;
                    const MAX_TEXTURE_TRAVERSE = 10000;
                    
                    window.scene.traverse((obj) => {
                        textureTraverseLimit++;
                        if (textureTraverseLimit > MAX_TEXTURE_TRAVERSE) {
                            return;
                        }
                        
                        if (obj.material) {
                            const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
                            materials.forEach(mat => {
                                if (mat && typeof mat === 'object') {
                                    // Safely check common texture properties instead of iterating all
                                    const textureProps = ['map', 'normalMap', 'bumpMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'lightMap', 'displacementMap', 'alphaMap'];
                                    textureProps.forEach(prop => {
                                        try {
                                            const val = mat[prop];
                                            if (val && typeof val === 'object' && val.isTexture) {
                                                textures.add(val);
                                            }
                                        } catch (e) {
                                            // Skip if property access fails
                                        }
                                    });
                                }
                            });
                        }
                    });
                } catch (e) {
                    // Silently fail if traversal causes issues
                    console.warn('Error counting textures:', e);
                }
                textureCount = textures.size;
                
                info.push('');
                info.push(t('memory.threejsObjects'));
                info.push(`  ${t('memory.sceneObjects')}: ${objectCount}`);
                info.push(`  ${t('memory.geometries')}: ${geometryCount}`);
                info.push(`  ${t('memory.materials')}: ${materialCount}`);
                info.push(`  ${t('memory.textures')}: ${textureCount}`);
            } catch (e) {
                // Silently fail if scene is not accessible
            }
        }
        
        memoryDetails.innerHTML = info.join('<br>');
    }
    
    if (memoryBtn && memoryPanel) {
        memoryBtn.addEventListener('click', () => {
            // Toggle panel visibility
            if (memoryPanel.style.display === 'none' || !memoryPanel.style.display) {
                memoryPanel.style.display = 'block';
                updateMemoryInfo();
                
                // Update memory info every second while panel is open
                if (memoryUpdateInterval) {
                    clearInterval(memoryUpdateInterval);
                }
                memoryUpdateInterval = setInterval(updateMemoryInfo, 1000);
            } else {
                memoryPanel.style.display = 'none';
                if (memoryUpdateInterval) {
                    clearInterval(memoryUpdateInterval);
                    memoryUpdateInterval = null;
                }
            }
        });
        
        if (memoryClose) {
            memoryClose.addEventListener('click', () => {
                memoryPanel.style.display = 'none';
                if (memoryUpdateInterval) {
                    clearInterval(memoryUpdateInterval);
                    memoryUpdateInterval = null;
                }
            });
        }
    }
}

/**
 * Update status message
 * @param {string} message - Status message
 * @param {string} type - Message type: 'info', 'success', 'error'
 */
function updateStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    const statusText = document.getElementById('statusText');
    const statusClose = document.getElementById('statusClose');
    
    if (statusEl && statusText) {
        statusText.textContent = message;
        statusEl.className = `status-canvas-message ${type}`;
        statusEl.style.display = 'flex';
        
        // Set up close button handler if not already set
        if (statusClose && !statusClose.dataset.handlerSet) {
            statusClose.addEventListener('click', () => {
                statusEl.style.display = 'none';
            });
            statusClose.dataset.handlerSet = 'true';
        }
    }
}

/**
 * Update badge text with count
 * @param {HTMLElement} button - Button element
 * @param {string} translationKey - Translation key for button text
 * @param {number} count - Count to display
 */
function updateBadgeText(button, translationKey, count) {
    if (!button) return;
    // Use translation function to get the base text, then append count if needed
    const baseText = t(translationKey);
    button.textContent = count > 0 ? `${baseText} (${count})` : baseText;
}

// ============================================================================
// Gamification: UI Initialization
// ============================================================================

/**
 * Initialize Statistics Panel
 */
function initStatsPanel() {
    const statsBtn = document.getElementById('statsBtn');
    const statsPanel = document.getElementById('statsPanel');
    const statsClose = statsPanel?.querySelector('.memory-panel-close');
    const statsContent = document.getElementById('statsContent');
    
    function updateStatsDisplay() {
        if (!statsContent) return;
        
        const stats = loadStats();
        const html = [];
        
        // Start table
        html.push('<table class="stats-table">');
        
        // Overview section
        html.push('<tr><th colspan="2">' + escapeHtml(t('stats.overview')) + '</th></tr>');
        html.push('<tr><td>' + escapeHtml(t('stats.totalModels')) + '</td><td><strong>' + stats.totalModels + '</strong></td></tr>');
        html.push('<tr><td>' + escapeHtml(t('stats.totalExports')) + '</td><td><strong>' + stats.totalExports + '</strong></td></tr>');
        
        if (stats.firstModelDate) {
            const firstDate = new Date(stats.firstModelDate).toLocaleDateString();
            html.push('<tr><td>' + escapeHtml(t('stats.firstModel')) + '</td><td>' + escapeHtml(firstDate) + '</td></tr>');
        }
        
        if (stats.lastModelDate) {
            const lastDate = new Date(stats.lastModelDate).toLocaleDateString();
            html.push('<tr><td>' + escapeHtml(t('stats.lastModel')) + '</td><td>' + escapeHtml(lastDate) + '</td></tr>');
        }
        
        // Patterns section
        if (stats.patternsTried.length > 0) {
            html.push('<tr><th colspan="2">' + escapeHtml(t('stats.patternsExplored')) + '</th></tr>');
            html.push('<tr><td>' + escapeHtml(t('stats.patternsTried')) + '</td><td><strong>' + stats.patternsTried.length + '</strong> ' + escapeHtml(t('stats.of12')) + '</td></tr>');
            
            // Most used pattern
            let mostUsed = '';
            let mostUsedCount = 0;
            Object.keys(stats.patternUsage).forEach(pattern => {
                if (stats.patternUsage[pattern] > mostUsedCount) {
                    mostUsedCount = stats.patternUsage[pattern];
                    mostUsed = pattern;
                }
            });
            if (mostUsed) {
                const patternName = t(`patterns.${mostUsed}`) || mostUsed;
                html.push('<tr><td>' + escapeHtml(t('stats.mostUsed')) + '</td><td><strong>' + escapeHtml(patternName) + '</strong> (' + mostUsedCount + 'x)</td></tr>');
            }
        }
        
        // Features section
        html.push('<tr><th colspan="2">' + escapeHtml(t('stats.featuresUsed')) + '</th></tr>');
        html.push('<tr><td>' + escapeHtml(t('stats.viewModes')) + '</td><td><strong>' + stats.viewModesUsed.length + '</strong> ' + escapeHtml(t('stats.of7')) + '</td></tr>');
        
        const toolsUsedCount = Object.values(stats.toolsUsed).filter(v => v).length;
        html.push('<tr><td>' + escapeHtml(t('stats.toolsUsed')) + '</td><td><strong>' + toolsUsedCount + '</strong> ' + escapeHtml(t('stats.of4')) + '</td></tr>');
        
        // Model characteristics
        if (stats.largestModel > 0) {
            html.push('<tr><th colspan="2">' + escapeHtml(t('stats.modelCharacteristics')) + '</th></tr>');
            html.push('<tr><td>' + escapeHtml(t('stats.largestModel')) + '</td><td><strong>' + stats.largestModel.toLocaleString() + '</strong> ' + escapeHtml(t('stats.blocks')) + '</td></tr>');
            html.push('<tr><td>' + escapeHtml(t('stats.averageModelSize')) + '</td><td><strong>' + stats.averageModelSize.toLocaleString() + '</strong> ' + escapeHtml(t('stats.blocks')) + '</td></tr>');
            if (stats.totalVolume > 0) {
                const volumeKm3 = stats.totalVolume / VOLUME_CONVERSION_FACTOR;
                html.push('<tr><td>' + escapeHtml(t('stats.totalVolume')) + '</td><td><strong>' + volumeKm3.toFixed(2) + '</strong> ' + escapeHtml(t('stats.millionM3')) + '</td></tr>');
            }
        }
        
        // Current session
        if (stats.currentSession.modelsGenerated > 0) {
            html.push('<tr><th colspan="2">' + escapeHtml(t('stats.currentSession')) + '</th></tr>');
            html.push('<tr><td>' + escapeHtml(t('stats.modelsGenerated')) + '</td><td><strong>' + stats.currentSession.modelsGenerated + '</strong></td></tr>');
        }
        
        html.push('</table>');
        statsContent.innerHTML = html.join('');
    }
    
    if (statsBtn && statsPanel) {
        statsBtn.addEventListener('click', () => {
            updateStatsDisplay();
            statsPanel.style.display = statsPanel.style.display === 'none' ? 'block' : 'none';
        });
        
        if (statsClose) {
            statsClose.addEventListener('click', () => {
                statsPanel.style.display = 'none';
            });
        }
        
        // Update stats badge (after i18n is ready)
        function updateStatsBadge() {
            if (!statsBtn) return;
            const stats = loadStats();
            const baseText = t('buttons.stats');
            // Only update if translation is loaded (not the key itself)
            if (baseText && baseText !== 'buttons.stats') {
                // Update title attribute with badge count
                const badgeText = stats.totalModels > 0 ? `${baseText} (${stats.totalModels})` : baseText;
                statsBtn.setAttribute('title', badgeText);
            }
        }
        
        // Wait for i18n to initialize before updating badge
        // Listen for localeChanged event to ensure translations are loaded
        function initStatsBadge() {
            const translated = t('buttons.stats');
            if (translated && translated !== 'buttons.stats') {
                // Translations are loaded
                updateStatsBadge();
                setInterval(updateStatsBadge, 5000); // Update every 5 seconds
            } else {
                // Wait a bit longer for translations
                setTimeout(initStatsBadge, 100);
            }
        }
        initStatsBadge();
        
        // Re-update badge when locale changes
        window.addEventListener('localeChanged', () => {
            setTimeout(updateStatsBadge, 50);
        });
    }
}

/**
 * Initialize Gallery Panel
 */
function initGalleryPanel() {
    const galleryBtn = document.getElementById('galleryBtn');
    const galleryPanel = document.getElementById('galleryPanel');
    const galleryClose = galleryPanel?.querySelector('.memory-panel-close');
    const galleryContent = document.getElementById('galleryContent');
    const saveCurrentModelBtn = document.getElementById('saveCurrentModelBtn');
    const saveModelBtn = document.getElementById('saveModelBtn');
    const saveModelModal = document.getElementById('saveModelModal');
    const saveModelConfirmBtn = document.getElementById('saveModelConfirmBtn');
    const modelNameInput = document.getElementById('modelNameInput');
    const saveModelModalClose = saveModelModal?.querySelector('.modal-close');
    
    function updateGalleryDisplay() {
        if (!galleryContent) return;
        
        const models = getSavedModels();
        
        if (models.length === 0) {
            galleryContent.innerHTML = `<p style="opacity: 0.7; text-align: center; padding: 20px;">${t('gallery.noModels')}</p>`;
            return;
        }
        
        const html = [];
        models.forEach(model => {
            const date = new Date(model.date).toLocaleDateString();
            const patternName = t(`patterns.${model.preview.pattern}`) || model.preview.pattern;
            
            html.push(`<div style="border: 1px solid rgba(255,255,255,0.2); padding: 12px; margin-bottom: 8px; border-radius: 4px;">`);
            html.push(`<div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">`);
            html.push(`<div style="flex: 1;">`);
            html.push(`<div style="font-weight: bold; margin-bottom: 4px;">${escapeHtml(model.name)}</div>`);
            html.push(`<div style="font-size: 0.85em; opacity: 0.8;">${escapeHtml(patternName)} • ${model.stats.blockCount.toLocaleString()} ${t('gallery.blocks')} • ${date}</div>`);
            html.push(`</div>`);
            html.push(`<div style="display: flex; gap: 4px;">`);
            html.push(`<button class="header-btn gallery-load-btn" style="padding: 4px 8px; font-size: 0.85em;" data-model-id="${escapeHtml(model.id)}" title="${t('gallery.load')}"><i class="fas fa-folder-open"></i></button>`);
            html.push(`<button class="header-btn gallery-delete-btn" style="padding: 4px 8px; font-size: 0.85em;" data-model-id="${escapeHtml(model.id)}" title="${t('gallery.delete')}"><i class="fas fa-trash"></i></button>`);
            html.push(`</div>`);
            html.push(`</div>`);
            html.push(`</div>`);
        });
        
        galleryContent.innerHTML = html.join('');
    }
    
    function openSaveModelDialog() {
        if (!currentParams || !currentModelStats) {
            updateStatus(t('gallery.generateFirst'), 'error');
            return;
        }
        modelNameInput.value = '';
        modelNameInput.placeholder = t('gallery.modelNamePlaceholder');
        saveModelModal.style.display = 'block';
        modelNameInput.focus();
    }
    
    function saveCurrentModel() {
        const name = modelNameInput.value.trim();
        if (!name) {
            updateStatus(t('gallery.enterName'), 'error');
            return;
        }
        
        if (name.length > MAX_MODEL_NAME_LENGTH) {
            updateStatus(t('gallery.nameTooLong', { max: MAX_MODEL_NAME_LENGTH }), 'error');
            return;
        }
        
        try {
            // Capture visualization state
            let visualizationState = null;
            if (typeof getVisualizationState === 'function') {
                visualizationState = getVisualizationState();
            }
            
            // Capture random seed if available
            let randomSeed = null;
            if (currentRandomSeed !== undefined && currentRandomSeed !== null) {
                randomSeed = currentRandomSeed;
            }
            
            saveModelToGallery(name, currentParams, currentModelStats, visualizationState, randomSeed);
            updateStatus(t('gallery.modelSaved', { name: name }), 'success');
            saveModelModal.style.display = 'none';
            updateGalleryDisplay();
            if (typeof window.updateGalleryBadge === 'function') {
                window.updateGalleryBadge();
            }
        } catch (e) {
            updateStatus(t('gallery.saveError', { message: e.message }), 'error');
        }
    }
    
    // Event delegation for gallery buttons (avoids XSS risk from inline onclick)
    function handleGalleryButtonClick(e) {
        const target = e.target.closest('.gallery-load-btn, .gallery-delete-btn');
        if (!target) return;
        
        const modelId = target.getAttribute('data-model-id');
        if (!modelId) return;
        
        if (target.classList.contains('gallery-load-btn')) {
            const model = loadModelFromGallery(modelId);
            if (model) {
                updateStatus(t('gallery.loading', { name: model.name }), 'info');
                galleryPanel.style.display = 'none';
                
                // Restore visualization state if available (delay until after generation)
                const visualizationStateToRestore = model.visualizationState;
                
                // Set random seed if available (mark as from gallery to preserve it)
                if (model.randomSeed) {
                    currentRandomSeed = {
                        ...model.randomSeed,
                        fromGallery: true
                    };
                } else {
                    // Clear seed so new random values are generated
                    currentRandomSeed = null;
                }
                
                setTimeout(() => {
                    handleGenerate().then(() => {
                        // Clear the gallery flag after generation
                        if (currentRandomSeed) {
                            currentRandomSeed.fromGallery = false;
                        }
                        
                        // Restore visualization state after generation completes
                        if (visualizationStateToRestore && typeof restoreVisualizationState === 'function') {
                            setTimeout(() => {
                                restoreVisualizationState(visualizationStateToRestore);
                            }, 100);
                        }
                    });
                    updateStatus(t('gallery.modelLoaded', { name: model.name }), 'success');
                }, 100);
            }
        } else if (target.classList.contains('gallery-delete-btn')) {
            if (confirm(t('gallery.deleteConfirm'))) {
                deleteModelFromGallery(modelId);
                updateGalleryDisplay();
                if (typeof window.updateGalleryBadge === 'function') {
                    window.updateGalleryBadge();
                }
                updateStatus(t('gallery.modelDeleted'), 'success');
            }
        }
    }
    
    if (galleryBtn && galleryPanel) {
        galleryBtn.addEventListener('click', () => {
            updateGalleryDisplay();
            galleryPanel.style.display = galleryPanel.style.display === 'none' ? 'block' : 'none';
        });
        
        if (galleryClose) {
            galleryClose.addEventListener('click', () => {
                galleryPanel.style.display = 'none';
            });
        }
        
        if (saveCurrentModelBtn) {
            saveCurrentModelBtn.addEventListener('click', openSaveModelDialog);
        }
        
        if (saveModelBtn) {
            saveModelBtn.addEventListener('click', openSaveModelDialog);
        }
        
        if (saveModelConfirmBtn) {
            saveModelConfirmBtn.addEventListener('click', saveCurrentModel);
        }
        
        
        if (saveModelModalClose) {
            saveModelModalClose.addEventListener('click', () => {
                saveModelModal.style.display = 'none';
            });
        }
        
        // Close modal on outside click
        if (saveModelModal) {
            saveModelModal.addEventListener('click', (e) => {
                if (e.target === saveModelModal) {
                    saveModelModal.style.display = 'none';
                }
            });
        }
        
        // Enter key to save
        if (modelNameInput) {
            modelNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveCurrentModel();
                }
            });
        }
        
        // Event delegation for gallery buttons (secure, avoids XSS)
        if (galleryContent) {
            galleryContent.addEventListener('click', handleGalleryButtonClick);
        }
        
        // Update gallery badge (after i18n is ready)
        function updateGalleryBadgeSafe() {
            if (!galleryBtn) return;
            const models = getSavedModels();
            const baseText = t('buttons.gallery');
            // Only update if translation is loaded (not the key itself)
            if (baseText && baseText !== 'buttons.gallery') {
                // Update title attribute with badge count
                const badgeText = models.length > 0 ? `${baseText} (${models.length})` : baseText;
                galleryBtn.setAttribute('title', badgeText);
            }
        }
        
        // Wait for i18n to initialize before updating badge
        function initGalleryBadge() {
            const translated = t('buttons.gallery');
            if (translated && translated !== 'buttons.gallery') {
                // Translations are loaded
                updateGalleryBadgeSafe();
            } else {
                // Wait a bit longer for translations
                setTimeout(initGalleryBadge, 100);
            }
        }
        initGalleryBadge();
        
        // Re-update badge when locale changes
        window.addEventListener('localeChanged', () => {
            setTimeout(updateGalleryBadgeSafe, 50);
        });
        
        // Expose updateGalleryBadge for use elsewhere
        window.updateGalleryBadge = updateGalleryBadgeSafe;
    }
}

/**
 * Initialize Model Statistics Display
 */
function initModelStatsDisplay() {
    const modelStatsModal = document.getElementById('modelStatsModal');
    const modelStatsContent = document.getElementById('modelStatsContent');
    const modelStatsBtn = document.getElementById('modelStatsBtn');
    const modelStatsClose = modelStatsModal?.querySelector('.modal-close');
    
    if (!modelStatsModal || !modelStatsContent || !modelStatsBtn) {
        console.warn('Model stats elements not found');
        return;
    }
    
    // Update button title with translation
    function updateButtonTitle() {
        if (modelStatsBtn && typeof t === 'function') {
            const translated = t('modelStats.title');
            if (translated && translated !== 'modelStats.title') {
                modelStatsBtn.setAttribute('title', translated);
            }
        }
    }
    
    // Open modal
    function openModelStatsModal() {
        if (currentModelStats && modelStatsModal) {
            updateModelStatsDisplay();
            modelStatsModal.style.display = 'block';
        }
    }
    
    // Close modal
    function closeModelStatsModal() {
        if (modelStatsModal) {
            modelStatsModal.style.display = 'none';
        }
    }
    
    // Set up button click handler
    modelStatsBtn.addEventListener('click', openModelStatsModal);
    
    // Set up close button handler
    if (modelStatsClose) {
        modelStatsClose.addEventListener('click', closeModelStatsModal);
    }
    
    // Close modal when clicking outside
    modelStatsModal.addEventListener('click', (e) => {
        if (e.target === modelStatsModal) {
            closeModelStatsModal();
        }
    });
    
    function updateModelStatsDisplay() {
        if (!modelStatsContent || !currentModelStats) {
            // Hide button if no stats available
            if (modelStatsBtn) {
                modelStatsBtn.style.display = 'none';
            }
            return;
        }
        
        // Show button when stats are available
        if (modelStatsBtn) {
            modelStatsBtn.style.display = 'flex';
        }
        
        const stats = currentModelStats;
        const html = [];
        
        // Key stats (always visible)
        html.push('<div style="margin-bottom: 12px;">');
        html.push(`<div style="margin-bottom: 4px;"><strong>${t('modelStats.blocks')}:</strong> ${stats.blockCount.toLocaleString()}</div>`);
        html.push(`<div style="margin-bottom: 4px;"><strong>${t('modelStats.volume')}:</strong> ${(stats.totalVolume / 1000).toFixed(1)}${t('modelStats.kM3')}</div>`);
        html.push(`<div style="margin-bottom: 4px;"><strong>${t('modelStats.ore')}:</strong> ${stats.orePercentage.toFixed(1)}% | <strong>${t('modelStats.waste')}:</strong> ${stats.wastePercentage.toFixed(1)}%</div>`);
        
        if (stats.zoneCount > 0) {
            html.push(`<div style="margin-bottom: 4px;"><strong>${t('modelStats.zones')}:</strong> ${stats.zoneCount}</div>`);
        }
        
        if (stats.gradeCu.hasData) {
            html.push(`<div style="margin-bottom: 4px;"><strong>${t('modelStats.cuGrade')}:</strong> ${stats.gradeCu.min.toFixed(2)}% - ${stats.gradeCu.max.toFixed(2)}% (${t('modelStats.avg')}: ${stats.gradeCu.avg.toFixed(2)}%)</div>`);
        }
        
        if (stats.gradeAu.hasData) {
            html.push(`<div style="margin-bottom: 4px;"><strong>${t('modelStats.auGrade')}:</strong> ${stats.gradeAu.min.toFixed(2)} - ${stats.gradeAu.max.toFixed(2)} ${t('modelStats.gPerT')} (${t('modelStats.avg')}: ${stats.gradeAu.avg.toFixed(2)})</div>`);
        }
        
        html.push('</div>');
        
        // Interesting facts
        if (stats.interestingFacts.length > 0) {
            html.push('<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">');
            html.push(`<div style="font-size: 1em; opacity: 0.9;"><strong>${t('modelStats.interestingFacts')}:</strong></div>`);
            stats.interestingFacts.forEach(fact => {
                html.push(`<div style="font-size: 0.95em; opacity: 0.85; margin-top: 6px;">• ${escapeHtml(fact)}</div>`);
            });
            html.push('</div>');
        }
        
        modelStatsContent.innerHTML = html.join('');
    }
    
    // Expose function to update display
    window.updateModelStatsDisplay = updateModelStatsDisplay;
    
    // Initial button title update
    updateButtonTitle();
    
    // Listen for locale changes to re-translate button title
    window.addEventListener('localeChanged', () => {
        setTimeout(updateButtonTitle, 50);
    });
}

// ============================================================================
// Gamification: Statistics Tracking
// ============================================================================

/**
 * Initialize statistics structure
 * @returns {Object} Statistics object
 */
function initStats() {
    return {
        totalModels: 0,
        totalExports: 0,
        firstModelDate: null,
        lastModelDate: null,
        totalSessionTime: 0,
        patternsTried: [],
        patternUsage: {},
        viewModesUsed: [],
        toolsUsed: {
            sliceTool: false,
            valueFilter: false,
            categoryFilter: false,
            groundLayer: false
        },
        largestModel: 0,
        averageModelSize: 0,
        totalVolume: 0,
        currentSession: {
            startTime: Date.now(),
            modelsGenerated: 0
        }
    };
}

/**
 * Load statistics from localStorage
 * @returns {Object} Statistics object
 */
function loadStats() {
    try {
        const stored = localStorage.getItem(STATS_STORAGE_KEY);
        if (stored) {
            const stats = JSON.parse(stored);
            // Initialize current session if not present
            if (!stats.currentSession || !stats.currentSession.startTime) {
                stats.currentSession = {
                    startTime: Date.now(),
                    modelsGenerated: 0
                };
            }
            return stats;
        }
    } catch (e) {
        console.error('Error loading statistics:', e);
    }
    return initStats();
}

/**
 * Save statistics to localStorage
 * @param {Object} stats - Statistics object
 */
function saveStats(stats) {
    try {
        localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {
        console.error('Error saving statistics:', e);
        // Handle quota exceeded error
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            updateStatus(t('gallery.storageQuotaExceeded'), 'error');
        }
    }
}

/**
 * Track model generation
 * @param {Object} params - Model parameters
 * @param {Array} blocks - Generated blocks
 */
function trackModelGeneration(params, blocks) {
    const stats = loadStats();
    const now = Date.now();
    
    // Update model counts
    stats.totalModels++;
    stats.currentSession.modelsGenerated++;
    
    // Update dates
    if (!stats.firstModelDate) {
        stats.firstModelDate = now;
    }
    stats.lastModelDate = now;
    
    // Track pattern
    const pattern = params.patternType;
    if (!stats.patternsTried.includes(pattern)) {
        stats.patternsTried.push(pattern);
    }
    stats.patternUsage[pattern] = (stats.patternUsage[pattern] || 0) + 1;
    
    // Track model size
    const blockCount = blocks.length;
    if (blockCount > stats.largestModel) {
        stats.largestModel = blockCount;
    }
    
    // Update average model size
    const totalModels = stats.totalModels;
    stats.averageModelSize = Math.round(
        ((stats.averageModelSize * (totalModels - 1)) + blockCount) / totalModels
    );
    
    // Calculate and track volume (approximate)
    const volume = params.cellSizeX * params.cellSizeY * params.cellSizeZ * blockCount;
    stats.totalVolume += volume;
    
    saveStats(stats);
    return stats;
}

/**
 * Track export
 */
function trackExport() {
    const stats = loadStats();
    stats.totalExports++;
    saveStats(stats);
}

/**
 * Track view mode usage
 * @param {string} mode - View mode name
 */
function trackViewMode(mode) {
    const stats = loadStats();
    if (!stats.viewModesUsed.includes(mode)) {
        stats.viewModesUsed.push(mode);
        saveStats(stats);
    }
}

/**
 * Track tool usage
 * @param {string} tool - Tool name: 'sliceTool', 'valueFilter', 'categoryFilter', 'groundLayer'
 */
function trackToolUsage(tool) {
    const stats = loadStats();
    if (stats.toolsUsed.hasOwnProperty(tool)) {
        stats.toolsUsed[tool] = true;
        saveStats(stats);
    }
}

/**
 * Update session time
 */
function updateSessionTime() {
    const stats = loadStats();
    if (stats.currentSession.startTime) {
        const sessionDuration = Math.floor((Date.now() - stats.currentSession.startTime) / 1000);
        stats.totalSessionTime += sessionDuration;
        stats.currentSession.startTime = Date.now(); // Reset for next session
        saveStats(stats);
    }
}

// ============================================================================
// Gamification: Model Statistics Calculation
// ============================================================================

/**
 * Calculate comprehensive statistics for a model
 * @param {Array} blocks - Array of block objects
 * @param {Object} params - Model parameters
 * @returns {Object} Model statistics
 */
function calculateModelStats(blocks, params) {
    if (!blocks || blocks.length === 0) {
        return null;
    }
    
    const stats = {
        blockCount: blocks.length,
        totalVolume: 0,
        dimensions: { width: 0, height: 0, depth: 0 },
        rockTypes: {},
        orePercentage: 0,
        wastePercentage: 0,
        zones: {},
        zoneCount: 0,
        gradeCu: { min: null, max: null, avg: 0, hasData: false },
        gradeAu: { min: null, max: null, avg: 0, hasData: false },
        econValue: { min: null, max: null, avg: 0, total: 0, hasData: false },
        density: { min: Infinity, max: -Infinity, avg: 0 },
        interestingFacts: []
    };
    
    // Calculate dimensions
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    let totalDensity = 0;
    let totalGradeCu = 0, gradeCuCount = 0;
    let totalGradeAu = 0, gradeAuCount = 0;
    let totalEconValue = 0, econValueCount = 0;
    let oreCount = 0;
    
    blocks.forEach(block => {
        // Dimensions
        minX = Math.min(minX, block.x);
        maxX = Math.max(maxX, block.x);
        minY = Math.min(minY, block.y);
        maxY = Math.max(maxY, block.y);
        minZ = Math.min(minZ, block.z);
        maxZ = Math.max(maxZ, block.z);
        
        // Rock types
        const rockType = block.rockType || block.material || 'Unknown';
        stats.rockTypes[rockType] = (stats.rockTypes[rockType] || 0) + 1;
        
        // Ore vs waste
        if (rockType.toLowerCase().includes('ore') || 
            (block.gradeCu && block.gradeCu > 0.3) ||
            (block.gradeAu && block.gradeAu > 0.5)) {
            oreCount++;
        }
        
        // Zones
        if (block.zone !== undefined && block.zone !== null) {
            const zone = String(block.zone);
            stats.zones[zone] = (stats.zones[zone] || 0) + 1;
        }
        
        // Density
        if (block.density !== undefined && block.density !== null) {
            stats.density.min = Math.min(stats.density.min, block.density);
            stats.density.max = Math.max(stats.density.max, block.density);
            totalDensity += block.density;
        }
        
        // Cu Grade
        if (block.gradeCu !== undefined && block.gradeCu !== null && !isNaN(block.gradeCu)) {
            stats.gradeCu.hasData = true;
            if (stats.gradeCu.min === null || block.gradeCu < stats.gradeCu.min) {
                stats.gradeCu.min = block.gradeCu;
            }
            if (stats.gradeCu.max === null || block.gradeCu > stats.gradeCu.max) {
                stats.gradeCu.max = block.gradeCu;
            }
            totalGradeCu += block.gradeCu;
            gradeCuCount++;
        }
        
        // Au Grade
        if (block.gradeAu !== undefined && block.gradeAu !== null && !isNaN(block.gradeAu)) {
            stats.gradeAu.hasData = true;
            if (stats.gradeAu.min === null || block.gradeAu < stats.gradeAu.min) {
                stats.gradeAu.min = block.gradeAu;
            }
            if (stats.gradeAu.max === null || block.gradeAu > stats.gradeAu.max) {
                stats.gradeAu.max = block.gradeAu;
            }
            totalGradeAu += block.gradeAu;
            gradeAuCount++;
        }
        
        // Economic Value
        if (block.econValue !== undefined && block.econValue !== null && !isNaN(block.econValue)) {
            stats.econValue.hasData = true;
            if (stats.econValue.min === null || block.econValue < stats.econValue.min) {
                stats.econValue.min = block.econValue;
            }
            if (stats.econValue.max === null || block.econValue > stats.econValue.max) {
                stats.econValue.max = block.econValue;
            }
            totalEconValue += block.econValue;
            econValueCount++;
        }
    });
    
    // Calculate averages
    stats.density.avg = blocks.length > 0 ? totalDensity / blocks.length : 0;
    if (stats.density.min === Infinity) stats.density.min = 0;
    if (stats.density.max === -Infinity) stats.density.max = 0;
    
    if (gradeCuCount > 0) {
        stats.gradeCu.avg = totalGradeCu / gradeCuCount;
    }
    
    if (gradeAuCount > 0) {
        stats.gradeAu.avg = totalGradeAu / gradeAuCount;
    }
    
    if (econValueCount > 0) {
        stats.econValue.avg = totalEconValue / econValueCount;
        stats.econValue.total = totalEconValue;
    }
    
    // Calculate dimensions
    stats.dimensions.width = maxX - minX + (params.cellSizeX || 0);
    stats.dimensions.height = maxY - minY + (params.cellSizeY || 0);
    stats.dimensions.depth = maxZ - minZ + (params.cellSizeZ || 0);
    
    // Calculate volume (cubic meters)
    stats.totalVolume = params.cellSizeX * params.cellSizeY * params.cellSizeZ * blocks.length;
    
    // Calculate percentages
    stats.orePercentage = blocks.length > 0 ? (oreCount / blocks.length) * 100 : 0;
    stats.wastePercentage = 100 - stats.orePercentage;
    
    // Zone count
    stats.zoneCount = Object.keys(stats.zones).length;
    
    // Generate interesting facts
    stats.interestingFacts = generateInterestingFacts(stats, params);
    
    return stats;
}

/**
 * Generate interesting facts about the model
 * @param {Object} stats - Model statistics
 * @param {Object} params - Model parameters
 * @returns {Array} Array of fact strings
 */
function generateInterestingFacts(stats, params) {
    const facts = [];
    
    // Volume fact
    if (stats.totalVolume >= 1000) {
        facts.push(t('modelStats.facts.volumeLarge', { volume: (stats.totalVolume / 1000).toFixed(1) }));
    } else {
        facts.push(t('modelStats.facts.volume', { volume: stats.totalVolume.toFixed(1) }));
    }
    
    // Ore percentage
    if (stats.orePercentage > 0) {
        facts.push(t('modelStats.facts.orePercentage', { percentage: stats.orePercentage.toFixed(1) }));
    }
    
    // Zone count
    if (stats.zoneCount > 0) {
        const zoneKey = stats.zoneCount > 1 ? 'modelStats.facts.zonesPlural' : 'modelStats.facts.zones';
        facts.push(t(zoneKey, { count: stats.zoneCount }));
    }
    
    // Grade ranges
    if (stats.gradeCu.hasData) {
        facts.push(t('modelStats.facts.cuGradeRange', { 
            min: stats.gradeCu.min.toFixed(2), 
            max: stats.gradeCu.max.toFixed(2) 
        }));
    }
    
    if (stats.gradeAu.hasData) {
        facts.push(t('modelStats.facts.auGradeRange', { 
            min: stats.gradeAu.min.toFixed(2), 
            max: stats.gradeAu.max.toFixed(2) 
        }));
    }
    
    // Economic value
    if (stats.econValue.hasData && stats.econValue.total > 0) {
        facts.push(t('modelStats.facts.econValue', { value: stats.econValue.total.toLocaleString() }));
    }
    
    // Rock type diversity
    const rockTypeCount = Object.keys(stats.rockTypes).length;
    if (rockTypeCount > 3) {
        facts.push(t('modelStats.facts.rockTypes', { count: rockTypeCount }));
    }
    
    // Model size category
    if (stats.blockCount >= 100000) {
        facts.push(t('modelStats.facts.sizeLarge'));
    } else if (stats.blockCount >= 50000) {
        facts.push(t('modelStats.facts.sizeMediumLarge'));
    } else if (stats.blockCount >= 10000) {
        facts.push(t('modelStats.facts.sizeMedium'));
    }
    
    return facts;
}

// ============================================================================
// Gamification: Model Gallery
// ============================================================================

/**
 * Generate UUID v4
 * Uses crypto.randomUUID() if available (more secure), falls back to Math.random()
 * @returns {string} UUID
 */
function generateUUID() {
    // Use crypto.randomUUID() if available (more secure)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback to Math.random() for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Load saved models from localStorage
 * @returns {Array} Array of saved models
 */
function loadSavedModels() {
    try {
        const stored = localStorage.getItem(GALLERY_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error loading saved models:', e);
    }
    return [];
}

/**
 * Save models array to localStorage
 * @param {Array} models - Array of saved models
 */
function saveModelsToGallery(models) {
    try {
        // Limit to MAX_SAVED_MODELS, keep most recent
        const sorted = models.sort((a, b) => new Date(b.date) - new Date(a.date));
        const limited = sorted.slice(0, MAX_SAVED_MODELS);
        localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(limited));
    } catch (e) {
        console.error('Error saving models to gallery:', e);
        // Handle quota exceeded error
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            updateStatus(t('gallery.storageQuotaExceeded'), 'error');
            // Try to save fewer models
            try {
                const reduced = sorted.slice(0, Math.floor(MAX_SAVED_MODELS * 0.8));
                localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(reduced));
                updateStatus(t('gallery.storageReduced'), 'info');
            } catch (e2) {
                console.error('Failed to save reduced gallery:', e2);
            }
        }
    }
}

/**
 * Save current model to gallery
 * @param {string} name - Model name
 * @param {Object} params - Model parameters
 * @param {Object} stats - Model statistics
 * @param {Object} visualizationState - Current visualization state (optional)
 * @param {Object} randomSeed - Random seed values used for generation (optional)
 * @returns {Object} Saved model object
 */
function saveModelToGallery(name, params, stats, visualizationState = null, randomSeed = null) {
    const models = loadSavedModels();
    
    const savedModel = {
        id: generateUUID(),
        name: name.trim() || 'Unnamed Model',
        date: new Date().toISOString(),
        params: {
            originX: params.originX,
            originY: params.originY,
            originZ: params.originZ,
            cellSizeX: params.cellSizeX,
            cellSizeY: params.cellSizeY,
            cellSizeZ: params.cellSizeZ,
            cellsX: params.cellsX,
            cellsY: params.cellsY,
            cellsZ: params.cellsZ,
            patternType: params.patternType
        },
        stats: {
            blockCount: stats.blockCount,
            totalVolume: stats.totalVolume,
            orePercentage: stats.orePercentage,
            zoneCount: stats.zoneCount,
            hasGrades: stats.gradeCu.hasData || stats.gradeAu.hasData,
            hasZones: stats.zoneCount > 0
        },
        preview: {
            pattern: params.patternType,
            size: stats.blockCount < 10000 ? 'small' : stats.blockCount < 50000 ? 'medium' : 'large',
            hasGrades: stats.gradeCu.hasData || stats.gradeAu.hasData,
            hasZones: stats.zoneCount > 0
        }
    };
    
    // Add visualization state if provided
    if (visualizationState) {
        savedModel.visualizationState = visualizationState;
    }
    
    // Add random seed if provided
    if (randomSeed) {
        savedModel.randomSeed = randomSeed;
    }
    
    models.push(savedModel);
    saveModelsToGallery(models);
    
    return savedModel;
}

/**
 * Load model from gallery (sets parameters and triggers generation)
 * @param {string} modelId - Model ID
 * @returns {Object|null} Model object or null if not found
 */
function loadModelFromGallery(modelId) {
    const models = loadSavedModels();
    const model = models.find(m => m.id === modelId);
    
    if (!model) {
        return null;
    }
    
    // Set form parameters
    document.getElementById('originX').value = model.params.originX;
    document.getElementById('originY').value = model.params.originY;
    document.getElementById('originZ').value = model.params.originZ;
    document.getElementById('cellSizeX').value = model.params.cellSizeX;
    document.getElementById('cellSizeY').value = model.params.cellSizeY;
    document.getElementById('cellSizeZ').value = model.params.cellSizeZ;
    document.getElementById('cellsX').value = model.params.cellsX;
    document.getElementById('cellsY').value = model.params.cellsY;
    document.getElementById('cellsZ').value = model.params.cellsZ;
    document.getElementById('patternType').value = model.params.patternType;
    
    return model;
}

/**
 * Delete model from gallery
 * @param {string} modelId - Model ID
 */
function deleteModelFromGallery(modelId) {
    const models = loadSavedModels();
    const filtered = models.filter(m => m.id !== modelId);
    saveModelsToGallery(filtered);
}

/**
 * Get all saved models
 * @returns {Array} Array of saved models
 */
function getSavedModels() {
    return loadSavedModels();
}

// Initialize when DOM is ready AND i18n is loaded
async function initializeApp() {
    // Wait for i18n to be ready (check if initI18n has completed)
    if (typeof initI18n === 'function') {
        // Wait a bit for i18n to initialize if it's still loading
        let attempts = 0;
        while (typeof getLocale === 'undefined' && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 10));
            attempts++;
        }
    }
    
    // Also listen for localeChanged event to ensure translations are loaded
    if (typeof getLocale === 'undefined') {
        await new Promise(resolve => {
            window.addEventListener('localeChanged', () => resolve(), { once: true });
            // Timeout after 1 second if event doesn't fire
            setTimeout(() => resolve(), 1000);
        });
    }
    
    init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
