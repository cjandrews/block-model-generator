# Cursor Agents Configuration

This file defines specialized subagents for this project.

## Security Analysis Agent

**Purpose**: Automated security analysis and review of code changes and the application codebase.

**Activation**: 
- **Automatic**: Reviews code changes when editing `.js`, `.html`, or `.json` files (via `.cursor/rules/security-analysis.mdc`)
- **Manual**: Invoke using natural language prompts (see "Manual Invocation" section below)
- **Keyword Triggers**: Mentions of "security", "vulnerability", "XSS", "audit", etc. in conversations

**Capabilities**:
- Scans for OWASP Top 10 vulnerabilities
- Reviews JavaScript/TypeScript code for security issues
- Checks for XSS vulnerabilities in DOM manipulation
- Validates input sanitization and output encoding
- Reviews localStorage usage for sensitive data exposure
- Checks for hardcoded secrets or credentials
- Analyzes dependency vulnerabilities
- Reviews Content Security Policy implementation
- Validates Three.js security best practices
- Checks for insecure eval() or Function() usage

**Focus Areas** (Client-Side Web Application):
1. **Cross-Site Scripting (XSS)**
   - DOM manipulation safety (`innerHTML`, `textContent`)
   - User input sanitization
   - Output encoding

2. **Data Storage Security**
   - localStorage usage (no sensitive data)
   - Session storage security
   - Cache security

3. **Input Validation**
   - Form input validation
   - URL parameter validation
   - File upload validation (if applicable)

4. **Dependency Security**
   - npm package vulnerabilities
   - Three.js version security
   - Outdated dependencies

5. **Content Security Policy**
   - CSP headers
   - Inline script security
   - External resource loading

**Output Format**:
- Structured security report with severity levels
- Specific file locations and line numbers
- Actionable recommendations
- Code examples for fixes

**Integration**:
- Uses the `security-analysis` skill for comprehensive analysis
- Follows OWASP Top 10 guidelines
- References project-specific security patterns

---

## Manual Invocation

**You can invoke the Security Analysis Agent from ANY existing chat session** - no need to start a "New Agent" chat. The agent works through:

1. **Natural Language Prompts**: Just ask in your current chat
2. **Automatic Rule Activation**: The rule activates when you have `.js`, `.html`, or `.json` files open
3. **Skill Integration**: The `security-analysis` skill is always available in the background

### How to Invoke

Simply type any of these prompts in your current Cursor chat:

### General Security Review
- "Review the security of this file"
- "Check for security vulnerabilities"
- "Analyze security issues"
- "Perform a security review"
- "Scan for security vulnerabilities"

### Full Application Audit
- "Perform a complete security audit of the application"
- "Run a full security analysis"
- "Review all security aspects of this project"
- "Check the entire codebase for security issues"

### Specific File Review
- "Review [filename] for security vulnerabilities"
- "Check [filename] for security issues"
- "Analyze security of [filename]"

### Specific Vulnerability Types
- "Check for XSS vulnerabilities"
- "Review localStorage usage for security"
- "Check for injection vulnerabilities"
- "Review input validation"
- "Check for hardcoded secrets"
- "Analyze dependency vulnerabilities"
- "Review Content Security Policy"

### Targeted Analysis
- "Check if we're storing sensitive data in localStorage"
- "Review all DOM manipulation for XSS risks"
- "Check for unsafe eval() usage"
- "Review Three.js usage for security issues"
- "Check npm dependencies for vulnerabilities"

## Usage Examples

### Example 1: Review Current File
If you have `scripts/main.js` open:
```
"Review this file for security vulnerabilities"
```

### Example 2: Full Application Scan
```
"Perform a complete security audit of the application"
```

### Example 3: Specific Concern
```
"Check for XSS vulnerabilities in the visualization code"
```

### Example 4: Dependency Check
```
"Review npm dependencies for security vulnerabilities"
```

## How It Works

1. **Any Chat Session**: Works in your current chat - no separate "agent chat" needed
2. **Natural Language Processing**: Cursor recognizes security-related prompts and activates the agent
3. **Automatic Rule Activation**: When you have `.js`, `.html`, or `.json` files open, the rule automatically applies
4. **Skill Integration**: The agent uses the `security-analysis` skill for comprehensive analysis
5. **Rule Application**: The `.cursor/rules/security-analysis.mdc` rule provides project-specific guidance
6. **Structured Output**: Results are formatted with severity levels, locations, and recommendations

### No Separate Chat Needed

- ✅ **Use your existing chat** - just ask naturally
- ✅ **Works automatically** when relevant files are open
- ✅ **Skills are always available** in the background
- ❌ **No need for** a "New Agent" button or separate chat session

## Automatic Review

