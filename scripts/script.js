/**
 * Earth Observation Health Analytics Platform
 * Script: Scroll-driven card stack and progress bar
 */

// ==================== DOM ELEMENTS ====================
const scroll_indicator = document.getElementById("scrollIndicator");
const cards = document.querySelectorAll('.content-card');
const stack_section = document.querySelector('.stack-section');
const progress_bar = document.getElementById('progressBar');

// ==================== HELPER FUNCTIONS ====================

/**
 * update_card_stack_and_progress()
 * --------------------------------
 * Calculates scroll progress inside the stack section,
 * updates the vertical progress bar, and applies 'above'/'active'/'below'
 * classes to each card.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function update_card_stack_and_progress() {
    // 1. Header fade (scroll indicator)
    if (scroll_indicator) {
        scroll_indicator.style.opacity = window.scrollY > 50 ? "0" : "1";
    }

    // 2. Card stack progress – only if stack section exists
    if (!stack_section) return;

    const section_rect = stack_section.getBoundingClientRect();
    const section_top = section_rect.top;

    // Total scroll distance available inside the stack section
    const max_scroll = stack_section.offsetHeight - window.innerHeight;

    // How far we've scrolled INTO the section
    let current_scroll = -section_top;
    current_scroll = Math.min(Math.max(current_scroll, 0), max_scroll);

    // Progress 0.0 to 1.0
    let progress = current_scroll / max_scroll;

    // Update progress bar height
    if (progress_bar) {
        progress_bar.style.height = `${Math.min(progress * 100, 100)}%`;
    }

    // Determine active card index
    let active_index = Math.floor(progress * cards.length);
    active_index = Math.min(Math.max(active_index, 0), cards.length - 1);

    // Apply classes to each card
    cards.forEach((card, i) => {
        card.classList.remove('above', 'active', 'below');

        if (i < active_index) {
            card.classList.add('above');
        } else if (i === active_index) {
            card.classList.add('active');
        } else {
            card.classList.add('below');
        }
    });
}

/**
 * init_glow_wave_delays()
 * -----------------------
 * Sets CSS custom property '--i' on each letter span of the .glow-wave
 * to create staggered animation delays.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function init_glow_wave_delays() {
    document.querySelectorAll('.glow-wave span').forEach((span, i) => {
        span.style.setProperty('--i', i);
    });
}

/**
 * init_scroll_listeners()
 * -----------------------
 * Attaches scroll and resize event listeners with passive/RAF optimisations.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function init_scroll_listeners() {
    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                update_card_stack_and_progress();
                ticking = false;
            });
            ticking = true;
        }
    });

    window.addEventListener('resize', () => {
        // Recalculate everything on window resize
        update_card_stack_and_progress();
    });
}

// ==================== INITIALISATION ====================
init_glow_wave_delays();
init_scroll_listeners();
update_card_stack_and_progress();   // set initial state