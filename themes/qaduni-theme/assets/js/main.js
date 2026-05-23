// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', !isExpanded);
            navMenu.classList.toggle('active');
        });
    }
    
    // Header scroll effect (Throttled)
    const header = document.querySelector('.site-header');
    if (header) {
        let lastScroll = 0;
        let ticking = false;

        window.addEventListener('scroll', function() {
            lastScroll = window.scrollY;

            if (!ticking) {
                window.requestAnimationFrame(function() {
                    if (lastScroll > 50) {
                        header.classList.add('scrolled');
                    } else {
                        header.classList.remove('scrolled');
                    }
                    ticking = false;
                });

                ticking = true;
            }
        });
    }
    
    // Mobile dropdown handling
    const dropdownItems = document.querySelectorAll('.nav-menu li');

    dropdownItems.forEach(item => {
        const dropdown = item.querySelector('.nav-dropdown, .nav-sub-dropdown');

        if (dropdown) {
            const trigger = item.querySelector('.nav-label') || item.querySelector('a');
            if (trigger) {
                trigger.addEventListener('click', function(e) {
                    if (window.innerWidth <= 768 || trigger.tagName.toLowerCase() === 'span') {
                        e.preventDefault();
                        e.stopPropagation();
                        item.classList.toggle('dropdown-open');
                    }
                });
            }
        }
    });

    // Service worker registration (moved out of an inline <script> in
    // baseof.html so a strict CSP without 'unsafe-inline' can ship).
    // Silent on success/failure — earlier console.log/console.error noise
    // leaked the SW scope to anyone with DevTools open.
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('/sw.js').catch(function () {
                // Intentionally silent: SW failure must not surface in console.
            });
        });
    }
});
