// Runs immediately in <head> to set the theme before body renders,
// preventing a flash of the wrong theme on page load.
(function () {
    var saved = localStorage.getItem('eoha-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
}());

function toggleTheme() {
    var html = document.documentElement;
    var next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('eoha-theme', next);
}
