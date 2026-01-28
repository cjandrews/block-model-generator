# Localization Proposal: Mining Block Model Generator

## Executive Summary

This document proposes a comprehensive localization strategy for the Mining Block Model Generator application to support **English**, **Spanish**, and **French**. The application is a client-side web application using vanilla JavaScript, HTML, and Three.js for 3D visualization.

## 1. Localization Strategy Overview

### Recommended Approach: **Lightweight i18n Library**

Given that this is a vanilla JavaScript application without a framework, I recommend using a **lightweight, dependency-free i18n solution** or a minimal custom implementation. Two primary options:

#### Option A: Custom Lightweight i18n (Recommended)
- **Pros**: No external dependencies, full control, minimal overhead
- **Cons**: Need to implement pluralization and formatting manually
- **Best for**: This project (small to medium complexity, no framework)

#### Option B: i18next (Alternative)
- **Pros**: Feature-rich, handles pluralization, formatting, namespaces
- **Cons**: External dependency (~15KB minified), may be overkill
- **Best for**: If you plan to add more languages or complex features later

### Implementation Pattern

```javascript
// Simple translation function
function t(key, params = {}) {
    const translations = i18n[currentLocale] || i18n['en'];
    let text = translations[key] || key;
    
    // Simple parameter substitution
    Object.keys(params).forEach(param => {
        text = text.replace(`{{${param}}}`, params[param]);
    });
    
    return text;
}
```

## 2. Content Inventory

### 2.1 HTML Static Content (`index.html`)

#### Page Metadata
- Page title: "Mining Block Model Generator"
- Meta description (if added)
- HTML `lang` attribute

#### Header Section
- Main heading: "Mining Block Model Generator"
- Subtitle: "Create dummy 3D block models for testing mining applications"
- Button labels: "Memory", "About"

#### Form Labels & Controls
- **Model Parameters Section**:
  - "Model Parameters" (section header)
  - "Origin X", "Origin Y", "Origin Z"
  - "Cell Size X", "Cell Size Y", "Cell Size Z"
  - "Cells X", "Cells Y", "Cells Z"
  - "Material Pattern" (label)
  - Pattern options:
    - "Uniform"
    - "Layered"
    - "Gradient"
    - "Checkerboard"
    - "Random"
    - "Single Ore Horizon"
    - "Inclined Vein"
    - "Random Clusters"
    - "Ellipsoid Ore Body"
    - "Vein/Structural Ore Body"
    - "Porphyry-Style Zoning"
    - "Salt Dome Reservoir (Petroleum)"

- **Buttons**:
  - "Generate"
  - "Export"
  - "Zoom to Fit"
  - "📚 Documentation"

- **Visualization Section**:
  - "Visualization" (section header)
  - "View Mode" (label)
  - View mode options:
    - "Solid"
    - "Points"
    - "Transparent"
    - "Squares"
    - "Slices X"
    - "Slices Y"
    - "Slices Z"
  - "Field" (label)
  - Field options:
    - "Rock Type"
    - "Density"
    - "Cu Grade"
    - "Au Grade"
    - "Value"

- **Slice Tool Section**:
  - "Slice Tool" (section header)
  - "Enable" (checkbox label)
  - "Axis" (label)
  - Axis options:
    - "X (Front/Back)"
    - "Y (Left/Right)"
    - "Z (Up/Down)"
  - "Position: {value}" (label with dynamic value)

- **Value Filter Section**:
  - "Value Filter" (section header)
  - "Enable Filter" (checkbox label)
  - "Mode" (label)
  - Mode options:
    - "Above threshold"
    - "Below threshold"
  - "Threshold: {value}" (label with dynamic value)

- **Category Filter Section**:
  - "Category Filter" (section header)
  - "Enable Filter" (checkbox label)
  - "Show/Hide Categories:" (label)
  - Placeholder text: "Select a categorical field (e.g., Rock Type) to filter"
  - "No blocks available" (message)

- **Ground Layer Section**:
  - "Ground Layer" (section header)
  - "Show Ground" (checkbox label)

#### Controls Hint
- "Controls: Left-click drag to rotate | Right-click drag to pan | Scroll to zoom"

#### Modal Content (About Modal)
- "About" (modal title)
- "Mining Block Model Generator" (app name)
- "Built by **Chris Andrews**, BuildIT Design Labs"
- "License: MIT License"
- "Copyright: © 2026 All rights reserved"

