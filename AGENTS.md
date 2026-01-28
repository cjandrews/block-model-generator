# Cursor Agents Configuration

This file defines specialized subagents for this project.

---

## How to Verify Agent Activation

Since agents work transparently in the background, here's how to tell if a subagent is actively being invoked:

### Visual Indicators

1. **Structured Output Format**
   - Each agent produces distinctive, structured outputs:
     - **Security Analysis**: Reports with severity levels (Critical, High, Medium, Low), specific file locations with line numbers, and actionable recommendations
     - **Localization-i18n**: Translation file structures, code examples using `t()` patterns, mentions of `data-i18n` attributes, and locale-specific formatting
     - **Documentation Expert**: Well-structured markdown with proper formatting, interactive HTML documentation patterns, and documentation-focused guidance

2. **Agent-Specific Terminology**
   - Agents use specialized vocabulary:
     - **Security**: OWASP Top 10, XSS, injection vulnerabilities, Content Security Policy, input sanitization
     - **i18n**: Translation keys, locale detection, `t()` function, `data-i18n`, pluralization, parameter substitution
     - **Documentation**: README structure, markdown formatting, user guides, interactive docs, search functionality

3. **Skill File Access**
   - When an agent is invoked, Cursor reads the corresponding skill file:
     - `security-analysis\SKILL.md` for Security Analysis
     - `localization-i18n\SKILL.md` for i18n Expert
     - `user-assistance-docs\SKILL.md` for Documentation Expert
   - You can see these tool calls in the chat interface

4. **Response Behavior**
   - Agents follow their documented patterns and focus areas
   - They provide comprehensive, domain-specific guidance rather than generic responses
   - They reference project-specific patterns and conventions

### How to Explicitly Check

You can ask directly:
- "Are you using the Security Analysis Agent right now?"
- "Is the i18n expert active?"
- "Which agent is handling this request?"

The agent will confirm if it's using a specialized subagent and which one.

### Automatic Activation Triggers

Agents activate automatically when:
- **File Types**: Editing relevant file types (e.g., `.js`, `.html`, `.json` for Security; translation files for i18n)
- **Keywords**: Using trigger keywords in your prompts (e.g., "security", "vulnerability", "translation", "i18n", "documentation")
- **File Context**: Having relevant files open in your editor

### What to Expect

When an agent is active, you'll notice:
- ✅ More comprehensive, domain-specific responses
- ✅ Structured outputs matching the agent's format
- ✅ References to specialized tools, patterns, or frameworks
- ✅ Focus on the agent's specific expertise area
- ✅ Actionable recommendations with specific examples

---

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

---

## Documentation Expert Agent

**Purpose**: Expert guidance and creation of interactive, engaging, and user-friendly documentation for technical applications.

**Activation**: 
- **Automatic**: Reviews and updates documentation when editing `.md`, `.html` documentation files, or when documentation-related keywords are detected
- **Manual**: Invoke using natural language prompts (see "Manual Invocation" section below)
- **Keyword Triggers**: Mentions of "documentation", "docs", "README", "user guide", "help", "tutorial", "document", etc. in conversations

**Capabilities**:
- Create comprehensive README.md files for GitHub repositories
- Design interactive documentation tools (HTML-based with search and navigation)
- Write user-friendly technical documentation
- Create engaging documentation with proper formatting and structure
- Update documentation to reflect code changes and new features
- Generate documentation that matches application styling and themes
- Create documentation with search functionality and interactive features
- Write clear installation and usage instructions
- Document API interfaces, schemas, and data formats
- Create feature documentation with examples
- Generate project structure documentation
- Write troubleshooting guides and FAQs
- Create documentation with proper markdown formatting
- Handle image references and media in documentation
- Update documentation for UI changes and feature additions

**Focus Areas** (Technical Documentation):

1. **README.md Creation**
   - Project description and overview
   - Feature lists and capabilities
   - Installation and setup instructions
   - Usage examples and workflows
   - Project structure documentation
   - Technical details and architecture
   - License and author information
   - Contributing guidelines
   - Browser compatibility information
   - Performance benchmarks

2. **Interactive Documentation Tools**
   - HTML-based documentation pages
   - Search functionality with highlighting
   - Navigation between sections
   - Responsive design for mobile/desktop
   - Styling that matches application theme
   - Interactive demos and examples
   - Code syntax highlighting
   - Table of contents and navigation menus

3. **User Guides and Tutorials**
   - Step-by-step instructions
   - Quick start guides
   - Feature explanations
   - Use case examples
   - Best practices
   - Tips and tricks sections
   - Common use cases

