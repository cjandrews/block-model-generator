# Gamification Features Implementation Plan

## Overview

Implementing three gamification features:
1. Statistics Dashboard
2. Model Statistics Display  
3. Model Gallery

All features use localStorage for client-side only storage.

---

## 1. Statistics Dashboard

### Data Structure (localStorage key: `app_stats`)

```javascript
{
  // Usage statistics
  totalModels: 0,
  totalExports: 0,
  firstModelDate: null,
  lastModelDate: null,
  totalSessionTime: 0, // seconds
  
  // Pattern exploration
  patternsTried: [], // Array of pattern names
  patternUsage: {}, // { 'porphyry_ore': 5, 'vein_ore': 3 }
  
  // Feature usage
  viewModesUsed: [], // Array of view mode names
  toolsUsed: {
    sliceTool: false,
    valueFilter: false,
    categoryFilter: false,
    groundLayer: false
  },
  
  // Model characteristics
  largestModel: 0,
  averageModelSize: 0,
  totalVolume: 0, // cubic meters
  
  // Session tracking
  currentSession: {
    startTime: null,
    modelsGenerated: 0
  }
}
```

### UI Components

**Header Button:**
- "📊 Stats" button next to Memory button
- Shows badge with total models count (if > 0)

**Statistics Modal:**
- Similar to Memory panel (non-modal, slides in)
- Sections:
  - **Overview**: Total models, first/last model dates
  - **Patterns**: Patterns tried, most used pattern
  - **Features**: View modes used, tools used
  - **Models**: Largest model, average size, total volume
  - **Session**: Current session stats

### Tracking Points

- Model generation → increment totalModels, track pattern, update dates
- Export → increment totalExports
- View mode change → track viewModesUsed
- Tool usage → track toolsUsed
- Session start → track startTime

---

## 2. Model Statistics Display

### Statistics to Calculate

From `currentBlocks` array:

```javascript
{
  // Basic stats
  blockCount: number,
  totalVolume: number, // cubic meters
  dimensions: { width, height, depth },
  
  // Rock type distribution
  rockTypes: { 'Waste': count, 'Ore': count, ... },
  orePercentage: number,
  wastePercentage: number,
  
  // Zone distribution (if zones exist)
  zones: { 'Zone1': count, ... },
  zoneCount: number,
  
  // Grade statistics (if grades exist)
  gradeCu: { min, max, avg, hasData: boolean },
  gradeAu: { min, max, avg, hasData: boolean },
  
  // Economic value (if exists)
  econValue: { min, max, avg, total, hasData: boolean },
  
  // Density statistics
  density: { min, max, avg },
  
  // Interesting facts
  interestingFacts: [] // Array of strings
}
```

### UI Display

**Location:** Below status message, expandable section

**Design:**
- Collapsible section: "📈 Model Statistics"
- Key stats visible when collapsed
- Expand to see full details
- Visual indicators (percentages, charts)

**Interesting Facts Examples:**
- "This model contains 3 distinct ore zones"
- "Cu grade ranges from 0.1% to 2.5%"
- "Model volume: 15,625 cubic meters"
- "45% of blocks are ore-grade material"

---

## 3. Model Gallery

### Data Structure (localStorage key: `app_savedModels`)

```javascript
[
  {
    id: 'uuid-v4',
    name: 'My Porphyry Deposit',
    date: '2026-01-23T10:30:00Z',
    params: {
      originX, originY, originZ,
      cellSizeX, cellSizeY, cellSizeZ,
      cellsX, cellsY, cellsZ,
      patternType
    },
    stats: {
      blockCount: 15625,
      totalVolume: 15625,
      orePercentage: 35,
      // ... other stats
    },
    preview: {
      // Summary for quick display
      pattern: 'porphyry_ore',
      size: 'medium',
      hasGrades: true,
      hasZones: true
    }
  }
]
```

### UI Components

**Header Button:**
- "💾 Gallery" button in header
- Shows badge with saved model count

**Gallery Modal:**
- Similar to Memory panel
- List/grid of saved models
- Each model shows:
  - Name (editable)
  - Date created
  - Pattern type
  - Block count
  - Preview stats