#### Memory Monitor Panel
- "Memory Monitor" (panel title)
- "Memory Usage:" (label)
- "Loading..." (initial state)
- "Note: Memory information may not be available in all browsers." (note)
- Memory detail labels:
  - "Used JS Heap"
  - "Total JS Heap"
  - "JS Heap Limit"
  - "Heap Usage"
  - "Device Memory"
  - "Three.js Objects:"
  - "Scene Objects"
  - "Geometries"
  - "Materials"
  - "Textures"

### 2.2 JavaScript Dynamic Content

#### Status Messages (`main.js`)

**Generation Status**:
- "Generating initial model..."
- "Generating block model..."
- "Checking cache for large model..."
- "Loaded {count} blocks from cache."
- "Generating {count} blocks..."
- "Generating large model in chunks (this may take a while)..."
- "Generating blocks: {progress}% ({processed}/{total})..."
- "Applying material pattern..."
- "Caching model data..."
- "Model generated: {count} blocks. Pattern: {pattern}. Ready to export."
- "Model generated: {count} blocks. Pattern: {pattern}. Visualizing sample for performance. Full model available for export."
- "Model loaded from cache: {count} blocks. Ready to export."
- "Model loaded from cache: {count} blocks. Visualizing sample for performance. Full model available for export."

**Error Messages**:
- "Error: {message}"
- "Cell sizes must be greater than 0"
- "Number of cells must be greater than 0"
- "No blocks to export. Please generate a model first."
- "CSV content too large. Please reduce model size."
- "Export error: {message}. Trying CSV export..."
- "CSV export error: {message}"

**Export Status**:
- "Exporting to ZIP (this may take a moment for large models)..."
- "ZIP library not loaded. Exporting as CSV..."
- "ZIP exported successfully: {count} blocks. Compressed {originalSize} MB to {compressedSize} MB ({ratio}% reduction)."
- "CSV exported successfully: {count} blocks."

#### Tooltip Content (`visualization.js`)

- "Block Information" (tooltip header)
- "Position:" (label)
- "Indices:" (label)
- "Rock Type:" (label)
- "Density:" (label) + "t/m³" (unit)
- "Cu Grade:" (label) + "%" (unit)
- "Au Grade:" (label) + "g/t" (unit)
- "Economic Value:" (label)
- "Zone:" (label)
- "N/A" (not available)

#### Category Filter Messages (`visualization.js`)
- "Select \"Rock Type\" field to filter categories"
- "No blocks available"

### 2.3 Technical Terms & Units

#### Rock/Material Types (Consider keeping in English or translating)
- "Waste"
- "Ore"
- "Salt"
- "CapRock"
- "OilSand"
- "GasSand"
- "WaterSand"
- "Shale"
- Plus any other material types defined in `blockModel.js`

**Recommendation**: Keep technical terms (rock types, material names) in English for consistency with industry standards, but provide translations in tooltips/help text.

#### Units (Internationalization considerations)
- "t/m³" (tonnes per cubic meter) - May need translation
- "%" (percent) - Universal
- "g/t" (grams per tonne) - May need translation
- "MB" (megabytes) - Universal
- "GB" (gigabytes) - Universal

### 2.4 Documentation (`docs.html`)

The documentation page (`docs.html`) contains extensive content that would also need localization:
- Section headers
- Pattern descriptions
- Technical explanations
- Search placeholder text
- Navigation items

**Note**: Documentation localization is a separate, larger effort. Consider it as Phase 2.

## 3. File Structure Proposal

### Option A: JSON Translation Files (Recommended)

```
block-model-generator/
├── locales/
│   ├── en.json          # English (default)
│   ├── es.json          # Spanish
│   └── fr.json          # French
├── scripts/
│   ├── i18n.js          # i18n utility functions
│   ├── main.js          # (modified with t() calls)
│   ├── visualization.js # (modified with t() calls)
│   └── ...
└── index.html           # (modified with data-i18n attributes)
```

### Option B: JavaScript Module Files

```
block-model-generator/
├── locales/
│   ├── en.js
│   ├── es.js
│   └── fr.js
└── scripts/
    └── i18n.js
```

**Recommendation**: Use **Option A (JSON)** for easier editing and non-developer access.

## 4. Implementation Details

### 4.1 Translation File Structure

