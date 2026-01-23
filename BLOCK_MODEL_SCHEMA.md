# Standardized Block Model Schema

## Overview

This document defines the standardized block model schema used in this application, designed to be compatible with MiningMath and common mining software packages.

## Standard Field Schema

### Required Fields

| Field | Type | Description | Units | Example |
|-------|------|-------------|-------|---------|
| `X` | number | X coordinate (centroid) | meters | 15.0000 |
| `Y` | number | Y coordinate (centroid) | meters | 15.0000 |
| `Z` | number | Z coordinate (centroid) | meters | 15.0000 |
| `ROCKTYPE` | string | Rock type classification | - | "Waste", "Ore", "Magnetite", "Hematite" |
| `DENSITY` | number | Density | tonnes/m³ | 2.5000 |

### Optional Fields

| Field | Type | Description | Units | Example |
|-------|------|-------------|-------|---------|
| `ZONE` | string | Zone identifier | - | "Zone1", "Upper", "Lower" |
| `GRADE_CU` | number | Copper grade | % | 0.5000 |
| `GRADE_AU` | number | Gold grade | g/t or % | 1.2500 |
| `ECON_VALUE` | number | Economic value | currency units | 100.0000 |
| `I` | number | Grid index (X direction) | - | 0, 1, 2, ... |
| `J` | number | Grid index (Y direction) | - | 0, 1, 2, ... |
| `K` | number | Grid index (Z direction) | - | 0, 1, 2, ... |

## Coordinate Conventions

**Recommended: Centroids in CSV**

- Block centroids are calculated as: `centroid = origin + (index + 0.5) * increment`
- This is the standard format expected by most mining software
- Coordinates are stored in metric units (meters)

**Grid Parameters (Internal)**

- `XMORIG`, `YMORIG`, `ZMORIG`: Model origin coordinates
- `XINC`, `YINC`, `ZINC`: Cell size increments
- `NX`, `NY`, `NZ`: Number of cells in each direction

## Column Mapping from Sample CSVs

### mining_block_model.csv → Standard Schema

| Source Column | Standard Field | Notes |
|---------------|----------------|-------|
| `Block_ID` | (omitted) | Internal tracking, not in standard |
| `X` | `X` | Direct mapping ✓ |
| `Y` | `Y` | Direct mapping ✓ |
| `Z` | `Z` | Direct mapping ✓ |
| `Rock_Type` | `ROCKTYPE` | Direct mapping ✓ |
| `Ore_Grade (%)` | `GRADE_CU` | Assumed copper grade |
| `Tonnage` | (derived) | Calculated from density × volume |
| `Ore_Value (¥/tonne)` | `ECON_VALUE` | Economic value ✓ |
| `Mining_Cost (¥)` | (optional) | Economic field, not in standard |
| `Processing_Cost (¥)` | (optional) | Economic field, not in standard |
| `Waste_Flag` | (derived) | `ROCKTYPE === 'Waste'` |
| `Profit (¥)` | `ECON_VALUE` | Alternative economic value |
| `Target` | (optional) | Optimization field, not in standard |

### Marvin_Strategy_Optimization.CSV → Standard Schema

| Source Column | Standard Field | Notes |
|---------------|----------------|-------|
| `X` | `X` | Direct mapping ✓ |
| `Y` | `Y` | Direct mapping ✓ |
| `Z` | `Z` | Direct mapping ✓ |
| `@CU` | `GRADE_CU` | Copper grade ✓ |
| `@AU` | `GRADE_AU` | Gold grade ✓ |
| `/Slope` | (optional) | Geotechnical field, not in standard |
| `%Density` | `DENSITY` | Density ✓ |
| `$Process1` | `ECON_VALUE` | Economic value (scenario 1) |
| `$P1 Cu +5` | (optional) | Economic scenario variant |
| `$P1 Cu +10` | (optional) | Economic scenario variant |
| `$P1 Cu -5` | (optional) | Economic scenario variant |
| `$P1 Cu -10` | (optional) | Economic scenario variant |
| `$Waste` | `ECON_VALUE` | Economic value (waste scenario) |
| `+Proc Hours` | (optional) | Processing time, not in standard |

## CSV Export Rules (MiningMath Compatible)

1. **Comma Separator**: All fields separated by commas
2. **Metric Units**: All coordinates and measurements in metric units
3. **Short Header Names**: Uppercase, no spaces, underscores allowed
4. **No Air Blocks**: Blocks with density = 0 are filtered out by default
5. **Centroid Coordinates**: X, Y, Z represent block centroids
6. **Precision**: 4 decimal places for numeric values
7. **No Missing Values**: Empty numeric fields default to 0.0000

## JavaScript Interface

### Block Object

```javascript
{
    x: number,           // X centroid (meters)
    y: number,           // Y centroid (meters)
    z: number,           // Z centroid (meters)
    i: number,           // I index (grid position)
    j: number,           // J index (grid position)
    k: number,           // K index (grid position)
    rockType: string,    // Rock type classification
    density: number,     // Density (tonnes/m³)
    zone?: string,       // Optional zone identifier
    gradeAu?: number,    // Optional gold grade
    gradeCu?: number,    // Optional copper grade
    econValue?: number   // Optional economic value
}
```

### Grid Parameters

```javascript
{
    xmOrig: number,  // X model origin (XMORIG)
    ymOrig: number,  // Y model origin (YMORIG)
    zmOrig: number,  // Z model origin (ZMORIG)
    xInc: number,    // X cell increment (XINC)
    yInc: number,    // Y cell increment (YINC)
    zInc: number,    // Z cell increment (ZINC)
    nx: number,      // Number of cells in X (NX)
    ny: number,      // Number of cells in Y (NY)
    nz: number       // Number of cells in Z (NZ)
}
```

## Usage Examples

### Generate Regular Grid

```javascript
const params = {
    xmOrig: 0,
    ymOrig: 0,
    zmOrig: 0,
    xInc: 30,
    yInc: 30,
    zInc: 30,
    nx: 10,
    ny: 10,
    nz: 10
};

const blocks = generateRegularGrid(params);
```

### Export to CSV

```javascript
const csv = blocksToCsv(blocks, {
    includeIndices: false,    // Omit I, J, K from CSV
    includeZone: true,        // Include ZONE if present
    includeGrades: true,       // Include grade fields if present
    includeEconValue: true,    // Include economic value if present
    filterAirBlocks: true      // Filter out density = 0 blocks
});
```

### Convert Legacy Format

```javascript
const legacyBlock = {
    blockId: 1,
    x: 15.0,
    y: 15.0,
    z: 15.0,
    i: 0,
    j: 0,
    k: 0,
    material: 'Ore_Med',
    density: 3.2,
    grade: 1.0,
    value: 25
};

const standardBlock = convertLegacyBlock(legacyBlock);
```

## Best Practices

1. **Always use centroids** for coordinates in CSV exports
2. **Filter air blocks** (density = 0) before export
3. **Use short header names** (uppercase, no spaces)
4. **Maintain 4 decimal precision** for numeric values
5. **Include only present fields** in CSV (omit undefined optional fields)
6. **Use metric units** consistently throughout
7. **Validate grid parameters** before generating blocks

## Compatibility Notes

- **MiningMath**: Fully compatible with standard schema
- **Vulcan**: Compatible (may require coordinate transformation)
- **Surpac**: Compatible (may require additional fields)
- **MineSight**: Compatible (may require zone field)
- **Datamine**: Compatible (may require block ID field)
