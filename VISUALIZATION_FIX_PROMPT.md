# 3D Visualization Fix: Ground Layer and Vertical Positioning

## Issue Summary

The current implementation does not follow standard mining block model conventions for vertical positioning. In mining:
- **Z=0 represents the ground surface**
- **Z values decrease (become negative) as you go deeper underground**
- **The ground layer should be positioned at Z=0, not at the deepest block**

## Current Problems

### 1. Block Generation (blockModel.js, line 51)
**Current Code:**
```javascript
const z = zmOrig + (k + 0.5) * zInc;
```

**Problem:** When `zmOrig = 0` and `zInc = 10`, this generates:
- k=0: z = 5 (above ground)
- k=1: z = 15 (further above ground)
- k=2: z = 25 (even higher)

Blocks go **upward** from zero, but in mining they should go **downward**.

**Expected:** Blocks should have negative Z values when going deeper:
- k=0: z = -5 (just below ground)
- k=1: z = -15 (deeper)
- k=2: z = -25 (even deeper)

### 2. Visualization Z Negation (visualization.js, multiple locations)
**Current Code:**
```javascript
// Line 369 (renderAsPoints):
positions[i + 2] = -block.z; // Negate Z for mining convention

// Line 521 (renderAsCubes):
matrix.makeTranslation(block.x, block.y, -block.z);

// Line 546, 702, 937 (calculateModelBounds, centerCameraOnModel, updateGroundLayer):
const z = -block.z; // For mining convention
```

**Problem:** The code negates Z values as a workaround, but this creates confusion and inconsistency. Blocks should be generated with correct Z values from the start.

### 3. Ground Layer Positioning (visualization.js, line 961)
**Current Code:**
```javascript
// Line 937-942: Calculate minZ from negated block.z
blocks.forEach(block => {
    const z = -block.z; // For mining convention
    minZ = Math.min(minZ, z);
});

// Line 961: Position ground at minZ (deepest point)
groundMesh.position.set(centerX, centerY, minZ);
```

**Problem:** Ground is positioned at `minZ` (the deepest block), but it should be at **Z=0** (the ground surface).

## Required Changes

### Change 1: Fix Block Generation to Use Negative Z
**File:** `scripts/blockModel.js` (line 51)

**Current:**
```javascript
const z = zmOrig + (k + 0.5) * zInc;
```

**Change to:**
```javascript
// For mining convention: Z goes downward (negative) from ground surface (zmOrig)
// When zmOrig = 0, blocks go from 0 downward (negative values)
const z = zmOrig - (k + 0.5) * zInc;
```

**Explanation:** This makes Z values decrease as k increases, so blocks go downward from the origin. If `zmOrig = 0` and `zInc = 10`:
- k=0: z = 0 - 5 = -5 (just below ground)
- k=1: z = 0 - 15 = -15 (deeper)
- k=2: z = 0 - 25 = -25 (even deeper)

### Change 2: Remove Z Negation in Visualization
**File:** `scripts/visualization.js`

**Locations to fix:**
1. **Line 369** (`renderAsPoints` function):
   ```javascript
   // CURRENT:
   positions[i + 2] = -block.z; // Negate Z for mining convention
   
   // CHANGE TO:
   positions[i + 2] = block.z; // Z already goes downward (negative)
   ```

2. **Line 521** (`renderAsCubes` function):
   ```javascript
   // CURRENT:
   matrix.makeTranslation(block.x, block.y, -block.z);
   
   // CHANGE TO:
   matrix.makeTranslation(block.x, block.y, block.z);
   ```

3. **Line 546** (`calculateModelBounds` function):
   ```javascript
   // CURRENT:
   blocks.forEach(block => {
       const z = -block.z; // For mining, Z typically goes down (negative)
       minX = Math.min(minX, block.x);
       maxX = Math.max(maxX, block.x);
       minY = Math.min(minY, block.y);
       maxY = Math.max(maxY, block.y);
       minZ = Math.min(minZ, z);
       maxZ = Math.max(maxZ, z);
   });
   
   // CHANGE TO:
   blocks.forEach(block => {
       // Z already goes downward (negative values)
       minX = Math.min(minX, block.x);
       maxX = Math.max(maxX, block.x);
       minY = Math.min(minY, block.y);
       maxY = Math.max(maxY, block.y);
       minZ = Math.min(minZ, block.z); // block.z is already negative
       maxZ = Math.max(maxZ, block.z);  // maxZ will be closest to zero (shallowest)
   });
   ```

4. **Line 702** (`centerCameraOnModel` function):
   ```javascript
   // CURRENT:
   blocks.forEach(block => {
       const z = -block.z; // For mining, Z typically goes down (negative)
       // ... rest of code
   });
   
   // CHANGE TO:
   blocks.forEach(block => {
       // Z already goes downward (negative values)
       // Use block.z directly, no negation needed
       // ... rest of code
   });
   ```

### Change 3: Position Ground Layer at Z=0
**File:** `scripts/visualization.js` (`updateGroundLayer` function, lines 916-967)

**Current:**
```javascript
// Calculate bounds
let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;
let minZ = Infinity;

blocks.forEach(block => {
    const z = -block.z; // For mining convention
    minX = Math.min(minX, block.x);
    maxX = Math.max(maxX, block.x);
    minY = Math.min(minY, block.y);
    maxY = Math.max(maxY, block.y);
    minZ = Math.min(minZ, z);
});

// ... create ground mesh ...

// Position ground at the bottom of the model (Z = 0 or minZ)
const centerX = (minX + maxX) / 2;
const centerY = (minY + maxY) / 2;
groundMesh.position.set(centerX, centerY, minZ); // WRONG: at deepest point
```

**Change to:**
```javascript
// Calculate bounds (X and Y only, for ground plane size)
let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;

blocks.forEach(block => {
    minX = Math.min(minX, block.x);
    maxX = Math.max(maxX, block.x);
    minY = Math.min(minY, block.y);
    maxY = Math.max(maxY, block.y);
});

// ... create ground mesh ...

// Position ground at Z=0 (ground surface in mining convention)
const centerX = (minX + maxX) / 2;
const centerY = (minY + maxY) / 2;
groundMesh.position.set(centerX, centerY, 0); // CORRECT: at ground surface
```

## Validation Checklist

After making changes, verify:

1. ✅ **Block Generation**: With `zmOrig = 0`, `zInc = 10`, `nz = 5`:
   - First block (k=0) should have z ≈ -5
   - Last block (k=4) should have z ≈ -45
   - All Z values should be negative (below ground)

2. ✅ **Visualization**: Blocks should appear below the ground plane in 3D view

3. ✅ **Ground Layer**: When enabled, ground plane should be at Z=0 (ground surface)

4. ✅ **Camera Positioning**: Camera should center correctly on the model

5. ✅ **Slice Tool**: Z-axis slicing should work correctly with negative Z values

6. ✅ **Bounds Calculation**: Model bounds should correctly identify minZ (deepest) and maxZ (shallowest, closest to 0)

## Testing Scenarios

1. **Generate a model with origin Z=0**: Ground should be at Z=0, blocks below it
2. **Generate a model with origin Z=100**: Ground should be at Z=100, blocks below it (95, 85, 75, etc.)
3. **Toggle ground layer**: Should appear/disappear at correct Z position
4. **Slice tool on Z-axis**: Should slice through blocks correctly

## Notes

- The change from `+` to `-` in block generation is the **primary fix**
- Removing Z negation in visualization is **necessary** once blocks have correct Z values
- Ground at Z=0 is the **standard mining convention**
- This ensures compatibility with mining software that expects Z=0 as ground surface
