/**
 * Internationalization (i18n) Utility
 * Provides translation functions and locale management
 * 
 * @license MIT License
 * @copyright Copyright (c) 2026 BuildIT Design Labs, LLC
 */

// Current locale (default: English)
let currentLocale = 'en';

// Translation data (loaded from JSON files)
let translations = {};

// Supported locales
const SUPPORTED_LOCALES = ['en', 'es', 'fr'];

// Locale-specific number formatting
const LOCALE_FORMATS = {
    'en': { decimal: '.', thousands: ',', percent: '%' },
    'es': { decimal: ',', thousands: '.', percent: '%' },
    'fr': { decimal: ',', thousands: ' ', percent: '%' }
};

// Embedded translations for file:// protocol support (fallback when JSON files can't be loaded)
const EMBEDDED_TRANSLATIONS = {
    'en': {
        "app": {
            "title": "Mining Block Model Generator",
            "subtitle": "Create dummy 3D block models for testing mining applications"
        },
        "buttons": {
            "generate": "Generate",
            "export": "Export",
            "zoomToFit": "Zoom",
            "memory": "Memory",
            "about": "About",
            "documentation": "Documentation",
            "stats": "Stats",
            "gallery": "Gallery",
            "save": "Save",
            "cancel": "Cancel"
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
            "builtBy": "Built by <strong><a href=\"mailto:chris@builditdesignlab.com\">Chris Andrews</a></strong>, <a href=\"https://www.builditdesignlab.com/#block-model-generator\" target=\"_blank\" rel=\"noopener noreferrer\">BuildIT Design Labs</a>",
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
        },
        "stats": {
            "title": "Statistics Dashboard",
            "overview": "Overview",
            "totalModels": "Total Models",
            "totalExports": "Total Exports",
            "firstModel": "First Model",
            "lastModel": "Last Model",
            "patternsExplored": "Patterns Explored",
            "patternsTried": "Patterns Tried",
            "mostUsed": "Most Used",
            "featuresUsed": "Features Used",
            "viewModes": "View Modes",
            "toolsUsed": "Tools Used",
            "modelCharacteristics": "Model Characteristics",
            "largestModel": "Largest Model",
            "averageModelSize": "Average Model Size",
            "totalVolume": "Total Volume Generated",
            "currentSession": "Current Session",
            "modelsGenerated": "Models Generated",
            "of12": "of 12",
            "of7": "of 7",
            "of4": "of 4",
            "blocks": "blocks",
            "millionM3": "million m³"
        },
        "modelStats": {
            "title": "📈 Model Statistics",
            "blocks": "Blocks",
            "volume": "Volume",
            "ore": "Ore",
            "waste": "Waste",
            "zones": "Zones",
            "cuGrade": "Cu Grade",
            "auGrade": "Au Grade",
            "interestingFacts": "Interesting Facts",
            "kM3": "K m³",
            "avg": "avg",
            "gPerT": "g/t",
            "facts": {
                "volumeLarge": "Model volume: {{volume}}K cubic meters",
                "volume": "Model volume: {{volume}} cubic meters",
                "orePercentage": "{{percentage}}% of blocks are ore-grade material",
                "zones": "Contains {{count}} distinct zone",
                "zonesPlural": "Contains {{count}} distinct zones",
                "cuGradeRange": "Cu grade ranges from {{min}}% to {{max}}%",
                "auGradeRange": "Au grade ranges from {{min}} to {{max}} g/t",
                "econValue": "Total economic value: {{value}} units",
                "rockTypes": "Contains {{count}} different rock types",
                "sizeLarge": "Large-scale model (100K+ blocks)",
                "sizeMediumLarge": "Medium-large model (50K+ blocks)",
                "sizeMedium": "Medium-scale model (10K+ blocks)"
            }
        },
        "gallery": {
            "title": "Model Gallery",
            "saveCurrent": "Save Current Model",
            "saveModel": "Save Model",
            "modelName": "Model Name",
            "modelNamePlaceholder": "Enter model name",
            "load": "Load",
            "delete": "Delete",
            "noModels": "No saved models yet. Generate a model and click \"Save\" to add it to your gallery.",
            "modelSaved": "Model \"{{name}}\" saved to gallery",
            "modelLoaded": "Loaded: {{name}}",
            "modelDeleted": "Model deleted from gallery",
            "deleteConfirm": "Delete this model from gallery?",
            "generateFirst": "Please generate a model first",
            "enterName": "Please enter a model name",
            "loading": "Loading model: {{name}}...",
            "saveError": "Error saving model: {{message}}",
            "blocks": "blocks",
            "nameTooLong": "Model name must be {{max}} characters or less",
            "storageQuotaExceeded": "Storage quota exceeded. Some data may not be saved.",
            "storageReduced": "Storage full. Reduced gallery size to save space."
        },
        "language": {
            "select": "Language",
            "english": "English",
            "spanish": "Español",
            "french": "Français"
        },
        "docs": {
            "title": "📚 Documentation",
            "subtitle": "Block Model Generator",
            "searchPlaceholder": "🔍 Search documentation...",
            "nav": {
                "gettingStarted": "Getting Started",
                "modelParameters": "Model Parameters",
                "patterns": "Material Patterns",
                "visualization": "Visualization",
                "filters": "Filters & Tools",
                "export": "Export & Data",
                "schema": "Data Schema",
                "controls": "Controls",
                "tips": "Tips & Tricks"
            },
            "sections": {
                "gettingStarted": {
                    "title": "🚀 Getting Started",
                    "welcome": "Welcome to the <strong>Mining Block Model Generator</strong>! This tool helps you create realistic 3D block models for testing mining applications, visualization, and data analysis. The tool also supports petroleum geology applications through specialized patterns.",
                    "whatIsBlockModel": "What is a Block Model?",
                    "blockModelDesc": "A block model is a 3D grid representation of a mining deposit, where each block (cell) contains properties like:",
                    "coordinates": "Coordinates (X, Y, Z) - Block center position",
                    "rockType": "Rock Type - Classification (Ore, Waste, etc.)",
                    "density": "Density - Material density in tonnes/m³",
                    "grades": "Grades - Metal concentrations (Cu, Au, etc.)",
                    "economicValue": "Economic Value - Calculated value per block",
                    "quickStartGuide": "Quick Start Guide",
                    "step1": "Set Model Parameters - Define origin, cell size, and grid dimensions",
                    "step2": "Choose a Pattern - Select how materials are distributed (12 patterns available: Uniform, Layered, Ore Bodies, Petroleum, etc.)",
                    "step3": "Generate Model - Click \"Generate\" to create your block model",
                    "step4": "Visualize - Explore the 3D model using interactive controls",
                    "step5": "Export - Download as CSV for use in other software",
                    "navigationHelp": "Navigation & Help",
                    "headerButtons": "The header contains quick access buttons:",
                    "docsButton": "📚 Docs - Opens this documentation (you're reading it now!)",
                    "memoryButton": "Memory - Monitor memory usage for large models",
                    "aboutButton": "About - Application information and credits",
                    "tipStart": "💡 Tip: Start with default parameters to get familiar with the tool, then adjust based on your needs."
                },
                "modelParameters": {
                    "title": "⚙️ Model Parameters",
                    "intro": "Model parameters define the physical structure and dimensions of your block model.",
                    "originCoordinates": "Origin Coordinates",
                    "originDesc": "The origin (X, Y, Z) defines the starting point of your model. All block coordinates are calculated relative to this origin.",
                    "originXyz": "Origin X, Y, Z - Starting coordinates in meters (default: 0, 0, 0)",
                    "originUseful": "Useful for aligning models with real-world coordinates",
                    "cellSize": "Cell Size",
                    "cellSizeDesc": "Cell size determines the dimensions of each block in the model.",
                    "cellSizeXyz": "Cell Size X, Y, Z - Block dimensions in meters (default: 1m × 1m × 1m)",
                    "cellSizeDifferent": "All three dimensions can be different (e.g., 10m × 10m × 5m)",
                    "cellSizeMin": "Minimum value: 0.1 meters",
                    "gridDimensions": "Grid Dimensions",
                    "gridDimensionsDesc": "The number of cells in each direction determines the model size.",
                    "cellsXyz": "Cells X, Y, Z - Number of blocks in each direction (default: 25 × 25 × 25)",
                    "totalBlocks": "Total blocks = Cells X × Cells Y × Cells Z",
                    "largerModels": "Larger models take more time to generate and render",
                    "performanceNote": "⚠️ Performance Note: Models with more than 50,000 blocks may take longer to generate. The app automatically uses caching for large models.",
                    "tipTesting": "💡 Tip: For testing, start with smaller models (10×10×10 = 1,000 blocks). For production, use realistic mining dimensions (e.g., 50×50×30 = 75,000 blocks)."
                },
                "patterns": {
                    "title": "🎨 Material Patterns",
                    "intro": "Material patterns control how different materials (ore, waste, etc.) are distributed throughout your block model.",
                    "advancedPatterns": "Advanced Ore Body Patterns",
                    "geologicalPatterns": "Geological Patterns",
                    "basicPatterns": "Basic Patterns",
                    "porphyryDesc": "Creates zoned ore bodies with concentric zones. Simulates porphyry copper-gold deposits.",
                    "porphyryFeature1": "High-grade core, intermediate shell, low-grade halo",
                    "porphyryFeature2": "Different Cu:Au ratios in different zones",
                    "porphyryFeature3": "Depth-related grade variations (supergene enrichment)",
                    "porphyryFeature4": "Randomized parameters for variation between generations",
                    "porphyryFeature5": "Center position, radii, grades, and structural controls are randomized",
                    "porphyryTip": "💡 Tip: Each time you press Generate, the porphyry ore body will have different characteristics while maintaining realistic geological patterns.",
                    "veinDesc": "Creates linear or planar ore bodies following structural controls. Simulates epithermal gold, mesothermal veins, or fault-controlled deposits.",
                    "veinFeature1": "Configurable strike and dip",
                    "veinFeature2": "Grade variations along strike and dip",
                    "veinFeature3": "Supports multiple parallel or intersecting veins",
                    "ellipsoidDesc": "Creates ellipsoidal ore bodies with plunging structures. Simulates massive sulfide, skarn, or VMS deposits.",
                    "ellipsoidFeature1": "Configurable size and orientation",
                    "ellipsoidFeature2": "Grade decreases from center outward",
                    "ellipsoidFeature3": "Supports multiple overlapping bodies",
                    "saltDomeDesc": "Creates a salt dome structure with oil and gas traps. Demonstrates petroleum geology concepts using the block model framework.",
                    "saltDomeFeature1": "Parabolic salt dome structure with cap rock",
                    "saltDomeFeature2": "Oil and gas trap zones around the dome",
                    "saltDomeFeature3": "Water zones below oil-water contact",
                    "saltDomeFeature4": "Multiple material types: Salt, CapRock, OilSand, GasSand, WaterSand, Shale",
                    "saltDomeFeature5": "Randomized dome position, size, trap zones, and material properties",
                    "saltDomeFieldMapping": "💡 Field Mapping: For petroleum geology, the standard fields are repurposed:",
                    "saltDomeField1": "gradeCu = Oil Saturation (%)",
                    "saltDomeField2": "gradeAu = Gas Saturation (%)",
                    "saltDomeField3": "density = Porosity (%)",
                    "saltDomeField4": "rockType = Material type (Salt, CapRock, OilSand, GasSand, WaterSand, Shale)",
                    "saltDomeTip": "💡 Tip: Each generation produces a different salt dome structure with randomized dimensions, positions, and material properties.",
                    "randomClustersDesc": "Creates multiple randomly distributed ore clusters. Simulates disseminated or stockwork deposits.",
                    "inclinedVeinDesc": "Creates an inclined planar ore body. Simulates vein deposits or fault-controlled mineralization.",
                    "singleOreHorizonDesc": "Creates a single horizontal ore layer at a specific depth. Simulates flat-lying deposits.",
                    "randomDesc": "Completely random distribution of materials. Useful for stress testing.",
                    "checkerboardDesc": "Alternating pattern of materials. Good for testing filtering and visualization tools.",
                    "gradientDesc": "Gradual transition of properties from one side to another. Useful for testing visualization.",
                    "layeredDesc": "Creates horizontal layers of different materials. Simulates sedimentary deposits.",
                    "uniformDesc": "All blocks have the same material properties. Useful for testing or simple models."
                },
                "visualization": {
                    "title": "👁️ Visualization",
                    "intro": "The 3D visualization allows you to explore your block model interactively.",
                    "viewModes": "View Modes",
                    "solidDesc": "Shows blocks as solid cubes. Best for seeing overall structure and material distribution.",
                    "pointsDesc": "Shows blocks as individual points. Useful for large models or when you need to see through the model.",
                    "transparentDesc": "Shows blocks with transparency. Allows you to see internal structure while maintaining shape.",
                    "squaresDesc": "Shows blocks as flat squares. Good for 2D-like visualization or when viewing from above.",
                    "slicesDesc": "Shows only blocks in evenly-spaced slice planes along the selected axis. Automatically calculates optimal number of slices (2-5) based on model size. Useful for examining cross-sections and understanding internal structure.",
                    "slicesXDesc": "Shows slices perpendicular to X-axis (front/back cross-sections)",
                    "slicesYDesc": "Shows slices perpendicular to Y-axis (left/right cross-sections)",
                    "slicesZDesc": "Shows slices perpendicular to Z-axis (top/bottom cross-sections)",
                    "slicesNote": "Note: Slice view modes automatically skip block thinning for better visualization, even in large models.",
                    "visualizationFields": "Visualization Fields",
                    "fieldsDesc": "Choose which property to visualize using color:",
                    "rockTypeField": "Rock Type - Color by material classification",
                    "densityField": "Density - Color scale based on density values",
                    "cuGradeField": "Cu Grade - Color scale based on copper grade",
                    "auGradeField": "Au Grade - Color scale based on gold grade",
                    "valueField": "Value - Color scale based on economic value",
                    "controls3d": "3D Controls",
                    "tipHover": "💡 Tip: Hover over blocks to see detailed information in the tooltip, including coordinates, grades, and other properties."
                },
                "filters": {
                    "title": "🔍 Filters & Tools",
                    "intro": "Filters and tools help you focus on specific parts of your model or analyze particular features.",
                    "sliceTool": "Slice Tool",
                    "valueFilter": "Value Filter",
                    "categoryFilter": "Category Filter",
                    "groundLayer": "Ground Layer",
                    "howItWorks": "How It Works",
                    "sliceToolDesc": "The slice tool allows you to view cross-sections of your model by hiding blocks outside a specific plane.",
                    "sliceToolFeature1": "Enable - Turn the slice tool on/off",
                    "sliceToolFeature2": "Axis - Choose which axis to slice (X, Y, or Z)",
                    "sliceToolFeature3": "Position - Adjust the slice position using the slider",
                    "valueFilterDesc": "Filter blocks based on their economic value or other numeric properties.",
                    "valueFilterFeature1": "Enable Filter - Turn the filter on/off",
                    "valueFilterFeature2": "Mode - Show blocks above or below the threshold",
                    "valueFilterFeature3": "Threshold - Set the value threshold using the slider",
                    "valueFilterUseful": "Useful for identifying high-value ore zones or filtering out low-value material.",
                    "categoryFilterDesc": "Show or hide specific categories (e.g., rock types) in your visualization.",
                    "categoryFilterFeature1": "Enable Filter - Turn the filter on/off",
                    "categoryFilterFeature2": "Checkboxes - Select which categories to show/hide",
                    "categoryFilterNote": "Categories are automatically detected from categorical fields like Rock Type.",
                    "groundLayerDesc": "Display a ground surface plane to provide spatial context.",
                    "groundLayerFeature1": "Show Ground - Toggle the ground plane visibility",
                    "groundLayerUseful": "Helpful for understanding the relationship between your model and the surface."
                },
                "export": {
                    "title": "💾 Export & Data",
                    "intro": "Export your block model to CSV format for use in other mining software.",
                    "exportFormat": "Export Format",
                    "exportFormatDesc": "The exported CSV follows a standardized schema compatible with:",
                    "exportFormatList1": "MiningMath",
                    "exportFormatList2": "Vulcan",
                    "exportFormatList3": "Surpac",
                    "exportFormatList4": "MineSight",
                    "exportFormatList5": "Datamine",
                    "exportProcess": "Export Process",
                    "exportProcessStep1": "Generate your block model",
                    "exportProcessStep2": "Click the \"Export\" button",
                    "exportProcessStep3": "The CSV file will download automatically",
                    "exportProcessStep4": "Open in Excel, mining software, or other tools",
                    "exportedFields": "Exported Fields",
                    "exportedFieldsDesc": "The CSV includes all relevant block properties:",
                    "exportedField1": "X, Y, Z - Block centroid coordinates (meters)",
                    "exportedField2": "ROCKTYPE - Rock type classification (or material type for petroleum)",
                    "exportedField3": "DENSITY - Density (tonnes/m³) or Porosity for petroleum patterns",
                    "exportedField4": "GRADE_CU - Copper grade (%) or Oil Saturation for petroleum",
                    "exportedField5": "GRADE_AU - Gold grade (g/t) or Gas Saturation for petroleum",
                    "exportedField6": "ECON_VALUE - Economic value",
                    "exportedField7": "ZONE - Zone identifier (if applicable)",
                    "exportPetroleumNote": "💡 Note: For petroleum geology patterns, field meanings differ. See the Data Schema section for details on petroleum field mappings.",
                    "exportTip": "💡 Tip: The export automatically filters out \"air blocks\" (blocks with density = 0) to reduce file size and improve compatibility.",
                    "exportWarning": "⚠️ Note: Large models may produce large CSV files. For models with >100,000 blocks, consider using filters before exporting. The export uses chunked processing to handle very large models (200x200x200+) without hitting JavaScript string length limits."
                },
                "schema": {
                    "title": "📊 Data Schema",
                    "intro": "The block model uses a standardized schema for maximum compatibility with mining software.",
                    "requiredFields": "Required Fields",
                    "optionalFields": "Optional Fields",
                    "tableHeaderField": "Field",
                    "tableHeaderType": "Type",
                    "tableHeaderDescription": "Description",
                    "tableHeaderUnits": "Units",
                    "fieldX": "X coordinate (centroid)",
                    "fieldY": "Y coordinate (centroid)",
                    "fieldZ": "Z coordinate (centroid)",
                    "fieldRockType": "Rock type classification",
                    "fieldDensity": "Density",
                    "fieldZone": "Zone identifier",
                    "fieldGradeCu": "Copper grade",
                    "fieldGradeAu": "Gold grade",
                    "fieldEconValue": "Economic value",
                    "unitsMeters": "meters",
                    "unitsTonnesPerM3": "tonnes/m³",
                    "unitsPercent": "%",
                    "unitsGramsPerTon": "g/t",
                    "unitsCurrency": "currency units",
                    "unitsNone": "-",
                    "coordinateConventions": "Coordinate Conventions",
                    "coordConvention1": "All coordinates represent block centroids (center points)",
                    "coordConvention2": "Coordinates are calculated as: centroid = origin + (index + 0.5) × cellSize",
                    "coordConvention3": "All units are in metric (meters)",
                    "coordConvention4": "Precision: 4 decimal places for numeric values",
                    "petroleumMappings": "Petroleum Geology Field Mappings",
                    "petroleumMappingsTitle": "Alternative Field Meanings",
                    "petroleumMappingsDesc": "For petroleum geology patterns (e.g., Salt Dome Reservoir), the standard fields are repurposed to represent petroleum properties:",
                    "petroleumTableHeaderStandard": "Standard Field",
                    "petroleumTableHeaderPetroleum": "Petroleum Meaning",
                    "petroleumTableHeaderUnits": "Units",
                    "petroleumMapping1": "Oil Saturation",
                    "petroleumMapping2": "Gas Saturation",
                    "petroleumMapping3": "Porosity",
                    "petroleumMapping4": "Material Type",
                    "petroleumMapping5": "Economic Value",
                    "petroleumMapping6": "Salt, CapRock, OilSand, GasSand, WaterSand, Shale",
                    "petroleumMapping7": "$/barrel equivalent",
                    "petroleumMappingsNote": "💡 Note: This field mapping allows the same block model framework to be used for both mining and petroleum applications. When exporting petroleum models, be aware that field names remain the same but meanings differ."
                },
                "controls": {
                    "title": "🎮 Controls",
                    "mouseControls": "Mouse Controls",
                    "mouseControlsTableAction": "Action",
                    "mouseControlsTableControl": "Control",
                    "mouseControlsTableDescription": "Description",
                    "mouseControlRotate": "Rotate",
                    "mouseControlRotateDesc": "Rotate the 3D model around its center",
                    "mouseControlPan": "Pan",
                    "mouseControlPanDesc": "Move the view horizontally/vertically",
                    "mouseControlZoom": "Zoom",
                    "mouseControlZoomDesc": "Zoom in/out on the model",
                    "mouseControlInfo": "Info",
                    "mouseControlInfoDesc": "Show block information in tooltip",
                    "mouseControlLeftClick": "Left-click + Drag",
                    "mouseControlRightClick": "Right-click + Drag",
                    "mouseControlScroll": "Scroll Wheel",
                    "mouseControlHover": "Hover",
                    "keyboardShortcuts": "Keyboard Shortcuts",
                    "keyboardDesc": "Currently, all controls are mouse-based. Keyboard shortcuts may be added in future versions.",
                    "buttonFunctions": "Button Functions",
                    "buttonGenerate": "Generate - Creates a new block model based on current parameters",
                    "buttonExport": "Export - Downloads the current model as CSV (enabled after generation)",
                    "buttonZoom": "Zoom to Fit - Resets the camera to show the entire model",
                    "buttonDocs": "📚 Docs - Opens this documentation in a new window",
                    "buttonMemory": "Memory - Displays memory usage information",
                    "buttonAbout": "About - Shows application information and credits"
                },
                "tips": {
                    "title": "💡 Tips & Tricks",
                    "performanceOptimization": "Performance Optimization",
                    "perfTip1": "Start with smaller models to test patterns and settings",
                    "perfTip2": "Use \"Points\" view mode for very large models (>100K blocks)",
                    "perfTip3": "Use \"Slices X/Y/Z\" view modes for examining large models - automatically skips thinning",
                    "perfTip4": "Enable filters to reduce rendering load",
                    "perfTip5": "Large models (>50K blocks) are automatically cached in browser storage for faster regeneration",
                    "perfTip6": "Models >200K blocks use automatic block thinning for visualization (full model available for export)",
                    "perfTip7": "Models >500K blocks are generated in chunks to avoid browser freezing",
                    "perfTip8": "Value filter uses GPU-accelerated shader-based clipping for real-time updates",
                    "visualizationTips": "Visualization Tips",
                    "vizTip1": "Use different view modes to see different aspects of your model",
                    "vizTip2": "Combine slice tool with filters for detailed cross-section analysis",
                    "vizTip3": "Switch between visualization fields to compare different properties",
                    "vizTip4": "Use transparent mode to see internal structure",
                    "patternSelection": "Pattern Selection",
                    "patternTip1": "Porphyry-Style Zoning - Ideal for large-scale porphyry deposits",
                    "patternTip2": "Vein/Structural Ore Body - Best for epithermal gold and fault-controlled deposits",
                    "patternTip3": "Ellipsoid Ore Body - Best for massive sulfide, skarn, or VMS deposits",
                    "patternTip4": "Salt Dome Reservoir - Perfect for petroleum geology demonstrations",
                    "patternTip5": "Random Clusters - Realistic for disseminated or stockwork deposits",
                    "patternTip6": "Inclined Vein - Good for simple vein deposits",
                    "patternTip7": "Single Ore Horizon - Good for flat-lying sedimentary deposits",
                    "patternTip8": "Basic Patterns (Random, Checkerboard, Gradient, Layered, Uniform) - Useful for testing and simple models",
                    "exportBestPractices": "Export Best Practices",
                    "exportTip1": "Filter out unwanted blocks before exporting to reduce file size",
                    "exportTip2": "Verify coordinate system matches your target software",
                    "exportTip3": "Check that all required fields are present for your use case",
                    "exportTip4": "Use appropriate cell sizes for your application (e.g., 5m×5m×5m for detailed models)",
                    "commonUseCases": "Common Use Cases",
                    "useCase1Title": "Testing Mining Software",
                    "useCase1Desc": "Generate models with known properties to test algorithms, visualization, or processing tools.",
                    "useCase2Title": "Training & Education",
                    "useCase2Desc": "Create models for teaching mining concepts, visualization techniques, or data analysis.",
                    "useCase3Title": "Prototype Development",
                    "useCase3Desc": "Use generated models as test data during software development when real data isn't available.",
                    "useCase4Title": "Visualization Testing",
                    "useCase4Desc": "Test visualization tools with various model sizes, patterns, and properties.",
                    "useCase5Title": "Petroleum Geology",
                    "useCase5Desc": "Use the Salt Dome Reservoir pattern to demonstrate petroleum geology concepts, reservoir modeling, and oil/gas trap visualization.",
                    "proTip": "💡 Pro Tip: Save your parameter combinations for common use cases. The app remembers your last settings in the browser."
                }
            }
        }
    },
    'es': {
        "app": {
            "title": "Generador de Modelo de Bloques Mineros",
            "subtitle": "Crea modelos de bloques 3D ficticios para probar aplicaciones mineras"
        },
        "buttons": {
            "generate": "Generar",
            "export": "Exportar",
            "zoomToFit": "Zoom",
            "memory": "Memoria",
            "about": "Acerca de",
            "documentation": "Documentación",
            "stats": "Estadísticas",
            "gallery": "Galería",
            "save": "Guardar",
            "cancel": "Cancelar"
        },
        "modelParameters": {
            "title": "Parámetros del Modelo",
            "originX": "Origen X",
            "originY": "Origen Y",
            "originZ": "Origen Z",
            "cellSizeX": "Tamaño de Celda X",
            "cellSizeY": "Tamaño de Celda Y",
            "cellSizeZ": "Tamaño de Celda Z",
            "cellsX": "Celdas X",
            "cellsY": "Celdas Y",
            "cellsZ": "Celdas Z",
            "materialPattern": "Patrón de Material"
        },
        "patterns": {
            "uniform": "Uniforme",
            "layered": "Estratificado",
            "gradient": "Gradiente",
            "checkerboard": "Tablero de Ajedrez",
            "random": "Aleatorio",
            "ore_horizon": "Horizonte de Mineral Único",
            "inclined_vein": "Veta Inclinada",
            "random_clusters": "Agrupaciones Aleatorias",
            "ellipsoid_ore": "Cuerpo de Mineral Elipsoidal",
            "vein_ore": "Cuerpo de Mineral de Veta/Estructural",
            "porphyry_ore": "Zonificación Estilo Pórfido",
            "salt_dome": "Reservorio de Domo de Sal (Petróleo)"
        },
        "visualization": {
            "title": "Visualización",
            "viewMode": "Modo de Vista",
            "field": "Campo",
            "modes": {
                "solid": "Sólido",
                "points": "Puntos",
                "transparent": "Transparente",
                "squares": "Cuadrados",
                "slicesX": "Cortes X",
                "slicesY": "Cortes Y",
                "slicesZ": "Cortes Z"
            },
            "fields": {
                "rockType": "Tipo de Roca",
                "density": "Densidad",
                "gradeCu": "Ley de Cu",
                "gradeAu": "Ley de Au",
                "econValue": "Valor"
            }
        },
        "sliceTool": {
            "title": "Herramienta de Corte",
            "enable": "Habilitar",
            "axis": "Eje",
            "position": "Posición: {{value}}",
            "axes": {
                "x": "X (Frente/Atrás)",
                "y": "Y (Izquierda/Derecha)",
                "z": "Z (Arriba/Abajo)"
            }
        },
        "valueFilter": {
            "title": "Filtro de Valor",
            "enable": "Habilitar Filtro",
            "mode": "Modo",
            "threshold": "Umbral: {{value}}",
            "modes": {
                "above": "Por encima del umbral",
                "below": "Por debajo del umbral"
            }
        },
        "categoryFilter": {
            "title": "Filtro de Categoría",
            "enable": "Habilitar Filtro",
            "showHide": "Mostrar/Ocultar Categorías:",
            "selectField": "Seleccione un campo categórico (ej., Tipo de Roca) para filtrar",
            "noBlocks": "No hay bloques disponibles"
        },
        "groundLayer": {
            "title": "Capa del Suelo",
            "showGround": "Mostrar Suelo"
        },
        "status": {
            "generatingInitial": "Generando modelo inicial...",
            "generating": "Generando modelo de bloques...",
            "checkingCache": "Verificando caché para modelo grande...",
            "loadedFromCache": "Cargados {{count}} bloques desde la caché.",
            "generatingBlocks": "Generando {{count}} bloques...",
            "generatingLarge": "Generando modelo grande en fragmentos (esto puede tardar un poco)...",
            "generatingProgress": "Generando bloques: {{progress}}% ({{processed}}/{{total}})...",
            "applyingPattern": "Aplicando patrón de material...",
            "caching": "Almacenando datos del modelo en caché...",
            "modelGenerated": "Modelo generado: {{count}} bloques. Patrón: {{pattern}}. Listo para exportar.",
            "modelGeneratedLarge": "Modelo generado: {{count}} bloques. Patrón: {{pattern}}. Visualizando muestra para rendimiento. Modelo completo disponible para exportar.",
            "modelLoaded": "Modelo cargado desde la caché: {{count}} bloques. Listo para exportar.",
            "modelLoadedLarge": "Modelo cargado desde la caché: {{count}} bloques. Visualizando muestra para rendimiento. Modelo completo disponible para exportar.",
            "exporting": "Exportando a ZIP (esto puede tardar un momento para modelos grandes)...",
            "zipNotAvailable": "Biblioteca ZIP no cargada. Exportando como CSV...",
            "exportSuccess": "ZIP exportado exitosamente: {{count}} bloques. Comprimido {{originalSize}} MB a {{compressedSize}} MB ({{ratio}}% de reducción).",
            "csvSuccess": "CSV exportado exitosamente: {{count}} bloques.",
            "error": "Error: {{message}}",
            "noBlocksToExport": "No hay bloques para exportar. Por favor, genere un modelo primero.",
            "csvTooLarge": "El contenido CSV es demasiado grande. Por favor, reduzca el tamaño del modelo.",
            "exportError": "Error de exportación: {{message}}. Intentando exportar como CSV...",
            "csvError": "Error de exportación CSV: {{message}}"
        },
        "errors": {
            "cellSizeInvalid": "Los tamaños de celda deben ser mayores que 0",
            "cellCountInvalid": "El número de celdas debe ser mayor que 0"
        },
        "stats": {
            "title": "Panel de Estadísticas",
            "overview": "Resumen",
            "totalModels": "Total de Modelos",
            "totalExports": "Total de Exportaciones",
            "firstModel": "Primer Modelo",
            "lastModel": "Último Modelo",
            "patternsExplored": "Patrones Explorados",
            "patternsTried": "Patrones Probados",
            "mostUsed": "Más Usado",
            "featuresUsed": "Características Usadas",
            "viewModes": "Modos de Vista",
            "toolsUsed": "Herramientas Usadas",
            "modelCharacteristics": "Características del Modelo",
            "largestModel": "Modelo Más Grande",
            "averageModelSize": "Tamaño Promedio del Modelo",
            "totalVolume": "Volumen Total Generado",
            "currentSession": "Sesión Actual",
            "modelsGenerated": "Modelos Generados",
            "of12": "de 12",
            "of7": "de 7",
            "of4": "de 4",
            "blocks": "bloques",
            "millionM3": "millones de m³"
        },
        "modelStats": {
            "title": "📈 Estadísticas del Modelo",
            "blocks": "Bloques",
            "volume": "Volumen",
            "ore": "Mineral",
            "waste": "Desecho",
            "zones": "Zonas",
            "cuGrade": "Ley de Cu",
            "auGrade": "Ley de Au",
            "interestingFacts": "Datos Interesantes",
            "kM3": "K m³",
            "avg": "prom",
            "gPerT": "g/t",
            "facts": {
                "volumeLarge": "Volumen del modelo: {{volume}}K metros cúbicos",
                "volume": "Volumen del modelo: {{volume}} metros cúbicos",
                "orePercentage": "{{percentage}}% de los bloques son material de ley de mineral",
                "zones": "Contiene {{count}} zona distinta",
                "zonesPlural": "Contiene {{count}} zonas distintas",
                "cuGradeRange": "La ley de Cu varía de {{min}}% a {{max}}%",
                "auGradeRange": "La ley de Au varía de {{min}} a {{max}} g/t",
                "econValue": "Valor económico total: {{value}} unidades",
                "rockTypes": "Contiene {{count}} tipos de roca diferentes",
                "sizeLarge": "Modelo a gran escala (100K+ bloques)",
                "sizeMediumLarge": "Modelo mediano-grande (50K+ bloques)",
                "sizeMedium": "Modelo de escala media (10K+ bloques)"
            }
        },
        "gallery": {
            "title": "Galería de Modelos",
            "saveCurrent": "Guardar Modelo Actual",
            "saveModel": "Guardar Modelo",
            "modelName": "Nombre del Modelo",
            "modelNamePlaceholder": "Ingresa el nombre del modelo",
            "load": "Cargar",
            "delete": "Eliminar",
            "noModels": "Aún no hay modelos guardados. Genera un modelo y haz clic en \"Guardar\" para agregarlo a tu galería.",
            "modelSaved": "Modelo \"{{name}}\" guardado en la galería",
            "modelLoaded": "Cargado: {{name}}",
            "modelDeleted": "Modelo eliminado de la galería",
            "deleteConfirm": "¿Eliminar este modelo de la galería?",
            "generateFirst": "Por favor, genera un modelo primero",
            "enterName": "Por favor, ingresa un nombre para el modelo",
            "loading": "Cargando modelo: {{name}}...",
            "saveError": "Error al guardar el modelo: {{message}}",
            "blocks": "bloques",
            "nameTooLong": "El nombre del modelo debe tener {{max}} caracteres o menos",
            "storageQuotaExceeded": "Cuota de almacenamiento excedida. Es posible que algunos datos no se guarden.",
            "storageReduced": "Almacenamiento lleno. Se redujo el tamaño de la galería para ahorrar espacio."
        },
        "tooltip": {
            "title": "Información del Bloque",
            "position": "Posición:",
            "indices": "Índices:",
            "rockType": "Tipo de Roca:",
            "density": "Densidad:",
            "cuGrade": "Ley de Cu:",
            "auGrade": "Ley de Au:",
            "econValue": "Valor Económico:",
            "zone": "Zona:",
            "notAvailable": "N/D",
            "units": {
                "density": "t/m³",
                "cuGrade": "%",
                "auGrade": "g/t"
            }
        },
        "controls": {
            "hint": "Controles: Arrastrar con clic izquierdo para rotar | Arrastrar con clic derecho para desplazar | Desplazar rueda para acercar/alejar"
        },
        "about": {
            "title": "Acerca de",
            "appName": "Generador de Modelo de Bloques Mineros",
            "builtBy": "Desarrollado por <strong><a href=\"mailto:chris@builditdesignlab.com\">Chris Andrews</a></strong>, <a href=\"https://www.builditdesignlab.com/#block-model-generator\" target=\"_blank\" rel=\"noopener noreferrer\">BuildIT Design Labs</a>",
            "license": "Licencia: Licencia MIT",
            "copyright": "Copyright: © {{year}} Todos los derechos reservados"
        },
        "memory": {
            "title": "Monitor de Memoria",
            "usage": "Uso de Memoria:",
            "loading": "Cargando...",
            "note": "Nota: La información de memoria puede no estar disponible en todos los navegadores.",
            "usedHeap": "Montón JS Usado",
            "totalHeap": "Montón JS Total",
            "heapLimit": "Límite del Montón JS",
            "heapUsage": "Uso del Montón",
            "deviceMemory": "Memoria del Dispositivo",
            "threejsObjects": "Objetos Three.js:",
            "sceneObjects": "Objetos de Escena",
            "geometries": "Geometrías",
            "materials": "Materiales",
            "textures": "Texturas"
        },
        "language": {
            "select": "Idioma",
            "english": "English",
            "spanish": "Español",
            "french": "Français"
        },
        "docs": {
            "title": "📚 Documentación",
            "subtitle": "Generador de Modelo de Bloques",
            "searchPlaceholder": "🔍 Buscar documentación...",
            "nav": {
                "gettingStarted": "Primeros Pasos",
                "modelParameters": "Parámetros del Modelo",
                "patterns": "Patrones de Material",
                "visualization": "Visualización",
                "filters": "Filtros y Herramientas",
                "export": "Exportar y Datos",
                "schema": "Esquema de Datos",
                "controls": "Controles",
                "tips": "Consejos y Trucos"
            },
            "sections": {
                "gettingStarted": {
                    "title": "🚀 Primeros Pasos",
                    "welcome": "¡Bienvenido al <strong>Generador de Modelo de Bloques Mineros</strong>! Esta herramienta te ayuda a crear modelos de bloques 3D realistas para probar aplicaciones mineras, visualización y análisis de datos. La herramienta también admite aplicaciones de geología petrolera a través de patrones especializados.",
                    "whatIsBlockModel": "¿Qué es un Modelo de Bloques?",
                    "blockModelDesc": "Un modelo de bloques es una representación de cuadrícula 3D de un depósito minero, donde cada bloque (celda) contiene propiedades como:",
                    "coordinates": "Coordenadas (X, Y, Z) - Posición del centro del bloque",
                    "rockType": "Tipo de Roca - Clasificación (Mineral, Desecho, etc.)",
                    "density": "Densidad - Densidad del material en toneladas/m³",
                    "grades": "Leyes - Concentraciones de metales (Cu, Au, etc.)",
                    "economicValue": "Valor Económico - Valor calculado por bloque",
                    "quickStartGuide": "Guía de Inicio Rápido",
                    "step1": "Establecer Parámetros del Modelo - Definir origen, tamaño de celda y dimensiones de la cuadrícula",
                    "step2": "Elegir un Patrón - Seleccionar cómo se distribuyen los materiales (12 patrones disponibles: Uniforme, Capas, Cuerpos de Mineral, Petróleo, etc.)",
                    "step3": "Generar Modelo - Hacer clic en \"Generar\" para crear tu modelo de bloques",
                    "step4": "Visualizar - Explorar el modelo 3D usando controles interactivos",
                    "step5": "Exportar - Descargar como CSV para usar en otro software",
                    "navigationHelp": "Navegación y Ayuda",
                    "headerButtons": "El encabezado contiene botones de acceso rápido:",
                    "docsButton": "📚 Docs - Abre esta documentación (¡la estás leyendo ahora!)",
                    "memoryButton": "Memoria - Monitorear el uso de memoria para modelos grandes",
                    "aboutButton": "Acerca de - Información de la aplicación y créditos",
                    "tipStart": "💡 Consejo: Comienza con parámetros predeterminados para familiarizarte con la herramienta, luego ajusta según tus necesidades."
                },
                "modelParameters": {
                    "title": "⚙️ Parámetros del Modelo",
                    "intro": "Los parámetros del modelo definen la estructura física y las dimensiones de tu modelo de bloques.",
                    "originCoordinates": "Coordenadas de Origen",
                    "originDesc": "El origen (X, Y, Z) define el punto de partida de tu modelo. Todas las coordenadas de los bloques se calculan en relación con este origen.",
                    "originXyz": "Origen X, Y, Z - Coordenadas iniciales en metros (predeterminado: 0, 0, 0)",
                    "originUseful": "Útil para alinear modelos con coordenadas del mundo real",
                    "cellSize": "Tamaño de Celda",
                    "cellSizeDesc": "El tamaño de celda determina las dimensiones de cada bloque en el modelo.",
                    "cellSizeXyz": "Tamaño de Celda X, Y, Z - Dimensiones del bloque en metros (predeterminado: 1m × 1m × 1m)",
                    "cellSizeDifferent": "Las tres dimensiones pueden ser diferentes (ej., 10m × 10m × 5m)",
                    "cellSizeMin": "Valor mínimo: 0.1 metros",
                    "gridDimensions": "Dimensiones de la Cuadrícula",
                    "gridDimensionsDesc": "El número de celdas en cada dirección determina el tamaño del modelo.",
                    "cellsXyz": "Celdas X, Y, Z - Número de bloques en cada dirección (predeterminado: 25 × 25 × 25)",
                    "totalBlocks": "Total de bloques = Celdas X × Celdas Y × Celdas Z",
                    "largerModels": "Los modelos más grandes tardan más en generarse y renderizarse",
                    "performanceNote": "⚠️ Nota de Rendimiento: Los modelos con más de 50,000 bloques pueden tardar más en generarse. La aplicación usa automáticamente caché para modelos grandes.",
                    "tipTesting": "💡 Consejo: Para pruebas, comienza con modelos más pequeños (10×10×10 = 1,000 bloques). Para producción, usa dimensiones mineras realistas (ej., 50×50×30 = 75,000 bloques)."
                },
                "patterns": {
                    "title": "🎨 Patrones de Material",
                    "intro": "Los patrones de material controlan cómo se distribuyen diferentes materiales (mineral, desecho, etc.) en todo tu modelo de bloques.",
                    "advancedPatterns": "Patrones Avanzados de Cuerpos de Mineral",
                    "geologicalPatterns": "Patrones Geológicos",
                    "basicPatterns": "Patrones Básicos",
                    "porphyryDesc": "Crea cuerpos de mineral zonificados con zonas concéntricas. Simula depósitos de pórfido de cobre-oro.",
                    "porphyryFeature1": "Núcleo de alta ley, capa intermedia, halo de baja ley",
                    "porphyryFeature2": "Diferentes relaciones Cu:Au en diferentes zonas",
                    "porphyryFeature3": "Variaciones de ley relacionadas con la profundidad (enriquecimiento supergénico)",
                    "porphyryFeature4": "Parámetros aleatorizados para variación entre generaciones",
                    "porphyryFeature5": "La posición del centro, los radios, las leyes y los controles estructurales están aleatorizados",
                    "porphyryTip": "💡 Consejo: Cada vez que presionas Generar, el cuerpo de mineral de pórfido tendrá diferentes características mientras mantiene patrones geológicos realistas.",
                    "veinDesc": "Crea cuerpos de mineral lineales o planares siguiendo controles estructurales. Simula depósitos de oro epitermal, vetas mesotermales o depósitos controlados por fallas.",
                    "veinFeature1": "Rumbo e inclinación configurables",
                    "veinFeature2": "Variaciones de ley a lo largo del rumbo y la inclinación",
                    "veinFeature3": "Admite múltiples vetas paralelas o que se cruzan",
                    "ellipsoidDesc": "Crea cuerpos de mineral elipsoidales con estructuras que se hunden. Simula depósitos de sulfuro masivo, skarn o VMS.",
                    "ellipsoidFeature1": "Tamaño y orientación configurables",
                    "ellipsoidFeature2": "La ley disminuye desde el centro hacia afuera",
                    "ellipsoidFeature3": "Admite múltiples cuerpos superpuestos",
                    "saltDomeDesc": "Crea una estructura de domo de sal con trampas de petróleo y gas. Demuestra conceptos de geología petrolera usando el marco del modelo de bloques.",
                    "saltDomeFeature1": "Estructura de domo de sal parabólica con capa de roca",
                    "saltDomeFeature2": "Zonas de trampa de petróleo y gas alrededor del domo",
                    "saltDomeFeature3": "Zonas de agua debajo del contacto agua-petróleo",
                    "saltDomeFeature4": "Múltiples tipos de material: Sal, CapRock, OilSand, GasSand, WaterSand, Shale",
                    "saltDomeFeature5": "Posición del domo, tamaño, zonas de trampa y propiedades del material aleatorizados",
                    "saltDomeFieldMapping": "💡 Mapeo de Campos: Para geología petrolera, los campos estándar se reutilizan:",
                    "saltDomeField1": "gradeCu = Saturación de Petróleo (%)",
                    "saltDomeField2": "gradeAu = Saturación de Gas (%)",
                    "saltDomeField3": "density = Porosidad (%)",
                    "saltDomeField4": "rockType = Tipo de material (Sal, CapRock, OilSand, GasSand, WaterSand, Shale)",
                    "saltDomeTip": "💡 Consejo: Cada generación produce una estructura de domo de sal diferente con dimensiones, posiciones y propiedades del material aleatorizadas.",
                    "randomClustersDesc": "Crea múltiples agrupaciones de mineral distribuidas aleatoriamente. Simula depósitos diseminados o de stockwork.",
                    "inclinedVeinDesc": "Crea un cuerpo de mineral planar inclinado. Simula depósitos de veta o mineralización controlada por fallas.",
                    "singleOreHorizonDesc": "Crea una sola capa de mineral horizontal a una profundidad específica. Simula depósitos planos.",
                    "randomDesc": "Distribución completamente aleatoria de materiales. Útil para pruebas de estrés.",
                    "checkerboardDesc": "Patrón alternado de materiales. Bueno para probar herramientas de filtrado y visualización.",
                    "gradientDesc": "Transición gradual de propiedades de un lado a otro. Útil para probar visualización.",
                    "layeredDesc": "Crea capas horizontales de diferentes materiales. Simula depósitos sedimentarios.",
                    "uniformDesc": "Todos los bloques tienen las mismas propiedades de material. Útil para pruebas o modelos simples."
                },
                "visualization": {
                    "title": "👁️ Visualización",
                    "intro": "La visualización 3D te permite explorar tu modelo de bloques de forma interactiva.",
                    "viewModes": "Modos de Vista",
                    "solidDesc": "Muestra los bloques como cubos sólidos. Ideal para ver la estructura general y la distribución de materiales.",
                    "pointsDesc": "Muestra los bloques como puntos individuales. Útil para modelos grandes o cuando necesitas ver a través del modelo.",
                    "transparentDesc": "Muestra los bloques con transparencia. Permite ver la estructura interna mientras se mantiene la forma.",
                    "squaresDesc": "Muestra los bloques como cuadrados planos. Bueno para visualización tipo 2D o cuando se ve desde arriba.",
                    "slicesDesc": "Muestra solo los bloques en planos de corte espaciados uniformemente a lo largo del eje seleccionado. Calcula automáticamente el número óptimo de cortes (2-5) según el tamaño del modelo. Útil para examinar secciones transversales y comprender la estructura interna.",
                    "slicesXDesc": "Muestra cortes perpendiculares al eje X (secciones transversales frontal/trasera)",
                    "slicesYDesc": "Muestra cortes perpendiculares al eje Y (secciones transversales izquierda/derecha)",
                    "slicesZDesc": "Muestra cortes perpendiculares al eje Z (secciones transversales superior/inferior)",
                    "slicesNote": "Nota: Los modos de vista de cortes omiten automáticamente el adelgazamiento de bloques para una mejor visualización, incluso en modelos grandes.",
                    "visualizationFields": "Campos de Visualización",
                    "fieldsDesc": "Elige qué propiedad visualizar usando color:",
                    "rockTypeField": "Tipo de Roca - Color por clasificación de material",
                    "densityField": "Densidad - Escala de color basada en valores de densidad",
                    "cuGradeField": "Ley de Cu - Escala de color basada en la ley de cobre",
                    "auGradeField": "Ley de Au - Escala de color basada en la ley de oro",
                    "valueField": "Valor - Escala de color basada en el valor económico",
                    "controls3d": "Controles 3D",
                    "tipHover": "💡 Consejo: Pasa el mouse sobre los bloques para ver información detallada en la información sobre herramientas, incluidas coordenadas, leyes y otras propiedades."
                },
                "filters": {
                    "title": "🔍 Filtros y Herramientas",
                    "intro": "Los filtros y herramientas te ayudan a enfocarte en partes específicas de tu modelo o analizar características particulares.",
                    "sliceTool": "Herramienta de Corte",
                    "valueFilter": "Filtro de Valor",
                    "categoryFilter": "Filtro de Categoría",
                    "groundLayer": "Capa del Suelo",
                    "howItWorks": "Cómo Funciona",
                    "sliceToolDesc": "La herramienta de corte te permite ver secciones transversales de tu modelo ocultando bloques fuera de un plano específico.",
                    "sliceToolFeature1": "Habilitar - Activar/desactivar la herramienta de corte",
                    "sliceToolFeature2": "Eje - Elige qué eje cortar (X, Y o Z)",
                    "sliceToolFeature3": "Posición - Ajusta la posición del corte usando el deslizador",
                    "valueFilterDesc": "Filtra bloques según su valor económico u otras propiedades numéricas.",
                    "valueFilterFeature1": "Habilitar Filtro - Activar/desactivar el filtro",
                    "valueFilterFeature2": "Modo - Mostrar bloques por encima o por debajo del umbral",
                    "valueFilterFeature3": "Umbral - Establece el umbral de valor usando el deslizador",
                    "valueFilterUseful": "Útil para identificar zonas de mineral de alto valor o filtrar material de bajo valor.",
                    "categoryFilterDesc": "Mostrar u ocultar categorías específicas (ej., tipos de roca) en tu visualización.",
                    "categoryFilterFeature1": "Habilitar Filtro - Activar/desactivar el filtro",
                    "categoryFilterFeature2": "Casillas de verificación - Selecciona qué categorías mostrar/ocultar",
                    "categoryFilterNote": "Las categorías se detectan automáticamente de campos categóricos como Tipo de Roca.",
                    "groundLayerDesc": "Muestra un plano de superficie del suelo para proporcionar contexto espacial.",
                    "groundLayerFeature1": "Mostrar Suelo - Alternar la visibilidad del plano del suelo",
                    "groundLayerUseful": "Útil para entender la relación entre tu modelo y la superficie."
                },
                "export": {
                    "title": "💾 Exportar y Datos",
                    "intro": "Exporta tu modelo de bloques al formato CSV para usar en otro software minero.",
                    "exportFormat": "Formato de Exportación",
                    "exportFormatDesc": "El CSV exportado sigue un esquema estandarizado compatible con:",
                    "exportFormatList1": "MiningMath",
                    "exportFormatList2": "Vulcan",
                    "exportFormatList3": "Surpac",
                    "exportFormatList4": "MineSight",
                    "exportFormatList5": "Datamine",
                    "exportProcess": "Proceso de Exportación",
                    "exportProcessStep1": "Genera tu modelo de bloques",
                    "exportProcessStep2": "Haz clic en el botón \"Exportar\"",
                    "exportProcessStep3": "El archivo CSV se descargará automáticamente",
                    "exportProcessStep4": "Abre en Excel, software minero u otras herramientas",
                    "exportedFields": "Campos Exportados",
                    "exportedFieldsDesc": "El CSV incluye todas las propiedades relevantes de los bloques:",
                    "exportedField1": "X, Y, Z - Coordenadas del centroide del bloque (metros)",
                    "exportedField2": "ROCKTYPE - Clasificación del tipo de roca (o tipo de material para petróleo)",
                    "exportedField3": "DENSITY - Densidad (toneladas/m³) o Porosidad para patrones de petróleo",
                    "exportedField4": "GRADE_CU - Ley de cobre (%) o Saturación de Petróleo para petróleo",
                    "exportedField5": "GRADE_AU - Ley de oro (g/t) o Saturación de Gas para petróleo",
                    "exportedField6": "ECON_VALUE - Valor económico",
                    "exportedField7": "ZONE - Identificador de zona (si aplica)",
                    "exportPetroleumNote": "💡 Nota: Para patrones de geología petrolera, los significados de los campos difieren. Consulta la sección Esquema de Datos para detalles sobre los mapeos de campos de petróleo.",
                    "exportTip": "💡 Consejo: La exportación filtra automáticamente los \"bloques de aire\" (bloques con densidad = 0) para reducir el tamaño del archivo y mejorar la compatibilidad.",
                    "exportWarning": "⚠️ Nota: Los modelos grandes pueden producir archivos CSV grandes. Para modelos con >100,000 bloques, considera usar filtros antes de exportar. La exportación usa procesamiento por fragmentos para manejar modelos muy grandes (200x200x200+) sin alcanzar los límites de longitud de cadena de JavaScript."
                },
                "schema": {
                    "title": "📊 Esquema de Datos",
                    "intro": "El modelo de bloques usa un esquema estandarizado para máxima compatibilidad con software minero.",
                    "requiredFields": "Campos Requeridos",
                    "optionalFields": "Campos Opcionales",
                    "tableHeaderField": "Campo",
                    "tableHeaderType": "Tipo",
                    "tableHeaderDescription": "Descripción",
                    "tableHeaderUnits": "Unidades",
                    "fieldX": "Coordenada X (centroide)",
                    "fieldY": "Coordenada Y (centroide)",
                    "fieldZ": "Coordenada Z (centroide)",
                    "fieldRockType": "Clasificación del tipo de roca",
                    "fieldDensity": "Densidad",
                    "fieldZone": "Identificador de zona",
                    "fieldGradeCu": "Ley de cobre",
                    "fieldGradeAu": "Ley de oro",
                    "fieldEconValue": "Valor económico",
                    "unitsMeters": "metros",
                    "unitsTonnesPerM3": "toneladas/m³",
                    "unitsPercent": "%",
                    "unitsGramsPerTon": "g/t",
                    "unitsCurrency": "unidades monetarias",
                    "unitsNone": "-",
                    "coordinateConventions": "Convenciones de Coordenadas",
                    "coordConvention1": "Todas las coordenadas representan centroides de bloques (puntos centrales)",
                    "coordConvention2": "Las coordenadas se calculan como: centroide = origen + (índice + 0.5) × tamañoCelda",
                    "coordConvention3": "Todas las unidades están en métrico (metros)",
                    "coordConvention4": "Precisión: 4 decimales para valores numéricos",
                    "petroleumMappings": "Mapeos de Campos de Geología Petrolera",
                    "petroleumMappingsTitle": "Significados Alternativos de Campos",
                    "petroleumMappingsDesc": "Para patrones de geología petrolera (ej., Reservorio de Domo de Sal), los campos estándar se reutilizan para representar propiedades petroleras:",
                    "petroleumTableHeaderStandard": "Campo Estándar",
                    "petroleumTableHeaderPetroleum": "Significado Petrolero",
                    "petroleumTableHeaderUnits": "Unidades",
                    "petroleumMapping1": "Saturación de Petróleo",
                    "petroleumMapping2": "Saturación de Gas",
                    "petroleumMapping3": "Porosidad",
                    "petroleumMapping4": "Tipo de Material",
                    "petroleumMapping5": "Valor Económico",
                    "petroleumMapping6": "Sal, CapRock, OilSand, GasSand, WaterSand, Shale",
                    "petroleumMapping7": "$/barril equivalente",
                    "petroleumMappingsNote": "💡 Nota: Este mapeo de campos permite que el mismo marco de modelo de bloques se use tanto para aplicaciones mineras como petroleras. Al exportar modelos petroleros, ten en cuenta que los nombres de los campos permanecen iguales pero los significados difieren."
                },
                "controls": {
                    "title": "🎮 Controles",
                    "mouseControls": "Controles del Mouse",
                    "mouseControlsTableAction": "Acción",
                    "mouseControlsTableControl": "Control",
                    "mouseControlsTableDescription": "Descripción",
                    "mouseControlRotate": "Rotar",
                    "mouseControlRotateDesc": "Rotar el modelo 3D alrededor de su centro",
                    "mouseControlPan": "Desplazar",
                    "mouseControlPanDesc": "Mover la vista horizontalmente/verticalmente",
                    "mouseControlZoom": "Zoom",
                    "mouseControlZoomDesc": "Acercar/alejar el modelo",
                    "mouseControlInfo": "Información",
                    "mouseControlInfoDesc": "Mostrar información del bloque en la información sobre herramientas",
                    "mouseControlLeftClick": "Clic izquierdo + Arrastrar",
                    "mouseControlRightClick": "Clic derecho + Arrastrar",
                    "mouseControlScroll": "Rueda de Desplazamiento",
                    "mouseControlHover": "Pasar el Mouse",
                    "keyboardShortcuts": "Atajos de Teclado",
                    "keyboardDesc": "Actualmente, todos los controles se basan en el mouse. Los atajos de teclado pueden agregarse en versiones futuras.",
                    "buttonFunctions": "Funciones de Botones",
                    "buttonGenerate": "Generar - Crea un nuevo modelo de bloques basado en los parámetros actuales",
                    "buttonExport": "Exportar - Descarga el modelo actual como CSV (habilitado después de la generación)",
                    "buttonZoom": "Ajustar Zoom - Restablece la cámara para mostrar todo el modelo",
                    "buttonDocs": "📚 Docs - Abre esta documentación en una nueva ventana",
                    "buttonMemory": "Memoria - Muestra información de uso de memoria",
                    "buttonAbout": "Acerca de - Muestra información de la aplicación y créditos"
                },
                "tips": {
                    "title": "💡 Consejos y Trucos",
                    "performanceOptimization": "Optimización de Rendimiento",
                    "perfTip1": "Comienza con modelos más pequeños para probar patrones y configuraciones",
                    "perfTip2": "Usa el modo de vista \"Puntos\" para modelos muy grandes (>100K bloques)",
                    "perfTip3": "Usa los modos de vista \"Cortes X/Y/Z\" para examinar modelos grandes - omite automáticamente el adelgazamiento",
                    "perfTip4": "Habilita filtros para reducir la carga de renderizado",
                    "perfTip5": "Los modelos grandes (>50K bloques) se almacenan automáticamente en caché en el almacenamiento del navegador para una regeneración más rápida",
                    "perfTip6": "Los modelos >200K bloques usan adelgazamiento automático de bloques para visualización (modelo completo disponible para exportar)",
                    "perfTip7": "Los modelos >500K bloques se generan en fragmentos para evitar que el navegador se congele",
                    "perfTip8": "El filtro de valor usa recorte basado en sombreadores acelerado por GPU para actualizaciones en tiempo real",
                    "visualizationTips": "Consejos de Visualización",
                    "vizTip1": "Usa diferentes modos de vista para ver diferentes aspectos de tu modelo",
                    "vizTip2": "Combina la herramienta de corte con filtros para análisis detallado de secciones transversales",
                    "vizTip3": "Cambia entre campos de visualización para comparar diferentes propiedades",
                    "vizTip4": "Usa el modo transparente para ver la estructura interna",
                    "patternSelection": "Selección de Patrones",
                    "patternTip1": "Zonificación Estilo Pórfido - Ideal para depósitos de pórfido a gran escala",
                    "patternTip2": "Cuerpo de Mineral de Veta/Estructural - Mejor para depósitos de oro epitermal y controlados por fallas",
                    "patternTip3": "Cuerpo de Mineral Elipsoidal - Mejor para depósitos de sulfuro masivo, skarn o VMS",
                    "patternTip4": "Reservorio de Domo de Sal - Perfecto para demostraciones de geología petrolera",
                    "patternTip5": "Agrupaciones Aleatorias - Realista para depósitos diseminados o de stockwork",
                    "patternTip6": "Veta Inclinada - Bueno para depósitos de veta simples",
                    "patternTip7": "Horizonte de Mineral Único - Bueno para depósitos sedimentarios planos",
                    "patternTip8": "Patrones Básicos (Aleatorio, Tablero de Ajedrez, Gradiente, Estratificado, Uniforme) - Útil para pruebas y modelos simples",
                    "exportBestPractices": "Mejores Prácticas de Exportación",
                    "exportTip1": "Filtra bloques no deseados antes de exportar para reducir el tamaño del archivo",
                    "exportTip2": "Verifica que el sistema de coordenadas coincida con tu software objetivo",
                    "exportTip3": "Verifica que todos los campos requeridos estén presentes para tu caso de uso",
                    "exportTip4": "Usa tamaños de celda apropiados para tu aplicación (ej., 5m×5m×5m para modelos detallados)",
                    "commonUseCases": "Casos de Uso Comunes",
                    "useCase1Title": "Prueba de Software Minero",
                    "useCase1Desc": "Genera modelos con propiedades conocidas para probar algoritmos, visualización o herramientas de procesamiento.",
                    "useCase2Title": "Capacitación y Educación",
                    "useCase2Desc": "Crea modelos para enseñar conceptos mineros, técnicas de visualización o análisis de datos.",
                    "useCase3Title": "Desarrollo de Prototipos",
                    "useCase3Desc": "Usa modelos generados como datos de prueba durante el desarrollo de software cuando los datos reales no están disponibles.",
                    "useCase4Title": "Prueba de Visualización",
                    "useCase4Desc": "Prueba herramientas de visualización con varios tamaños de modelo, patrones y propiedades.",
                    "useCase5Title": "Geología Petrolera",
                    "useCase5Desc": "Usa el patrón Reservorio de Domo de Sal para demostrar conceptos de geología petrolera, modelado de reservorios y visualización de trampas de petróleo/gas.",
                    "proTip": "💡 Consejo Profesional: Guarda tus combinaciones de parámetros para casos de uso comunes. La aplicación recuerda tu última configuración en el navegador."
                }
            }
        }
    },
    'fr': {
        "app": {
            "title": "Générateur de Modèle de Blocs Miniers",
            "subtitle": "Créez des modèles de blocs 3D fictifs pour tester des applications minières"
        },
        "buttons": {
            "generate": "Générer",
            "export": "Exporter",
            "zoomToFit": "Zoom",
            "memory": "Mémoire",
            "about": "À propos",
            "documentation": "Documentation",
            "stats": "Statistiques",
            "gallery": "Galerie",
            "save": "Enregistrer",
            "cancel": "Annuler"
        },
        "modelParameters": {
            "title": "Paramètres du Modèle",
            "originX": "Origine X",
            "originY": "Origine Y",
            "originZ": "Origine Z",
            "cellSizeX": "Taille de Cellule X",
            "cellSizeY": "Taille de Cellule Y",
            "cellSizeZ": "Taille de Cellule Z",
            "cellsX": "Cellules X",
            "cellsY": "Cellules Y",
            "cellsZ": "Cellules Z",
            "materialPattern": "Motif de Matériau"
        },
        "patterns": {
            "uniform": "Uniforme",
            "layered": "Stratifié",
            "gradient": "Dégradé",
            "checkerboard": "Damier",
            "random": "Aléatoire",
            "ore_horizon": "Horizon de Minerai Unique",
            "inclined_vein": "Veine Inclinée",
            "random_clusters": "Grappes Aléatoires",
            "ellipsoid_ore": "Corps de Minerai Ellipsoïdal",
            "vein_ore": "Corps de Minerai de Veine/Structurel",
            "porphyry_ore": "Zonage Style Porphyre",
            "salt_dome": "Réservoir de Dôme de Sel (Pétrole)"
        },
        "visualization": {
            "title": "Visualisation",
            "viewMode": "Mode d'Affichage",
            "field": "Champ",
            "modes": {
                "solid": "Solide",
                "points": "Points",
                "transparent": "Transparent",
                "squares": "Carrés",
                "slicesX": "Tranches X",
                "slicesY": "Tranches Y",
                "slicesZ": "Tranches Z"
            },
            "fields": {
                "rockType": "Type de Roche",
                "density": "Densité",
                "gradeCu": "Teneur en Cu",
                "gradeAu": "Teneur en Au",
                "econValue": "Valeur"
            }
        },
        "sliceTool": {
            "title": "Outil de Tranche",
            "enable": "Activer",
            "axis": "Axe",
            "position": "Position : {{value}}",
            "axes": {
                "x": "X (Avant/Arrière)",
                "y": "Y (Gauche/Droite)",
                "z": "Z (Haut/Bas)"
            }
        },
        "valueFilter": {
            "title": "Filtre de Valeur",
            "enable": "Activer le Filtre",
            "mode": "Mode",
            "threshold": "Seuil : {{value}}",
            "modes": {
                "above": "Au-dessus du seuil",
                "below": "En dessous du seuil"
            }
        },
        "categoryFilter": {
            "title": "Filtre de Catégorie",
            "enable": "Activer le Filtre",
            "showHide": "Afficher/Masquer les Catégories :",
            "selectField": "Sélectionnez un champ catégoriel (ex., Type de Roche) pour filtrer",
            "noBlocks": "Aucun bloc disponible"
        },
        "groundLayer": {
            "title": "Couche du Sol",
            "showGround": "Afficher le Sol"
        },
        "status": {
            "generatingInitial": "Génération du modèle initial...",
            "generating": "Génération du modèle de blocs...",
            "checkingCache": "Vérification du cache pour le grand modèle...",
            "loadedFromCache": "{{count}} blocs chargés depuis le cache.",
            "generatingBlocks": "Génération de {{count}} blocs...",
            "generatingLarge": "Génération du grand modèle par fragments (cela peut prendre un certain temps)...",
            "generatingProgress": "Génération des blocs : {{progress}}% ({{processed}}/{{total}})...",
            "applyingPattern": "Application du motif de matériau...",
            "caching": "Mise en cache des données du modèle...",
            "modelGenerated": "Modèle généré : {{count}} blocs. Motif : {{pattern}}. Prêt à l'exportation.",
            "modelGeneratedLarge": "Modèle généré : {{count}} blocs. Motif : {{pattern}}. Visualisation d'un échantillon pour les performances. Modèle complet disponible à l'exportation.",
            "modelLoaded": "Modèle chargé depuis le cache : {{count}} blocs. Prêt à l'exportation.",
            "modelLoadedLarge": "Modèle chargé depuis le cache : {{count}} blocs. Visualisation d'un échantillon pour les performances. Modèle complet disponible à l'exportation.",
            "exporting": "Exportation vers ZIP (cela peut prendre un moment pour les grands modèles)...",
            "zipNotAvailable": "Bibliothèque ZIP non chargée. Exportation en CSV...",
            "exportSuccess": "ZIP exporté avec succès : {{count}} blocs. Comprimé de {{originalSize}} Mo à {{compressedSize}} Mo ({{ratio}}% de réduction).",
            "csvSuccess": "CSV exporté avec succès : {{count}} blocs.",
            "error": "Erreur : {{message}}",
            "noBlocksToExport": "Aucun bloc à exporter. Veuillez d'abord générer un modèle.",
            "csvTooLarge": "Le contenu CSV est trop volumineux. Veuillez réduire la taille du modèle.",
            "exportError": "Erreur d'exportation : {{message}}. Tentative d'exportation en CSV...",
            "csvError": "Erreur d'exportation CSV : {{message}}"
        },
        "errors": {
            "cellSizeInvalid": "Les tailles de cellule doivent être supérieures à 0",
            "cellCountInvalid": "Le nombre de cellules doit être supérieur à 0"
        },
        "stats": {
            "title": "Tableau de Bord des Statistiques",
            "overview": "Aperçu",
            "totalModels": "Total des Modèles",
            "totalExports": "Total des Exportations",
            "firstModel": "Premier Modèle",
            "lastModel": "Dernier Modèle",
            "patternsExplored": "Motifs Explorés",
            "patternsTried": "Motifs Essayés",
            "mostUsed": "Le Plus Utilisé",
            "featuresUsed": "Fonctionnalités Utilisées",
            "viewModes": "Modes d'Affichage",
            "toolsUsed": "Outils Utilisés",
            "modelCharacteristics": "Caractéristiques du Modèle",
            "largestModel": "Modèle le Plus Grand",
            "averageModelSize": "Taille Moyenne du Modèle",
            "totalVolume": "Volume Total Généré",
            "currentSession": "Session Actuelle",
            "modelsGenerated": "Modèles Générés",
            "of12": "sur 12",
            "of7": "sur 7",
            "of4": "sur 4",
            "blocks": "blocs",
            "millionM3": "millions de m³"
        },
        "modelStats": {
            "title": "📈 Statistiques du Modèle",
            "blocks": "Blocs",
            "volume": "Volume",
            "ore": "Minerai",
            "waste": "Stérile",
            "zones": "Zones",
            "cuGrade": "Teneur en Cu",
            "auGrade": "Teneur en Au",
            "interestingFacts": "Faits Intéressants",
            "kM3": "K m³",
            "avg": "moy",
            "gPerT": "g/t",
            "facts": {
                "volumeLarge": "Volume du modèle : {{volume}}K mètres cubes",
                "volume": "Volume du modèle : {{volume}} mètres cubes",
                "orePercentage": "{{percentage}}% des blocs sont du matériau de qualité minerai",
                "zones": "Contient {{count}} zone distincte",
                "zonesPlural": "Contient {{count}} zones distinctes",
                "cuGradeRange": "La teneur en Cu varie de {{min}}% à {{max}}%",
                "auGradeRange": "La teneur en Au varie de {{min}} à {{max}} g/t",
                "econValue": "Valeur économique totale : {{value}} unités",
                "rockTypes": "Contient {{count}} types de roche différents",
                "sizeLarge": "Modèle à grande échelle (100K+ blocs)",
                "sizeMediumLarge": "Modèle moyen-grand (50K+ blocs)",
                "sizeMedium": "Modèle à échelle moyenne (10K+ blocs)"
            }
        },
        "gallery": {
            "title": "Galerie de Modèles",
            "saveCurrent": "Enregistrer le Modèle Actuel",
            "saveModel": "Enregistrer le Modèle",
            "modelName": "Nom du Modèle",
            "modelNamePlaceholder": "Entrez le nom du modèle",
            "load": "Charger",
            "delete": "Supprimer",
            "noModels": "Aucun modèle enregistré pour le moment. Générez un modèle et cliquez sur \"Enregistrer\" pour l'ajouter à votre galerie.",
            "modelSaved": "Modèle \"{{name}}\" enregistré dans la galerie",
            "modelLoaded": "Chargé : {{name}}",
            "modelDeleted": "Modèle supprimé de la galerie",
            "deleteConfirm": "Supprimer ce modèle de la galerie ?",
            "generateFirst": "Veuillez d'abord générer un modèle",
            "enterName": "Veuillez entrer un nom pour le modèle",
            "loading": "Chargement du modèle : {{name}}...",
            "saveError": "Erreur lors de l'enregistrement du modèle : {{message}}",
            "blocks": "blocs",
            "nameTooLong": "Le nom du modèle doit contenir {{max}} caractères ou moins",
            "storageQuotaExceeded": "Quota de stockage dépassé. Certaines données peuvent ne pas être enregistrées.",
            "storageReduced": "Stockage plein. Taille de la galerie réduite pour économiser de l'espace."
        },
        "tooltip": {
            "title": "Informations sur le Bloc",
            "position": "Position :",
            "indices": "Indices :",
            "rockType": "Type de Roche :",
            "density": "Densité :",
            "cuGrade": "Teneur en Cu :",
            "auGrade": "Teneur en Au :",
            "econValue": "Valeur Économique :",
            "zone": "Zone :",
            "notAvailable": "N/D",
            "units": {
                "density": "t/m³",
                "cuGrade": "%",
                "auGrade": "g/t"
            }
        },
        "controls": {
            "hint": "Contrôles : Glisser avec clic gauche pour tourner | Glisser avec clic droit pour déplacer | Faire défiler pour zoomer"
        },
        "about": {
            "title": "À propos",
            "appName": "Générateur de Modèle de Blocs Miniers",
            "builtBy": "Développé par <strong><a href=\"mailto:chris@builditdesignlab.com\">Chris Andrews</a></strong>, <a href=\"https://www.builditdesignlab.com/#block-model-generator\" target=\"_blank\" rel=\"noopener noreferrer\">BuildIT Design Labs</a>",
            "license": "Licence : Licence MIT",
            "copyright": "Copyright : © {{year}} Tous droits réservés"
        },
        "memory": {
            "title": "Moniteur de Mémoire",
            "usage": "Utilisation de la Mémoire :",
            "loading": "Chargement...",
            "note": "Remarque : Les informations sur la mémoire peuvent ne pas être disponibles dans tous les navigateurs.",
            "usedHeap": "Tas JS Utilisé",
            "totalHeap": "Tas JS Total",
            "heapLimit": "Limite du Tas JS",
            "heapUsage": "Utilisation du Tas",
            "deviceMemory": "Mémoire de l'Appareil",
            "threejsObjects": "Objets Three.js :",
            "sceneObjects": "Objets de Scène",
            "geometries": "Géométries",
            "materials": "Matériaux",
            "textures": "Textures"
        },
        "language": {
            "select": "Langue",
            "english": "English",
            "spanish": "Español",
            "french": "Français"
        },
        "docs": {
            "title": "📚 Documentation",
            "subtitle": "Générateur de Modèle de Blocs",
            "searchPlaceholder": "🔍 Rechercher dans la documentation...",
            "nav": {
                "gettingStarted": "Démarrage",
                "modelParameters": "Paramètres du Modèle",
                "patterns": "Motifs de Matériau",
                "visualization": "Visualisation",
                "filters": "Filtres et Outils",
                "export": "Exportation et Données",
                "schema": "Schéma de Données",
                "controls": "Contrôles",
                "tips": "Astuces et Conseils"
            },
            "sections": {
                "gettingStarted": {
                    "title": "🚀 Démarrage",
                    "welcome": "Bienvenue dans le <strong>Générateur de Modèle de Blocs Miniers</strong> ! Cet outil vous aide à créer des modèles de blocs 3D réalistes pour tester des applications minières, la visualisation et l'analyse de données. L'outil prend également en charge les applications de géologie pétrolière grâce à des motifs spécialisés.",
                    "whatIsBlockModel": "Qu'est-ce qu'un Modèle de Blocs ?",
                    "blockModelDesc": "Un modèle de blocs est une représentation de grille 3D d'un gisement minier, où chaque bloc (cellule) contient des propriétés telles que :",
                    "coordinates": "Coordonnées (X, Y, Z) - Position du centre du bloc",
                    "rockType": "Type de Roche - Classification (Minerai, Stérile, etc.)",
                    "density": "Densité - Densité du matériau en tonnes/m³",
                    "grades": "Teneurs - Concentrations de métaux (Cu, Au, etc.)",
                    "economicValue": "Valeur Économique - Valeur calculée par bloc",
                    "quickStartGuide": "Guide de Démarrage Rapide",
                    "step1": "Définir les Paramètres du Modèle - Définir l'origine, la taille des cellules et les dimensions de la grille",
                    "step2": "Choisir un Motif - Sélectionner comment les matériaux sont distribués (12 motifs disponibles : Uniforme, Stratifié, Corps de Minerai, Pétrole, etc.)",
                    "step3": "Générer le Modèle - Cliquer sur \"Générer\" pour créer votre modèle de blocs",
                    "step4": "Visualiser - Explorer le modèle 3D à l'aide de contrôles interactifs",
                    "step5": "Exporter - Télécharger au format CSV pour utiliser dans d'autres logiciels",
                    "navigationHelp": "Navigation et Aide",
                    "headerButtons": "L'en-tête contient des boutons d'accès rapide :",
                    "docsButton": "📚 Docs - Ouvre cette documentation (vous la lisez maintenant !)",
                    "memoryButton": "Mémoire - Surveiller l'utilisation de la mémoire pour les grands modèles",
                    "aboutButton": "À propos - Informations sur l'application et crédits",
                    "tipStart": "💡 Astuce : Commencez avec les paramètres par défaut pour vous familiariser avec l'outil, puis ajustez selon vos besoins."
                },
                "modelParameters": {
                    "title": "⚙️ Paramètres du Modèle",
                    "intro": "Les paramètres du modèle définissent la structure physique et les dimensions de votre modèle de blocs.",
                    "originCoordinates": "Coordonnées d'Origine",
                    "originDesc": "L'origine (X, Y, Z) définit le point de départ de votre modèle. Toutes les coordonnées des blocs sont calculées par rapport à cette origine.",
                    "originXyz": "Origine X, Y, Z - Coordonnées de départ en mètres (par défaut : 0, 0, 0)",
                    "originUseful": "Utile pour aligner les modèles avec les coordonnées du monde réel",
                    "cellSize": "Taille de Cellule",
                    "cellSizeDesc": "La taille de cellule détermine les dimensions de chaque bloc dans le modèle.",
                    "cellSizeXyz": "Taille de Cellule X, Y, Z - Dimensions du bloc en mètres (par défaut : 1m × 1m × 1m)",
                    "cellSizeDifferent": "Les trois dimensions peuvent être différentes (ex. : 10m × 10m × 5m)",
                    "cellSizeMin": "Valeur minimale : 0.1 mètres",
                    "gridDimensions": "Dimensions de la Grille",
                    "gridDimensionsDesc": "Le nombre de cellules dans chaque direction détermine la taille du modèle.",
                    "cellsXyz": "Cellules X, Y, Z - Nombre de blocs dans chaque direction (par défaut : 25 × 25 × 25)",
                    "totalBlocks": "Total de blocs = Cellules X × Cellules Y × Cellules Z",
                    "largerModels": "Les modèles plus grands prennent plus de temps à générer et à rendre",
                    "performanceNote": "⚠️ Note sur les Performances : Les modèles avec plus de 50 000 blocs peuvent prendre plus de temps à générer. L'application utilise automatiquement la mise en cache pour les grands modèles.",
                    "tipTesting": "💡 Astuce : Pour les tests, commencez avec des modèles plus petits (10×10×10 = 1 000 blocs). Pour la production, utilisez des dimensions minières réalistes (ex. : 50×50×30 = 75 000 blocs)."
                },
                "patterns": {
                    "title": "🎨 Motifs de Matériau",
                    "intro": "Les motifs de matériau contrôlent la façon dont différents matériaux (minerai, stérile, etc.) sont distribués dans votre modèle de blocs.",
                    "advancedPatterns": "Motifs Avancés de Corps de Minerai",
                    "geologicalPatterns": "Motifs Géologiques",
                    "basicPatterns": "Motifs de Base",
                    "porphyryDesc": "Crée des corps de minerai zonés avec des zones concentriques. Simule les gisements de porphyre cuivre-or.",
                    "porphyryFeature1": "Noyau à haute teneur, coquille intermédiaire, halo à faible teneur",
                    "porphyryFeature2": "Différents rapports Cu:Au dans différentes zones",
                    "porphyryFeature3": "Variations de teneur liées à la profondeur (enrichissement supergène)",
                    "porphyryFeature4": "Paramètres randomisés pour la variation entre les générations",
                    "porphyryFeature5": "La position du centre, les rayons, les teneurs et les contrôles structurels sont randomisés",
                    "porphyryTip": "💡 Astuce : Chaque fois que vous appuyez sur Générer, le corps de minerai de porphyre aura des caractéristiques différentes tout en maintenant des motifs géologiques réalistes.",
                    "veinDesc": "Crée des corps de minerai linéaires ou plans suivant des contrôles structurels. Simule l'or épithermal, les veines mésothermales ou les gisements contrôlés par failles.",
                    "veinFeature1": "Direction et pendage configurables",
                    "veinFeature2": "Variations de teneur le long de la direction et du pendage",
                    "veinFeature3": "Prend en charge plusieurs veines parallèles ou qui se croisent",
                    "ellipsoidDesc": "Crée des corps de minerai ellipsoïdaux avec des structures plongeantes. Simule les gisements de sulfure massif, skarn ou VMS.",
                    "ellipsoidFeature1": "Taille et orientation configurables",
                    "ellipsoidFeature2": "La teneur diminue du centre vers l'extérieur",
                    "ellipsoidFeature3": "Prend en charge plusieurs corps qui se chevauchent",
                    "saltDomeDesc": "Crée une structure de dôme de sel avec des pièges à pétrole et à gaz. Démontre les concepts de géologie pétrolière en utilisant le cadre du modèle de blocs.",
                    "saltDomeFeature1": "Structure de dôme de sel parabolique avec roche de chapeau",
                    "saltDomeFeature2": "Zones de piège à pétrole et à gaz autour du dôme",
                    "saltDomeFeature3": "Zones d'eau sous le contact eau-pétrole",
                    "saltDomeFeature4": "Plusieurs types de matériaux : Sel, CapRock, OilSand, GasSand, WaterSand, Shale",
                    "saltDomeFeature5": "Position du dôme, taille, zones de piège et propriétés du matériau randomisées",
                    "saltDomeFieldMapping": "💡 Mappage des Champs : Pour la géologie pétrolière, les champs standard sont réutilisés :",
                    "saltDomeField1": "gradeCu = Saturation en Pétrole (%)",
                    "saltDomeField2": "gradeAu = Saturation en Gaz (%)",
                    "saltDomeField3": "density = Porosité (%)",
                    "saltDomeField4": "rockType = Type de matériau (Sel, CapRock, OilSand, GasSand, WaterSand, Shale)",
                    "saltDomeTip": "💡 Astuce : Chaque génération produit une structure de dôme de sel différente avec des dimensions, positions et propriétés du matériau randomisées.",
                    "randomClustersDesc": "Crée plusieurs grappes de minerai distribuées aléatoirement. Simule les gisements disséminés ou en stockwork.",
                    "inclinedVeinDesc": "Crée un corps de minerai plan incliné. Simule les gisements de veine ou la minéralisation contrôlée par failles.",
                    "singleOreHorizonDesc": "Crée une seule couche de minerai horizontale à une profondeur spécifique. Simule les gisements plats.",
                    "randomDesc": "Distribution complètement aléatoire des matériaux. Utile pour les tests de résistance.",
                    "checkerboardDesc": "Motif alterné de matériaux. Bon pour tester les outils de filtrage et de visualisation.",
                    "gradientDesc": "Transition progressive des propriétés d'un côté à l'autre. Utile pour tester la visualisation.",
                    "layeredDesc": "Crée des couches horizontales de différents matériaux. Simule les gisements sédimentaires.",
                    "uniformDesc": "Tous les blocs ont les mêmes propriétés de matériau. Utile pour les tests ou les modèles simples."
                },
                "visualization": {
                    "title": "👁️ Visualisation",
                    "intro": "La visualisation 3D vous permet d'explorer votre modèle de blocs de manière interactive.",
                    "viewModes": "Modes d'Affichage",
                    "solidDesc": "Affiche les blocs sous forme de cubes solides. Idéal pour voir la structure globale et la distribution des matériaux.",
                    "pointsDesc": "Affiche les blocs sous forme de points individuels. Utile pour les grands modèles ou lorsque vous devez voir à travers le modèle.",
                    "transparentDesc": "Affiche les blocs avec transparence. Permet de voir la structure interne tout en maintenant la forme.",
                    "squaresDesc": "Affiche les blocs sous forme de carrés plats. Bon pour la visualisation de type 2D ou lors de la visualisation depuis le haut.",
                    "slicesDesc": "Affiche uniquement les blocs dans des plans de tranche uniformément espacés le long de l'axe sélectionné. Calcule automatiquement le nombre optimal de tranches (2-5) en fonction de la taille du modèle. Utile pour examiner les coupes transversales et comprendre la structure interne.",
                    "slicesXDesc": "Affiche les tranches perpendiculaires à l'axe X (coupes transversales avant/arrière)",
                    "slicesYDesc": "Affiche les tranches perpendiculaires à l'axe Y (coupes transversales gauche/droite)",
                    "slicesZDesc": "Affiche les tranches perpendiculaires à l'axe Z (coupes transversales haut/bas)",
                    "slicesNote": "Note : Les modes d'affichage de tranche ignorent automatiquement l'amincissement des blocs pour une meilleure visualisation, même dans les grands modèles.",
                    "visualizationFields": "Champs de Visualisation",
                    "fieldsDesc": "Choisissez quelle propriété visualiser en utilisant la couleur :",
                    "rockTypeField": "Type de Roche - Couleur par classification de matériau",
                    "densityField": "Densité - Échelle de couleur basée sur les valeurs de densité",
                    "cuGradeField": "Teneur en Cu - Échelle de couleur basée sur la teneur en cuivre",
                    "auGradeField": "Teneur en Au - Échelle de couleur basée sur la teneur en or",
                    "valueField": "Valeur - Échelle de couleur basée sur la valeur économique",
                    "controls3d": "Contrôles 3D",
                    "tipHover": "💡 Astuce : Survolez les blocs pour voir des informations détaillées dans l'info-bulle, y compris les coordonnées, les teneurs et d'autres propriétés."
                },
                "filters": {
                    "title": "🔍 Filtres et Outils",
                    "intro": "Les filtres et outils vous aident à vous concentrer sur des parties spécifiques de votre modèle ou à analyser des caractéristiques particulières.",
                    "sliceTool": "Outil de Tranche",
                    "valueFilter": "Filtre de Valeur",
                    "categoryFilter": "Filtre de Catégorie",
                    "groundLayer": "Couche du Sol",
                    "howItWorks": "Comment Ça Marche",
                    "sliceToolDesc": "L'outil de tranche vous permet de visualiser des coupes transversales de votre modèle en masquant les blocs en dehors d'un plan spécifique.",
                    "sliceToolFeature1": "Activer - Activer/désactiver l'outil de tranche",
                    "sliceToolFeature2": "Axe - Choisissez quel axe couper (X, Y ou Z)",
                    "sliceToolFeature3": "Position - Ajustez la position de la tranche à l'aide du curseur",
                    "valueFilterDesc": "Filtrez les blocs en fonction de leur valeur économique ou d'autres propriétés numériques.",
                    "valueFilterFeature1": "Activer le Filtre - Activer/désactiver le filtrage",
                    "valueFilterFeature2": "Mode - Afficher les blocs au-dessus ou en dessous du seuil",
                    "valueFilterFeature3": "Seuil - Définissez le seuil de valeur à l'aide du curseur",
                    "valueFilterUseful": "Utile pour identifier les zones de minerai à haute valeur ou filtrer les matériaux à faible valeur.",
                    "categoryFilterDesc": "Afficher ou masquer des catégories spécifiques (ex., types de roche) dans votre visualisation.",
                    "categoryFilterFeature1": "Activer le Filtre - Activer/désactiver le filtrage",
                    "categoryFilterFeature2": "Cases à cocher - Sélectionnez les catégories à afficher/masquer",
                    "categoryFilterNote": "Les catégories sont automatiquement détectées à partir de champs catégoriels comme Type de Roche.",
                    "groundLayerDesc": "Affichez un plan de surface du sol pour fournir un contexte spatial.",
                    "groundLayerFeature1": "Afficher le Sol - Basculer la visibilité du plan du sol",
                    "groundLayerUseful": "Utile pour comprendre la relation entre votre modèle et la surface."
                },
                "export": {
                    "title": "💾 Exportation et Données",
                    "intro": "Exportez votre modèle de blocs au format CSV pour l'utiliser dans d'autres logiciels miniers.",
                    "exportFormat": "Format d'Exportation",
                    "exportFormatDesc": "Le CSV exporté suit un schéma standardisé compatible avec :",
                    "exportFormatList1": "MiningMath",
                    "exportFormatList2": "Vulcan",
                    "exportFormatList3": "Surpac",
                    "exportFormatList4": "MineSight",
                    "exportFormatList5": "Datamine",
                    "exportProcess": "Processus d'Exportation",
                    "exportProcessStep1": "Générez votre modèle de blocs",
                    "exportProcessStep2": "Cliquez sur le bouton \"Exporter\"",
                    "exportProcessStep3": "Le fichier CSV sera téléchargé automatiquement",
                    "exportProcessStep4": "Ouvrez dans Excel, logiciel minier ou autres outils",
                    "exportedFields": "Champs Exportés",
                    "exportedFieldsDesc": "Le CSV inclut toutes les propriétés pertinentes des blocs :",
                    "exportedField1": "X, Y, Z - Coordonnées du centroïde du bloc (mètres)",
                    "exportedField2": "ROCKTYPE - Classification du type de roche (ou type de matériau pour le pétrole)",
                    "exportedField3": "DENSITY - Densité (tonnes/m³) ou Porosité pour les motifs pétroliers",
                    "exportedField4": "GRADE_CU - Teneur en cuivre (%) ou Saturation en Pétrole pour le pétrole",
                    "exportedField5": "GRADE_AU - Teneur en or (g/t) ou Saturation en Gaz pour le pétrole",
                    "exportedField6": "ECON_VALUE - Valeur économique",
                    "exportedField7": "ZONE - Identifiant de zone (le cas échéant)",
                    "exportPetroleumNote": "💡 Note : Pour les motifs de géologie pétrolière, les significations des champs diffèrent. Consultez la section Schéma de Données pour les détails sur les mappages de champs pétroliers.",
                    "exportTip": "💡 Astuce : L'exportation filtre automatiquement les \"blocs d'air\" (blocs avec densité = 0) pour réduire la taille du fichier et améliorer la compatibilité.",
                    "exportWarning": "⚠️ Note : Les grands modèles peuvent produire de gros fichiers CSV. Pour les modèles avec >100 000 blocs, envisagez d'utiliser des filtres avant l'exportation. L'exportation utilise un traitement par fragments pour gérer les très grands modèles (200x200x200+) sans atteindre les limites de longueur de chaîne JavaScript."
                },
                "schema": {
                    "title": "📊 Schéma de Données",
                    "intro": "Le modèle de blocs utilise un schéma standardisé pour une compatibilité maximale avec les logiciels miniers.",
                    "requiredFields": "Champs Requis",
                    "optionalFields": "Champs Optionnels",
                    "tableHeaderField": "Champ",
                    "tableHeaderType": "Type",
                    "tableHeaderDescription": "Description",
                    "tableHeaderUnits": "Unités",
                    "fieldX": "Coordonnée X (centroïde)",
                    "fieldY": "Coordonnée Y (centroïde)",
                    "fieldZ": "Coordonnée Z (centroïde)",
                    "fieldRockType": "Classification du type de roche",
                    "fieldDensity": "Densité",
                    "fieldZone": "Identifiant de zone",
                    "fieldGradeCu": "Teneur en cuivre",
                    "fieldGradeAu": "Teneur en or",
                    "fieldEconValue": "Valeur économique",
                    "unitsMeters": "mètres",
                    "unitsTonnesPerM3": "tonnes/m³",
                    "unitsPercent": "%",
                    "unitsGramsPerTon": "g/t",
                    "unitsCurrency": "unités monétaires",
                    "unitsNone": "-",
                    "coordinateConventions": "Conventions de Coordonnées",
                    "coordConvention1": "Toutes les coordonnées représentent les centroïdes de blocs (points centraux)",
                    "coordConvention2": "Les coordonnées sont calculées comme : centroïde = origine + (index + 0.5) × tailleCellule",
                    "coordConvention3": "Toutes les unités sont en métrique (mètres)",
                    "coordConvention4": "Précision : 4 décimales pour les valeurs numériques",
                    "petroleumMappings": "Mappages de Champs de Géologie Pétrolière",
                    "petroleumMappingsTitle": "Significations Alternatives des Champs",
                    "petroleumMappingsDesc": "Pour les motifs de géologie pétrolière (ex., Réservoir de Dôme de Sel), les champs standard sont réutilisés pour représenter les propriétés pétrolières :",
                    "petroleumTableHeaderStandard": "Champ Standard",
                    "petroleumTableHeaderPetroleum": "Signification Pétrolière",
                    "petroleumTableHeaderUnits": "Unités",
                    "petroleumMapping1": "Saturation en Pétrole",
                    "petroleumMapping2": "Saturation en Gaz",
                    "petroleumMapping3": "Porosité",
                    "petroleumMapping4": "Type de Matériau",
                    "petroleumMapping5": "Valeur Économique",
                    "petroleumMapping6": "Sel, CapRock, OilSand, GasSand, WaterSand, Shale",
                    "petroleumMapping7": "$/baril équivalent",
                    "petroleumMappingsNote": "💡 Note : Ce mappage de champs permet d'utiliser le même cadre de modèle de blocs pour les applications minières et pétrolières. Lors de l'exportation de modèles pétroliers, sachez que les noms de champs restent les mêmes mais les significations diffèrent."
                },
                "controls": {
                    "title": "🎮 Contrôles",
                    "mouseControls": "Contrôles de la Souris",
                    "mouseControlsTableAction": "Action",
                    "mouseControlsTableControl": "Contrôle",
                    "mouseControlsTableDescription": "Description",
                    "mouseControlRotate": "Tourner",
                    "mouseControlRotateDesc": "Tourner le modèle 3D autour de son centre",
                    "mouseControlPan": "Déplacer",
                    "mouseControlPanDesc": "Déplacer la vue horizontalement/verticalement",
                    "mouseControlZoom": "Zoom",
                    "mouseControlZoomDesc": "Zoomer/dézoomer sur le modèle",
                    "mouseControlInfo": "Info",
                    "mouseControlInfoDesc": "Afficher les informations du bloc dans l'info-bulle",
                    "mouseControlLeftClick": "Clic gauche + Glisser",
                    "mouseControlRightClick": "Clic droit + Glisser",
                    "mouseControlScroll": "Molette de Défilement",
                    "mouseControlHover": "Survoler",
                    "keyboardShortcuts": "Raccourcis Clavier",
                    "keyboardDesc": "Actuellement, tous les contrôles sont basés sur la souris. Les raccourcis clavier peuvent être ajoutés dans les versions futures.",
                    "buttonFunctions": "Fonctions des Boutons",
                    "buttonGenerate": "Générer - Crée un nouveau modèle de blocs basé sur les paramètres actuels",
                    "buttonExport": "Exporter - Télécharge le modèle actuel au format CSV (activé après génération)",
                    "buttonZoom": "Ajuster le Zoom - Réinitialise la caméra pour afficher tout le modèle",
                    "buttonDocs": "📚 Docs - Ouvre cette documentation dans une nouvelle fenêtre",
                    "buttonMemory": "Mémoire - Affiche les informations d'utilisation de la mémoire",
                    "buttonAbout": "À propos - Affiche les informations de l'application et les crédits"
                },
                "tips": {
                    "title": "💡 Astuces et Conseils",
                    "performanceOptimization": "Optimisation des Performances",
                    "perfTip1": "Commencez avec des modèles plus petits pour tester les motifs et les paramètres",
                    "perfTip2": "Utilisez le mode d'affichage \"Points\" pour les très grands modèles (>100K blocs)",
                    "perfTip3": "Utilisez les modes d'affichage \"Tranches X/Y/Z\" pour examiner les grands modèles - ignore automatiquement l'amincissement",
                    "perfTip4": "Activez les filtres pour réduire la charge de rendu",
                    "perfTip5": "Les grands modèles (>50K blocs) sont automatiquement mis en cache dans le stockage du navigateur pour une régénération plus rapide",
                    "perfTip6": "Les modèles >200K blocs utilisent un amincissement automatique des blocs pour la visualisation (modèle complet disponible pour l'exportation)",
                    "perfTip7": "Les modèles >500K blocs sont générés par fragments pour éviter le gel du navigateur",
                    "perfTip8": "Le filtre de valeur utilise un découpage basé sur des shaders accéléré par GPU pour des mises à jour en temps réel",
                    "visualizationTips": "Conseils de Visualisation",
                    "vizTip1": "Utilisez différents modes d'affichage pour voir différents aspects de votre modèle",
                    "vizTip2": "Combinez l'outil de tranche avec les filtres pour une analyse détaillée des coupes transversales",
                    "vizTip3": "Basculez entre les champs de visualisation pour comparer différentes propriétés",
                    "vizTip4": "Utilisez le mode transparent pour voir la structure interne",
                    "patternSelection": "Sélection de Motifs",
                    "patternTip1": "Zonage Style Porphyre - Idéal pour les gisements de porphyre à grande échelle",
                    "patternTip2": "Corps de Minerai de Veine/Structurel - Meilleur pour l'or épithermal et les gisements contrôlés par failles",
                    "patternTip3": "Corps de Minerai Ellipsoïdal - Meilleur pour les gisements de sulfure massif, skarn ou VMS",
                    "patternTip4": "Réservoir de Dôme de Sel - Parfait pour les démonstrations de géologie pétrolière",
                    "patternTip5": "Grappes Aléatoires - Réaliste pour les gisements disséminés ou en stockwork",
                    "patternTip6": "Veine Inclinée - Bon pour les gisements de veine simples",
                    "patternTip7": "Horizon de Minerai Unique - Bon pour les gisements sédimentaires plats",
                    "patternTip8": "Motifs de Base (Aléatoire, Damier, Dégradé, Stratifié, Uniforme) - Utile pour les tests et les modèles simples",
                    "exportBestPractices": "Meilleures Pratiques d'Exportation",
                    "exportTip1": "Filtrez les blocs indésirables avant d'exporter pour réduire la taille du fichier",
                    "exportTip2": "Vérifiez que le système de coordonnées correspond à votre logiciel cible",
                    "exportTip3": "Vérifiez que tous les champs requis sont présents pour votre cas d'usage",
                    "exportTip4": "Utilisez des tailles de cellule appropriées pour votre application (ex. : 5m×5m×5m pour les modèles détaillés)",
                    "commonUseCases": "Cas d'Usage Courants",
                    "useCase1Title": "Test de Logiciel Minier",
                    "useCase1Desc": "Générez des modèles avec des propriétés connues pour tester des algorithmes, la visualisation ou les outils de traitement.",
                    "useCase2Title": "Formation et Éducation",
                    "useCase2Desc": "Créez des modèles pour enseigner les concepts miniers, les techniques de visualisation ou l'analyse de données.",
                    "useCase3Title": "Développement de Prototype",
                    "useCase3Desc": "Utilisez des modèles générés comme données de test pendant le développement de logiciels lorsque les données réelles ne sont pas disponibles.",
                    "useCase4Title": "Test de Visualisation",
                    "useCase4Desc": "Testez les outils de visualisation avec diverses tailles de modèle, motifs et propriétés.",
                    "useCase5Title": "Géologie Pétrolière",
                    "useCase5Desc": "Utilisez le motif Réservoir de Dôme de Sel pour démontrer les concepts de géologie pétrolière, la modélisation de réservoirs et la visualisation des pièges à pétrole/gaz.",
                    "proTip": "💡 Astuce Pro : Enregistrez vos combinaisons de paramètres pour les cas d'usage courants. L'application se souvient de vos derniers paramètres dans le navigateur."
                }
            }
        }
    }
};