4. **API and Schema Documentation**
   - Data schema specifications
   - Field definitions and types
   - Coordinate conventions
   - Export format documentation
   - Integration examples
   - Compatibility notes

5. **Documentation Maintenance**
   - Updating docs for code changes
   - Reviewing and updating existing documentation
   - Ensuring documentation accuracy
   - Adding new feature documentation
   - Updating examples and screenshots
   - Maintaining consistency across docs

6. **Markdown and Formatting**
   - Proper markdown syntax
   - Image references and paths
   - Code blocks and syntax highlighting
   - Tables and lists
   - Links and cross-references
   - Badges and shields
   - GitHub-specific markdown features

**Output Format**:
- Well-structured markdown files
- Interactive HTML documentation pages
- Clear, engaging prose
- Code examples and snippets
- Properly formatted tables and lists
- Cross-referenced sections
- Searchable content

**Integration**:
- Uses the `user-assistance-docs` skill for comprehensive documentation guidance
- Follows GitHub markdown best practices
- Creates documentation that matches application styling
- Maintains consistency with existing documentation style
- References project-specific patterns and conventions

---

## Manual Invocation (Documentation Expert)

**You can invoke the Documentation Expert from ANY existing chat session** - no need to start a "New Agent" chat. The agent works through:

1. **Natural Language Prompts**: Just ask in your current chat
2. **Automatic Rule Activation**: Activates when editing documentation files (`.md`, `docs.html`, etc.)
3. **Skill Integration**: The `user-assistance-docs` skill is always available in the background

### How to Invoke

Simply type any of these prompts in your current Cursor chat:

### General Documentation Tasks
- "Create documentation for this project"
- "Generate a README.md file"
- "Update the documentation"
- "Review and improve the documentation"
- "Create user documentation"
- "Write a user guide"

### README Creation
- "Create a comprehensive README.md"
- "Generate README with installation instructions"
- "Write a README for GitHub"
- "Create project documentation"
- "Document the features"

### Interactive Documentation
- "Create an interactive documentation tool"
- "Build a documentation page with search"
- "Create a help system"
- "Design a user guide interface"
- "Make documentation that matches the app style"

### Documentation Updates
- "Update documentation for new features"
- "Review changes and update docs"
- "Document the new [feature]"
- "Update README with latest changes"
- "Sync documentation with code"

### Specific Documentation Tasks
- "Document the API"
- "Create installation instructions"
- "Write usage examples"
- "Document the data schema"
- "Create a troubleshooting guide"
- "Write feature documentation"
- "Document the project structure"

### Markdown Help
- "How do I reference images in markdown?"
- "Format this documentation properly"
- "Create a table in markdown"
- "Add code examples to documentation"
- "Fix markdown formatting"

## Usage Examples (Documentation Expert)

### Example 1: Create README
```
"Create a comprehensive README.md file for this project"
```

### Example 2: Update Documentation
```
"Review the changes to the app and update the documentation"
```

### Example 3: Interactive Docs
```
"Create an interactive documentation tool that can be opened in a new window, matching the app's styles"
```

### Example 4: Feature Documentation
```
"Document the new Salt Dome Reservoir pattern feature"
```

### Example 5: Schema Documentation
```
"Create documentation for the block model schema"
```

## How It Works (Documentation Expert)

1. **Any Chat Session**: Works in your current chat - no separate "agent chat" needed
2. **Natural Language Processing**: Cursor recognizes documentation-related prompts and activates the agent
3. **Automatic Rule Activation**: When you edit documentation files (`.md`, `docs.html`), the rule automatically applies
4. **Skill Integration**: The agent uses the `user-assistance-docs` skill for comprehensive documentation guidance
5. **Pattern Recognition**: Recognizes documentation patterns (README structure, markdown syntax, HTML docs)
6. **Structured Output**: Results include well-formatted documentation with proper structure and examples

### No Separate Chat Needed

- ✅ **Use your existing chat** - just ask naturally
- ✅ **Works automatically** when relevant files are open
- ✅ **Skills are always available** in the background
- ❌ **No need for** a "New Agent" button or separate chat session

## Automatic Review (Documentation Expert)

The agent also automatically reviews and suggests improvements when:
- You edit `.md` files (README.md, documentation files)
- You modify `docs.html` or other documentation HTML files
- Documentation-related keywords appear in your conversation
- New features are added to the codebase
- API or schema changes are detected
- UI changes are made that affect user experience
