// Configure Tailwind
tailwind.config = {
    darkMode: 'class',
}

// --- Dark Mode Logic ---
var themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
var themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');

// Check state on load
if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    themeToggleLightIcon.classList.remove('hidden');
    document.documentElement.classList.add('dark');
} else {
    themeToggleDarkIcon.classList.remove('hidden');
    document.documentElement.classList.remove('dark');
}

var themeToggleBtn = document.getElementById('theme-toggle');

themeToggleBtn.addEventListener('click', function () {
    themeToggleDarkIcon.classList.toggle('hidden');
    themeToggleLightIcon.classList.toggle('hidden');

    if (localStorage.getItem('color-theme')) {
        if (localStorage.getItem('color-theme') === 'light') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
        }
    } else {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
        }
    }
});

// --- Sidebar Logic ---
const sidebar = document.getElementById('logo-sidebar');
const mainContent = document.getElementById('main-content');
const toggleBtn = document.getElementById('sidebar-toggle-btn');

// Elements to hide/fade
const sidebarTitle = document.getElementById('sidebar-title');
const sidebarNav = document.getElementById('sidebar-nav');
const themeBtnTheme = document.getElementById('theme-toggle'); // renamed variable to avoid conflict
const headerContainer = sidebar.querySelector('.flex.items-center.justify-between');

const toggleArrow = document.getElementById('toggle-arrow');
const contentCard = document.getElementById('content-card');
const sidebarSearchContainer = document.getElementById('sidebar-search-container');

function toggleSidebar() {
    // Check if mobile (md breakpoint is usually 768px in Tailwind)
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
        // Mobile: Toggle visibility using translate
        const isHidden = sidebar.classList.contains('-translate-x-full');
        if (isHidden) {
            sidebar.classList.remove('-translate-x-full'); // Show
        } else {
            sidebar.classList.add('-translate-x-full'); // Hide
        }
    } else {
        // Desktop: Toggle Width (Collapse/Expand)
        const isCollapsing = sidebar.classList.contains('md:w-80') || sidebar.classList.contains('w-80');
        // Note: We use the presence of the full-width class to detect state

        if (isCollapsing) {
            // Minimize
            sidebar.classList.remove('md:w-80', 'w-80');
            sidebar.classList.add('w-16');

            // Adjust main content margin
            mainContent.classList.remove('md:ml-[22rem]', 'ml-[22rem]');
            mainContent.classList.add('md:ml-24', 'ml-24');

            // Hide sidebar content
            sidebarTitle.classList.add('hidden');
            themeBtnTheme.classList.add('hidden');
            sidebarNav.classList.add('hidden');

            // Center icon
            headerContainer.classList.remove('justify-between', 'px-6');
            headerContainer.classList.add('justify-center', 'px-2');

            // Rotate Arrow
            if (toggleArrow) toggleArrow.classList.add('rotate-180');

            // Switch Search Mode
            if (searchInputWrapper) searchInputWrapper.classList.add('hidden');
            if (searchCollapsedBtn) {
                searchCollapsedBtn.classList.remove('hidden');
                searchCollapsedBtn.classList.add('flex');
            }
            // Remove padding to center the button in the specific 40px available space
            if (sidebarSearchContainer) sidebarSearchContainer.classList.remove('px-3');

        } else {
            // Expand
            sidebar.classList.remove('w-16');
            sidebar.classList.add('md:w-80', 'w-80'); // Re-add both for safety

            mainContent.classList.remove('md:ml-24', 'ml-24');
            mainContent.classList.add('md:ml-80', 'ml-80'); /// Adjusted to ml-80 to match w-80

            sidebarTitle.classList.remove('hidden');
            themeBtnTheme.classList.remove('hidden');
            sidebarNav.classList.remove('hidden');
            // sidebarSearch logic removed/commented out by user edits? I should verify. 
            // For now, focusing on contentCard alignment.

            headerContainer.classList.remove('justify-center', 'px-2');
            headerContainer.classList.add('justify-between', 'px-6');

            // Reset Arrow
            if (toggleArrow) toggleArrow.classList.remove('rotate-180');

            // Switch Search Mode
            if (searchInputWrapper) searchInputWrapper.classList.remove('hidden');
            if (searchCollapsedBtn) {
                searchCollapsedBtn.classList.add('hidden');
                searchCollapsedBtn.classList.remove('flex');
            }
            // Restore padding
            if (sidebarSearchContainer) sidebarSearchContainer.classList.add('px-3');
        }
    }
}

toggleBtn.addEventListener('click', toggleSidebar);

// --- Client Side Router ---

document.addEventListener('DOMContentLoaded', () => {
    // Intercept clicks on links
    document.body.addEventListener('click', e => {
        const link = e.target.closest('a');
        if (link && link.href && link.host === window.location.host && !link.hash) {
            e.preventDefault();
            navigateTo(link.href);
        }
    });

    // Handle back/forward buttons
    window.addEventListener('popstate', () => {
        loadPage(window.location.href);
    });
});