/**
 * Detect the best locale from user preferences
 * @returns {string} Locale code
 */
function detectLocale() {
    // Check localStorage for user preference
    const saved = localStorage.getItem('app_locale');
    if (saved && SUPPORTED_LOCALES.includes(saved)) {
        return saved;
    }
    
    // Check browser language
    const browserLang = navigator.language.split('-')[0];
    if (SUPPORTED_LOCALES.includes(browserLang)) {
        return browserLang;
    }
    
    // Default to English
    return 'en';
}

/**
 * Load translation file for a locale using XMLHttpRequest (works with file:// protocol)
 * @param {string} locale - Locale code
 * @returns {Promise<Object>} Translation data
 */
async function loadTranslations(locale) {
    // Check if we're running on file:// protocol (local file)
    const isFileProtocol = window.location.protocol === 'file:';
    
    // For file:// protocol, use embedded translations (CORS blocks XMLHttpRequest/fetch)
    if (isFileProtocol) {
        if (EMBEDDED_TRANSLATIONS[locale]) {
            return EMBEDDED_TRANSLATIONS[locale];
        } else {
            // Fallback to English if locale not found
            console.warn(`Embedded translations not found for locale: ${locale}, falling back to English`);
            return EMBEDDED_TRANSLATIONS['en'] || {};
        }
    }
    
    // For http/https protocols, try to load from JSON files
    try {
        const response = await fetch(`locales/${locale}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load translations for ${locale}`);
        }
        return await response.json();
    } catch (error) {
        console.warn(`Error loading translations from file for ${locale}, using embedded translations:`, error);
        // Fallback to embedded translations
        if (EMBEDDED_TRANSLATIONS[locale]) {
            return EMBEDDED_TRANSLATIONS[locale];
        } else if (locale !== 'en' && EMBEDDED_TRANSLATIONS['en']) {
            return EMBEDDED_TRANSLATIONS['en'];
        }
        return {};
    }
}

