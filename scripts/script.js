// ===== Glow-wave letter index =====
document.querySelectorAll('.glow-wave span').forEach((span, i) => {
    span.style.setProperty('--i', i);
});

// ===== Animated stat counters =====
function animateCounter(el, target, duration) {
    const start = performance.now();
    function step(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target);
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target;
    }
    requestAnimationFrame(step);
}

document.querySelectorAll('.stat-num').forEach(el => {
    animateCounter(el, parseInt(el.dataset.target, 10), 1800);
});

// ===== Hamburger menu =====
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');

if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
        this.classList.toggle('open');
        navLinks.classList.toggle('open');
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('open');
            navLinks.classList.remove('open');
        });
    });
}

// ===== Scroll indicator hide =====
const indicator = document.getElementById('scrollIndicator');
window.addEventListener('scroll', () => {
    if (indicator) indicator.style.opacity = window.scrollY > 50 ? '0' : '1';
}, { passive: true });

// ===== Scroll-reveal (IntersectionObserver) =====
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
