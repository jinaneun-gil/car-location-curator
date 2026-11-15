// Small local icon set: no CDN, font download or network required.
(function () {
  const paths = {
    route: '<path d="M3 18l5-6 5 3 6-9"/><circle cx="19" cy="5" r="3"/><circle cx="3" cy="19" r="1"/>',
    map: '<path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3zM9 3v15M15 6v15"/>',
    grid: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/>',
    audio: '<path d="M4 10v4M8 6v12M12 3v18M16 6v12M20 10v4"/>',
    phone: '<path d="M5 3h4l2 5-3 2a14 14 0 006 6l2-3 5 2v4c0 2-2 3-4 2C10 19 5 14 3 7c-1-2 0-4 2-4z"/>',
    wind: '<path d="M3 8h12c4 0 4-5 1-5-2 0-3 1-3 2M3 12h16c4 0 4 6 0 6M3 16h7c4 0 4 5 1 5"/>',
    go: '<path d="M5 20v-8a5 5 0 015-5h10M15 2l5 5-5 5"/>',
    next: '<path d="M5 5l10 7-10 7zM19 5v14"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0014 0v-2M12 19v3M8 22h8"/>',
    stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
    pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1114 0z"/><circle cx="12" cy="9" r="2"/>',
    ticket: '<path d="M3 7h18v4a2 2 0 000 4v4H3v-4a2 2 0 000-4V7zM15 7v2M15 12v2M15 17v2"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    check: '<path d="M5 12l4 4L20 5"/>',
    shield: '<path d="M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4zM8 12l3 3 5-6"/>',
  };
  App.icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.pin}</svg>`;
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = App.icon(el.dataset.icon); });
  document.getElementById('brandIcon').innerHTML = App.icon('route');
})();