- Actions:
  - **Load** → Set parameters and regenerate
  - **Rename** → Edit name
  - **Delete** → Remove from gallery
  - **Save Current** → Save current model (opens name dialog)

**Save Current Model:**
- Button: "💾 Save Model" next to Export button
- Opens dialog: "Enter model name"
- Saves current params + stats
- Shows success message

**Load Model:**
- Click "Load" in gallery
- Sets all form parameters
- Triggers `handleGenerate()` automatically
- Shows success message: "Loaded: [Model Name]"

---

## Implementation Order

1. **Statistics tracking functions** (data layer)
2. **Model statistics calculation** (data layer)
3. **Model gallery storage** (data layer)
4. **Statistics dashboard UI** (UI layer)
5. **Model statistics display UI** (UI layer)
6. **Model gallery UI** (UI layer)
7. **Integration** (wire everything together)

---

## Storage Efficiency

### Compact Storage Strategy

1. **Statistics:**
   - Store only essential data
   - Use arrays for patterns/viewModes (not objects)
   - Compress dates to timestamps
   - Don't store full block arrays (too large)

2. **Model Gallery:**
   - Store only parameters + stats (not blocks)
   - Blocks can be regenerated from parameters
   - Limit to 50 saved models (prevent storage bloat)
   - Auto-delete oldest if limit exceeded

3. **Storage Keys:**
   - `app_stats` - Statistics data
   - `app_savedModels` - Gallery data
   - Keep existing `blockModel_*` keys for caching

---

## File Structure

### New Functions in `main.js`:

1. **Statistics Functions:**
   - `initStats()` - Initialize stats structure
   - `loadStats()` - Load from localStorage
   - `saveStats()` - Save to localStorage
   - `trackModelGeneration(params, blocks)` - Track generation
   - `trackExport()` - Track export
   - `trackViewMode(mode)` - Track view mode
   - `trackToolUsage(tool)` - Track tool usage
   - `updateSessionTime()` - Update session time

2. **Model Statistics Functions:**
   - `calculateModelStats(blocks, params)` - Calculate all stats
   - `generateInterestingFacts(stats)` - Generate facts

3. **Gallery Functions:**
   - `loadSavedModels()` - Load from localStorage
   - `saveModelToGallery(name, params, stats)` - Save model
   - `loadModelFromGallery(modelId)` - Load model params
   - `deleteModelFromGallery(modelId)` - Delete model
   - `getSavedModels()` - Get all saved models

### New UI in `index.html`:

1. Header buttons:
   - Stats button
   - Gallery button

2. Modals/Panels:
   - Statistics panel (similar to memory panel)
   - Gallery panel (similar to memory panel)
   - Save model dialog (simple modal)

3. Model statistics display:
   - Collapsible section in control panel

---

## Integration Points

### In `handleGenerate()`:
- Call `trackModelGeneration()` after successful generation
- Call `calculateModelStats()` and display
- Update statistics dashboard

### In Export functions:
- Call `trackExport()` after successful export

### In View Mode changes:
- Call `trackViewMode()` when mode changes

### In Tool toggles:
- Call `trackToolUsage()` when tools are enabled

### On App Load:
- Load and display statistics
- Initialize session tracking

---

## Testing Checklist

- [ ] Statistics persist across sessions
- [ ] Model statistics calculate correctly
- [ ] Gallery saves/loads models correctly
- [ ] Loading model sets all parameters correctly
- [ ] Statistics update in real-time
- [ ] Storage doesn't exceed localStorage limits
- [ ] Gallery limits work (max 50 models)
- [ ] All UI elements are accessible
- [ ] Internationalization works (i18n)
- [ ] Mobile responsive

---

## Success Criteria

1. **Statistics Dashboard:**
   - Shows accurate usage statistics
   - Updates in real-time
   - Persists across sessions

2. **Model Statistics:**
   - Calculates all stats correctly
   - Displays interesting facts
   - Updates when model changes

3. **Model Gallery:**
   - Saves models with names
   - Loads models correctly
   - Sets all parameters correctly
   - Limits storage appropriately