```json
// locales/en.json
{
  "app": {
    "title": "Mining Block Model Generator",
    "subtitle": "Create dummy 3D block models for testing mining applications"
  },
  "buttons": {
    "generate": "Generate",
    "export": "Export",
    "zoomToFit": "Zoom to Fit",
    "memory": "Memory",
    "about": "About",
    "documentation": "📚 Documentation"
  },
  "modelParameters": {
    "title": "Model Parameters",
    "originX": "Origin X",
    "originY": "Origin Y",
    "originZ": "Origin Z",
    "cellSizeX": "Cell Size X",
    "cellSizeY": "Cell Size Y",
    "cellSizeZ": "Cell Size Z",
    "cellsX": "Cells X",
    "cellsY": "Cells Y",
    "cellsZ": "Cells Z",
    "materialPattern": "Material Pattern"
  },
  "patterns": {
    "uniform": "Uniform",
    "layered": "Layered",
    "gradient": "Gradient",
    "checkerboard": "Checkerboard",
    "random": "Random",
    "ore_horizon": "Single Ore Horizon",
    "inclined_vein": "Inclined Vein",
    "random_clusters": "Random Clusters",
    "ellipsoid_ore": "Ellipsoid Ore Body",
    "vein_ore": "Vein/Structural Ore Body",
    "porphyry_ore": "Porphyry-Style Zoning",
    "salt_dome": "Salt Dome Reservoir (Petroleum)"
  },
  "visualization": {
    "title": "Visualization",
    "viewMode": "View Mode",
    "field": "Field",
    "modes": {
      "solid": "Solid",
      "points": "Points",
      "transparent": "Transparent",
      "squares": "Squares",
      "slicesX": "Slices X",
      "slicesY": "Slices Y",
      "slicesZ": "Slices Z"
    },
    "fields": {
      "rockType": "Rock Type",
      "density": "Density",
      "gradeCu": "Cu Grade",
      "gradeAu": "Au Grade",
      "econValue": "Value"
    }
  },
  "sliceTool": {
    "title": "Slice Tool",
    "enable": "Enable",
    "axis": "Axis",
    "position": "Position: {{value}}",
    "axes": {
      "x": "X (Front/Back)",
      "y": "Y (Left/Right)",
      "z": "Z (Up/Down)"
    }
  },
  "valueFilter": {
    "title": "Value Filter",
    "enable": "Enable Filter",
    "mode": "Mode",
    "threshold": "Threshold: {{value}}",
    "modes": {
      "above": "Above threshold",
      "below": "Below threshold"
    }
  },
  "categoryFilter": {
    "title": "Category Filter",
    "enable": "Enable Filter",
    "showHide": "Show/Hide Categories:",
    "selectField": "Select a categorical field (e.g., Rock Type) to filter",
    "noBlocks": "No blocks available"
  },
  "groundLayer": {
    "title": "Ground Layer",
    "showGround": "Show Ground"
  },
  "status": {
    "generatingInitial": "Generating initial model...",
    "generating": "Generating block model...",
    "checkingCache": "Checking cache for large model...",
    "loadedFromCache": "Loaded {{count}} blocks from cache.",
    "generatingBlocks": "Generating {{count}} blocks...",
    "generatingLarge": "Generating large model in chunks (this may take a while)...",
    "generatingProgress": "Generating blocks: {{progress}}% ({{processed}}/{{total}})...",
    "applyingPattern": "Applying material pattern...",
    "caching": "Caching model data...",
    "modelGenerated": "Model generated: {{count}} blocks. Pattern: {{pattern}}. Ready to export.",
    "modelGeneratedLarge": "Model generated: {{count}} blocks. Pattern: {{pattern}}. Visualizing sample for performance. Full model available for export.",
    "modelLoaded": "Model loaded from cache: {{count}} blocks. Ready to export.",
    "modelLoadedLarge": "Model loaded from cache: {{count}} blocks. Visualizing sample for performance. Full model available for export.",
    "exporting": "Exporting to ZIP (this may take a moment for large models)...",
    "zipNotAvailable": "ZIP library not loaded. Exporting as CSV...",
    "exportSuccess": "ZIP exported successfully: {{count}} blocks. Compressed {{originalSize}} MB to {{compressedSize}} MB ({{ratio}}% reduction).",
    "csvSuccess": "CSV exported successfully: {{count}} blocks.",
    "error": "Error: {{message}}",
    "noBlocksToExport": "No blocks to export. Please generate a model first.",
    "csvTooLarge": "CSV content too large. Please reduce model size.",
    "exportError": "Export error: {{message}}. Trying CSV export...",
    "csvError": "CSV export error: {{message}}"
  },
  "errors": {
    "cellSizeInvalid": "Cell sizes must be greater than 0",
    "cellCountInvalid": "Number of cells must be greater than 0"
  },
  "tooltip": {
    "title": "Block Information",
    "position": "Position:",
    "indices": "Indices:",
    "rockType": "Rock Type:",
    "density": "Density:",
    "cuGrade": "Cu Grade:",
    "auGrade": "Au Grade:",
    "econValue": "Economic Value:",
    "zone": "Zone:",
    "notAvailable": "N/A",
    "units": {
      "density": "t/m³",
      "cuGrade": "%",
      "auGrade": "g/t"
    }
  },
  "controls": {
    "hint": "Controls: Left-click drag to rotate | Right-click drag to pan | Scroll to zoom"
  },
  "about": {
    "title": "About",
    "appName": "Mining Block Model Generator",
    "builtBy": "Built by <strong>{{author}}</strong>, {{company}}",
    "license": "License: MIT License",
    "copyright": "Copyright: © {{year}} All rights reserved"
  },
  "memory": {
    "title": "Memory Monitor",
    "usage": "Memory Usage:",
    "loading": "Loading...",
    "note": "Note: Memory information may not be available in all browsers.",
    "usedHeap": "Used JS Heap",
    "totalHeap": "Total JS Heap",
    "heapLimit": "JS Heap Limit",
    "heapUsage": "Heap Usage",
    "deviceMemory": "Device Memory",
    "threejsObjects": "Three.js Objects:",
    "sceneObjects": "Scene Objects",
    "geometries": "Geometries",
    "materials": "Materials",
    "textures": "Textures"
  }
}
```