The agent also automatically reviews code when:
- You edit `.js`, `.html`, or `.json` files (triggered by the rule's glob patterns)
- Security-related keywords appear in your conversation
- You commit or stage changes (if configured)

---

## Localization-i18n Expert Agent

**Purpose**: Expert guidance and implementation for internationalization (i18n) and localization (l10n) of web applications.

**Activation**: 
- **Automatic**: Reviews code when editing translation files (`.json` in `locales/`), i18n utilities, or when i18n-related keywords are detected
- **Manual**: Invoke using natural language prompts (see "Manual Invocation" section below)
- **Keyword Triggers**: Mentions of "localization", "i18n", "l10n", "translation", "locale", "multilingual", "language", etc.

**Capabilities**:
- Design and implement i18n infrastructure for vanilla JavaScript applications
- Create and maintain translation JSON files (easy for non-programmers)
- Extract hardcoded strings from HTML and JavaScript
- Implement translation utility functions (`t()` function pattern)
- Set up locale detection (localStorage → browser language → default)
- Implement language switcher UI components
- Handle dynamic content translation (tooltips, status messages, error messages)
- Manage translation keys with dot notation (e.g., `status.modelGenerated`)
- Implement number and date formatting for different locales
- Handle CORS issues for local file:// protocol development
- Update HTML elements with `data-i18n` attributes
- Translate select options, form labels, buttons, and UI text
- Manage pluralization and parameter substitution (`{{param}}`)
- Ensure translations load before code execution
- Validate translation key coverage across all language files

**Focus Areas** (Vanilla JavaScript Web Applications):

1. **Translation File Management**
   - JSON structure design (nested objects with dot notation)
   - Translation key naming conventions
   - Maintaining consistency across multiple language files
   - Missing translation detection and fallback handling

2. **i18n Infrastructure**
   - Custom lightweight i18n library (no external dependencies)
   - Translation loading (fetch for http/https, XMLHttpRequest for file://)
   - Locale detection and persistence
   - Global `t()` function availability
   - Translation caching and performance

3. **HTML Localization**
   - Adding `data-i18n` attributes to translatable elements
   - Handling dynamic labels with parameters
   - Updating select options on locale change
   - Language switcher UI implementation

4. **JavaScript Localization**
   - Replacing hardcoded strings with `t()` calls
   - Status message translation
   - Error message translation
   - Tooltip content translation
   - Dynamic content updates on locale change

5. **Formatting & Localization**
   - Number formatting (Intl.NumberFormat)
   - Date/time formatting
   - Currency formatting
   - File size formatting
   - Percentage formatting
   - Locale-specific decimal/thousands separators

6. **Technical Considerations**
   - CORS handling for local development (file:// protocol)
   - Translation loading timing (preventing errors before translations load)
   - Fallback to default language when translations fail
   - Translation key validation and error handling

**Output Format**:
- Translation file structure recommendations
- Code examples for i18n implementation
- List of strings requiring translation
- Translation key naming suggestions
- Implementation patterns and best practices
- CORS and loading issue solutions

**Integration**:
- Uses the `localization-i18n` skill for comprehensive i18n guidance
- Follows vanilla JavaScript best practices (no framework dependencies)
- References project-specific patterns (JSON-based, lightweight approach)
- Maintains compatibility with existing codebase structure

---

## Manual Invocation (Localization-i18n Expert)

**You can invoke the Localization-i18n Expert from ANY existing chat session** - no need to start a "New Agent" chat. The agent works through:

1. **Natural Language Prompts**: Just ask in your current chat
2. **Automatic Rule Activation**: Activates when editing translation files or i18n utilities
3. **Skill Integration**: The `localization-i18n` skill is always available in the background

### How to Invoke

Simply type any of these prompts in your current Cursor chat:

### General Localization Review
- "Review the i18n implementation"
- "Check translation coverage"
- "Analyze localization setup"
- "Review translation files"
- "Check for missing translations"

### Add New Language Support
- "Add support for [language]"
- "Create translation file for [language]"
- "Add [language] to the language selector"
- "Implement translations for [language]"

### Extract Strings for Translation
- "Find all hardcoded strings that need translation"
- "Extract strings from [filename]"
- "Identify untranslated content"
- "List all user-facing strings"

### Translation File Management
- "Review translation file structure"
- "Check for missing translation keys"
- "Validate translation files"
- "Add missing translations"
- "Fix translation key errors"

### Implementation Help
- "How do I add a new translation?"
- "Implement i18n for [feature]"
- "Translate [specific UI element]"
- "Add dynamic translation for [component]"

### Technical Issues
- "Fix CORS errors with translations"
- "Translation keys not found errors"
- "Translations not loading"
- "Fix locale detection"
- "Update language switcher"

### Formatting & Localization
- "Format numbers for [locale]"
- "Format dates for [locale]"
- "Implement locale-specific formatting"
- "Handle number formatting differences"

## Usage Examples (Localization-i18n Expert)

### Example 1: Review Current Translation Setup
If you have `scripts/i18n.js` or `locales/en.json` open:
```
"Review the i18n implementation and suggest improvements"
```

### Example 2: Add New Language
```
"Add French translations to the application"
```

### Example 3: Extract Strings
```
"Find all hardcoded English strings in main.js that need translation"
```

### Example 4: Fix Translation Errors
```
"Fix the 'Translation key not found' errors"
```

### Example 5: Implement Feature Translation
```
"Add translations for the new export feature"
```

## How It Works (Localization-i18n Expert)

1. **Any Chat Session**: Works in your current chat - no separate "agent chat" needed
2. **Natural Language Processing**: Cursor recognizes i18n-related prompts and activates the agent
3. **Automatic Rule Activation**: When you edit translation files or i18n utilities, the rule automatically applies
4. **Skill Integration**: The agent uses the `localization-i18n` skill for comprehensive guidance
5. **Pattern Recognition**: Recognizes common i18n patterns (JSON files, `t()` function, `data-i18n` attributes)
6. **Structured Output**: Results include file structure, code examples, and implementation patterns

### No Separate Chat Needed

- ✅ **Use your existing chat** - just ask naturally
- ✅ **Works automatically** when relevant files are open
- ✅ **Skills are always available** in the background
- ❌ **No need for** a "New Agent" button or separate chat session

## Automatic Review (Localization-i18n Expert)

The agent also automatically reviews code when:
- You edit translation files (`.json` in `locales/` directory)
- You modify i18n utility files (`i18n.js` or similar)
- i18n-related keywords appear in your conversation
- Translation key errors are detected in console
- Missing translation keys are identified
