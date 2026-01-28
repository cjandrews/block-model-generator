# Slice Tool Clipping Surface Improvements

## Problem Statement

When the slice tool clips blocks using Three.js clipping planes, the cut faces of the cubes are left open/exposed, showing the interior geometry. This creates a visually unappealing "hollow" appearance where you can see through the sides of sliced cubes.

## Current Implementation

- Uses `THREE.Plane` for clipping
- Applies `clippingPlanes` to materials (`MeshLambertMaterial`, `PointsMaterial`)
- `renderer.localClippingEnabled = true` is enabled
- Blocks are rendered as `InstancedMesh` with `BoxGeometry`
- Clipping happens at the shader level, leaving cut faces open

## Proposed Solutions

### Option 1: Cap/Fill Cut Faces (Heal the Cubes)

**Approach**: Use stencil buffer technique to render cap faces that fill the holes created by clipping.

**Implementation Strategy**:
1. **Enable Stencil Buffer**: Ensure renderer has stencil buffer enabled
   ```javascript
   renderer = new THREE.WebGLRenderer({ 
       antialias: true,
       stencil: true  // Enable stencil buffer
   });
   ```

2. **Create Cap Geometry**: Generate cap faces for clipped blocks
   - For each clipped block, determine which faces intersect the clipping plane
   - Create a plane geometry aligned with the clipping plane at the cut location
   - Size the cap to match the block's cross-section at the cut

3. **Stencil-Based Rendering**:
   - First pass: Render blocks with clipping enabled, using stencil operations
   - Second pass: Render cap faces only where stencil marks exist
   - Use separate material for caps with:
     - `stencilWrite: true`
     - `stencilFunc: THREE.EqualStencilFunc`
     - `depthWrite: false` (for stencil pass)
     - Same color as the block material

4. **Performance Considerations**:
   - Only generate caps for blocks that are actually clipped
   - Use instanced rendering for caps if many blocks are clipped
   - Cache cap geometries when slice position doesn't change

**Files to Modify**:
- `scripts/visualization.js`:
  - `initVisualization()`: Enable stencil buffer in renderer
  - `renderAsCubes()`: Add cap generation logic
  - `updateClippingPlanes()`: Update cap positions when slice moves
  - New function: `generateClipCaps(blocks, slicePlane, cellSizes)` - Generate cap geometries
  - New function: `renderClipCaps(caps, materials)` - Render caps with stencil

**Pros**:
- Clean, solid appearance
- No transparency artifacts
- Professional look

**Cons**:
- More complex implementation
- Additional geometry to render (performance impact)
- Requires stencil buffer support
- May have z-fighting issues if not handled carefully

---

### Option 2: Remove/Make Transparent Cut Faces

**Approach**: Make the cut faces transparent or remove them entirely so you can see through to blocks on the other side.

**Implementation Strategy**:

**Sub-option 2A: Transparent Cut Faces**
1. **Custom Shader Modification**: Modify the fragment shader to detect clipped edges
2. **Edge Detection**: Use `onBeforeCompile` to inject shader code that:
   - Detects when a fragment is near a clipping plane edge
   - Gradually fades opacity near the edge
   - Uses distance from clipping plane to determine transparency

3. **Implementation**:
   ```javascript
   material.onBeforeCompile = function(shader) {
       shader.fragmentShader = shader.fragmentShader.replace(
           '#include <clipping_planes_fragment>',
           `
           #include <clipping_planes_fragment>
           
           // Fade edges near clipping plane
           float edgeDistance = abs(dot(vViewPosition, clippingPlanes[0].xyz) + clippingPlanes[0].w);
           float edgeFade = smoothstep(0.0, 0.1, edgeDistance); // Fade over 0.1 units
           gl_FragColor.a *= edgeFade;
           `
       );
   };
   ```

**Sub-option 2B: Remove Cut Faces Entirely**
1. **Geometry Modification**: Instead of clipping, modify block geometry to exclude faces on the clipped side
2. **Pre-filter Blocks**: Filter out blocks entirely on the clipped side before rendering
3. **Partial Block Handling**: For blocks that are partially clipped:
   - Calculate intersection of block bounds with clipping plane
   - Generate modified geometry that excludes the clipped portion
   - This is more complex but gives clean edges

**Files to Modify**:
- `scripts/visualization.js`:
  - `renderAsCubes()`: Add shader modification for transparency (Option 2A)
  - OR modify geometry generation to exclude clipped portions (Option 2B)
  - `updateClippingPlanes()`: Update shader uniforms or regenerate geometries

**Pros**:
- Simpler implementation (especially 2A)
- Can see through to other side
- Less geometry overhead than capping

**Cons**:
- May look less "solid" or professional
- Transparency can cause rendering order issues
- Option 2B requires geometry manipulation which is complex with InstancedMesh

---

## Recommended Approach

**Recommendation: Option 1 (Cap/Fill Cut Faces)** for the best visual result, with Option 2A as a fallback if performance is a concern.

### Implementation Priority:
1. **Phase 1**: Implement Option 2A (transparent edges) - Quick win, minimal code changes
2. **Phase 2**: If needed, implement Option 1 (stencil capping) - Better visual quality

### Key Implementation Details for Option 1:

1. **Cap Generation**:
   ```javascript
   function generateClipCaps(blocks, slicePlane, cellSizeX, cellSizeY, cellSizeZ) {
       const caps = [];
       const planeNormal = slicePlane.normal;
       const planeConstant = slicePlane.constant;
       
       blocks.forEach(block => {
           // Transform block position to Three.js coords: (x, z, y)
           const blockPos = new THREE.Vector3(block.x, block.z, block.y);
           const blockCenter = blockPos;
           
           // Check if block intersects clipping plane
           const distance = planeNormal.dot(blockCenter) + planeConstant;
           const halfSize = Math.max(cellSizeX, cellSizeY, cellSizeZ) / 2;
           
           if (Math.abs(distance) < halfSize) {
               // Block is clipped - create cap
               // Determine cap orientation based on slice axis
               // Create plane geometry aligned with clipping plane
               // Size based on block dimensions
           }
       });
       
       return caps;
   }
   ```

2. **Stencil Rendering Order**:
   - Render blocks normally with clipping (stencil write)
   - Render caps with stencil test (only where marked)
   - Clear stencil buffer after each frame

3. **Performance Optimization**:
   - Only generate caps when slice position changes significantly
   - Use instanced rendering for caps
   - Consider LOD: skip caps for distant blocks

---

## Testing Considerations

1. **Visual Quality**: Ensure caps match block colors exactly
2. **Performance**: Measure FPS impact with many clipped blocks
3. **Edge Cases**: Test with blocks at exact slice position, very small blocks, etc.
4. **Multiple View Modes**: Ensure solution works with solid, transparent, and slice view modes
5. **Value Filtering**: Ensure caps respect value visibility filters

---

## Alternative: Hybrid Approach

Consider a hybrid where:
- Blocks far from the slice plane use standard clipping (no caps)
- Blocks near the slice plane get caps for clean appearance
- Use distance threshold to determine which blocks need caps

This balances visual quality with performance.