async function navigateTo(url) {
    history.pushState(null, null, url);
    await loadPage(url);
}

async function loadPage(url) {
    // Show loading state (optional)
    const contentDiv = document.querySelector('article');
    contentDiv.style.opacity = '0.5';

    try {
        // Add ?format=json to the URL, handling existing query params
        const fetchUrl = new URL(url);
        fetchUrl.searchParams.set('format', 'json');

        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();

        // Update Content
        contentDiv.innerHTML = data.Content;

        // Update Title (Browser Tab)
        document.title = data.Title || "MyDocs";

        // Update View Count
        const viewCountSpan = document.getElementById('view-count');
        if (viewCountSpan && data.Views !== undefined) {
            viewCountSpan.innerText = `👀 ${data.Views} views`;
        }

        // Update Sidebar Active State
        updateSidebar(data.CurrentPath);

        // Scroll to top
        window.scrollTo(0, 0);

        // Mobile: Close sidebar after navigation
        if (window.innerWidth < 768) {
            const sidebar = document.getElementById('logo-sidebar');
            sidebar.classList.add('-translate-x-full');
        }

        // Process Highlights
        const highlightQuery = fetchUrl.searchParams.get('highlight');
        if (highlightQuery) {
            // Small delay to ensure rendering complete
            setTimeout(() => {
                const firstMatch = highlightTextInDOM(contentDiv, highlightQuery);
                if (firstMatch) {
                    firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 50);
        }

    } catch (error) {
        console.error('Failed to load page:', error);
        contentDiv.innerHTML = '<h1>Error loading content</h1><p>Please try refreshing the page.</p>';
    } finally {
        contentDiv.style.opacity = '1';
    }
}

function updateSidebar(currentPath) {
    const links = document.querySelectorAll('#sidebar-nav a');
    const activeClasses = ['bg-blue-100', 'text-blue-700', 'dark:bg-blue-900/50', 'dark:text-blue-400', 'font-medium'];
    const inactiveClasses = ['text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-700'];

    links.forEach(link => {
        // Normalize paths for comparison (remove trailing slashes)
        const linkPath = new URL(link.href).pathname.replace(/\/$/, "");
        const activePath = currentPath.replace(/\/$/, "");

        if (linkPath === activePath) {
            link.classList.add(...activeClasses);
            link.classList.remove(...inactiveClasses);
        } else {
            link.classList.remove(...activeClasses);
            // Re-add default classes if they are missing
            link.classList.add(...inactiveClasses);
        }
    });
}

// --- Search Logic ---
// --- Search Modal Logic ---
const searchTriggerExpanded = document.getElementById('search-trigger-expanded');
const searchTriggerCollapsed = document.getElementById('search-collapsed-btn'); // reusing generic ID from before
const searchModal = document.getElementById('search-modal');
const searchModalBackdrop = document.getElementById('search-modal-backdrop');
const searchModalPanel = document.getElementById('search-modal-panel');
const modalSearchInput = document.getElementById('modal-search-input');
const modalSearchResults = document.getElementById('modal-search-results');

const searchInputWrapper = document.getElementById('search-trigger-expanded'); // Updated ref for sidebar toggle logic which uses 'searchInputWrapper' var name

let debounceTimer;

function openSearchModal() {
    searchModal.classList.remove('hidden');
    // Animate in
    setTimeout(() => {
        searchModalBackdrop.classList.remove('opacity-0');
        searchModalPanel.classList.remove('opacity-0', 'scale-95');
        searchModalPanel.classList.add('opacity-100', 'scale-100');
    }, 10);
    modalSearchInput.focus();
}

function closeSearchModal() {
    searchModalBackdrop.classList.add('opacity-0');
    searchModalPanel.classList.add('opacity-0', 'scale-95');
    searchModalPanel.classList.remove('opacity-100', 'scale-100');
    setTimeout(() => {
        searchModal.classList.add('hidden');
        modalSearchInput.value = ''; // Optional: clear on close
        modalSearchResults.innerHTML = '<p class="p-4 text-center text-slate-500 dark:text-slate-400">Type to search...</p>';
    }, 300);
}

// Triggers
if (searchTriggerExpanded) searchTriggerExpanded.addEventListener('click', openSearchModal);
if (searchTriggerCollapsed) searchTriggerCollapsed.addEventListener('click', openSearchModal); // Now opens modal directly

// Close events
// Close events
if (searchModalBackdrop) searchModalBackdrop.addEventListener('click', closeSearchModal);

const searchModalWrapper = document.getElementById('search-modal-wrapper');
if (searchModalWrapper) {
    searchModalWrapper.addEventListener('click', (e) => {
        if (e.target === searchModalWrapper) {
            closeSearchModal();
        }
    });
}

let focusedResultIndex = -1;

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !searchModal.classList.contains('hidden')) {
        closeSearchModal();
    }
    // Cmd+K to open
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSearchModal();
    }

    // Search Navigation (Up/Down/Enter)
    if (!searchModal.classList.contains('hidden')) {
        const results = modalSearchResults.querySelectorAll('li > a');
        if (results.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                focusedResultIndex = (focusedResultIndex + 1) % results.length;
                updateFocusedResult(results);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                focusedResultIndex = (focusedResultIndex - 1 + results.length) % results.length;
                updateFocusedResult(results);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (focusedResultIndex >= 0 && results[focusedResultIndex]) {
                    results[focusedResultIndex].click();
                }
            }
        }
    }
});

