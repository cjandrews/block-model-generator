# Ore Body Generation Algorithms

This document describes 2-3 algorithms for generating geologically plausible ore bodies that populate Gold (GRADE_AU) and Copper (GRADE_CU) values while respecting the block model parameters defined in the application.

## Algorithm Overview

All algorithms will:
- Respect grid parameters: `xmOrig`, `ymOrig`, `zmOrig`, `xInc`, `yInc`, `zInc`, `nx`, `ny`, `nz`
- Generate continuous grade distributions (not discrete material types)
- Populate both `gradeAu` and `gradeCu` fields
- Create spatially correlated grade distributions (geological continuity)
- Allow configurable parameters for different deposit styles

---

## Algorithm 1: Ellipsoid/Plunging Ore Body

### Description
Creates ellipsoidal ore bodies that can plunge at various angles, simulating typical massive sulfide or skarn deposits. Grades decrease from the core outward following a Gaussian-like distribution.

### Geological Rationale
- Models massive, lens-shaped ore bodies
- Supports plunging structures (common in folded terrains)
- Grade decreases from core to margins (typical of replacement deposits)
- Can model multiple overlapping ore bodies

### Parameters
```javascript
{
    // Ore body center (in model coordinates)
    centerX: number,      // X coordinate of ore body center
    centerY: number,      // Y coordinate of ore body center
    centerZ: number,      // Z coordinate of ore body center
    
    // Ore body dimensions (semi-axes of ellipsoid, in meters)
    radiusX: number,       // Half-length in X direction
    radiusY: number,       // Half-length in Y direction
    radiusZ: number,       // Half-length in Z direction
    
    // Plunge angles (in degrees)
    plungeAngle: number,  // Plunge angle (0-90°, 0 = horizontal)
    plungeAzimuth: number, // Azimuth of plunge direction (0-360°)
    
    // Grade parameters
    maxGradeCu: number,   // Maximum copper grade at center (%)
    maxGradeAu: number,   // Maximum gold grade at center (g/t)
    gradeDecay: number,    // Decay factor (0-1, lower = sharper gradient)
    
    // Grade correlation
    cuAuRatio: number,    // Typical Cu:Au ratio (e.g., 100:1 for porphyry)
    gradeVariation: number // Random variation factor (0-1)
}
```

### Algorithm Steps
1. For each block, calculate distance from block centroid to ore body center
2. Transform coordinates to account for plunge (rotation around center)
3. Calculate normalized distance within ellipsoid (0 = center, 1 = edge)
4. Apply decay function: `grade = maxGrade * exp(-decayFactor * distance²)`
5. Add spatial correlation (smooth variations)
6. Apply random variation within defined limits
7. Set `gradeCu` and `gradeAu` based on correlation ratio

### Implementation Notes
- Use ellipsoid distance formula: `d = sqrt((x/rx)² + (y/ry)² + (z/rz)²)`
- Apply rotation matrix for plunge transformation
- Use Perlin noise or Gaussian smoothing for spatial correlation
- Ensure grades respect minimum thresholds (e.g., > 0.1% Cu for ore classification)

---

## Algorithm 2: Vein/Structural Control

### Description
Creates linear or planar ore bodies following structural controls (faults, veins, shear zones). Grades vary along strike and dip, with higher grades typically at intersections or bends.

### Geological Rationale
- Models vein-type deposits (epithermal, mesothermal gold)
- Simulates structural control (faults, fractures, shear zones)
- Grade variations along strike/dip (typical of vein systems)
- Can model multiple parallel or intersecting structures

### Parameters
```javascript
{
    // Vein/structure definition
    strike: number,        // Strike angle (0-360°, measured from North)
    dip: number,           // Dip angle (0-90°, 0 = horizontal)
    dipDirection: number,  // Dip direction (0-360°)
    
    // Vein position (point on vein plane)
    veinX: number,         // X coordinate of reference point
    veinY: number,         // Y coordinate of reference point
    veinZ: number,         // Z coordinate of reference point
    
    // Vein dimensions
    strikeLength: number,  // Length along strike (meters)
    dipLength: number,     // Length down dip (meters)
    width: number,         // Vein width (meters, half-width from center)
    
    // Grade parameters
    maxGradeCu: number,    // Maximum copper grade (%)
    maxGradeAu: number,    // Maximum gold grade (g/t)
    gradeAlongStrike: function, // Grade variation function along strike
    gradeDownDip: function,     // Grade variation function down dip
    
    // Structural complexity
    numVeins: number,      // Number of parallel veins
    veinSpacing: number,   // Spacing between veins (meters)
    intersectionBonus: number // Grade multiplier at intersections
}
```

### Algorithm Steps
1. For each block, calculate perpendicular distance to vein plane
2. Calculate position along strike and down dip
3. If within vein width, calculate grade based on:
   - Distance from vein center (Gaussian decay)
   - Position along strike (user-defined function)
   - Position down dip (user-defined function)
4. For multiple veins, sum contributions
5. Apply intersection bonuses where veins cross
6. Add structural noise (fracture density variations)

### Implementation Notes
- Use plane equation: `ax + by + cz + d = 0` to find distance to plane
- Project block onto plane to find strike/dip coordinates
- Use distance-weighted averaging for multiple veins
- Consider using spline curves for grade variations along strike

