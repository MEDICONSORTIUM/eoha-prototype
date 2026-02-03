// Header Logic
const indicator = document.getElementById("scrollIndicator");

document.querySelectorAll('.glow-wave span').forEach((span, i) => {
    span.style.setProperty('--i', i);
});

// Card Stack Logic
const cards = document.querySelectorAll('.content-card');
const stackSection = document.querySelector('.stack-section');
const progressBar = document.getElementById('progressBar');

function handleScroll() {
    const scrollY = window.scrollY;

    // 1. Header fade
    if (indicator) {
        if (scrollY > 50) {
            indicator.style.opacity = "0";
        } else {
            indicator.style.opacity = "1";
        }
    }

    // 2. Card Stack Progress
    if (!stackSection) return;

    const sectionRect = stackSection.getBoundingClientRect();
    const sectionTop = sectionRect.top;
    
    // Total scroll distance available inside the stack section
    const maxScroll = stackSection.offsetHeight - window.innerHeight;
    
    // Calculate how far we've scrolled INTO the section
    let currentScroll = -sectionTop;

    // Clamp
    if (currentScroll < 0) currentScroll = 0;
    if (currentScroll > maxScroll) currentScroll = maxScroll;

    // Progress 0.0 to 1.0
    let progress = currentScroll / maxScroll;

    // Update Progress Bar
    if (progressBar) {
        progressBar.style.height = `${Math.min(progress * 100, 100)}%`;
    }

    // Determine Active Card
    let activeIndex = Math.floor(progress * cards.length);

    if (activeIndex < 0) activeIndex = 0;
    if (activeIndex >= cards.length) activeIndex = cards.length - 1;

    // Apply Classes
    cards.forEach((card, i) => {
        card.classList.remove('above', 'active', 'below');

        if (i < activeIndex) {
            card.classList.add('above');
        } else if (i === activeIndex) {
            card.classList.add('active');
        } else {
            card.classList.add('below');
        }
    });
}

window.addEventListener('scroll', handleScroll);
handleScroll();