(function () {
  function initAdminPage() {
    if (!window.app) {
      document.addEventListener('DOMContentLoaded', initAdminPage);
      return;
    }
    try {
      // Просто переключаемся на раздел админки и обновляем таймстамп
      if (typeof window.app.switchSection === 'function') {
        window.app.switchSection('admin');
      }
      if (typeof window.app.updateLastUpdated === 'function') {
        window.app.updateLastUpdated();
      }
    } catch (e) {
      console.error('Admin init failed:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminPage);
  } else {
    initAdminPage();
  }
})();