---

## Algorithm 3: Porphyry-Style Zoning

### Description
Creates zoned ore bodies typical of porphyry copper-gold deposits with concentric zones of different grades. Includes central high-grade core, intermediate zones, and peripheral low-grade halos.

### Geological Rationale
- Models porphyry deposits (most common Cu-Au deposit type)
- Concentric zoning (core → shell → halo)
- Different Cu:Au ratios in different zones
- Depth-related grade variations (supergene enrichment)

### Parameters
```javascript
{
    // Deposit center
    centerX: number,
    centerY: number,
    centerZ: number,
    
    // Zone radii (from center outward, in meters)
    coreRadius: number,        // High-grade core radius
    shellRadius: number,       // Intermediate zone outer radius
    haloRadius: number,        // Low-grade halo outer radius
    
    // Zone grades
    coreGradeCu: number,       // Core Cu grade (%)
    coreGradeAu: number,       // Core Au grade (g/t)
    shellGradeCu: number,      // Shell Cu grade (%)
    shellGradeAu: number,      // Shell Au grade (g/t)
    haloGradeCu: number,       // Halo Cu grade (%)
    haloGradeAu: number,       // Halo Au grade (g/t)
    
    // Zoning parameters
    verticalGradient: number,  // Grade change with depth (positive = deeper = higher)
    horizontalGradient: number, // Grade change from center (0-1 decay factor)
    
    // Supergene enrichment (optional)
    enrichmentDepth: number,   // Depth below surface for enrichment zone
    enrichmentFactor: number,  // Grade multiplier in enrichment zone (1.5-3x)
    
    // Grade variation
    zoneTransition: number,    // Smoothness of zone boundaries (0-1)
    localVariation: number      // Local grade variation (0-1)
}
```

### Algorithm Steps
1. For each block, calculate distance from deposit center
2. Determine which zone the block belongs to (core, shell, or halo)
3. Calculate base grade for that zone
4. Apply vertical gradient (depth-related variation)
5. Apply horizontal gradient (distance from center within zone)
6. Apply supergene enrichment if within enrichment depth
7. Add smooth transitions between zones
8. Add local variation (noise) for realistic distribution

### Implementation Notes
- Use smooth step functions for zone transitions
- Consider using 3D distance for spherical zones, or 2D + depth for cylindrical zones
- Supergene enrichment typically affects upper 50-200m
- Cu:Au ratios vary by zone (core may be 50:1, shell 100:1, halo 200:1)

---

## Implementation Recommendations

### Common Functions Needed

1. **Distance Calculations**
   - Ellipsoid distance
   - Plane distance
   - 3D Euclidean distance

2. **Coordinate Transformations**
   - Rotation matrices for plunge
   - Strike/dip transformations
   - Grid to world coordinate conversion

3. **Grade Distribution Functions**
   - Gaussian decay: `grade = max * exp(-k * distance²)`
   - Linear decay: `grade = max * (1 - distance/radius)`
   - Power law: `grade = max * (1 - distance/radius)^n`

4. **Spatial Correlation**
   - Perlin noise for smooth variations
   - Gaussian smoothing for continuity
   - Kriging-like interpolation (optional, advanced)

### Integration with Existing Code

All algorithms should:
- Accept grid parameters from `generateRegularGrid()` output
- Return blocks with populated `gradeAu` and `gradeCu` fields
- Respect existing `rockType` assignments (or update them based on grade thresholds)
- Work with existing visualization and export functions

### Example Usage Pattern

```javascript
// Generate base grid
const gridParams = {
    xmOrig: 0, ymOrig: 0, zmOrig: 0,
    xInc: 30, yInc: 30, zInc: 30,
    nx: 50, ny: 50, nz: 30
};
const blocks = generateRegularGrid(gridParams);

// Apply ore body algorithm
const oreBodyParams = {
    centerX: 750, centerY: 750, centerZ: -450,
    radiusX: 200, radiusY: 150, radiusZ: 100,
    maxGradeCu: 1.5, maxGradeAu: 2.0,
    // ... other parameters
};
const blocksWithOre = generateEllipsoidOreBody(blocks, oreBodyParams);

// Update rock types based on grades
blocksWithOre.forEach(block => {
    if (block.gradeCu > 0.5 || block.gradeAu > 0.5) {
        block.rockType = 'Ore';
    } else if (block.gradeCu > 0.2 || block.gradeAu > 0.2) {
        block.rockType = 'Ore_Low';
    }
});
```

---

## Algorithm Selection Guide

- **Ellipsoid/Plunging**: Use for massive deposits, skarns, VMS deposits
- **Vein/Structural**: Use for epithermal gold, mesothermal veins, fault-controlled deposits
- **Porphyry-Style Zoning**: Use for porphyry Cu-Au, IOCG deposits, large disseminated deposits

---

## Next Steps

1. Implement Algorithm 1 (Ellipsoid) as it's most versatile
2. Add algorithm selection to UI (dropdown in pattern selection)
3. Add algorithm-specific parameter controls
4. Implement Algorithm 2 (Vein) for structural deposits
5. Implement Algorithm 3 (Porphyry) for large-scale deposits
6. Add ability to combine multiple algorithms (e.g., multiple ore bodies)
