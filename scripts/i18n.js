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
                    "basicPatterns": "Basic Patterns"
                },
                "visualization": {
                    "title": "👁️ Visualization",
                    "intro": "The 3D visualization allows you to explore your block model interactively.",
                    "viewModes": "View Modes",
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
                    "howItWorks": "How It Works"
                },
                "export": {
                    "title": "💾 Export & Data",
                    "intro": "Export your block model to CSV format for use in other mining software.",
                    "exportFormat": "Export Format",
                    "exportProcess": "Export Process",
                    "exportedFields": "Exported Fields"
                },
                "schema": {
                    "title": "📊 Data Schema",
                    "intro": "The block model uses a standardized schema for maximum compatibility with mining software.",
                    "requiredFields": "Required Fields",
                    "optionalFields": "Optional Fields",
                    "coordinateConventions": "Coordinate Conventions",
                    "petroleumMappings": "Petroleum Geology Field Mappings"
                },
                "controls": {
                    "title": "🎮 Controls",
                    "mouseControls": "Mouse Controls",
                    "keyboardShortcuts": "Keyboard Shortcuts",
                    "keyboardDesc": "Currently, all controls are mouse-based. Keyboard shortcuts may be added in future versions.",
                    "buttonFunctions": "Button Functions"
                },
                "tips": {
                    "title": "💡 Tips & Tricks",
                    "performanceOptimization": "Performance Optimization",
                    "visualizationTips": "Visualization Tips",
                    "patternSelection": "Pattern Selection",
                    "exportBestPractices": "Export Best Practices",
                    "commonUseCases": "Common Use Cases"
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
            "documentation": "📚 Documentación"
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
            "builtBy": "Desarrollado por <strong>{{author}}</strong>, {{company}}",
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
                    "basicPatterns": "Patrones Básicos"
                },
                "visualization": {
                    "title": "👁️ Visualización",
                    "intro": "La visualización 3D te permite explorar tu modelo de bloques de forma interactiva.",
                    "viewModes": "Modos de Vista",
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
                    "howItWorks": "Cómo Funciona"
                },
                "export": {
                    "title": "💾 Exportar y Datos",
                    "intro": "Exporta tu modelo de bloques al formato CSV para usar en otro software minero.",
                    "exportFormat": "Formato de Exportación",
                    "exportProcess": "Proceso de Exportación",
                    "exportedFields": "Campos Exportados"
                },
                "schema": {
                    "title": "📊 Esquema de Datos",
                    "intro": "El modelo de bloques usa un esquema estandarizado para máxima compatibilidad con software minero.",
                    "requiredFields": "Campos Requeridos",
                    "optionalFields": "Campos Opcionales",
                    "coordinateConventions": "Convenciones de Coordenadas",
                    "petroleumMappings": "Mapeos de Campos de Geología Petrolera"
                },
                "controls": {
                    "title": "🎮 Controles",
                    "mouseControls": "Controles del Mouse",
                    "keyboardShortcuts": "Atajos de Teclado",
                    "keyboardDesc": "Actualmente, todos los controles se basan en el mouse. Los atajos de teclado pueden agregarse en versiones futuras.",
                    "buttonFunctions": "Funciones de Botones"
                },
                "tips": {
                    "title": "💡 Consejos y Trucos",
                    "performanceOptimization": "Optimización de Rendimiento",
                    "visualizationTips": "Consejos de Visualización",
                    "patternSelection": "Selección de Patrones",
                    "exportBestPractices": "Mejores Prácticas de Exportación",
                    "commonUseCases": "Casos de Uso Comunes"
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
            "documentation": "📚 Documentation"
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
            "builtBy": "Développé par <strong>{{author}}</strong>, {{company}}",
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
                    "basicPatterns": "Motifs de Base"
                },
                "visualization": {
                    "title": "👁️ Visualisation",
                    "intro": "La visualisation 3D vous permet d'explorer votre modèle de blocs de manière interactive.",
                    "viewModes": "Modes d'Affichage",
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
                    "howItWorks": "Comment Ça Marche"
                },
                "export": {
                    "title": "💾 Exportation et Données",
                    "intro": "Exportez votre modèle de blocs au format CSV pour l'utiliser dans d'autres logiciels miniers.",
                    "exportFormat": "Format d'Exportation",
                    "exportProcess": "Processus d'Exportation",
                    "exportedFields": "Champs Exportés"
                },
                "schema": {
                    "title": "📊 Schéma de Données",
                    "intro": "Le modèle de blocs utilise un schéma standardisé pour une compatibilité maximale avec les logiciels miniers.",
                    "requiredFields": "Champs Requis",
                    "optionalFields": "Champs Optionnels",
                    "coordinateConventions": "Conventions de Coordonnées",
                    "petroleumMappings": "Mappages de Champs de Géologie Pétrolière"
                },
                "controls": {
                    "title": "🎮 Contrôles",
                    "mouseControls": "Contrôles de la Souris",
                    "keyboardShortcuts": "Raccourcis Clavier",
                    "keyboardDesc": "Actuellement, tous les contrôles sont basés sur la souris. Les raccourcis clavier peuvent être ajoutés dans les versions futures.",
                    "buttonFunctions": "Fonctions des Boutons"
                },
                "tips": {
                    "title": "💡 Astuces et Conseils",
                    "performanceOptimization": "Optimisation des Performances",
                    "visualizationTips": "Conseils de Visualisation",
                    "patternSelection": "Sélection de Motifs",
                    "exportBestPractices": "Meilleures Pratiques d'Exportation",
                    "commonUseCases": "Cas d'Usage Courants"
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
    // If translations haven't loaded yet, return key (silently)
    if (!translations || typeof translations !== 'object' || Object.keys(translations).length === 0) {
        return key;
    }
    
    // Navigate through nested object using dot notation
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            // Key not found, return the key itself (helps identify missing translations)
            // Only warn if translations are loaded (to avoid spam during initial load)
            if (Object.keys(translations).length > 0) {
                console.warn(`Translation key not found: ${key}`);
            }
            return key;
        }
    }
    
    // If value is not a string, return the key
    if (typeof value !== 'string') {
        if (Object.keys(translations).length > 0) {
            console.warn(`Translation value is not a string for key: ${key}`);
        }
        return key;
    }
    
    // Substitute parameters (simple {{param}} replacement)
    let result = value;
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
            // For labels and other elements, use innerHTML to preserve HTML tags
            if (element.tagName === 'LABEL' || element.tagName === 'P' || element.tagName === 'SPAN') {
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