// Removed loadTranslationsSync - no longer needed with embedded translations

/**
 * Initialize i18n system
 * @param {string} locale - Initial locale (optional, will auto-detect if not provided)
 * @returns {Promise<void>}
 */
async function initI18n(locale = null) {
    if (!locale) {
        locale = detectLocale();
    }
    
    currentLocale = locale;
    translations = await loadTranslations(locale);
    
    // Ensure translations object is valid
    if (!translations || typeof translations !== 'object') {
        console.error('Failed to load translations, using empty object');
        translations = {};
    }
    
    // Update HTML lang attribute
    if (document.documentElement) {
        document.documentElement.lang = locale;
    }
    
    // Update all elements with data-i18n attributes
    // Use setTimeout to ensure DOM is fully ready
    setTimeout(() => {
        updateAllTranslations();
        window.dispatchEvent(new CustomEvent('localeChanged', { detail: { locale } }));
    }, 0);
}

/**
 * Get translation for a key
 * @param {string} key - Translation key (supports dot notation, e.g., "app.title")
 * @param {Object} params - Parameters to substitute in the translation
 * @returns {string} Translated text
 */
function t(key, params = {}) {
    // Helper function to get value from a translations object
    const getValueFromTranslations = (transObj, keyPath) => {
        if (!transObj || typeof transObj !== 'object' || Object.keys(transObj).length === 0) {
            return null;
        }
        
        const keys = keyPath.split('.');
        let value = transObj;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return null;
            }
        }
        
        if (typeof value === 'string') {
            return value;
        }
        
        return null;
    };
    
    // Try to get translation from loaded translations first
    let translation = getValueFromTranslations(translations, key);
    
    // If not found in loaded translations, try embedded translations as fallback
    if (!translation && EMBEDDED_TRANSLATIONS && currentLocale) {
        const embedded = EMBEDDED_TRANSLATIONS[currentLocale];
        if (embedded) {
            translation = getValueFromTranslations(embedded, key);
        }
        // If still not found, try English as fallback
        if (!translation && currentLocale !== 'en' && EMBEDDED_TRANSLATIONS['en']) {
            translation = getValueFromTranslations(EMBEDDED_TRANSLATIONS['en'], key);
        }
    }
    
    // If still not found, return the key (helps identify missing translations)
    if (!translation) {
        // Only warn if translations are loaded (to avoid spam during initial load)
        if (translations && Object.keys(translations).length > 0) {
            console.warn(`Translation key not found: ${key}`);
        }
        return key;
    }
    
    // Substitute parameters (simple {{param}} replacement)
    let result = translation;
    Object.keys(params).forEach(param => {
        const regex = new RegExp(`\\{\\{${param}\\}\\}`, 'g');
        result = result.replace(regex, params[param]);
    });
    
    return result;
}