function updateFocusedResult(results) {
    results.forEach((res, idx) => {
        if (idx === focusedResultIndex) {
            res.classList.add('bg-slate-100', 'dark:bg-slate-700');
            res.scrollIntoView({ block: 'nearest' });
        } else {
            res.classList.remove('bg-slate-100', 'dark:bg-slate-700');
        }
    });
}


if (modalSearchInput) {
    modalSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        focusedResultIndex = -1; // Reset focus on new input

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (query.length < 2) {
                modalSearchResults.innerHTML = '<p class="p-4 text-center text-slate-500 dark:text-slate-400">Type at least 2 characters...</p>';
                return;
            }
            performSearch(query);
        }, 300);
    });
}

async function performSearch(query) {
    try {
        const response = await fetch(`/?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Search failed');
        const results = await response.json();

        renderSearchResults(results);
    } catch (error) {
        console.error(error);
        modalSearchResults.innerHTML = '<p class="p-4 text-center text-red-500">Search failed.</p>';
    }
}

function renderSearchResults(results) {
    modalSearchResults.innerHTML = '';
    if (!results || results.length === 0) {
        modalSearchResults.innerHTML = `
            <div class="p-12 text-center">
                <svg class="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">No results found</h3>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Try adjusting your search terms.</p>
            </div>`;
    } else {
        const list = document.createElement('ul');
        list.className = 'py-2 text-sm text-slate-700 dark:text-slate-200';

        results.forEach(result => {
            const li = document.createElement('li');
            const item = document.createElement('a');
            item.href = `${result.Path}?highlight=${encodeURIComponent(modalSearchInput.value)}`;
            item.className = 'group flex select-none items-center rounded-md p-3 mx-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer block';
            item.innerHTML = `
                <div class="flex-auto">
                    <p class="truncate font-medium text-slate-900 dark:text-slate-100">${highlightText(result.Title, modalSearchInput.value)}</p>
                    <p class="truncate text-slate-500 dark:text-slate-400 text-xs">${highlightText(result.Snippet, modalSearchInput.value)}</p>
                </div>
                <svg class="ml-3 h-5 w-5 flex-none text-slate-400 group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-300 transform group-hover:translate-x-1 transition-transform" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
            `;
            // Handle navigation
            item.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(item.href);
                closeSearchModal();
            });
            li.appendChild(item);
            list.appendChild(li);
        });
        modalSearchResults.appendChild(list);
    }
}

function highlightText(text, query) {
    if (!query) return text;
    // Simple case-insensitive highlight
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-200 text-slate-900 font-medium rounded px-0.5">$1</span>');
}

// --- Section Toggle Logic ---
window.toggleSection = function (button) {
    const container = button.nextElementSibling;
    const icon = button.querySelector('svg');

    if (container.classList.contains('hidden')) {
        // Expand
        container.classList.remove('hidden');
        icon.classList.remove('-rotate-90');
    } else {
        // Collapse
        container.classList.add('hidden');
        icon.classList.add('-rotate-90');
    }
}

// --- Safe DOM Highlighting ---
function highlightTextInDOM(root, query) {
    if (!query || query.length < 2) return null;

    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function (node) {
                // Skip script and style tags just in case
                if (node.parentElement && (node.parentElement.tagName === 'SCRIPT' || node.parentElement.tagName === 'STYLE')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    let firstMatchElement = null;
    const nodesToReplace = [];

    let node;
    while (node = walker.nextNode()) {
        if (regex.test(node.nodeValue)) {
            nodesToReplace.push(node);
        }
    }

    nodesToReplace.forEach(textNode => {
        // Reset regex state
        regex.lastIndex = 0;
        const text = textNode.nodeValue;

        const wrapper = document.createElement('span');
        let cursor = 0;

        // Use replace with callback to iterate matches
        text.replace(regex, (match, p1, offset) => {
            // Add text before match
            if (offset > cursor) {
                wrapper.appendChild(document.createTextNode(text.slice(cursor, offset)));
            }

            // Add match
            const glight = document.createElement('span');
            glight.className = "bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-200 text-slate-900 font-medium rounded px-0.5 animate-pulse";
            glight.innerText = match;
            wrapper.appendChild(glight);

            if (!firstMatchElement) firstMatchElement = glight;

            cursor = offset + match.length;
            return match;
        });

        // Add remaining text
        if (cursor < text.length) {
            wrapper.appendChild(document.createTextNode(text.slice(cursor)));
        }

        if (wrapper.childNodes.length > 0) {
            textNode.parentNode.replaceChild(wrapper, textNode);
        }
    });

    return firstMatchElement;
}
