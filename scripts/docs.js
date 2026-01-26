/**
 * Interactive Documentation Tool
 * Provides search, navigation, and interactive features for the documentation
 * 
 * @license MIT License
 * @copyright Copyright (c) 2026 BuildIT Design Labs, LLC
 */

(function() {
    'use strict';

    // Initialize documentation
    document.addEventListener('DOMContentLoaded', function() {
        initNavigation();
        initSearch();
        initScrollToTop();
    });

    /**
     * Initialize navigation between sections
     */
    function initNavigation() {
        const navLinks = document.querySelectorAll('.docs-nav-link');
        const sections = document.querySelectorAll('.docs-section');

        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetSection = this.getAttribute('data-section');
                
                // Update active nav link
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
                
                // Show target section
                sections.forEach(s => {
                    s.classList.remove('active');
                    if (s.id === targetSection) {
                        s.classList.add('active');
                        // Scroll to top of content
                        document.querySelector('.docs-content').scrollTop = 0;
                    }
                });

                // Update URL hash without scrolling
                if (history.pushState) {
                    history.pushState(null, null, '#' + targetSection);
                }
            });
        });

        // Handle initial hash
        if (window.location.hash) {
            const hash = window.location.hash.substring(1);
            const link = document.querySelector(`[data-section="${hash}"]`);
            if (link) {
                link.click();
            }
        }
    }

    /**
     * Initialize search functionality
     */
    function initSearch() {
        const searchBox = document.getElementById('searchBox');
        if (!searchBox) return;

        let searchTimeout;
        
        searchBox.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.toLowerCase().trim();
            
            searchTimeout = setTimeout(() => {
                if (query.length === 0) {
                    clearSearch();
                    return;
                }
                
                performSearch(query);
            }, 300);
        });

        searchBox.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = this.value.toLowerCase().trim();
                if (query.length > 0) {
                    performSearch(query);
                }
            } else if (e.key === 'Escape') {
                this.value = '';
                clearSearch();
            }
        });
    }

    /**
     * Perform search across all documentation
     */
    function performSearch(query) {
        const sections = document.querySelectorAll('.docs-section');
        const navLinks = document.querySelectorAll('.docs-nav-link');
        let foundSections = new Set();
        let totalMatches = 0;

        // Remove previous highlights
        clearSearch();

        sections.forEach(section => {
            const content = section.innerHTML;
            const lowerContent = content.toLowerCase();
            
            if (lowerContent.includes(query)) {
                foundSections.add(section.id);
                
                // Highlight matches in content
                highlightMatches(section, query);
                totalMatches++;
            }
        });

        // Update navigation to show which sections have matches
        navLinks.forEach(link => {
            const sectionId = link.getAttribute('data-section');
            if (foundSections.has(sectionId)) {
                link.style.borderColor = '#7c8aff';
                link.style.boxShadow = '0 0 5px rgba(124, 138, 255, 0.5)';
            } else {
                link.style.borderColor = '';
                link.style.boxShadow = '';
            }
        });

        // Show first matching section
        if (foundSections.size > 0) {
            const firstSection = Array.from(foundSections)[0];
            const link = document.querySelector(`[data-section="${firstSection}"]`);
            if (link) {
                link.click();
            }
        }

        // Show search results count
        showSearchResults(totalMatches, query);
    }

    /**
     * Highlight search matches in content
     */
    function highlightMatches(element, query) {
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.trim().length > 0) {
                textNodes.push(node);
            }
        }

        textNodes.forEach(textNode => {
            const text = textNode.textContent;
            const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
            
            if (regex.test(text)) {
                const highlighted = text.replace(regex, '<span class="highlight">$1</span>');
                const wrapper = document.createElement('span');
                wrapper.innerHTML = highlighted;
                textNode.parentNode.replaceChild(wrapper, textNode);
            }
        });
    }

    /**
     * Clear search highlights
     */
    function clearSearch() {
        // Remove highlight spans
        const highlights = document.querySelectorAll('.highlight');
        highlights.forEach(highlight => {
            const parent = highlight.parentNode;
            parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
            parent.normalize();
        });

        // Reset nav link styles
        const navLinks = document.querySelectorAll('.docs-nav-link');
        navLinks.forEach(link => {
            link.style.borderColor = '';
            link.style.boxShadow = '';
        });

        // Hide search results
        hideSearchResults();
    }

    /**
     * Show search results count
     */
    function showSearchResults(count, query) {
        let resultsDiv = document.getElementById('searchResults');
        if (!resultsDiv) {
            resultsDiv = document.createElement('div');
            resultsDiv.id = 'searchResults';
            resultsDiv.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: #2a2a2a;
                border: 1px solid #7c8aff;
                border-radius: 6px;
                padding: 12px 16px;
                color: #e0e0e0;
                font-size: 0.9em;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            `;
            document.body.appendChild(resultsDiv);
        }

        resultsDiv.innerHTML = `
            <strong style="color: #7c8aff;">Found ${count} section${count !== 1 ? 's' : ''}</strong>
            <br>
            <span style="opacity: 0.8;">Searching for: "${query}"</span>
        `;
        resultsDiv.style.display = 'block';
    }

    /**
     * Hide search results
     */
    function hideSearchResults() {
        const resultsDiv = document.getElementById('searchResults');
        if (resultsDiv) {
            resultsDiv.style.display = 'none';
        }
    }

    /**
     * Escape special regex characters
     */
    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Initialize scroll to top functionality
     */
    function initScrollToTop() {
        // Add smooth scrolling behavior
        document.querySelector('.docs-content').style.scrollBehavior = 'smooth';
    }

    /**
     * Add interactive demo functionality (if needed in future)
     */
    function initInteractiveDemos() {
        // Placeholder for future interactive demos
        const demoButtons = document.querySelectorAll('.docs-interactive-demo .docs-button');
        demoButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Future: Add interactive demonstrations
                console.log('Interactive demo clicked:', this.textContent);
            });
        });
    }

    // Initialize interactive demos
    initInteractiveDemos();

})();