// Make t() function available globally immediately (even before translations load)
// This prevents errors when code calls t() before translations are loaded
window.t = t;

/**
 * Change locale and reload translations
 * @param {string} locale - New locale code
 * @returns {Promise<void>}
 */
async function setLocale(locale) {
    if (!SUPPORTED_LOCALES.includes(locale)) {
        console.warn(`Unsupported locale: ${locale}`);
        return;
    }
    
    currentLocale = locale;
    translations = await loadTranslations(locale);
    
    // Save preference
    localStorage.setItem('app_locale', locale);
    
    // Update HTML lang attribute
    document.documentElement.lang = locale;
    
    // Update all translations
    updateAllTranslations();
    
    // Clean up icon-only buttons - remove any spans that shouldn't be there
    document.querySelectorAll('button[title][data-i18n]').forEach(button => {
        const icon = button.querySelector('i');
        const span = button.querySelector('span');
        // If button has title (icon-only) and has a span, remove the span
        if (icon && span && button.hasAttribute('title')) {
            span.remove();
        }
    });
    
    // Trigger custom event
    window.dispatchEvent(new CustomEvent('localeChanged', { detail: { locale } }));
}

/**
 * Get current locale
 * @returns {string} Current locale code
 */
function getLocale() {
    return currentLocale;
}

