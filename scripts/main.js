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
    
    // Initialize modals
    initAboutModal();
    initMemoryModal();
    initDocsButton();
    
    updateStatus(t('status.generatingInitial'));
    
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
        updateStatus(t('status.generating'));
        
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
        
        // Apply material pattern
        updateStatus(t('status.applyingPattern'));
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
        
        // Enable export button
        document.getElementById('exportBtn').disabled = false;
        
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
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
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
