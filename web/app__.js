// FundChain Frontend Application
// Comprehensive JavaScript for the Traceable Community Fund MVP

class FundChainApp {
  constructor() {
    this.baseURL = 'http://localhost:8000/api/v1';
    this.currentSection = 'dashboard';
    this.refreshInterval = 30000; // 30 seconds
    this.refreshTimer = null;
    this.votingTimer = null;
    this.walletAddress = null;
    this.autoRefreshEnabled = true; // Новое свойство
    
    this.init();
  }

  // Initialize the application
  init() {
    console.log('FundChainApp initializing...');
    this.setupEventListeners();
    this.loadInitialData();
    this.startAutoRefresh();
    
    // Ожидаем инициализации i18n перед обновлением переключателя
    setTimeout(() => {
      this.updateAutoRefreshToggle();
    }, 100);
    
    console.log('FundChain App initialized successfully');
  }

  // Setup event listeners
  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = e.target.dataset.section;
        this.switchSection(section);
      });
    });

    // Filters
    const categoryFilter = document.getElementById('category-filter');
    const statusFilter = document.getElementById('status-filter');
    
    if (categoryFilter) {
      categoryFilter.addEventListener('change', () => this.loadProjects());
    }
    
    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.loadProjects());
    }

    // Wallet address input
    const walletInput = document.getElementById('wallet-address');
    if (walletInput) {
      walletInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.loadPersonalStats();
        }
      });
    }
    
    // Language change event
    window.addEventListener('languageChanged', () => {
      this.updateAutoRefreshToggle();
    });
  }

  // Section switching
  switchSection(sectionName) {
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
      section.classList.add('hidden');
    });

    // Show selected section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
      targetSection.classList.remove('hidden');
      this.currentSection = sectionName;
      
      // Load section-specific data
      this.loadSectionData(sectionName);
    }
  }

  // Load data for specific section
  loadSectionData(section) {
    switch (section) {
      case 'dashboard':
        this.loadDashboard();
        break;
      case 'projects':
        this.loadProjectsSection();
        break;
      case 'voting':
        this.loadVotingSection();
        break;
      case 'treasury':
        this.loadTreasurySection();
        break;
      case 'personal':
        if (this.walletAddress) {
          this.loadPersonalStats();
        }
        break;
      case 'admin':
        this.loadAdminSection();
        break;
    }
  }

  // API helper function
  async fetchJSON(url, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        // Try to get the error details from the response
        let errorDetails;
        try {
          errorDetails = await response.json();
          this.lastResponse = errorDetails; // Store for error handling
        } catch {
          errorDetails = { detail: response.statusText };
          this.lastResponse = errorDetails;
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      this.lastResponse = data; // Store successful response
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      this.showError(`API Error: ${error.message}`);
      throw error;
    }
  }

  // API helper function that doesn't show generic error messages (for specific error handling)
  async fetchJSONSilent(url, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        // Try to get the error details from the response
        let errorDetails;
        try {
          errorDetails = await response.json();
          this.lastResponse = errorDetails; // Store for error handling
        } catch {
          errorDetails = { detail: response.statusText };
          this.lastResponse = errorDetails;
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      this.lastResponse = data; // Store successful response
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      // Note: No generic error message shown - let caller handle it
      throw error;
    }
  }

  // Load initial data
  async loadInitialData() {
    try {
      await this.loadDashboard();
      this.updateLastUpdated();
    } catch (error) {
      console.error('Failed to load initial data:', error);
      this.showError('Failed to connect to API. Please check if the backend is running.');
    }
  }

  // Dashboard functions
  async loadDashboard() {
    try {
      // Load treasury stats
      const treasuryStats = await this.fetchJSON('/treasury/stats');
      this.updateTreasuryMetrics(treasuryStats);
      
      // Load projects
      await this.loadProjects();
      
      // Load overview stats
      const overviewStats = await this.fetchJSON('/stats/overview');
      this.updateOverviewMetrics(overviewStats);
      
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  }

  // Update treasury metrics
  updateTreasuryMetrics(stats) {
    this.updateElement('treasury-balance', this.formatETH(stats.total_balance));
    this.updateElement('total-balance', this.formatETH(stats.total_balance));
    this.updateElement('total-donations', this.formatETH(stats.total_donations));
    this.updateElement('total-allocated', this.formatETH(stats.total_allocated));
    this.updateElement('total-paid-out', this.formatETH(stats.total_paid_out));
    this.updateElement('active-projects', stats.active_projects_count);
  }

  // Update overview metrics
  updateOverviewMetrics(stats) {
    if (stats.projects) {
      this.updateElement('active-projects', stats.projects.active);
      this.updateElement('soft-cap-reached', stats.projects.completed);
    }
    
    // Use real data for 7-day donations if available
    if (stats.donations_7d !== undefined) {
      this.updateElement('donations-7d', this.formatETH(stats.donations_7d));
    } else {
      // If no data available, show error instead of placeholder
      this.updateElement('donations-7d', '--');
    }
  }

  // Load and display projects
  async loadProjects() {
    try {
      const categoryFilter = document.getElementById('category-filter');
      const statusFilter = document.getElementById('status-filter');
      
      const params = new URLSearchParams();
      if (categoryFilter && categoryFilter.value) {
        params.append('category', categoryFilter.value);
      }
      if (statusFilter && statusFilter.value) {
        params.append('status', statusFilter.value);
      }
      params.append('limit', '50');
      
      const projects = await this.fetchJSON(`/projects?${params}`);
      const votes = await this.fetchJSON('/votes/priority/summary');
      
      console.log('Dashboard projects:', projects.length);
      console.log('Dashboard votes data:', votes);
      console.log('Dashboard votes length:', votes ? votes.length : 0);
      
      this.displayProjects(projects, votes);
      
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }

  // Display projects in the table
  displayProjects(projects, votes) {
    const tbody = document.getElementById('projects-tbody');
    if (!tbody) return;
    
    // Create vote lookup
    const votesById = {};
    votes.forEach(vote => {
      votesById[vote.project_id] = vote;
    });
    
    tbody.innerHTML = '';
    
    if (projects.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No projects found</td></tr>';
      return;
    }
    
    projects.forEach(project => {
      const vote = votesById[project.id] || {
        for_weight: 0,
        against_weight: 0,
        abstained_count: 0,
        not_participating_count: 0,
        turnout_percentage: 0
      };
      
      const progressPercent = (project.total_allocated / project.target * 100).toFixed(1);
      const lacking = Math.max(0, project.target - project.total_allocated);
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div><strong><a href="#" onclick="app.viewProject('${project.id}'); return false;" style="text-decoration: none; color: #007bff;">${this.escapeHtml(project.name)}</a></strong></div>
          <div class="text-muted" style="font-size: 0.875rem;">${this.escapeHtml(project.category)}</div>
          <span class="badge badge-${this.getStatusBadgeClass(project.status)}">${project.status}</span>
        </td>
        <td class="text-center">${project.priority || '-'}</td>
        <td>
          <div class="mb-1">${this.formatETH(project.total_allocated)} / ${this.formatETH(project.target)} ETH</div>
          <div class="progress">
            <div class="progress-bar" style="width: ${Math.min(100, progressPercent)}%"></div>
          </div>
          <div class="text-muted" style="font-size: 0.75rem;">${progressPercent}%</div>
        </td>
        <td class="text-right">${this.formatETH(lacking)} ETH</td>
        <td class="text-center">
          <div class="vote-results">
            <span class="badge badge-success" title="For">${vote.for_weight}</span>
            <span class="badge badge-danger" title="Against">${vote.against_weight}</span>
            <span class="badge badge-info" title="Abstain">${vote.abstained_count}</span>
            <span class="badge badge-secondary" title="Not Participating">${vote.not_participating_count}</span>
          </div>
          <div class="text-muted" style="font-size: 0.75rem;">Turnout: ${vote.turnout_percentage}%</div>
        </td>
        <td class="text-center">
          ${this.calculateETA(project)}
        </td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="app.supportProject('${project.id}')">${i18n.t('buttons.support')}</button>
          <button class="btn btn-secondary btn-sm ml-2" onclick="app.viewProject('${project.id}')">${i18n.t('buttons.details')}</button>
        </td>
      `;
      
      tbody.appendChild(row);
    });
  }

  // Projects section functions
  async loadProjectsSection() {
    try {
      // Load projects with filters for main projects section
      await this.loadProjectsMain();
      
      // Load and populate filter options
      this.populateProjectFilters();
      
      // Set up filter event listeners
      this.setupProjectFilters();
      
    } catch (error) {
      console.error('Failed to load projects section:', error);
    }
  }

  // Load and display projects in main projects section
  async loadProjectsMain() {
    try {
      const categoryFilter = document.getElementById('project-category-filter');
      const statusFilter = document.getElementById('project-status-filter');
      
      const params = new URLSearchParams();
      if (categoryFilter && categoryFilter.value) {
        params.append('category', categoryFilter.value);
      }
      if (statusFilter && statusFilter.value) {
        params.append('status', statusFilter.value);
      }
      params.append('limit', '50');
      
      const projects = await this.fetchJSON(`/projects?${params}`);
      const votes = await this.fetchJSON('/votes/priority/summary');
      
      this.displayProjectsMain(projects, votes);
      
    } catch (error) {
      console.error('Failed to load projects for main section:', error);
    }
  }

  // Display projects in the main projects section table
  displayProjectsMain(projects, votes) {
    const tbody = document.getElementById('projects-main-tbody');
    if (!tbody) return;
    
    // Create vote lookup
    const votesById = {};
    votes.forEach(vote => {
      votesById[vote.project_id] = vote;
    });
    
    tbody.innerHTML = '';
    
    if (projects.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No projects found</td></tr>';
      return;
    }
    
    projects.forEach(project => {
      const vote = votesById[project.id] || {
        for_weight: 0,
        against_weight: 0,
        abstained_count: 0,
        not_participating_count: 0,
        turnout_percentage: 0
      };
      
      const progressPercent = (project.total_allocated / project.target * 100).toFixed(1);
      const lacking = Math.max(0, project.target - project.total_allocated);
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div><strong><a href="#" onclick="app.viewProject('${project.id}'); return false;" style="text-decoration: none; color: #007bff;">${this.escapeHtml(project.name)}</a></strong></div>
          <div class="text-muted" style="font-size: 0.875rem;">${this.escapeHtml(project.category)}</div>
          <span class="badge badge-${this.getStatusBadgeClass(project.status)}">${project.status}</span>
        </td>
        <td class="text-center">${project.priority || '-'}</td>
        <td>
          <div class="mb-1">${this.formatETH(project.total_allocated)} / ${this.formatETH(project.target)} ETH</div>
          <div class="progress">
            <div class="progress-bar" style="width: ${Math.min(100, progressPercent)}%"></div>
          </div>
          <div class="text-muted" style="font-size: 0.75rem;">${progressPercent}%</div>
        </td>
        <td class="text-right">${this.formatETH(lacking)} ETH</td>
        <td class="text-center">
          <div class="vote-results">
            <span class="badge badge-success" title="For">${vote.for_weight}</span>
            <span class="badge badge-danger" title="Against">${vote.against_weight}</span>
            <span class="badge badge-info" title="Abstain">${vote.abstained_count}</span>
            <span class="badge badge-secondary" title="Not Participating">${vote.not_participating_count}</span>
          </div>
          <div class="text-muted" style="font-size: 0.75rem;">Turnout: ${vote.turnout_percentage}%</div>
        </td>
        <td class="text-center">
          ${this.calculateETA(project)}
        </td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="app.supportProject('${project.id}')">${i18n.t('buttons.support')}</button>
          <button class="btn btn-secondary btn-sm ml-2" onclick="app.viewProject('${project.id}')">${i18n.t('buttons.details')}</button>
        </td>
      `;
      
      tbody.appendChild(row);
    });
  }

  // Populate project filter options
  populateProjectFilters() {
    const categoryFilter = document.getElementById('project-category-filter');
    const statusFilter = document.getElementById('project-status-filter');
    
    if (categoryFilter) {
      // Add common categories
      const categories = ['healthcare', 'education', 'infrastructure', 'environment', 'social', 'culture'];
      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        categoryFilter.appendChild(option);
      });
    }
    
    if (statusFilter) {
      // Add common statuses
      const statuses = ['active', 'voting', 'ready_to_payout', 'paid', 'cancelled'];
      statuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status.replace('_', ' ').toUpperCase();
        statusFilter.appendChild(option);
      });
    }
  }

  // Set up project filter event listeners
  setupProjectFilters() {
    const categoryFilter = document.getElementById('project-category-filter');
    const statusFilter = document.getElementById('project-status-filter');
    const periodFilter = document.getElementById('project-period-filter');
    
    [categoryFilter, statusFilter, periodFilter].forEach(filter => {
      if (filter) {
        filter.addEventListener('change', () => {
          // Reload projects for the current section
          if (this.currentSection === 'projects') {
            this.loadProjectsMain();
          } else {
            this.loadProjects();
          }
        });
      }
    });
  }

  // Voting section functions
  async loadVotingSection() {
    try {
      // Load current voting round info
      const currentRound = await this.fetchJSON('/votes/current-round');
      console.log('Current round data:', currentRound);
      this.displayCurrentVotingRound(currentRound);
      
      // Load voting results
      const votingResults = await this.fetchJSON('/votes/priority/summary');
      console.log('Voting results data:', votingResults);
      console.log('Voting results length:', votingResults ? votingResults.length : 0);
      this.displayVotingResults(votingResults);
      
      // Start voting timer if in active phase
      if (currentRound.phase === 'commit' || currentRound.phase === 'reveal') {
        this.startVotingTimer(currentRound);
      }
      
    } catch (error) {
      console.error('Failed to load voting section:', error);
    }
  }

  // Display current voting round information
  displayCurrentVotingRound(roundInfo) {
    this.updateElement('current-round', roundInfo.round_id || 'N/A');
    this.updateElement('voting-phase', this.getPhaseDisplayName(roundInfo.phase));
    this.updateElement('total-participants', roundInfo.total_participants || 0);
    this.updateElement('total-revealed', roundInfo.total_revealed || 0);
    this.updateElement('turnout-percentage', `${(roundInfo.turnout_percentage || 0).toFixed(1)}%`);
    this.updateElement('voting-method', roundInfo.counting_method || 'weighted');

    // Update voting controls based on phase
    this.updateVotingControls(roundInfo);
    
    // Update project list for voting
    if (roundInfo.projects) {
      this.displayVotingProjects(roundInfo.projects, roundInfo.phase);
    }
  }

  // Get display name for voting phase
  getPhaseDisplayName(phase) {
    const phaseNames = {
      'pending': 'Not Started',
      'commit': 'Commit Phase',
      'reveal': 'Reveal Phase',
      'pending_finalization': 'Pending Finalization',
      'finalized': 'Finalized',
      'ended': 'Ended',
      'no_active_round': 'No Active Round'
    };
    return phaseNames[phase] || phase;
  }

  // Update voting controls based on current phase
  updateVotingControls(roundInfo) {
    const commitSection = document.getElementById('commit-voting-section');
    const revealSection = document.getElementById('reveal-voting-section');
    const votingComplete = document.getElementById('voting-complete-section');
    
    // Hide all sections first
    [commitSection, revealSection, votingComplete].forEach(section => {
      if (section) section.classList.add('hidden');
    });

    // Show appropriate section based on phase
    if (roundInfo.phase === 'commit' && commitSection) {
      commitSection.classList.remove('hidden');
      this.setupCommitInterface(roundInfo);
    } else if (roundInfo.phase === 'reveal' && revealSection) {
      revealSection.classList.remove('hidden');
      this.setupRevealInterface(roundInfo);
    } else if ((roundInfo.phase === 'finalized' || roundInfo.phase === 'ended') && votingComplete) {
      votingComplete.classList.remove('hidden');
    }
  }

  // Setup commit interface
  setupCommitInterface(roundInfo) {
    const form = document.getElementById('commit-vote-form');
    if (!form) return;

    // Clear existing form
    form.innerHTML = '';
    
    // Check if user has already voted in this round
    const votingStatus = this.checkUserVotingStatus(roundInfo.round_id);
    
    if (votingStatus.hasCommitted) {
      // Show "already voted" message instead of voting form
      const alreadyVotedDiv = document.createElement('div');
      alreadyVotedDiv.className = 'alert alert-success text-center';
      alreadyVotedDiv.innerHTML = `
        <h5><i class="fas fa-check-circle"></i> Вы уже проголосовали!</h5>
        <p>Вы успешно зафиксировали свой голос в раунде #${roundInfo.round_id}.</p>
        <p class="mb-0">Ожидайте начала фазы раскрытия голосов для подтверждения вашего выбора.</p>
      `;
      form.appendChild(alreadyVotedDiv);
      return;
    }
    
    // Add instructions
    const instructions = document.createElement('div');
    instructions.className = 'alert alert-info mb-3';
    instructions.innerHTML = `
      <h6>${i18n.t('voting.commit_phase.instructions_title')}</h6>
      <p>${i18n.t('voting.commit_phase.instructions_text1')}</p>
      <p>${i18n.t('voting.commit_phase.instructions_text2')}</p>
    `;
    form.appendChild(instructions);

    // Add project voting controls
    if (roundInfo.projects) {
      roundInfo.projects.forEach((project, index) => {
        const projectVoteDiv = this.createProjectVoteControl(project, index);
        form.appendChild(projectVoteDiv);
      });
    }

    // Add salt input
    const saltDiv = document.createElement('div');
    saltDiv.className = 'form-group mt-3';
    saltDiv.innerHTML = `
      <label for="vote-salt">${i18n.t('voting.commit_phase.secret_salt_label')}</label>
      <input type="text" class="form-control" id="vote-salt" 
             value="${this.generateRandomSalt()}" readonly>
      <small class="form-text text-muted">
        ${i18n.t('voting.commit_phase.salt_description')}
      </small>
    `;
    form.appendChild(saltDiv);

    // Add submit button
    const submitDiv = document.createElement('div');
    submitDiv.className = 'text-center mt-4';
    submitDiv.innerHTML = `
      <button type="button" class="btn btn-primary btn-lg" onclick="app.submitCommitVote(${roundInfo.round_id})">
        ${i18n.t('voting.commit_phase.submit_button')}
      </button>
    `;
    form.appendChild(submitDiv);
  }

  // Create project vote control
  createProjectVoteControl(project, index) {
    const div = document.createElement('div');
    div.className = 'card mb-3';
    div.innerHTML = `
      <div class="card-body">
        <h6 class="card-title">${this.escapeHtml(project.name)}</h6>
        <p class="card-text text-muted">${this.escapeHtml(project.description.substring(0, 100))}...</p>
        <div class="form-group">
          <label>${i18n.t('voting.commit_phase.your_vote')}</label>
          <div class="btn-group btn-group-toggle d-block" data-toggle="buttons">
            <label class="btn btn-outline-success">
              <input type="radio" name="vote-${project.id}" value="for"> ${i18n.t('voting.commit_phase.for')}
            </label>
            <label class="btn btn-outline-danger">
              <input type="radio" name="vote-${project.id}" value="against"> ${i18n.t('voting.commit_phase.against')}
            </label>
            <label class="btn btn-outline-info">
              <input type="radio" name="vote-${project.id}" value="abstain"> ${i18n.t('voting.commit_phase.abstain')}
            </label>
            <label class="btn btn-outline-secondary active">
              <input type="radio" name="vote-${project.id}" value="not_participating" checked> ${i18n.t('voting.commit_phase.not_participating')}
            </label>
          </div>
        </div>
        <div class="row mt-2">
          <div class="col-sm-6">
            <small class="text-muted">${i18n.t('voting.commit_phase.target')}: ${this.formatETH(project.target)} ETH</small>
          </div>
          <div class="col-sm-6">
            <small class="text-muted">${i18n.t('voting.commit_phase.allocated')}: ${this.formatETH(project.total_allocated)} ETH</small>
          </div>
        </div>
      </div>
    `;
    return div;
  }

  // Setup reveal interface
  setupRevealInterface(roundInfo) {
    const form = document.getElementById('reveal-vote-form');
    if (!form) return;

    // Check if user has vote data to reveal
    const votingStatus = this.checkUserVotingStatus(roundInfo.round_id);
    
    if (votingStatus.hasRevealed) {
      // User has already revealed votes
      form.innerHTML = `
        <div class="alert alert-success text-center">
          <h5><i class="fas fa-check-circle"></i> Вы уже раскрыли свои голоса!</h5>
          <p>Ваши голоса успешно подтверждены и засчитаны в раунде #${roundInfo.round_id}.</p>
          <p class="mb-0">Дождитесь завершения раунда для просмотра результатов.</p>
        </div>
      `;
      return;
    }
    
    if (!votingStatus.hasCommitted) {
      // User hasn't committed a vote
      form.innerHTML = `
        <div class="alert alert-warning text-center">
          <h5><i class="fas fa-exclamation-triangle"></i> Нет голосов для раскрытия</h5>
          <p>У вас нет зафиксированных голосов в этом раунде.</p>
          <p class="mb-0">Чтобы принять участие в голосовании, дождитесь следующего раунда.</p>
        </div>
      `;
      return;
    }

    form.innerHTML = `
      <div class="alert alert-warning mb-3">
        <h6>${i18n.t('voting.reveal_phase.title')}</h6>
        <p>${i18n.t('voting.reveal_phase.instructions_text1')}</p>
        <p><strong>${i18n.t('voting.reveal_phase.warning')}</strong> ${i18n.t('voting.reveal_phase.warning_text')}</p>
      </div>
      <div class="form-group">
        <label for="reveal-salt">${i18n.t('voting.reveal_phase.salt_label')}</label>
        <input type="text" class="form-control" id="reveal-salt" 
               placeholder="${i18n.t('voting.reveal_phase.salt_placeholder')}">
      </div>
      <div id="reveal-votes-summary" class="mt-3">
        <h6>${i18n.t('voting.reveal_phase.committed_votes_title')}</h6>
        <p class="text-muted">${i18n.t('voting.reveal_phase.committed_votes_text')}</p>
      </div>
      <div class="text-center mt-4">
        <button type="button" class="btn btn-success btn-lg" onclick="app.submitRevealVote(${roundInfo.round_id})">
          ${i18n.t('voting.reveal_phase.reveal_button')}
        </button>
      </div>
    `;
  }

  // Display voting projects in the main voting table
  displayVotingProjects(projects, phase) {
    const tbody = document.getElementById('voting-projects-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (projects.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No projects in current voting round</td></tr>';
      return;
    }
    
    // Get voting results for current projects
    this.fetchJSON('/votes/priority/summary')
      .then(votingResults => {
        console.log('Voting projects results:', votingResults);
        
        // Create vote lookup
        const votesById = {};
        if (votingResults && votingResults.length > 0) {
          votingResults.forEach(vote => {
            votesById[vote.project_id] = vote;
          });
        }
        
        projects.forEach(project => {
          const vote = votesById[project.id] || {
            for_weight: 0,
            against_weight: 0,
            abstained_count: 0,
            not_participating_count: 0,
            turnout_percentage: 0
          };
          
          const progressPercent = (project.total_allocated / project.target * 100).toFixed(1);
          
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>
              <div><strong><a href="#" onclick="app.viewProject('${project.id}'); return false;" style="text-decoration: none; color: #007bff;">${this.escapeHtml(project.name)}</a></strong></div>
              <div class="text-muted" style="font-size: 0.875rem;">${this.escapeHtml(project.category)}</div>
            </td>
            <td>
              <div class="mb-1">${this.formatETH(project.total_allocated)} / ${this.formatETH(project.target)} ETH</div>
              <div class="progress">
                <div class="progress-bar" style="width: ${Math.min(100, progressPercent)}%"></div>
              </div>
              <div class="text-muted" style="font-size: 0.75rem;">${progressPercent}%</div>
            </td>
            <td class="text-center">
              <span class="badge badge-info">${phase}</span>
            </td>
            <td class="text-center">
              <div class="vote-results">
                <span class="badge badge-success" title="За">${vote.for_weight}</span>
                <span class="badge badge-danger" title="Против">${vote.against_weight}</span>
                <span class="badge badge-info" title="Воздержался">${vote.abstained_count}</span>
                <span class="badge badge-secondary" title="Не участвует">${vote.not_participating_count}</span>
              </div>
              <div class="text-muted" style="font-size: 0.75rem;">Явка: ${vote.turnout_percentage}%</div>
            </td>
            <td>
              <button class="btn btn-info btn-sm" onclick="app.viewProject('${project.id}')">
                Подробно
              </button>
            </td>
          `;
          
          tbody.appendChild(row);
        });
      })
      .catch(error => {
        console.error('Error loading voting results for projects:', error);
        // Fallback without voting results
        projects.forEach(project => {
          const progressPercent = (project.total_allocated / project.target * 100).toFixed(1);
          
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>
              <div><strong><a href="#" onclick="app.viewProject('${project.id}'); return false;" style="text-decoration: none; color: #007bff;">${this.escapeHtml(project.name)}</a></strong></div>
              <div class="text-muted" style="font-size: 0.875rem;">${this.escapeHtml(project.category)}</div>
            </td>
            <td>
              <div class="mb-1">${this.formatETH(project.total_allocated)} / ${this.formatETH(project.target)} ETH</div>
              <div class="progress">
                <div class="progress-bar" style="width: ${Math.min(100, progressPercent)}%"></div>
              </div>
              <div class="text-muted" style="font-size: 0.75rem;">${progressPercent}%</div>
            </td>
            <td class="text-center">
              <span class="badge badge-info">${phase}</span>
            </td>
            <td class="text-center">
              <div class="text-muted">Ожидание результатов</div>
            </td>
            <td>
              <button class="btn btn-info btn-sm" onclick="app.viewProject('${project.id}')">
                Подробно
              </button>
            </td>
          `;
          
          tbody.appendChild(row);
        });
      });
  }

  // Display voting results
  displayVotingResults(results) {
    console.log('displayVotingResults called with:', results);
    const tbody = document.getElementById('voting-results-tbody');
    if (!tbody) {
      console.error('voting-results-tbody element not found');
      return;
    }
    
    tbody.innerHTML = '';
    
    if (!results || results.length === 0) {
      console.log('No voting results, showing empty message');
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Результаты голосования пока недоступны</td></tr>';
      return;
    }
    
    console.log(`Displaying ${results.length} voting results`);
    results.forEach((result, index) => {
      console.log(`Processing result ${index}:`, result);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${result.project_id ? result.project_id.substring(0, 8) + '...' : 'N/A'}</td>
        <td class="text-center">
          <span class="badge badge-success">${result.for_weight || 0}</span>
        </td>
        <td class="text-center">
          <span class="badge badge-danger">${result.against_weight || 0}</span>
        </td>
        <td class="text-center">
          <span class="badge badge-info">${result.abstained_count || 0}</span>
        </td>
        <td class="text-center">
          <span class="badge badge-secondary">${result.not_participating_count || 0}</span>
        </td>
        <td class="text-center">${result.turnout_percentage || 0}%</td>
        <td class="text-center">
          <strong>${result.final_priority || (index + 1)}</strong>
        </td>
      `;
      
      tbody.appendChild(row);
    });
    console.log('Voting results displayed successfully');
  }

  // Treasury section functions
  async loadTreasurySection() {
    try {
      const stats = await this.fetchJSON('/treasury/stats');
      this.updateTreasuryMetrics(stats);
      
      // Load recent transactions
      const transactions = await this.fetchJSON('/treasury/transactions?limit=50');
      this.displayTreasuryTransactions(transactions);
      
    } catch (error) {
      console.error('Failed to load treasury section:', error);
    }
  }

  // Display treasury transactions
  async showSystemConfig() {
    const modalTitle = i18n.t('admin_modals.system_config.title');
    const modalBody = `
      <div class="form-section">
        <h5>${i18n.t('admin_modals.system_config.smart_contract_addresses')}</h5>
        <div class="form-group">
          <label for="treasury-address">${i18n.t('admin_modals.system_config.treasury_contract')}</label>
          <input type="text" class="form-control" id="treasury-address" value="0x..." readonly>
        </div>
        <div class="form-group">
          <label for="ballot-address">${i18n.t('admin_modals.system_config.ballot_contract')}</label>
          <input type="text" class="form-control" id="ballot-address" value="0x..." readonly>
        </div>
        <div class="form-group">
          <label for="sbt-address">${i18n.t('admin_modals.system_config.sbt_contract')}</label>
          <input type="text" class="form-control" id="sbt-address" value="0x..." readonly>
        </div>
      </div>
      
      <div class="form-section">
        <h5>${i18n.t('admin_modals.system_config.system_parameters')}</h5>
        <div class="form-row">
          <div class="form-group">
            <label for="k-anonymity">${i18n.t('admin_modals.system_config.k_anonymity_threshold')}</label>
            <input type="number" class="form-control" id="k-anonymity" value="5" min="2">
          </div>
          <div class="form-group">
            <label for="max-export">${i18n.t('admin_modals.system_config.max_export_records')}</label>
            <input type="number" class="form-control" id="max-export" value="10000" min="100">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="default-commit-duration">${i18n.t('admin_modals.system_config.default_commit_duration')}</label>
            <input type="number" class="form-control" id="default-commit-duration" value="168" min="1">
          </div>
          <div class="form-group">
            <label for="default-reveal-duration">${i18n.t('admin_modals.system_config.default_reveal_duration')}</label>
            <input type="number" class="form-control" id="default-reveal-duration" value="72" min="1">
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h5>${i18n.t('admin_modals.system_config.security_settings')}</h5>
        <div class="checkbox-group">
          <input type="checkbox" id="enable-privacy-filters" checked>
          <label for="enable-privacy-filters">${i18n.t('admin_modals.system_config.enable_privacy_filters')}</label>
        </div>
        <div class="checkbox-group">
          <input type="checkbox" id="require-sbt-voting" checked>
          <label for="require-sbt-voting">${i18n.t('admin_modals.system_config.require_sbt_voting')}</label>
        </div>
        <div class="checkbox-group">
          <input type="checkbox" id="enable-auto-finalization">
          <label for="enable-auto-finalization">${i18n.t('admin_modals.system_config.enable_auto_finalization')}</label>
        </div>
      </div>
    `;
    
    const modalFooter = `
      <button class="btn btn-secondary" onclick="app.closeModal()">${i18n.t('buttons.cancel')}</button>
      <button class="btn btn-primary" onclick="app.saveSystemConfig()">${i18n.t('admin_modals.system_config.save_configuration')}</button>
    `;
    
    this.showModal(modalTitle, modalBody, modalFooter);
  }

  displayAdminContent(title, content) {
    document.getElementById('admin-content-title').textContent = title;
    document.getElementById('admin-content-body').innerHTML = content;
  }

  // Функция для обновления интерфейса голосования
  async refreshVotingSection() {
    try {
      console.log('Refreshing voting section...');
      
      // Обновляем информацию о текущем раунде
      const currentRound = await this.fetchJSON('/votes/current-round');
      this.displayCurrentVotingRound(currentRound);
      
      // Обновляем результаты голосования
      const votingResults = await this.fetchJSON('/votes/priority/summary');
      this.displayVotingResults(votingResults);
      
      console.log('Voting section refreshed successfully');
    } catch (error) {
      console.error('Error refreshing voting section:', error);
    }
  }

  async editCategory(categoryName) {
    // Show error instead of simulated success
    this.showError(`Функция редактирования категории "${categoryName}" не реализована. Требуется настройка API.`);
  }

  async deleteCategory(categoryName) {
    // Show confirmation dialog
    const confirmMessage = `${i18n.t('admin_modals.messages.delete_category_confirm')} "${categoryName}"?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    // Show error instead of simulated success
    this.showError(`Функция удаления категории "${categoryName}" не реализована. Требуется настройка API.`);
    
    // Refresh the categories modal
    this.manageCategories();
  }

  async addCategory() {
    const name = document.getElementById('new-category-name').value;
    const limit = document.getElementById('new-category-limit').value;
    
    if (!name) {
      this.showError(i18n.t('admin_modals.messages.category_name_required'));
      return;
    }
    
    // Show error instead of simulated success
    this.showError(`Функция добавления категории "${name}" не реализована. Требуется настройка API.`);
    
    // Clear the form
    document.getElementById('new-category-name').value = '';
    
    // Refresh the categories modal
    this.manageCategories();
  }

  async submitMintSBT() {
    const recipient = document.getElementById('sbt-recipient').value;
    const donationAmount = document.getElementById('sbt-donation-amount').value;
    const weightMode = document.getElementById('weight-mode').value;
    
    if (!recipient || !donationAmount) {
      this.showError(i18n.t('admin_modals.messages.fill_required_fields'));
      return;
    }
    
    // Show error instead of simulated success
    this.showError('Функция минтинга SBT не реализована. Требуется настройка API.');
    this.closeModal();
  }

  async submitStartVoting() {
    const selectedProjects = Array.from(document.querySelectorAll('.voting-project:checked')).map(cb => cb.value);
    const commitDuration = document.getElementById('commit-duration')?.value || 168;
    const revealDuration = document.getElementById('reveal-duration')?.value || 72;
    const countingMethod = document.getElementById('counting-method')?.value || 'borda';
    const autoCancellation = document.getElementById('auto-cancellation')?.checked || false;
    const cancellationThreshold = document.getElementById('cancellation-threshold')?.value || 25;
    
    if (selectedProjects.length === 0) {
      this.showError(i18n.t('admin_modals.messages.select_at_least_one_project'));
      return;
    }
    
    try {
      // Показываем индикатор загрузки
      const submitButton = document.querySelector('button[onclick="app.submitStartVoting()"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Запуск...';
      }
      
      // Формируем данные для отправки
      const votingData = {
        projects: selectedProjects,
        commit_duration_hours: parseInt(commitDuration),
        reveal_duration_hours: parseInt(revealDuration),
        counting_method: countingMethod,
        enable_auto_cancellation: autoCancellation,
        auto_cancellation_threshold: parseInt(cancellationThreshold)
      };
      
      console.log('Starting voting round with data:', votingData);
      
      // Пытаемся сделать API вызов (если эндпоинт существует)
      let response;
      try {
        console.log('Making API call to /admin/voting/start-round with data:', votingData);
        
        response = await this.fetchJSON('/admin/voting/start-round', {
          method: 'POST',
          body: JSON.stringify(votingData)
        });
        
        console.log('API call successful, response:', response);
      } catch (apiError) {
        console.error('API endpoint not available:', apiError);
        this.showError(`Ошибка при запуске раунда голосования: ${apiError.message}`);
        throw apiError;
      }
      
      // Показываем результат
      if (response.status === 'success' || response.round_id) {
        this.showSuccess(`Раунд голосования #${response.round_id || 'N/A'} успешно запущен с ${selectedProjects.length} проектами!`);
        
        // Обновляем интерфейс голосования
        await this.refreshVotingSection();
        
        // Закрываем модальное окно
        this.closeModal();
        
        // Переключаемся на раздел голосования для демонстрации
        this.switchSection('voting');
      } else {
        throw new Error(response.message || 'Неизвестная ошибка');
      }
      
    } catch (error) {
      console.error('Error starting voting round:', error);
      this.showError(`Ошибка запуска раунда голосования: ${error.message}`);
    } finally {
      // Восстанавливаем кнопку
      const submitButton = document.querySelector('button[onclick="app.submitStartVoting()"]');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = i18n.t('admin_modals.start_voting.start_voting_round');
      }
    }
  }

  async manageWeights() { 
    this.showError('Функция не реализована. Требуется настройка API.');
  }
  async showVotingConfig() { 
    this.showError('Функция не реализована. Требуется настройка API.');
  }
  async showLogsAdmin() { 
    this.showError('Функция не реализована. Требуется настройка API.');
  }
  // Вспомогательная функция для получения имени проекта по ID
  getProjectNameById(id) {
    // Пытаемся найти имя проекта в заголовках таблицы
    const adminContentBody = document.getElementById('admin-content-body');
    if (adminContentBody) {
      const projectRow = adminContentBody.querySelector(`button[onclick*="'${id}'"]`);
      if (projectRow) {
        const rowElement = projectRow.closest('tr');
        if (rowElement) {
          const nameCell = rowElement.querySelector('td:first-child strong');
          if (nameCell) {
            return nameCell.textContent;
          }
        }
      }
    }
    
    // Если не нашли, возвращаем сокращенный ID
    return id.length > 20 ? id.substring(0, 20) + '...' : id;
  }

  async editProject(id) { 
    this.showError('Функция редактирования проекта не реализована. Требуется настройка API.');
  }
  async pauseProject(id) { 
    this.showError('Функция приостановки проекта не реализована. Требуется настройка API.');
  }
  async cancelProject(id) { 
    // Показываем диалог подтверждения
    const projectName = this.getProjectNameById(id);
    const confirmMessage = `Вы уверены, что хотите отменить проект "${projectName}"?\n\nЭто действие нельзя отменить. Проект будет помечен как отмененный, и донаторы смогут вернуть свои средства.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      // Отправляем запрос на отмену проекта
      const response = await this.fetchJSON(`/admin/projects/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({
          reason: 'Отменен администратором через интерфейс'
        })
      });
      
      this.showSuccess(`Проект "${projectName}" успешно отменен.`);
      
      // Обновляем список проектов
      this.showProjectsAdmin();
      
    } catch (error) {
      console.error('Error canceling project:', error);
      this.showError(`Ошибка при отмене проекта: ${error.message}`);
    }
  }
  
  async deleteProject(id) {
    // Показываем диалог подтверждения
    const projectName = this.getProjectNameById(id);
    const confirmMessage = `ОПАСНО! Вы уверены, что хотите ПОЛНОСТЬЮ УДАЛИТЬ проект "${projectName}"?\n\nЭто действие НЕЛЬЗЯ ОТМЕНИТЬ!\n\nПроект будет навсегда удален из базы данных вместе со всеми данными о донатах и голосованиях.\n\nДля подтверждения введите 'DELETE' (заглавными буквами):`;
    
    const userInput = prompt(confirmMessage);
    
    if (userInput !== 'DELETE') {
      if (userInput !== null) { // Пользователь не отменил диалог
        this.showWarning('Удаление отменено. Неправильное подтверждение.');
      }
      return;
    }
    
    try {
      // Отправляем запрос на полное удаление
      const response = await this.fetchJSON(`/admin/projects/${id}`, {
        method: 'DELETE'
      });
      
      this.showSuccess(`Проект "${projectName}" полностью удален из системы.`);
      
      // Обновляем список проектов
      this.showProjectsAdmin();
      
    } catch (error) {
      console.error('Error deleting project:', error);
      this.showError(`Ошибка при удалении проекта: ${error.message}`);
    }
  }
  async updateMemberWeight(address) { 
    this.showError('Функция обновления веса участника не реализована. Требуется настройка API.');
  }
  async toggleMemberStatus(address) { 
    this.showError('Функция изменения статуса участника не реализована. Требуется настройка API.');
  }
  async viewRoundDetails(roundId) { 
    this.showError('Функция просмотра деталей раунда не реализована. Требуется настройка API.');
  }
  async exportRoundResults(roundId) { 
    this.showError('Функция экспорта результатов раунда не реализована. Требуется настройка API.');
  }
  async saveSystemConfig() { 
    try {
      // Получаем данные из формы
      const configData = {
        k_anonymity_threshold: parseInt(document.getElementById('k-anonymity')?.value || '5'),
        max_export_records: parseInt(document.getElementById('max-export')?.value || '10000'),
        default_commit_duration: parseInt(document.getElementById('default-commit-duration')?.value || '168'),
        default_reveal_duration: parseInt(document.getElementById('default-reveal-duration')?.value || '72'),
        enable_privacy_filters: document.getElementById('enable-privacy-filters')?.checked || false,
        require_sbt_voting: document.getElementById('require-sbt-voting')?.checked || false,
        enable_auto_finalization: document.getElementById('enable-auto-finalization')?.checked || false
      };
      
      const response = await this.fetchJSON('/admin/system/config', {
        method: 'POST',
        body: JSON.stringify(configData)
      });
      
      this.showSuccess('Настройки системы успешно сохранены.');
      this.closeModal();
    } catch (error) {
      console.error('Error saving system config:', error);
      this.showError(`Ошибка сохранения настроек: ${error.message}`);
    }
  }
  
  // Reset voting status for current user (for testing)
  async resetVotingStatus() {
    try {
      const currentRound = await this.fetchJSON('/votes/current-round');
      if (currentRound && currentRound.round_id) {
        this.resetUserVotingStatus(currentRound.round_id);
        alert(`Статус голосования сброшен для раунда #${currentRound.round_id}. Теперь вы можете голосовать заново.`);
      } else {
        alert('Нет активного раунда голосования.');
      }
    } catch (error) {
      console.error('Error resetting voting status:', error);
      alert('Ошибка при сбросе статуса голосования.');
    }
  }

  async startVoting() {
    this.showError('Функция запуска голосования не реализована. Требуется настройка API.');
  }
}

// Global functions for onclick handlers
window.showCreateProject = () => window.app.showProjectForm();
window.loadPersonalStats = () => window.app.loadPersonalStats();
window.exportTreasuryData = () => window.app.exportTreasuryData();
window.exportPersonalData = () => window.app.exportPersonalData();
window.showProjectForm = () => window.app.showProjectForm();
window.managecategories = () => window.app.managecategories();
window.mintSBT = () => window.app.mintSBT();
window.manageWeights = () => window.app.manageWeights();
window.startVotingRound = () => window.app.startVotingRound();
window.configureVoting = () => window.app.configureVoting();
window.reindexBlockchain = () => window.app.reindexBlockchain();
window.startVoting = () => window.app.startVoting();
window.resetVotingStatus = () => window.app.resetVotingStatus();

// Initialize the application
function initializeApp() {
  console.log('Initializing FundChain app...');
  window.app = new FundChainApp();
  console.log('App object created:', window.app);
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Handle page unload
window.addEventListener('beforeunload', () => {
  if (window.app) {
    window.app.stopAutoRefresh();
  }
});