/**
 * Update all elements with data-i18n attributes
 */
function updateAllTranslations() {
    // Ensure DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateAllTranslations);
        return;
    }
    
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        let translation = t(key);
        
        // Check for parameters in data-i18n-params attribute
        const paramsAttr = element.getAttribute('data-i18n-params');
        if (paramsAttr) {
            try {
                const params = JSON.parse(paramsAttr);
                translation = t(key, params);
            } catch (e) {
                console.warn('Invalid data-i18n-params JSON:', paramsAttr);
            }
        }
        
        // Handle different element types
        if (element.tagName === 'INPUT' && element.type === 'submit') {
            element.value = translation;
        } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            element.placeholder = translation;
        } else {
            // For buttons, preserve Font Awesome icons
            if (element.tagName === 'BUTTON') {
                // First, check if button already has an icon element (any <i> tag)
                const existingIcon = element.querySelector('i');
                const existingSpan = element.querySelector('span');
                
                // If button has title attribute, update it with translation (for icon-only buttons)
                if (element.hasAttribute('title')) {
                    element.setAttribute('title', translation);
                }
                
                // If button has title attribute, it's an icon-only button - don't add text
                if (element.hasAttribute('title') && existingIcon && !existingSpan) {
                    // Icon-only button - preserve icon, don't add text
                    return; // Don't process further
                }
                
                // If button already has both icon and span
                if (existingIcon && existingSpan) {
                    // If button has title attribute, it should be icon-only - remove span
                    if (element.hasAttribute('title')) {
                        existingSpan.remove();
                        return; // Don't process further
                    }
                    // Button should have text - update span text, preserve icon
                    if (!existingIcon.parentNode || existingIcon.parentNode !== element) {
                        // Icon was lost somehow, restore it
                        const iconHTML = existingIcon.outerHTML;
                        element.innerHTML = iconHTML + ' <span>' + translation + '</span>';
                    } else {
                        // Icon is fine, just update span text
                        existingSpan.textContent = translation;
                    }
                    return; // Don't process further
                }
                
                // If button has icon but no span, check if it should be icon-only (has title)
                if (existingIcon && !existingSpan) {
                    if (element.hasAttribute('title')) {
                        // Icon-only button - don't add text
                        return;
                    }
                    // Has icon but should have text - add span with translation
                    const iconHTML = existingIcon.outerHTML;
                    element.innerHTML = iconHTML + ' <span>' + translation + '</span>';
                    return; // Don't process further
                }
                
                // If button has no icon structure, check if translation contains HTML
                // (shouldn't happen for buttons, but be safe)
                if (!existingIcon) {
                    // No icon found, just update text content
                    element.textContent = translation;
                }
            } else if (element.tagName === 'LABEL' || element.tagName === 'P' || element.tagName === 'SPAN') {
                // For labels and other elements, use innerHTML to preserve HTML tags
                element.innerHTML = translation;
            } else {
                element.textContent = translation;
            }
        }
    });
    
    // Update select options (with a small delay to ensure DOM is ready)
    setTimeout(() => {
        updateSelectOptions();
        updateDynamicLabels();
    }, 0);
}

