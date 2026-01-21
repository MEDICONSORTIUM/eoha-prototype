const indicator = document.getElementById("scrollIndicator");

window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
        indicator.style.opacity = "0";
    } else {
        indicator.style.opacity = "1";
    }
});

document.querySelectorAll('.glow-wave span').forEach((span, i) => {
    span.style.setProperty('--i', i);
});