### 4.2 HTML Modification Pattern

**Before**:
```html
<h1>Mining Block Model Generator</h1>
<button id="generateBtn">Generate</button>
```

**After**:
```html
<h1 data-i18n="app.title">Mining Block Model Generator</h1>
<button id="generateBtn" data-i18n="buttons.generate">Generate</button>
```

**Or programmatically**:
```javascript
document.getElementById('generateBtn').textContent = t('buttons.generate');
```

### 4.3 JavaScript Modification Pattern

**Before**:
```javascript
updateStatus('Generating block model...');
```

**After**:
```javascript
updateStatus(t('status.generating'));
```

**With parameters**:
```javascript
updateStatus(t('status.generatingBlocks', { count: totalCells.toLocaleString() }));
```

### 4.4 Dynamic Content (Select Options, Tooltips)

**Select Options** - Update on locale change:
```javascript
function updateSelectOptions() {
    const patternSelect = document.getElementById('patternType');
    const options = patternSelect.querySelectorAll('option');
    options.forEach(option => {
        const key = `patterns.${option.value}`;
        option.textContent = t(key);
    });
}
```

**Tooltips** - Update dynamically:
```javascript
content += `<div class="tooltip-row">
    <span class="tooltip-label">${t('tooltip.density')}</span>
    <span class="tooltip-value">${block.density.toFixed(2)} ${t('tooltip.units.density')}</span>
</div>`;
```

## 5. Locale Detection & Switching

### 5.1 Locale Detection Strategy

1. **Check localStorage** for user preference
2. **Check browser language** (`navigator.language`)
3. **Default to English** if unsupported

```javascript
function detectLocale() {
    // Check user preference
    const saved = localStorage.getItem('app_locale');
    if (saved && ['en', 'es', 'fr'].includes(saved)) {
        return saved;
    }
    
    // Check browser language
    const browserLang = navigator.language.split('-')[0];
    if (['en', 'es', 'fr'].includes(browserLang)) {
        return browserLang;
    }
    
    // Default to English
    return 'en';
}
```

### 5.2 Language Switcher UI

Add a language selector to the header:
```html
<div class="language-selector">
    <select id="languageSelect">
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="fr">Français</option>
    </select>
</div>
```

## 6. Number & Date Formatting

### 6.1 Number Formatting

Use `Intl.NumberFormat` for locale-aware number formatting:

```javascript
function formatNumber(value, locale, options = {}) {
    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: options.decimals || 2,
        maximumFractionDigits: options.decimals || 2,
        ...options
    }).format(value);
}

// Usage
formatNumber(1234.56, 'en'); // "1,234.56"
formatNumber(1234.56, 'es'); // "1.234,56" (Spanish uses comma for decimals)
formatNumber(1234.56, 'fr'); // "1 234,56" (French uses space for thousands, comma for decimals)
```

