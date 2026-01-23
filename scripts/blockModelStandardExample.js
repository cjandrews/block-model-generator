/**
 * Example Usage of Standardized Block Model Functions
 * Demonstrates integration with existing codebase
 * 
 * @license MIT License
 * @copyright Copyright (c) 2026 BuildIT Design Labs, LLC
 */

// Example 1: Generate a standard regular grid
function exampleGenerateGrid() {
    const gridParams = {
        xmOrig: 0,      // X model origin
        ymOrig: 0,      // Y model origin
        zmOrig: 0,      // Z model origin
        xInc: 30,       // 30m cell size in X
        yInc: 30,       // 30m cell size in Y
        zInc: 30,       // 30m cell size in Z
        nx: 20,         // 20 cells in X
        ny: 20,         // 20 cells in Y
        nz: 10          // 10 cells in Z
    };
    
    const blocks = generateRegularGrid(gridParams);
    console.log(`Generated ${blocks.length} blocks`);
    return blocks;
}

// Example 2: Apply material properties to blocks
function exampleApplyMaterials(blocks) {
    // Define material properties matching sample CSV data
    const materialDefinitions = {
        'Waste': {
            density: 2.5,
            gradeCu: 0.0,
            gradeAu: 0.0,
            econValue: -100.0  // Negative value for waste
        },
        'Magnetite': {
            density: 3.2,
            gradeCu: 0.55,
            gradeAu: 0.0,
            econValue: 300.0,
            zone: 'Zone1'
        },
        'Hematite': {
            density: 3.0,
            gradeCu: 0.60,
            gradeAu: 0.0,
            econValue: 280.0,
            zone: 'Zone1'
        },
        'Ore': {
            density: 3.5,
            gradeCu: 0.65,
            gradeAu: 1.25,
            econValue: 350.0,
            zone: 'Zone2'
        }
    };
    
    // Apply pattern (similar to existing applyMaterialPattern)
    const blocksWithMaterials = blocks.map((block, index) => {
        // Example: layered pattern
        const layerRatio = block.k / 10; // Assuming nz = 10
        let rockType;
        
        if (layerRatio < 0.2) {
            rockType = 'Waste';
        } else if (layerRatio < 0.5) {
            rockType = 'Magnetite';
        } else if (layerRatio < 0.8) {
            rockType = 'Hematite';
        } else {
            rockType = 'Ore';
        }
        
        const material = materialDefinitions[rockType];
        
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
    
    return applyMaterialProperties(blocksWithMaterials, materialDefinitions);
}

// Example 3: Export to CSV with different options
function exampleExportCSV(blocks) {
    // Standard export (MiningMath compatible)
    const csvStandard = blocksToCsv(blocks, {
        includeIndices: false,
        includeZone: true,
        includeGrades: true,
        includeEconValue: true,
        filterAirBlocks: true
    });
    
    // Export with indices (for debugging)
    const csvWithIndices = blocksToCsv(blocks, {
        includeIndices: true,
        includeZone: true,
        includeGrades: true,
        includeEconValue: true,
        filterAirBlocks: true
    });
    
    // Minimal export (coordinates and rock type only)
    const csvMinimal = blocksToCsv(blocks, {
        includeIndices: false,
        includeZone: false,
        includeGrades: false,
        includeEconValue: false,
        filterAirBlocks: true
    });
    
    return {
        standard: csvStandard,
        withIndices: csvWithIndices,
        minimal: csvMinimal
    };
}

// Example 4: Convert existing blocks to standard format
function exampleConvertLegacyBlocks(legacyBlocks) {
    return legacyBlocks.map(block => convertLegacyBlock(block));
}

// Example 5: Complete workflow
function exampleCompleteWorkflow() {
    // Step 1: Generate grid
    const gridParams = {
        xmOrig: 0,
        ymOrig: 0,
        zmOrig: 0,
        xInc: 30,
        yInc: 30,
        zInc: 30,
        nx: 10,
        ny: 10,
        nz: 5
    };
    
    let blocks = generateRegularGrid(gridParams);
    
    // Step 2: Apply materials
    blocks = exampleApplyMaterials(blocks);
    
    // Step 3: Export to CSV
    const csv = blocksToCsv(blocks);
    
    // Step 4: Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `block_model_standard_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return csv;
}

// Example 6: Integration with existing generateBlockGrid function
function exampleIntegrationWithExisting() {
    // Use existing function to generate blocks
    const legacyBlocks = generateBlockGrid(
        0, 0, 0,        // origin
        30, 30, 30,     // cell sizes
        10, 10, 5       // cell counts
    );
    
    // Apply existing material pattern
    const blocksWithMaterials = applyMaterialPattern(
        legacyBlocks,
        'layered',
        10, 10, 5
    );
    
    // Convert to standard format
    const standardBlocks = blocksWithMaterials.map(block => ({
        x: block.x,
        y: block.y,
        z: block.z,
        i: block.i,
        j: block.j,
        k: block.k,
        rockType: block.material,
        density: block.density,
        gradeCu: block.grade > 0 ? block.grade : undefined,
        econValue: block.value
    }));
    
    // Export using standard CSV function
    const csv = blocksToCsv(standardBlocks);
    
    return csv;
}
