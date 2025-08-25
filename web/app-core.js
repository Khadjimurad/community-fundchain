(function () {
  class FundChainCoreApp {
    constructor() {
      this.baseURL = 'http://localhost:8000/api/v1';
      this.autoRefreshEnabled = true;
      this.refreshInterval = 30000;
      this.refreshTimer = null;
      this.walletAddress = null;
    }

    async fetchJSON(url, options = {}) {
      try {
        const response = await fetch(`${this.baseURL}${url}`, {
          headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
          ...options
        });
        if (!response.ok) {
          let errorDetails;
          try { errorDetails = await response.json(); this.lastResponse = errorDetails; }
          catch { errorDetails = { detail: response.statusText }; this.lastResponse = errorDetails; }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        this.lastResponse = data;
        return data;
      } catch (error) {
        console.error('API request failed:', error);
        this.showError(`API Error: ${error.message}`);
        throw error;
      }
    }

    async fetchJSONSilent(url, options = {}) {
      try {
        const response = await fetch(`${this.baseURL}${url}`, {
          headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
          ...options
        });
        if (!response.ok) {
          let errorDetails;
          try { errorDetails = await response.json(); this.lastResponse = errorDetails; }
          catch { errorDetails = { detail: response.statusText }; this.lastResponse = errorDetails; }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        this.lastResponse = data;
        return data;
      } catch (error) {
        console.error('API request failed:', error);
        throw error;
      }
    }

    updateElement(id, value) {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    }

    updateLastUpdated() {
      const now = new Date();
      this.updateElement('last-updated', now.toLocaleTimeString());
    }

    formatETH(value) {
      if (typeof value !== 'number' || isNaN(value)) return '0.000';
      return value.toFixed(3);
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    normalizeProjectStatus(status) {
      if (typeof status === 'number') {
        const map = { 0: 'draft', 1: 'active', 2: 'paused', 3: 'cancelled', 4: 'ready_to_payout', 5: 'completed', 6: 'failed' };
        return map[status] || 'active';
      }
      const str = String(status ?? '').trim();
      if (/^\d+$/.test(str)) {
        const n = parseInt(str, 10);
        return this.normalizeProjectStatus(n);
      }
      const raw = str.toLowerCase();
      const compact = raw.replace(/\s+|-/g, '_');
      if (compact === 'readytopayout' || compact === 'ready_to_payout') return 'ready_to_payout';
      if (compact === 'canceled') return 'cancelled';
      if (compact === 'complete' || compact === 'completed') return 'completed';
      if (compact === 'pay' || compact === 'payed' || compact === 'paid') return 'paid';
      return compact;
    }

    getStatusBadgeClass(status) {
      const key = this.normalizeProjectStatus(status);
      const statusClasses = { 'draft': 'secondary', 'active': 'info', 'voting': 'warning', 'paused': 'warning', 'ready_to_payout': 'primary', 'paid': 'secondary', 'completed': 'success', 'cancelled': 'danger', 'failed': 'danger' };
      return statusClasses[key] || 'info';
    }

    showModal(title, body, footer = '') {
      const modal = document.getElementById('admin-modal');
      if (!modal) { console.error('Admin modal not found'); return; }
      const titleEl = document.getElementById('modal-title');
      const bodyEl = document.getElementById('modal-body');
      const footerEl = document.getElementById('modal-footer');
      if (titleEl) titleEl.textContent = title;
      if (bodyEl) bodyEl.innerHTML = body;
      if (footerEl) footerEl.innerHTML = footer || `<button class="btn btn-secondary" onclick="app.closeModal()">${i18n?.t ? i18n.t('admin_modals.messages.close') : 'Close'}</button>`;
      modal.classList.remove('hidden');
    }

    closeModal() {
      const modal = document.getElementById('admin-modal');
      if (modal) modal.classList.add('hidden');
    }

    showError(message) {
      console.error(message);
      try {
        const modal = document.getElementById('admin-modal');
        if (modal && !modal.classList.contains('hidden')) {
          const body = document.getElementById('modal-body');
          if (body) body.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i> ${message}</div>` + body.innerHTML;
        } else {
          console.error(`❌ ${message}`);
        }
      } catch (e) { console.error(`❌ ${message}`); }
    }

    showSuccess(message) {
      console.log('Success:', message);
      try {
        const modal = document.getElementById('admin-modal');
        if (modal && !modal.classList.contains('hidden')) {
          const body = document.getElementById('modal-body');
          if (body) body.innerHTML = `<div class="alert alert-success"><i class="fas fa-check-circle"></i> ${message}</div>` + body.innerHTML;
        } else {
          console.log(`✅ ${message}`);
        }
      } catch (e) { console.log(`✅ ${message}`); }
    }

    displayAdminContent(title, content) {
      const t = document.getElementById('admin-content-title');
      const b = document.getElementById('admin-content-body');
      if (t) t.textContent = title;
      if (b) b.innerHTML = content;
    }

    async performExport(endpoint, filename, format = 'csv') {
      try {
        const params = new URLSearchParams();
        params.append('format', format);
        const response = await fetch(`${this.baseURL}${endpoint}?${params.toString()}`);
        if (!response.ok) throw new Error(`${response.statusText}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.showSuccess(`${filename} ${i18n?.t ? i18n.t('admin_modals.messages.exported_successfully') : 'exported successfully'}`);
      } catch (error) {
        console.error('Export failed:', error);
        this.showError(`${i18n?.t ? i18n.t('admin_modals.messages.failed_to_export') : 'Failed to export'} ${filename}`);
      }
    }

    // No-op for pages without full section system
    switchSection() {}

    // Auto-refresh helpers (page-level responsibility to define callback)
    startAutoRefresh(callback) {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }
      if (this.autoRefreshEnabled && typeof callback === 'function') {
        this.refreshTimer = setInterval(() => {
          try { callback(); this.updateLastUpdated(); } catch (e) { console.error(e); }
        }, this.refreshInterval);
      }
    }

    stopAutoRefresh() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }
    }

    toggleAutoRefresh() {
      this.autoRefreshEnabled = !this.autoRefreshEnabled;
      const toggleButton = document.getElementById('auto-refresh-toggle');
      const icon = '🔄';
      if (this.autoRefreshEnabled) {
        this.updateAutoRefreshToggle();
      } else {
        this.stopAutoRefresh();
        if (toggleButton) {
          toggleButton.className = 'btn btn-secondary disabled';
          toggleButton.title = (window.i18n?.t ? i18n.t('controls.auto_refresh_disabled') : 'Auto refresh disabled');
          toggleButton.innerHTML = icon;
        }
      }
      console.log('Auto refresh:', this.autoRefreshEnabled ? 'enabled' : 'disabled');
    }

    updateAutoRefreshToggle() {
      const toggleButton = document.getElementById('auto-refresh-toggle');
      if (toggleButton) {
        const icon = '🔄';
        if (this.autoRefreshEnabled) {
          toggleButton.className = 'btn btn-secondary enabled';
          toggleButton.title = (window.i18n?.t ? i18n.t('controls.auto_refresh_enabled') : 'Auto refresh enabled');
        } else {
          toggleButton.className = 'btn btn-secondary disabled';
          toggleButton.title = (window.i18n?.t ? i18n.t('controls.auto_refresh_disabled') : 'Auto refresh disabled');
        }
        toggleButton.innerHTML = icon;
      }
    }

    // Lazy-load full app (app.js) on-demand for admin actions
    async lazyLoadFullApp() {
      if (window.__fullAppLoaded) return;
      if (document.getElementById('full-app-script')) {
        await this.waitForFullApp();
        return;
      }
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = './app.js?v=1.4.24';
        s.id = 'full-app-script';
        s.async = true;
        s.onload = () => resolve();
        s.onerror = (e) => reject(new Error('Failed to load app.js'));
        document.body.appendChild(s);
      });
      await this.waitForFullApp();
    }

    async waitForFullApp() {
      const isReady = () => window.app && typeof window.app.showProjectForm === 'function';
      const start = Date.now();
      while (!isReady()) {
        if (Date.now() - start > 10000) throw new Error('Timeout waiting for full app');
        await new Promise(r => setTimeout(r, 50));
      }
      window.__fullAppLoaded = true;
      if (typeof window.app.switchSection === 'function') {
        try { window.app.switchSection('admin'); } catch (_) {}
      }
    }

    registerLazyAdminMethods() {
      const methodNames = [
        'showProjectForm', 'manageCategories', 'showProjectsAdmin',
        'showMintSBTForm', 'manageWeights', 'showMembersAdmin',
        'showStartVotingForm', 'showVotingConfig', 'showVotingHistory',
        'reindexBlockchain', 'showSystemConfig', 'showLogsAdmin',
        'exportAllDonations', 'exportAllAllocations', 'exportVotingResults', 'exportComprehensiveReport',
        'generateProjectAnalytics', 'generateVotingAnalytics', 'generateTreasuryAnalytics', 'generatePrivacyReport',
        'showExportOptions', 'viewProject', 'supportProject'
      ];
      methodNames.forEach(name => {
        if (typeof this[name] === 'function') return; // don't override if exists
        this[name] = async (...args) => {
          await this.lazyLoadFullApp();
          if (window.app && typeof window.app[name] === 'function') {
            return window.app[name](...args);
          }
          throw new Error(`Method ${name} not available`);
        };
      });
    }
  }

  window.app = new FundChainCoreApp();
  if (typeof window.app.registerLazyAdminMethods === 'function') {
    window.app.registerLazyAdminMethods();
  }
})();