/**
 * Update dynamic labels that have values (slice position, threshold)
 */
function updateDynamicLabels() {
    // Update slice position label
    const slicePositionValue = document.getElementById('slicePositionValue');
    if (slicePositionValue) {
        const value = parseFloat(slicePositionValue.textContent) || 0;
        const label = document.querySelector('label[for="slicePosition"]');
        if (label) {
            label.innerHTML = t('sliceTool.position', { value: value.toFixed(1) });
        }
    }
    
    // Update value visibility threshold label
    const thresholdValue = document.getElementById('valueVisibilityThresholdValue');
    if (thresholdValue) {
        const value = parseFloat(thresholdValue.textContent) || 0;
        const label = document.querySelector('label[for="valueVisibilityThreshold"]');
        if (label) {
            label.innerHTML = t('valueFilter.threshold', { value: value.toFixed(2) });
        }
    }
}

/**
 * Update select option text based on current locale
 */
function updateSelectOptions() {
    // Pattern type select
    const patternSelect = document.getElementById('patternType');
    if (patternSelect) {
        patternSelect.querySelectorAll('option').forEach(option => {
            const value = option.value;
            const key = `patterns.${value}`;
            const translation = t(key);
            if (translation !== key) { // Only update if translation found
                option.textContent = translation;
            }
        });
    }
    
    // View mode select
    const viewModeSelect = document.getElementById('viewMode');
    if (viewModeSelect) {
        viewModeSelect.querySelectorAll('option').forEach(option => {
            const value = option.value;
            const key = `visualization.modes.${value}`;
            const translation = t(key);
            if (translation !== key) {
                option.textContent = translation;
            }
        });
    }
    
    // Visualization field select
    const fieldSelect = document.getElementById('visualizationField');
    if (fieldSelect) {
        fieldSelect.querySelectorAll('option').forEach(option => {
            const value = option.value;
            const key = `visualization.fields.${value}`;
            const translation = t(key);
            if (translation !== key) {
                option.textContent = translation;
            }
        });
    }
    
    // Slice axis select
    const sliceAxisSelect = document.getElementById('sliceAxis');
    if (sliceAxisSelect) {
        sliceAxisSelect.querySelectorAll('option').forEach(option => {
            const value = option.value;
            const key = `sliceTool.axes.${value}`;
            const translation = t(key);
            if (translation !== key) {
                option.textContent = translation;
            }
        });
    }
    
    // Value visibility mode select
    const valueModeSelect = document.getElementById('valueVisibilityMode');
    if (valueModeSelect) {
        valueModeSelect.querySelectorAll('option').forEach(option => {
            const value = option.value;
            const key = `valueFilter.modes.${value}`;
            const translation = t(key);
            if (translation !== key) {
                option.textContent = translation;
            }
        });
    }
}