### 6.2 Percentage Formatting

```javascript
function formatPercent(value, locale) {
    return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value / 100);
}
```

### 6.3 File Size Formatting

```javascript
function formatBytes(bytes, locale) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    return `${formatNumber(size, locale, { decimals: 2 })} ${sizes[i]}`;
}
```

## 7. Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
1. Create `scripts/i18n.js` with translation functions
2. Create translation JSON files (`locales/en.json`, `es.json`, `fr.json`)
3. Implement locale detection and switching
4. Add language selector UI

### Phase 2: HTML Content (Week 1-2)
1. Add `data-i18n` attributes to all HTML elements
2. Create function to update all HTML content on locale change
3. Test all static content translations

### Phase 3: JavaScript Dynamic Content (Week 2)
1. Replace hardcoded strings in `main.js` with `t()` calls
2. Replace hardcoded strings in `visualization.js` with `t()` calls
3. Update tooltip generation
4. Update status messages
5. Test all dynamic content

### Phase 4: Formatting & Polish (Week 2-3)
1. Implement number formatting for all locales
2. Update file size displays
3. Test edge cases
4. Verify all three languages

### Phase 5: Documentation (Optional, Future)
1. Localize `docs.html` content
2. Create translated documentation files

## 8. Testing Strategy

### 8.1 Translation Coverage
- Verify all keys exist in all three language files
- Check for missing translations (fallback to English)
- Ensure no hardcoded English strings remain

### 8.2 UI Layout Testing
- Test with longer translations (German-like lengths for future expansion)
- Verify buttons/labels don't overflow
- Check responsive design with different languages

### 8.3 Functionality Testing
- Test all features in each language
- Verify number formatting is correct
- Test locale switching mid-session
- Verify localStorage persistence

## 9. Technical Considerations

### 9.1 Performance
- Load only the current locale's translation file
- Cache translations in memory
- Minimize DOM updates when switching languages

### 9.2 Maintainability
- Use consistent key naming (dot notation, namespaced)
- Document translation keys
- Provide context comments in translation files

### 9.3 Accessibility
- Update `lang` attribute on `<html>` when switching languages
- Ensure screen readers announce language changes
- Maintain ARIA labels in translated content

## 10. Recommendations

### Primary Recommendation: **Custom Lightweight i18n**

**Why**:
1. No external dependencies
2. Full control over implementation
3. Small footprint (~2-3KB)
4. Easy to understand and maintain
5. Sufficient for 3 languages

**Implementation**:
- Create `scripts/i18n.js` (~200 lines)
- Use JSON translation files
- Implement simple parameter substitution
- Use native `Intl` APIs for formatting

### Alternative: **i18next** (if future expansion expected)

**Consider if**:
- Planning to add 5+ languages
- Need complex pluralization rules
- Want namespace support
- Need interpolation features

## 11. Estimated Effort

- **Setup & Infrastructure**: 4-6 hours
- **Translation File Creation**: 6-8 hours (including translation)
- **HTML Updates**: 3-4 hours
- **JavaScript Updates**: 6-8 hours
- **Formatting Implementation**: 3-4 hours
- **Testing & Polish**: 4-6 hours

**Total**: ~26-36 hours for complete implementation

## 12. Next Steps

1. **Review this proposal** and choose approach
2. **Create translation files** structure
3. **Implement i18n infrastructure** (`scripts/i18n.js`)
4. **Begin HTML updates** with `data-i18n` attributes
5. **Update JavaScript** files incrementally
6. **Test thoroughly** in all three languages
7. **Deploy and gather feedback**

---

## Appendix: Sample Translation Keys (Spanish & French)

### Spanish (es.json) - Sample
```json
{
  "app": {
    "title": "Generador de Modelo de Bloques Mineros",
    "subtitle": "Crea modelos de bloques 3D ficticios para probar aplicaciones mineras"
  },
  "buttons": {
    "generate": "Generar",
    "export": "Exportar",
    "zoomToFit": "Ajustar Zoom"
  }
}
```

### French (fr.json) - Sample
```json
{
  "app": {
    "title": "Générateur de Modèle de Blocs Miniers",
    "subtitle": "Créez des modèles de blocs 3D fictifs pour tester des applications minières"
  },
  "buttons": {
    "generate": "Générer",
    "export": "Exporter",
    "zoomToFit": "Ajuster le Zoom"
  }
}
```

---

**Document Version**: 1.0  
**Date**: January 26, 2026  
**Author**: Localization Proposal