/**
 * Format a number according to current locale
 * @param {number} value - Number to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted number
 */
function formatNumber(value, options = {}) {
    if (value === undefined || value === null || isNaN(value)) {
        return '0';
    }
    
    const defaults = {
        minimumFractionDigits: options.decimals !== undefined ? options.decimals : 2,
        maximumFractionDigits: options.decimals !== undefined ? options.decimals : 2,
        useGrouping: true
    };
    
    try {
        return new Intl.NumberFormat(currentLocale === 'en' ? 'en-US' : currentLocale, {
            ...defaults,
            ...options
        }).format(value);
    } catch (e) {
        // Fallback to simple formatting
        return value.toFixed(defaults.minimumFractionDigits);
    }
}

/**
 * Format a percentage value
 * @param {number} value - Percentage value (0-100)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
function formatPercent(value, decimals = 2) {
    if (value === undefined || value === null || isNaN(value)) {
        return '0%';
    }
    
    try {
        return new Intl.NumberFormat(currentLocale === 'en' ? 'en-US' : currentLocale, {
            style: 'percent',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value / 100);
    } catch (e) {
        return `${value.toFixed(decimals)}%`;
    }
}

/**
 * Format file size (bytes to human-readable)
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = bytes / Math.pow(k, i);
    
    return `${formatNumber(size, { decimals: 2 })} ${sizes[i]}`;
}

// Make getLocale and setLocale available globally
window.getLocale = getLocale;
window.setLocale = setLocale;
window.initI18n = initI18n;

// Initialize i18n when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initI18n());
} else {
    initI18n();
}
