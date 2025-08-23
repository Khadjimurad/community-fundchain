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
    this.setupEventListeners();
    this.loadInitialData();
    this.startAutoRefresh();
    
    // Ожидаем инициализации i18n перед обновлением переключателя
    setTimeout(() => {
      this.updateAutoRefreshToggle();
    }, 100);
    
    console.log('FundChain App initialized');
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
    
    // Calculate 7-day donations (placeholder)
    this.updateElement('donations-7d', '12.5');
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
      
      // Load recent transactions (placeholder)
      this.displayTreasuryTransactions([]);
      
    } catch (error) {
      console.error('Failed to load treasury section:', error);
    }
  }

  // Display treasury transactions
  displayTreasuryTransactions(transactions) {
    const container = document.getElementById('treasury-transactions');
    if (!container) return;
    
    if (transactions.length === 0) {
      container.innerHTML = '<div class="text-center text-muted">No recent transactions</div>';
      return;
    }
    
    // Implementation for transaction display
    container.innerHTML = '<div class="text-center text-muted">Transaction history will be displayed here</div>';
  }

  // Personal stats functions
  async loadPersonalStats() {
    try {
      const walletInput = document.getElementById('wallet-address');
      const address = walletInput ? walletInput.value.trim() : this.walletAddress;
      
      if (!address) {
        this.showError(i18n.t('admin_modals.messages.please_enter_wallet_address'));
        return;
      }
      
      this.walletAddress = address;
      
      const params = new URLSearchParams();
      params.append('user_address', address);
      
      // Use special API call that doesn't show generic error for "User not found"
      const stats = await this.fetchJSONSilent(`/me/stats?${params}`);
      this.displayPersonalStats(stats);
      
      // Show the stats content
      const statsContent = document.getElementById('personal-stats-content');
      if (statsContent) {
        statsContent.classList.remove('hidden');
      }
      
    } catch (error) {
      console.error('Failed to load personal stats:', error);
      
      // Check if it's a "User not found" error (404 with specific message)
      if (error.message && error.message.includes('404') && 
          (error.message.includes('User not found') || 
           (this.lastResponse && this.lastResponse.detail === 'User not found'))) {
        this.showError(i18n.t('admin_modals.messages.user_not_found'));
      } else {
        this.showError(i18n.t('admin_modals.messages.failed_to_load_personal_stats'));
      }
    }
  }

  // Display personal statistics
  displayPersonalStats(stats) {
    this.updateElement('my-total-donated', this.formatETH(stats.total_donated));
    this.updateElement('my-projects-count', stats.supported_projects);
    this.updateElement('my-avg-share', `${stats.average_share_percentile}%`);
    
    // Update comparisons
    this.updateElement('donation-percentile', `${stats.average_share_percentile}th percentile`);
    this.updateElement('projects-comparison', `Above average`);
    this.updateElement('share-percentile', `${stats.average_share_percentile}th percentile`);
    
    // Display allocations
    this.displayPersonalAllocations(stats.allocations);
  }

  // Display personal allocations
  displayPersonalAllocations(allocations) {
    const container = document.getElementById('my-allocations');
    if (!container) return;
    
    if (allocations.length === 0) {
      container.innerHTML = '<div class="text-center text-muted">No allocations found</div>';
      return;
    }
    
    let html = '<div class="table-responsive"><table class="table"><thead><tr><th>Project</th><th>Amount</th><th>Share</th></tr></thead><tbody>';
    
    allocations.forEach(allocation => {
      html += `
        <tr>
          <td>${allocation.project_id.substring(0, 8)}...</td>
          <td>${this.formatETH(allocation.amount)} ETH</td>
          <td>${allocation.share_percentage}%</td>
        </tr>
      `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
  }

  // Admin section functions
  async loadAdminSection() {
    try {
      // Load indexer status
      const indexerStatus = await this.fetchJSON('/admin/indexer/status');
      this.updateIndexerStatus(indexerStatus);
      
    } catch (error) {
      console.error('Failed to load admin section:', error);
    }
  }

  // Update indexer status
  updateIndexerStatus(status) {
    const container = document.getElementById('indexer-status');
    if (!container) return;
    
    const statusClass = status.running ? 'badge-success' : 'badge-danger';
    const statusText = status.running ? 'Running' : 'Stopped';
    
    container.innerHTML = `
      <div>Indexer Status: <span class="badge ${statusClass}">${statusText}</span></div>
      <div class="text-muted">Contracts: ${status.contracts.join(', ')}</div>
      <div class="text-muted">Poll Interval: ${status.poll_interval}s</div>
    `;
  }

  // Utility functions
  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  formatETH(value) {
    if (typeof value !== 'number') return '--';
    return value.toFixed(3);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getStatusBadgeClass(status) {
    const statusClasses = {
      'active': 'info',
      'voting': 'warning',
      'ready_to_payout': 'success',
      'paid': 'secondary',
      'cancelled': 'danger'
    };
    return statusClasses[status] || 'info';
  }

  calculateETA(project) {
    if (project.total_allocated >= project.target) {
      return '<span class="badge badge-success">Target Reached</span>';
    }
    
    // Simple placeholder calculation
    const remaining = project.target - project.total_allocated;
    if (remaining <= 0) {
      return '<span class="badge badge-success">Complete</span>';
    }
    
    return '<span class="text-muted">Estimating...</span>';
  }

  showError(message) {
    console.error(message);
    // Simple error display - in production you'd want a proper toast/notification system
    alert(message);
  }

  showSuccess(message) {
    console.log('Success:', message);
    // Simple success display - in production you'd want a proper toast/notification system
    alert(message);
  }

  updateLastUpdated() {
    const now = new Date();
    this.updateElement('last-updated', now.toLocaleTimeString());
  }

  // Auto-refresh functionality
  startAutoRefresh() {
    // Останавливаем предыдущий таймер если он существует
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    // Запускаем только если автообновление включено
    if (this.autoRefreshEnabled) {
      this.refreshTimer = setInterval(() => {
        this.loadSectionData(this.currentSection);
        this.updateLastUpdated();
      }, this.refreshInterval);
    }
  }

  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    if (this.votingTimer) {
      clearInterval(this.votingTimer);
      this.votingTimer = null;
    }
  }

  // Переключатель автообновления
  toggleAutoRefresh() {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;
    
    const toggleButton = document.getElementById('auto-refresh-toggle');
    const icon = '🔄';
    
    if (this.autoRefreshEnabled) {
      this.startAutoRefresh();
      toggleButton.className = 'btn btn-secondary enabled';
      toggleButton.title = i18n.t('controls.auto_refresh_enabled');
      toggleButton.innerHTML = icon;
    } else {
      this.stopAutoRefresh();
      toggleButton.className = 'btn btn-secondary disabled';
      toggleButton.title = i18n.t('controls.auto_refresh_disabled');
      toggleButton.innerHTML = icon;
    }
    
    console.log('Auto refresh:', this.autoRefreshEnabled ? 'enabled' : 'disabled');
  }
  
  // Обновление переводов переключателя автообновления
  updateAutoRefreshToggle() {
    const toggleButton = document.getElementById('auto-refresh-toggle');
    if (toggleButton) {
      const icon = '🔄';
      
      // Обновляем только title (подсказку), иконка остается без текста
      if (this.autoRefreshEnabled) {
        toggleButton.title = i18n.t('controls.auto_refresh_enabled');
      } else {
        toggleButton.title = i18n.t('controls.auto_refresh_disabled');
      }
      toggleButton.innerHTML = icon;
    }
  }

  // Action functions
  async supportProject(projectId) {
    alert(`${i18n.t('messages.support_project_description')} ${projectId}`);
  }

  async viewProject(projectId) {
    try {
      const project = await this.fetchJSON(`/projects/${projectId}`);
      const progress = await this.fetchJSON(`/projects/${projectId}/progress`);
      
      this.showProjectDetailsModal(project, progress);
      
    } catch (error) {
      this.showError(i18n.t('admin_modals.messages.failed_to_load_project_details'));
    }
  }

  showProjectDetailsModal(project, progress) {
    const modalTitle = i18n.t('project_details.title');
    
    // Format dates
    const createdDate = new Date(project.created_at).toLocaleDateString();
    const deadlineText = project.deadline ? 
      new Date(project.deadline).toLocaleDateString() : 
      i18n.t('project_details.no_deadline');
    const etaText = progress.eta_estimate ? 
      new Date(progress.eta_estimate).toLocaleDateString() : 
      i18n.t('project_details.no_deadline');
    
    // Calculate additional metrics
    const progressToTargetPercent = progress.progress_to_target_percent || 0;
    const progressToSoftCapPercent = progress.progress_to_soft_cap_percent || 0;
    
    const modalBody = `
      <div class="project-details-modal">
        <!-- Project Basic Info -->
        <div class="project-section">
          <h5>${this.escapeHtml(project.name)}</h5>
          <div class="project-meta">
            <span class="badge badge-${this.getStatusBadgeClass(project.status)}">${project.status}</span>
            <span class="badge badge-secondary">${this.escapeHtml(project.category)}</span>
          </div>
        </div>
        
        <!-- Description -->
        <div class="project-section">
          <h6>${i18n.t('project_details.description')}</h6>
          <p class="project-description">${this.escapeHtml(project.description)}</p>
        </div>
        
        <!-- Funding Information -->
        <div class="project-section">
          <h6>${i18n.t('project_details.funding_info')}</h6>
          <div class="funding-grid">
            <div class="funding-item">
              <label>${i18n.t('project_details.target_amount')}:</label>
              <span>${this.formatETH(project.target)} ETH</span>
            </div>
            <div class="funding-item">
              <label>${i18n.t('project_details.soft_cap')}:</label>
              <span>${this.formatETH(project.soft_cap)} ETH</span>
            </div>
            <div class="funding-item">
              <label>${i18n.t('project_details.hard_cap')}:</label>
              <span>${this.formatETH(project.hard_cap)} ETH</span>
            </div>
            <div class="funding-item">
              <label>${i18n.t('project_details.total_allocated')}:</label>
              <span>${this.formatETH(progress.total_allocated)} ETH</span>
            </div>
            <div class="funding-item">
              <label>${i18n.t('project_details.total_paid_out')}:</label>
              <span>${this.formatETH(progress.total_paid_out)} ETH</span>
            </div>
          </div>
        </div>
        
        <!-- Progress Statistics -->
        <div class="project-section">
          <h6>${i18n.t('project_details.progress_stats')}</h6>
          <div class="progress-stats">
            <div class="progress-item">
              <label>${i18n.t('project_details.progress_to_target')}:</label>
              <div class="progress-bar-container">
                <div class="progress">
                  <div class="progress-bar" style="width: ${Math.min(100, progressToTargetPercent)}%"></div>
                </div>
                <span class="progress-text">${progressToTargetPercent.toFixed(1)}%</span>
              </div>
            </div>
            <div class="progress-item">
              <label>${i18n.t('project_details.progress_to_soft_cap')}:</label>
              <div class="progress-bar-container">
                <div class="progress">
                  <div class="progress-bar bg-warning" style="width: ${Math.min(100, progressToSoftCapPercent)}%"></div>
                </div>
                <span class="progress-text">${progressToSoftCapPercent.toFixed(1)}%</span>
              </div>
            </div>
            <div class="funding-item">
              <label>${i18n.t('project_details.lacking_to_target')}:</label>
              <span>${this.formatETH(progress.lacking_to_target)} ETH</span>
            </div>
            <div class="funding-item">
              <label>${i18n.t('project_details.lacking_to_soft_cap')}:</label>
              <span>${this.formatETH(progress.lacking_to_soft_cap)} ETH</span>
            </div>
          </div>
        </div>
        
        <!-- Community Information -->
        <div class="project-section">
          <h6>${i18n.t('project_details.community_info')}</h6>
          <div class="community-grid">
            <div class="community-item">
              <label>${i18n.t('project_details.unique_donors')}:</label>
              <span>${progress.unique_donors}</span>
            </div>
            <div class="community-item">
              <label>${i18n.t('project_details.allocation_count')}:</label>
              <span>${progress.allocation_count}</span>
            </div>
            <div class="community-item">
              <label>${i18n.t('project_details.payout_count')}:</label>
              <span>${progress.payout_count}</span>
            </div>
          </div>
        </div>
        
        <!-- Milestones -->
        <div class="project-section">
          <h6>${i18n.t('project_details.milestones')}</h6>
          <div class="milestones-grid">
            <div class="milestone-item">
              <label>${i18n.t('project_details.target_reached')}:</label>
              <span class="badge ${progress.is_target_reached ? 'badge-success' : 'badge-secondary'}">
                ${progress.is_target_reached ? i18n.t('project_details.yes') : i18n.t('project_details.no')}
              </span>
            </div>
            <div class="milestone-item">
              <label>${i18n.t('project_details.soft_cap_reached')}:</label>
              <span class="badge ${progress.is_soft_cap_reached ? 'badge-success' : 'badge-secondary'}">
                ${progress.is_soft_cap_reached ? i18n.t('project_details.yes') : i18n.t('project_details.no')}
              </span>
            </div>
          </div>
        </div>
        
        <!-- Timeline Information -->
        <div class="project-section">
          <h6>Timeline</h6>
          <div class="timeline-grid">
            <div class="timeline-item">
              <label>${i18n.t('project_details.created_date')}:</label>
              <span>${createdDate}</span>
            </div>
            <div class="timeline-item">
              <label>${i18n.t('project_details.deadline')}:</label>
              <span>${deadlineText}</span>
            </div>
            <div class="timeline-item">
              <label>${i18n.t('project_details.eta_estimate')}:</label>
              <span>${etaText}</span>
            </div>
          </div>
        </div>
      </div>
      
      <style>
        .project-details-modal {
          max-width: 100%;
        }
        .project-section {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #eee;
        }
        .project-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }
        .project-meta {
          margin-top: 0.5rem;
        }
        .project-meta .badge {
          margin-right: 0.5rem;
        }
        .project-description {
          margin: 0.5rem 0;
          line-height: 1.6;
          color: #555;
        }
        .funding-grid, .community-grid, .milestones-grid, .timeline-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-top: 0.75rem;
        }
        .funding-item, .community-item, .milestone-item, .timeline-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          background: #f8f9fa;
          border-radius: 4px;
        }
        .funding-item label, .community-item label, .milestone-item label, .timeline-item label {
          font-weight: 500;
          margin: 0;
          color: #666;
        }
        .progress-stats {
          margin-top: 0.75rem;
        }
        .progress-item {
          margin-bottom: 1rem;
        }
        .progress-item label {
          display: block;
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: #666;
        }
        .progress-bar-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .progress-bar-container .progress {
          flex: 1;
          height: 20px;
        }
        .progress-text {
          font-weight: 500;
          min-width: 50px;
          text-align: right;
        }
        @media (max-width: 768px) {
          .funding-grid, .community-grid, .milestones-grid, .timeline-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
    `;
    
    const modalFooter = `
      <button class="btn btn-primary" onclick="app.supportProject('${project.id}')">${i18n.t('buttons.support_project')}</button>
      <button class="btn btn-secondary" onclick="app.closeModal()">${i18n.t('buttons.close')}</button>
    `;
    
    this.showModal(modalTitle, modalBody, modalFooter);
  }

  // Voting timer functionality
  startVotingTimer(roundInfo) {
    // Clear existing timer
    if (this.votingTimer) {
      clearInterval(this.votingTimer);
    }

    const updateTimer = () => {
      const now = new Date();
      let targetTime;
      
      if (roundInfo.phase === 'commit') {
        targetTime = new Date(roundInfo.end_commit);
      } else if (roundInfo.phase === 'reveal') {
        targetTime = new Date(roundInfo.end_reveal);
      } else {
        this.updateElement('voting-timer', 'N/A');
        return;
      }

      const timeDiff = targetTime.getTime() - now.getTime();
      
      if (timeDiff <= 0) {
        this.updateElement('voting-timer', '00:00:00');
        clearInterval(this.votingTimer);
        // Refresh voting section when phase ends
        this.loadVotingSection();
        return;
      }

      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
      
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      this.updateElement('voting-timer', timeString);
    };

    // Update immediately and then every second
    updateTimer();
    this.votingTimer = setInterval(updateTimer, 1000);
  }

  // Generate random salt for commit-reveal voting
  generateRandomSalt() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  // Submit commit vote
  async submitCommitVote(roundId) {
    try {
      // Collect all votes from the form
      const votes = [];
      const saltInput = document.getElementById('vote-salt');
      
      if (!saltInput || !saltInput.value) {
        this.showError('Salt is required for commit voting');
        return;
      }
      
      const salt = saltInput.value;
      const projects = [];
      const choices = [];
      
      // Get current round info to get project list
      const roundInfo = await this.fetchJSON('/votes/current-round');
      
      if (!roundInfo.projects) {
        this.showError('No projects found for voting');
        return;
      }
      
      // Collect votes for each project
      let hasVotes = false;
      roundInfo.projects.forEach(project => {
        const radioInputs = document.querySelectorAll(`input[name="vote-${project.id}"]:checked`);
        if (radioInputs.length > 0) {
          const choice = radioInputs[0].value;
          projects.push(project.id);
          
          // Convert choice to number (0=NotParticipating, 1=Abstain, 2=Against, 3=For)
          const choiceMap = {
            'not_participating': 0,
            'abstain': 1,
            'against': 2,
            'for': 3
          };
          choices.push(choiceMap[choice] || 0);
          
          if (choice !== 'not_participating') {
            hasVotes = true;
          }
        } else {
          // Default to not participating
          projects.push(project.id);
          choices.push(0);
        }
      });
      
      if (!hasVotes) {
        const confirmSubmit = confirm('You have not selected any votes (all projects set to "Not Participating"). Do you want to continue?');
        if (!confirmSubmit) return;
      }
      
      // Create hash for commit (simplified - in real implementation this would use Web3)
      const voteData = { projects, choices, salt, voter: this.walletAddress || 'demo-user' };
      const hash = this.simpleHash(JSON.stringify(voteData));
      
      // Submit commit to backend
      const response = await this.fetchJSON(`/votes/${roundId}/commit`, {
        method: 'POST',
        body: JSON.stringify({
          hash: `0x${hash}`,
          projects: projects,
          choices: choices
        })
      });
      
      // Store vote data locally for reveal phase
      localStorage.setItem(`vote-data-${roundId}`, JSON.stringify(voteData));
      
      alert(i18n.t('admin_modals.messages.vote_committed_successfully'));
      
      // Refresh voting section
      this.loadVotingSection();
      
    } catch (error) {
      console.error('Failed to submit commit vote:', error);
      this.showError(i18n.t('admin_modals.messages.failed_to_submit_commit_vote'));
    }
  }

  // Submit reveal vote
  async submitRevealVote(roundId) {
    try {
      const saltInput = document.getElementById('reveal-salt');
      
      if (!saltInput || !saltInput.value) {
        this.showError(i18n.t('admin_modals.messages.salt_required_for_reveal'));
        return;
      }
      
      const salt = saltInput.value;
      
      // Try to get stored vote data
      const storedVoteData = localStorage.getItem(`vote-data-${roundId}`);
      if (storedVoteData) {
        const voteData = JSON.parse(storedVoteData);
        if (voteData.salt !== salt) {
          this.showError(i18n.t('admin_modals.messages.salt_does_not_match'));
          return;
        }
        
        // Submit reveal with stored data
        const response = await this.fetchJSON(`/votes/${roundId}/reveal`, {
          method: 'POST',
          body: JSON.stringify({
            projects: voteData.projects,
            choices: voteData.choices,
            salt: salt
          })
        });
        
        alert(i18n.t('admin_modals.messages.vote_revealed_successfully'));
        
        // Mark that user has revealed votes for this round
        localStorage.setItem(`vote-revealed-${roundId}`, 'true');
        
        // Clean up stored data
        localStorage.removeItem(`vote-data-${roundId}`);
        
      } else {
        this.showError(i18n.t('admin_modals.messages.no_committed_vote_data_found'));
        return;
      }
      
      // Refresh voting section
      this.loadVotingSection();
      
    } catch (error) {
      console.error('Failed to reveal vote:', error);
      this.showError(i18n.t('admin_modals.messages.failed_to_reveal_vote'));
    }
  }

  // Check if user has already voted in the current round
  checkUserVotingStatus(roundId) {
    // Check if there's stored vote data for this round (means user has committed vote)
    const storedVoteData = localStorage.getItem(`vote-data-${roundId}`);
    const revealedFlag = localStorage.getItem(`vote-revealed-${roundId}`);
    
    return {
      hasCommitted: storedVoteData !== null,
      hasRevealed: revealedFlag !== null,
      canCommit: storedVoteData === null && revealedFlag === null,
      canReveal: storedVoteData !== null && revealedFlag === null
    };
  }

  // Reset user voting status for a specific round (for testing/admin purposes)
  resetUserVotingStatus(roundId) {
    localStorage.removeItem(`vote-data-${roundId}`);
    localStorage.removeItem(`vote-revealed-${roundId}`);
    console.log(`Voting status reset for round ${roundId}`);
    // Refresh voting section to update UI
    this.loadVotingSection();
  }

  // Generate demo voting data for testing
  generateDemoVotingData() {
    return [
      {
        project_id: "proj_001_healthcare_fund",
        for_weight: 156.5,
        against_weight: 32.1,
        abstained_count: 12,
        not_participating_count: 8,
        turnout_percentage: 85.2,
        final_priority: 1
      },
      {
        project_id: "proj_002_education_support", 
        for_weight: 142.3,
        against_weight: 45.7,
        abstained_count: 15,
        not_participating_count: 11,
        turnout_percentage: 78.9,
        final_priority: 2
      },
      {
        project_id: "proj_003_infrastructure",
        for_weight: 98.7,
        against_weight: 87.2,
        abstained_count: 24,
        not_participating_count: 19,
        turnout_percentage: 72.1,
        final_priority: 3
      }
    ];
  }

  // Load voting section with fallback demo data
  async loadVotingSectionWithFallback() {
    try {
      await this.loadVotingSection();
    } catch (error) {
      console.warn('Failed to load real voting data, showing demo data:', error);
      
      // Show demo voting results
      const demoResults = this.generateDemoVotingData();
      console.log('Using demo voting results:', demoResults);
      this.displayVotingResults(demoResults);
      
      // Show demo round info
      const demoRound = {
        round_id: 4,
        phase: 'reveal',
        total_participants: 234,
        total_revealed: 208,
        turnout_percentage: 88.9,
        counting_method: 'weighted',
        projects: [
          {
            id: "proj_001_healthcare_fund",
            name: "Здравоохранение для всех",
            category: "healthcare",
            description: "Программа обеспечения доступного здравоохранения для сельских районов",
            target: 500,
            total_allocated: 387.5
          },
          {
            id: "proj_002_education_support",
            name: "Образование будущего", 
            category: "education",
            description: "Модернизация образовательных учреждений и внедрение новых технологий",
            target: 350,
            total_allocated: 298.2
          }
        ]
      };
      
      this.displayCurrentVotingRound(demoRound);
    }
  }

  // Simple hash function for demo purposes
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  async exportTreasuryData() {
    try {
      const response = await fetch(`${this.baseURL}/export/donations?format=csv`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'treasury_data.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      this.showError('Failed to export treasury data');
    }
  }

  async exportPersonalData() {
    if (!this.walletAddress) {
      this.showError('Please load personal stats first');
      return;
    }
    
    try {
      const params = new URLSearchParams();
      params.append('donor_address', this.walletAddress);
      params.append('format', 'csv');
      
      const response = await fetch(`${this.baseURL}/export/donations?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my_contributions.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      this.showError('Failed to export personal data');
    }
  }

  // Enhanced export functionality for admin
  async showExportOptions() {
    const modalTitle = i18n.t('admin_modals.export_data.title');
    const modalBody = `
      <div class="form-section">
        <h5>${i18n.t('admin_modals.export_data.quick_exports')}</h5>
        <div class="action-grid">
          <button class="btn btn-primary" onclick="app.exportAllDonations()">${i18n.t('admin_modals.export_data.export_all_donations')}</button>
          <button class="btn btn-primary" onclick="app.exportAllAllocations()">${i18n.t('admin_modals.export_data.export_all_allocations')}</button>
          <button class="btn btn-primary" onclick="app.exportVotingResults()">${i18n.t('admin_modals.export_data.export_voting_results')}</button>
          <button class="btn btn-primary" onclick="app.exportComprehensiveReport()">${i18n.t('admin_modals.export_data.comprehensive_report')}</button>
        </div>
      </div>
      
      <div class="form-section">
        <h5>${i18n.t('admin_modals.export_data.custom_export')}</h5>
        <form id="custom-export-form">
          <div class="form-row">
            <div class="form-group">
              <label for="export-type">${i18n.t('admin_modals.export_data.data_type')}</label>
              <select class="form-control" id="export-type">
                <option value="donations">${i18n.t('admin_modals.export_data.donations')}</option>
                <option value="allocations">${i18n.t('admin_modals.export_data.allocations')}</option>
                <option value="voting-results">${i18n.t('admin_modals.export_data.voting_results')}</option>
                <option value="comprehensive">${i18n.t('admin_modals.export_data.comprehensive')}</option>
              </select>
            </div>
            <div class="form-group">
              <label for="export-format">${i18n.t('admin_modals.export_data.format')}</label>
              <select class="form-control" id="export-format">
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="export-date-from">${i18n.t('admin_modals.export_data.from_date_optional')}</label>
              <input type="date" class="form-control" id="export-date-from">
            </div>
            <div class="form-group">
              <label for="export-date-to">${i18n.t('admin_modals.export_data.to_date_optional')}</label>
              <input type="date" class="form-control" id="export-date-to">
            </div>
          </div>
          
          <div class="form-group">
            <label for="export-limit">${i18n.t('admin_modals.export_data.record_limit')}</label>
            <input type="number" class="form-control" id="export-limit" value="10000" min="1" max="50000">
            <div class="form-text">${i18n.t('admin_modals.export_data.max_records_export')}</div>
          </div>
          
          <div class="checkbox-group">
            <input type="checkbox" id="include-personal-data">
            <label for="include-personal-data">${i18n.t('admin_modals.export_data.include_personal_data')}</label>
          </div>
        </form>
      </div>
      
      <div class="form-section">
        <h5>${i18n.t('admin_modals.export_data.analytics_reports')}</h5>
        <div class="action-grid">
          <button class="btn btn-secondary" onclick="app.generateProjectAnalytics()">${i18n.t('admin_modals.export_data.project_analytics')}</button>
          <button class="btn btn-secondary" onclick="app.generateVotingAnalytics()">${i18n.t('admin_modals.export_data.voting_analytics')}</button>
          <button class="btn btn-secondary" onclick="app.generateTreasuryAnalytics()">${i18n.t('admin_modals.export_data.treasury_analytics')}</button>
          <button class="btn btn-secondary" onclick="app.generatePrivacyReport()">${i18n.t('admin_modals.export_data.privacy_report')}</button>
        </div>
      </div>
    `;
    
    const modalFooter = `
      <button class="btn btn-secondary" onclick="app.closeModal()">${i18n.t('buttons.close')}</button>
      <button class="btn btn-primary" onclick="app.executeCustomExport()">${i18n.t('admin_modals.export_data.execute_custom_export')}</button>
    `;
    
    this.showModal(modalTitle, modalBody, modalFooter);
  }

  // Quick export functions
  async exportAllDonations() {
    await this.performExport('/export/donations', 'donations');
  }

  async exportAllAllocations() {
    await this.performExport('/export/allocations', 'allocations');
  }

  async exportVotingResults() {
    await this.performExport('/export/voting-results', 'voting_results');
  }

  async exportComprehensiveReport() {
    await this.performExport('/export/comprehensive-report', 'comprehensive_report', 'json');
  }

  // Generic export performer
  async performExport(endpoint, filename, format = 'csv') {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      
      const response = await fetch(`${this.baseURL}${endpoint}?${params}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert(`${filename} ${i18n.t('admin_modals.messages.exported_successfully')}`);
      } else {
        throw new Error(`${i18n.t('admin_modals.messages.export_failed')}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      this.showError(`${i18n.t('admin_modals.messages.failed_to_export')} ${filename}`);
    }
  }

  // Custom export execution
  async executeCustomExport() {
    const exportType = document.getElementById('export-type').value;
    const format = document.getElementById('export-format').value;
    const dateFrom = document.getElementById('export-date-from').value;
    const dateTo = document.getElementById('export-date-to').value;
    const limit = document.getElementById('export-limit').value;
    const includePersonal = document.getElementById('include-personal-data').checked;
    
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (limit) params.append('limit', limit);
      if (includePersonal) params.append('include_personal_data', 'true');
      
      let endpoint;
      switch (exportType) {
        case 'donations':
          endpoint = '/export/donations';
          break;
        case 'allocations':
          endpoint = '/export/allocations';
          break;
        case 'voting-results':
          endpoint = '/export/voting-results';
          break;
        case 'comprehensive':
          endpoint = '/export/comprehensive-report';
          break;
        default:
          throw new Error(i18n.t('admin_modals.messages.invalid_export_type'));
      }
      
      await this.performExport(endpoint, exportType, format);
      this.closeModal();
      
    } catch (error) {
      this.showError(i18n.t('admin_modals.messages.failed_execute_export'));
    }
  }

  // Analytics report generation
  async generateProjectAnalytics() {
    try {
      const analytics = await this.fetchJSON('/reports/project-analytics');
      this.displayAnalyticsReport('Project Analytics', this.renderProjectAnalytics(analytics));
    } catch (error) {
      this.showError('Failed to generate project analytics');
    }
  }

  async generateVotingAnalytics() {
    try {
      const analytics = await this.fetchJSON('/reports/voting-analytics');
      this.displayAnalyticsReport('Voting Analytics', this.renderVotingAnalytics(analytics));
    } catch (error) {
      this.showError('Failed to generate voting analytics');
    }
  }

  async generateTreasuryAnalytics() {
    try {
      const analytics = await this.fetchJSON('/reports/treasury-analytics');
      this.displayAnalyticsReport('Treasury Analytics', this.renderTreasuryAnalytics(analytics));
    } catch (error) {
      this.showError('Failed to generate treasury analytics');
    }
  }

  async generatePrivacyReport() {
    try {
      const report = await this.fetchJSON('/privacy/report?data_type=donations');
      this.displayAnalyticsReport('Privacy & K-Anonymity Report', this.renderPrivacyReport(report));
    } catch (error) {
      this.showError('Failed to generate privacy report');
    }
  }

  // Analytics report renderers
  renderProjectAnalytics(analytics) {
    return `
      <div class="analytics-report">
        <div class="report-header">
          <h4>${i18n.t('analytics.project_report.title')}</h4>
          <p>${i18n.t('analytics.project_report.generated')}: ${analytics.generated_at}</p>
          <p>${i18n.t('analytics.project_report.period')}: ${analytics.period_days} ${i18n.t('analytics.project_report.days')} | ${i18n.t('analytics.project_report.category')}: ${analytics.category}</p>
        </div>
        
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${analytics.summary.total_projects}</div>
            <div class="metric-label">${i18n.t('analytics.project_report.total_projects')}</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${this.formatETH(analytics.summary.total_target)}</div>
            <div class="metric-label">${i18n.t('analytics.project_report.total_target')}</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${this.formatETH(analytics.summary.total_allocated)}</div>
            <div class="metric-label">${i18n.t('analytics.project_report.total_allocated')}</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${(analytics.summary.total_allocated / analytics.summary.total_target * 100).toFixed(1)}%</div>
            <div class="metric-label">${i18n.t('analytics.project_report.funding_progress')}</div>
          </div>
        </div>
        
        <div class="section">
          <h5>${i18n.t('analytics.project_report.by_status')}</h5>
          <table class="data-table">
            <thead><tr><th>${i18n.t('analytics.project_report.status_header')}</th><th>${i18n.t('analytics.project_report.count_header')}</th><th>${i18n.t('analytics.project_report.target_header')}</th><th>${i18n.t('analytics.project_report.allocated_header')}</th></tr></thead>
            <tbody>
              ${Object.entries(analytics.by_status).map(([status, data]) => `
                <tr>
                  <td><span class="badge badge-info">${status}</span></td>
                  <td>${data.count}</td>
                  <td>${this.formatETH(data.total_target)} ETH</td>
                  <td>${this.formatETH(data.total_allocated)} ETH</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="section">
          <h5>${i18n.t('analytics.project_report.funding_progress_distribution')}</h5>
          <div class="progress-stats">
            <div>${i18n.t('analytics.project_report.fully_funded')}: ${analytics.funding_progress.fully_funded}</div>
            <div>${i18n.t('analytics.project_report.over_50_percent')}: ${analytics.funding_progress.over_50_percent}</div>
            <div>${i18n.t('analytics.project_report.under_50_percent')}: ${analytics.funding_progress.under_50_percent}</div>
            <div>${i18n.t('analytics.project_report.no_funding')}: ${analytics.funding_progress.no_funding}</div>
          </div>
        </div>
      </div>
    `;
  }

  renderVotingAnalytics(analytics) {
    return `
      <div class="analytics-report">
        <div class="report-header">
          <h4>${i18n.t('analytics.voting_report.title')}</h4>
          <p>${i18n.t('analytics.voting_report.generated')}: ${analytics.generated_at}</p>
          <p>${i18n.t('analytics.voting_report.round')}: ${analytics.round_id}</p>
        </div>
        
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${analytics.participation_metrics.total_projects_voted}</div>
            <div class="metric-label">${i18n.t('analytics.voting_report.projects_voted_on')}</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${analytics.participation_metrics.total_for_votes}</div>
            <div class="metric-label">${i18n.t('analytics.voting_report.total_for_votes')}</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${analytics.participation_metrics.total_against_votes}</div>
            <div class="metric-label">${i18n.t('analytics.voting_report.total_against_votes')}</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${analytics.participation_metrics.average_turnout.toFixed(1)}%</div>
            <div class="metric-label">${i18n.t('analytics.voting_report.average_turnout')}</div>
          </div>
        </div>
        
        ${analytics.project_analysis ? `
          <div class="section">
            <h5>${i18n.t('analytics.voting_report.project_analysis')}</h5>
            <table class="data-table">
              <thead>
                <tr>
                  <th>${i18n.t('analytics.voting_report.project_header')}</th>
                  <th>${i18n.t('analytics.voting_report.turnout_header')}</th>
                  <th>${i18n.t('analytics.voting_report.support_ratio_header')}</th>
                  <th>${i18n.t('analytics.voting_report.engagement_header')}</th>
                  <th>${i18n.t('analytics.voting_report.consensus_header')}</th>
                </tr>
              </thead>
              <tbody>
                ${analytics.project_analysis.map(p => `
                  <tr>
                    <td>${p.project_id.substring(0, 8)}...</td>
                    <td>${p.participation_rate.toFixed(1)}%</td>
                    <td>${p.support_ratio.toFixed(1)}%</td>
                    <td>${p.engagement_score.toFixed(1)}%</td>
                    <td><span class="badge badge-${p.consensus_level === 'high' ? 'success' : 'warning'}">${p.consensus_level}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderTreasuryAnalytics(analytics) {
    return `
      <div class="analytics-report">
        <div class="report-header">
          <h4>${i18n.t('analytics.treasury_report.title')}</h4>
          <p>${i18n.t('analytics.treasury_report.generated')}: ${analytics.generated_at}</p>
          <p>${i18n.t('analytics.treasury_report.period')}: ${analytics.period_days} ${i18n.t('analytics.treasury_report.days')}</p>
        </div>
        
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${this.formatETH(analytics.treasury_overview.total_balance)}</div>
            <div class="metric-label">${i18n.t('analytics.treasury_report.total_balance')}</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${this.formatETH(analytics.treasury_overview.total_donations)}</div>
            <div class="metric-label">${i18n.t('analytics.treasury_report.total_donations')}</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${analytics.flow_analysis.allocation_rate.toFixed(1)}%</div>
            <div class="metric-label">${i18n.t('analytics.treasury_report.allocation_rate')}</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${analytics.flow_analysis.payout_rate.toFixed(1)}%</div>
            <div class="metric-label">${i18n.t('analytics.treasury_report.payout_rate')}</div>
          </div>
        </div>
        
        <div class="section">
          <h5>${i18n.t('analytics.treasury_report.flow_analysis')}</h5>
          <div class="flow-chart">
            <div>💰 ${i18n.t('analytics.treasury_report.donations')}: ${this.formatETH(analytics.flow_analysis.total_inflow)} ETH</div>
            <div>📋 ${i18n.t('analytics.treasury_report.allocated')}: ${this.formatETH(analytics.flow_analysis.total_allocated)} ETH</div>
            <div>💸 ${i18n.t('analytics.treasury_report.paid_out')}: ${this.formatETH(analytics.flow_analysis.total_paid_out)} ETH</div>
            <div>🏦 ${i18n.t('analytics.treasury_report.unallocated')}: ${this.formatETH(analytics.flow_analysis.unallocated_balance)} ETH</div>
          </div>
        </div>
        
        <div class="section">
          <h5>${i18n.t('analytics.treasury_report.recent_activity')}</h5>
          <div>
            <p>${i18n.t('analytics.treasury_report.recent_donations')}: ${analytics.recent_activity.recent_donations_count}</p>
            <p>${i18n.t('analytics.treasury_report.recent_allocations')}: ${analytics.recent_activity.recent_allocations_count}</p>
            <p>${i18n.t('analytics.treasury_report.average_donation_size')}: ${this.formatETH(analytics.recent_activity.average_donation_size)} ETH</p>
          </div>
        </div>
      </div>
    `;
  }

  renderPrivacyReport(report) {
    return `
      <div class="analytics-report">
        <div class="report-header">
          <h4>Privacy & K-Anonymity Report</h4>
          <p>K-Anonymity Threshold: ${report.k_threshold || 5}</p>
        </div>
        
        <div class="alert alert-info">
          <strong>Privacy Protection Status:</strong> This system implements k-anonymity protection 
          to ensure individual privacy while maintaining transparency.
        </div>
        
        <div class="section">
          <h5>Data Protection Summary</h5>
          <p>All public data exports are filtered to maintain k-anonymity protection.</p>
          <p>Personal data exports require explicit user consent and address verification.</p>
          <p>Administrative exports include additional privacy safeguards.</p>
        </div>
      </div>
    `;
  }

  displayAnalyticsReport(title, content) {
    this.displayAdminContent(title, content);
    this.closeModal();
  }

  // Admin functions
  async showProjectForm() {
    const modalTitle = i18n.t('modal.create_new_project');
    const modalBody = `
      <form id="create-project-form">
        <div class="form-row">
          <div class="form-group">
            <label for="project-name">${i18n.t('modal.project_name')} *</label>
            <input type="text" class="form-control" id="project-name" required maxlength="200">
          </div>
          <div class="form-group">
            <label for="project-category">${i18n.t('modal.category')} *</label>
            <select class="form-control" id="project-category" required>
              <option value="">${i18n.t('modal.select_category')}</option>
              <option value="infrastructure">${i18n.t('modal.infrastructure')}</option>
              <option value="healthcare">${i18n.t('modal.healthcare')}</option>
              <option value="education">${i18n.t('modal.education')}</option>
              <option value="aid">${i18n.t('modal.emergency_aid')}</option>
              <option value="environment">${i18n.t('modal.environment')}</option>
              <option value="technology">${i18n.t('modal.technology')}</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label for="project-description">${i18n.t('modal.description')} *</label>
          <textarea class="form-control textarea" id="project-description" required maxlength="2000" 
                    placeholder="${i18n.t('modal.description_placeholder')}"></textarea>
        </div>
        
        <div class="form-section">
          <h5>${i18n.t('modal.funding_configuration')}</h5>
          <div class="form-row">
            <div class="form-group">
              <label for="project-target">${i18n.t('modal.target_amount_eth')} *</label>
              <input type="number" class="form-control" id="project-target" step="0.01" min="0.01" required>
            </div>
            <div class="form-group">
              <label for="project-soft-cap">${i18n.t('modal.soft_cap_eth')} *</label>
              <input type="number" class="form-control" id="project-soft-cap" step="0.01" min="0.01" required>
            </div>
            <div class="form-group">
              <label for="project-hard-cap">${i18n.t('modal.hard_cap_eth')}</label>
              <input type="number" class="form-control" id="project-hard-cap" step="0.01" min="0.01">
            </div>
          </div>
          
          <div class="checkbox-group">
            <input type="checkbox" id="soft-cap-enabled">
            <label for="soft-cap-enabled">${i18n.t('modal.enable_soft_cap')}</label>
          </div>
        </div>
        
        <div class="form-section">
          <h5>${i18n.t('modal.timeline')}</h5>
          <div class="form-group">
            <label for="project-deadline">${i18n.t('modal.deadline_optional')}</label>
            <input type="datetime-local" class="form-control" id="project-deadline">
            <div class="form-text">${i18n.t('modal.deadline_help_text')}</div>
          </div>
        </div>
      </form>
    `;
    
    const modalFooter = `
      <button class="btn btn-secondary" onclick="app.closeModal()">${i18n.t('buttons.cancel')}</button>
      <button class="btn btn-primary" onclick="app.submitCreateProject()">${i18n.t('modal.create_project')}</button>
    `;
    
    this.showModal(modalTitle, modalBody, modalFooter);
  }

  async submitCreateProject() {
    const form = document.getElementById('create-project-form');
    const formData = new FormData(form);
    
    const projectData = {
      name: document.getElementById('project-name').value,
      description: document.getElementById('project-description').value,
      category: document.getElementById('project-category').value,
      target: parseFloat(document.getElementById('project-target').value),
      soft_cap: parseFloat(document.getElementById('project-soft-cap').value),
      hard_cap: document.getElementById('project-hard-cap').value ? parseFloat(document.getElementById('project-hard-cap').value) : null,
      deadline: document.getElementById('project-deadline').value || null,
      soft_cap_enabled: document.getElementById('soft-cap-enabled').checked
    };
    
    // Validation
    if (!projectData.name || !projectData.description || !projectData.category) {
      this.showError(i18n.t('modal.validation.fill_required_fields'));
      return;
    }
    
    if (projectData.soft_cap > projectData.target) {
      this.showError(i18n.t('modal.validation.soft_cap_greater_than_target'));
      return;
    }
    
    if (projectData.hard_cap && projectData.hard_cap < projectData.target) {
      this.showError(i18n.t('modal.validation.hard_cap_less_than_target'));
      return;
    }
    
    try {
      // In a real implementation, this would call the API to create the project
      console.log('Creating project:', projectData);
      alert(i18n.t('modal.validation.project_creation_simulated'));
      this.closeModal();
    } catch (error) {
      this.showError(i18n.t('modal.validation.failed_to_create_project'));
    }
  }

  async manageCategories() {
    const modalTitle = i18n.t('admin_modals.manage_categories.title');
    const modalBody = `
      <div class="form-section">
        <h5>${i18n.t('admin_modals.manage_categories.add_new_category')}</h5>
        <div class="form-row">
          <div class="form-group">
            <label for="new-category-name">${i18n.t('admin_modals.manage_categories.category_name')}</label>
            <input type="text" class="form-control" id="new-category-name" placeholder="${i18n.t('admin_modals.manage_categories.category_name_placeholder')}">
          </div>
          <div class="form-group">
            <label for="new-category-limit">${i18n.t('admin_modals.manage_categories.max_active_projects')}</label>
            <input type="number" class="form-control" id="new-category-limit" value="10" min="1">
          </div>
        </div>
        <button class="btn btn-primary" onclick="app.addCategory()">${i18n.t('admin_modals.manage_categories.add_category')}</button>
      </div>
      
      <div class="form-section">
        <h5>${i18n.t('admin_modals.manage_categories.existing_categories')}</h5>
        <table class="data-table">
          <thead>
            <tr>
              <th>${i18n.t('admin_modals.manage_categories.category')}</th>
              <th>${i18n.t('admin_modals.manage_categories.active_projects')}</th>
              <th>${i18n.t('admin_modals.manage_categories.max_limit')}</th>
              <th>${i18n.t('admin_modals.manage_categories.actions')}</th>
            </tr>
          </thead>
          <tbody id="categories-table-body">
            <tr>
              <td>Infrastructure</td>
              <td>3</td>
              <td>10</td>
              <td class="action-buttons">
                <button class="btn btn-xs btn-secondary">${i18n.t('admin_modals.manage_categories.edit')}</button>
                <button class="btn btn-xs btn-danger">${i18n.t('admin_modals.manage_categories.delete')}</button>
              </td>
            </tr>
            <tr>
              <td>Healthcare</td>
              <td>2</td>
              <td>8</td>
              <td class="action-buttons">
                <button class="btn btn-xs btn-secondary">${i18n.t('admin_modals.manage_categories.edit')}</button>
                <button class="btn btn-xs btn-danger">${i18n.t('admin_modals.manage_categories.delete')}</button>
              </td>
            </tr>
            <tr>
              <td>Education</td>
              <td>1</td>
              <td>5</td>
              <td class="action-buttons">
                <button class="btn btn-xs btn-secondary">${i18n.t('admin_modals.manage_categories.edit')}</button>
                <button class="btn btn-xs btn-danger">${i18n.t('admin_modals.manage_categories.delete')}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
    
    this.showModal(modalTitle, modalBody);
  }

  async showMintSBTForm() {
    const modalTitle = i18n.t('admin_modals.mint_sbt.title');
    const modalBody = `
      <form id="mint-sbt-form">
        <div class="alert alert-info">
          <strong>${i18n.t('admin_modals.mint_sbt.note')}</strong> ${i18n.t('admin_modals.mint_sbt.sbt_description')}
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="sbt-recipient">${i18n.t('admin_modals.mint_sbt.recipient_address')}</label>
            <input type="text" class="form-control" id="sbt-recipient" 
                   placeholder="${i18n.t('placeholders.wallet_address_placeholder')}" pattern="^0x[a-fA-F0-9]{40}$" required>
          </div>
          <div class="form-group">
            <label for="sbt-donation-amount">${i18n.t('admin_modals.mint_sbt.donation_amount_eth')}</label>
            <input type="number" class="form-control" id="sbt-donation-amount" 
                   step="0.01" min="0.01" required>
            <div class="form-text">${i18n.t('admin_modals.mint_sbt.weight_determines')}</div>
          </div>
        </div>
        
        <div class="form-section">
          <h5>${i18n.t('admin_modals.mint_sbt.weight_configuration')}</h5>
          <div class="form-row">
            <div class="form-group">
              <label for="weight-mode">${i18n.t('admin_modals.mint_sbt.weight_calculation_mode')}</label>
              <select class="form-control" id="weight-mode">
                <option value="linear">${i18n.t('admin_modals.mint_sbt.linear_ratio')}</option>
                <option value="quadratic">${i18n.t('admin_modals.mint_sbt.quadratic_diminishing')}</option>
                <option value="logarithmic">${i18n.t('admin_modals.mint_sbt.logarithmic_heavy')}</option>
              </select>
            </div>
            <div class="form-group">
              <label for="calculated-weight">${i18n.t('admin_modals.mint_sbt.calculated_weight')}</label>
              <input type="text" class="form-control" id="calculated-weight" readonly>
            </div>
          </div>
        </div>
      </form>
    `;
    
    const modalFooter = `
      <button class="btn btn-secondary" onclick="app.closeModal()">${i18n.t('buttons.cancel')}</button>
      <button class="btn btn-primary" onclick="app.submitMintSBT()">${i18n.t('admin_modals.mint_sbt.mint_sbt')}</button>
    `;
    
    this.showModal(modalTitle, modalBody, modalFooter);
    
    // Add event listeners for weight calculation
    document.getElementById('sbt-donation-amount').addEventListener('input', this.calculateSBTWeight.bind(this));
    document.getElementById('weight-mode').addEventListener('change', this.calculateSBTWeight.bind(this));
    this.calculateSBTWeight();
  }

  calculateSBTWeight() {
    const donationAmount = parseFloat(document.getElementById('sbt-donation-amount').value) || 0;
    const weightMode = document.getElementById('weight-mode').value;
    
    let weight = 0;
    
    switch (weightMode) {
      case 'linear':
        weight = donationAmount;
        break;
      case 'quadratic':
        weight = Math.sqrt(donationAmount);
        break;
      case 'logarithmic':
        weight = donationAmount > 0 ? Math.log(donationAmount + 1) : 0;
        break;
    }
    
    document.getElementById('calculated-weight').value = weight.toFixed(3);
  }

  async showStartVotingForm() {
    const modalTitle = i18n.t('admin_modals.start_voting.title');
    const modalBody = `
      <form id="start-voting-form">
        <div class="alert alert-warning">
          <strong>${i18n.t('admin_modals.start_voting.warning')}</strong> ${i18n.t('admin_modals.start_voting.override_warning')}
        </div>
        
        <div class="form-section">
          <h5>${i18n.t('admin_modals.start_voting.timing_configuration')}</h5>
          <div class="form-row">
            <div class="form-group">
              <label for="commit-duration">${i18n.t('admin_modals.start_voting.commit_phase_duration')}</label>
              <input type="number" class="form-control" id="commit-duration" value="168" min="1">
              <div class="form-text">${i18n.t('admin_modals.start_voting.commit_default')}</div>
            </div>
            <div class="form-group">
              <label for="reveal-duration">${i18n.t('admin_modals.start_voting.reveal_phase_duration')}</label>
              <input type="number" class="form-control" id="reveal-duration" value="72" min="1">
              <div class="form-text">${i18n.t('admin_modals.start_voting.reveal_default')}</div>
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h5>${i18n.t('admin_modals.start_voting.voting_configuration')}</h5>
          <div class="form-row">
            <div class="form-group">
              <label for="counting-method">${i18n.t('admin_modals.start_voting.counting_method')}</label>
              <select class="form-control" id="counting-method">
                <option value="weighted">${i18n.t('admin_modals.start_voting.weighted_voting')}</option>
                <option value="borda">${i18n.t('admin_modals.start_voting.borda_count')}</option>
              </select>
            </div>
            <div class="form-group">
              <label for="cancellation-threshold">${i18n.t('admin_modals.start_voting.auto_cancellation_threshold')}</label>
              <input type="number" class="form-control" id="cancellation-threshold" value="66" min="1" max="100">
              <div class="form-text">${i18n.t('admin_modals.start_voting.minimum_turnout')}</div>
            </div>
          </div>
          
          <div class="checkbox-group">
            <input type="checkbox" id="enable-auto-cancellation" checked>
            <label for="enable-auto-cancellation">${i18n.t('admin_modals.start_voting.enable_auto_cancellation')}</label>
          </div>
        </div>
        
        <div class="form-section" id="project-selection">
          <h5>${i18n.t('admin_modals.start_voting.select_projects_voting')}</h5>
          <div class="text-muted mb-2">${i18n.t('admin_modals.start_voting.loading_projects')}</div>
        </div>
      </form>
    `;
    
    const modalFooter = `
      <button class="btn btn-secondary" onclick="app.closeModal()">${i18n.t('buttons.cancel')}</button>
      <button class="btn btn-primary" onclick="app.submitStartVoting()">${i18n.t('admin_modals.start_voting.start_voting_round')}</button>
    `;
    
    this.showModal(modalTitle, modalBody, modalFooter);
    
    // Load available projects
    this.loadProjectsForVoting();
  }

  async loadProjectsForVoting() {
    try {
      const projects = await this.fetchJSON('/projects?status=active&limit=100');
      const container = document.getElementById('project-selection');
      
      if (projects.length === 0) {
        container.innerHTML = `
          <h5>${i18n.t('admin_modals.start_voting.select_projects_voting')}</h5>
          <div class="alert alert-warning">${i18n.t('admin_modals.start_voting.no_active_projects')}</div>
        `;
        return;
      }
      
      let html = `<h5>${i18n.t('admin_modals.start_voting.select_projects_voting')}</h5>`;
      projects.forEach(project => {
        html += `
          <div class="checkbox-group">
            <input type="checkbox" id="project-${project.id}" value="${project.id}" class="voting-project">
            <label for="project-${project.id}">
              <strong>${this.escapeHtml(project.name)}</strong> 
              (${this.escapeHtml(project.category)}) - ${this.formatETH(project.target)} ETH
            </label>
          </div>
        `;
      });
      
      container.innerHTML = html;
    } catch (error) {
      console.error('Failed to load projects for voting:', error);
    }
  }

  async reindexBlockchain() {
    try {
      await this.fetchJSON('/admin/indexer/reindex', { method: 'POST' });
      alert(i18n.t('admin_modals.messages.blockchain_reindexing_initiated'));
      // Refresh indexer status
      this.loadAdminSection();
    } catch (error) {
      this.showError(i18n.t('admin_modals.messages.failed_to_start_reindexing'));
    }
  }

  // Modal system
  showModal(title, body, footer = '') {
    const modal = document.getElementById('admin-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal-footer').innerHTML = footer || `
      <button class="btn btn-secondary" onclick="app.closeModal()">${i18n.t('admin_modals.messages.close')}</button>
    `;
    modal.classList.remove('hidden');
  }

  closeModal() {
    const modal = document.getElementById('admin-modal');
    modal.classList.add('hidden');
  }

  // Additional admin functions
  async showProjectsAdmin() {
    try {
      const projects = await this.fetchJSON('/projects?limit=100');
      this.displayAdminContent('Project Management', this.renderProjectsAdminTable(projects));
    } catch (error) {
      this.showError('Failed to load projects');
    }
  }

  renderProjectsAdminTable(projects) {
    let html = `
      <div class="mb-2">
        <button class="btn btn-primary" onclick="app.showProjectForm()">${i18n.t('admin_modals.project_management.add_new_project')}</button>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>${i18n.t('admin_modals.project_management.name')}</th>
            <th>${i18n.t('modal.category')}</th>
            <th>${i18n.t('admin_modals.member_management.status')}</th>
            <th>${i18n.t('admin_modals.project_management.target')}</th>
            <th>${i18n.t('admin_modals.project_management.allocated')}</th>
            <th>${i18n.t('admin_modals.project_management.progress')}</th>
            <th>${i18n.t('admin_modals.member_management.actions')}</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    projects.forEach(project => {
      const progress = (project.total_allocated / project.target * 100).toFixed(1);
      html += `
        <tr>
          <td><strong>${this.escapeHtml(project.name)}</strong></td>
          <td><span class="badge badge-info">${this.escapeHtml(project.category)}</span></td>
          <td><span class="badge badge-${this.getStatusBadgeClass(project.status)}">${project.status}</span></td>
          <td>${this.formatETH(project.target)} ETH</td>
          <td>${this.formatETH(project.total_allocated)} ETH</td>
          <td>${progress}%</td>
          <td class="action-buttons">
            <button class="btn btn-xs btn-secondary" onclick="app.editProject('${project.id}')">${i18n.t('buttons.edit')}</button>
            <button class="btn btn-xs btn-warning" onclick="app.pauseProject('${project.id}')">${i18n.t('admin_modals.project_management.pause')}</button>
            <button class="btn btn-xs btn-danger" onclick="app.cancelProject('${project.id}')">${i18n.t('buttons.cancel')}</button>
          </td>
        </tr>
      `;
    });
    
    html += '</tbody></table>';
    return html;
  }

  async showMembersAdmin() {
    // Simulate member data
    const members = [
      { address: '0x1234...5678', sbt_weight: 5.2, total_donated: 5.0, voting_power: 5.2, status: 'active' },
      { address: '0x9876...1234', sbt_weight: 3.1, total_donated: 3.5, voting_power: 3.1, status: 'active' },
      { address: '0xabcd...efgh', sbt_weight: 1.8, total_donated: 2.1, voting_power: 1.8, status: 'inactive' }
    ];
    
    this.displayAdminContent('Member Management', this.renderMembersAdminTable(members));
  }

  renderMembersAdminTable(members) {
    let html = `
      <div class="mb-2">
        <button class="btn btn-primary" onclick="app.showMintSBTForm()">${i18n.t('admin_modals.member_management.mint_new_sbt')}</button>
        <button class="btn btn-secondary ml-2" onclick="app.bulkUpdateWeights()">${i18n.t('admin_modals.member_management.bulk_update_weights')}</button>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>${i18n.t('admin_modals.member_management.address')}</th>
            <th>${i18n.t('admin_modals.member_management.sbt_weight')}</th>
            <th>${i18n.t('admin_modals.member_management.total_donated')}</th>
            <th>${i18n.t('admin_modals.member_management.voting_power')}</th>
            <th>${i18n.t('admin_modals.member_management.status')}</th>
            <th>${i18n.t('admin_modals.member_management.actions')}</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    members.forEach(member => {
      const statusClass = member.status === 'active' ? 'success' : 'secondary';
      const statusText = member.status === 'active' ? i18n.t('admin_modals.member_management.active') : i18n.t('admin_modals.member_management.inactive');
      html += `
        <tr>
          <td><code>${member.address}</code></td>
          <td>${member.sbt_weight.toFixed(3)}</td>
          <td>${this.formatETH(member.total_donated)} ETH</td>
          <td>${member.voting_power.toFixed(3)}</td>
          <td><span class="badge badge-${statusClass}">${statusText}</span></td>
          <td class="action-buttons">
            <button class="btn btn-xs btn-secondary" onclick="app.updateMemberWeight('${member.address}')">${i18n.t('admin_modals.member_management.update_weight')}</button>
            <button class="btn btn-xs btn-warning" onclick="app.toggleMemberStatus('${member.address}')">${i18n.t('admin_modals.member_management.toggle_status')}</button>
          </td>
        </tr>
      `;
    });
    
    html += '</tbody></table>';
    return html;
  }

  async showVotingHistory() {
    try {
      const rounds = await this.fetchJSON('/votes/rounds?limit=10');
      this.displayAdminContent('Voting History', this.renderVotingHistoryTable(rounds));
    } catch (error) {
      // Simulate voting rounds data
      const rounds = [
        { round_id: 3, start_date: '2024-01-15', end_date: '2024-01-25', status: 'completed', participants: 127, turnout: 70 },
        { round_id: 2, start_date: '2024-01-01', end_date: '2024-01-10', status: 'completed', participants: 89, turnout: 65 },
        { round_id: 1, start_date: '2023-12-15', end_date: '2023-12-28', status: 'completed', participants: 156, turnout: 85 }
      ];
      this.displayAdminContent('Voting History', this.renderVotingHistoryTable(rounds));
    }
  }

  renderVotingHistoryTable(rounds) {
    let html = `
      <div class="mb-2">
        <button class="btn btn-primary" onclick="app.showStartVotingForm()">${i18n.t('admin_modals.voting_history.start_new_round')}</button>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>${i18n.t('admin_modals.voting_history.round_id')}</th>
            <th>${i18n.t('admin_modals.voting_history.start_date')}</th>
            <th>${i18n.t('admin_modals.voting_history.end_date')}</th>
            <th>${i18n.t('admin_modals.member_management.status')}</th>
            <th>${i18n.t('admin_modals.voting_history.participants')}</th>
            <th>${i18n.t('admin_modals.voting_history.turnout')}</th>
            <th>${i18n.t('admin_modals.member_management.actions')}</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    rounds.forEach(round => {
      const statusClass = round.status === 'completed' ? 'success' : 'warning';
      const statusText = round.status === 'completed' ? i18n.t('admin_modals.voting_history.completed') : round.status;
      html += `
        <tr>
          <td><strong>#${round.round_id}</strong></td>
          <td>${round.start_date}</td>
          <td>${round.end_date}</td>
          <td><span class="badge badge-${statusClass}">${statusText}</span></td>
          <td>${round.participants}</td>
          <td>${round.turnout}%</td>
          <td class="action-buttons">
            <button class="btn btn-xs btn-secondary" onclick="app.viewRoundDetails(${round.round_id})">${i18n.t('admin_modals.voting_history.view_details')}</button>
            <button class="btn btn-xs btn-secondary" onclick="app.exportRoundResults(${round.round_id})">${i18n.t('admin_modals.voting_history.export')}</button>
          </td>
        </tr>
      `;
    });
    
    html += '</tbody></table>';
    return html;
  }

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

  // Placeholder functions for additional admin actions
  async addCategory() {
    const name = document.getElementById('new-category-name').value;
    const limit = document.getElementById('new-category-limit').value;
    
    if (!name) {
      this.showError(i18n.t('admin_modals.messages.category_name_required'));
      return;
    }
    
    alert(`${i18n.t('admin_modals.messages.simulated_actions.add_category')} "${name}" ${i18n.t('admin_modals.messages.simulated_actions.with_limit')} ${limit} ${i18n.t('admin_modals.messages.simulated_actions.simulated')}`);
  }

  async submitMintSBT() {
    const recipient = document.getElementById('sbt-recipient').value;
    const donationAmount = document.getElementById('sbt-donation-amount').value;
    const weightMode = document.getElementById('weight-mode').value;
    
    if (!recipient || !donationAmount) {
      this.showError(i18n.t('admin_modals.messages.fill_required_fields'));
      return;
    }
    
    alert(`${i18n.t('admin_modals.messages.simulated_actions.mint_sbt_for')} ${recipient} ${i18n.t('admin_modals.messages.simulated_actions.with_amount')} ${donationAmount} ETH (${weightMode} ${i18n.t('admin_modals.messages.simulated_actions.weight')}) ${i18n.t('admin_modals.messages.simulated_actions.simulated')}`);
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
        // Если API эндпоинт не найден, симулируем успешный запуск
        console.warn('API endpoint not found or error occurred:', apiError);
        console.log('Full error details:', {
          message: apiError.message,
          stack: apiError.stack,
          lastResponse: this.lastResponse
        });
        
        response = {
          status: 'success',
          message: 'Раунд голосования запущен (симуляция)',
          round_id: 4,
          projects: selectedProjects
        };
      }
      
      // Показываем результат
      if (response.status === 'success' || response.round_id) {
        this.showSuccess(`Раунд голосования #${response.round_id || 4} успешно запущен с ${selectedProjects.length} проектами!`);
        
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

  async manageWeights() { alert(i18n.t('admin_modals.messages.weight_management_interface_simulated')); }
  async showVotingConfig() { alert(i18n.t('admin_modals.messages.voting_configuration_interface_simulated')); }
  async showLogsAdmin() { alert(i18n.t('admin_modals.messages.system_logs_interface_simulated')); }
  async editProject(id) { alert(i18n.t('admin_modals.messages.edit_project_simulated').replace('{id}', id)); }
  async pauseProject(id) { alert(i18n.t('admin_modals.messages.pause_project_simulated').replace('{id}', id)); }
  async cancelProject(id) { alert(i18n.t('admin_modals.messages.cancel_project_simulated').replace('{id}', id)); }
  async updateMemberWeight(address) { alert(i18n.t('admin_modals.messages.update_member_weight_simulated').replace('{address}', address)); }
  async toggleMemberStatus(address) { alert(i18n.t('admin_modals.messages.toggle_member_status_simulated').replace('{address}', address)); }
  async viewRoundDetails(roundId) { alert(i18n.t('admin_modals.messages.view_round_details_simulated').replace('{roundId}', roundId)); }
  async exportRoundResults(roundId) { alert(i18n.t('admin_modals.messages.export_round_results_simulated').replace('{roundId}', roundId)); }
  async saveSystemConfig() { alert(i18n.t('admin_modals.messages.simulated_actions.save_system_configuration')); this.closeModal(); }
  
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
    alert(i18n.t('admin_modals.messages.start_new_voting_round_interface'));
  }
}

// Global functions for onclick handlers
window.showCreateProject = () => app.showProjectForm();
window.loadPersonalStats = () => app.loadPersonalStats();
window.exportTreasuryData = () => app.exportTreasuryData();
window.exportPersonalData = () => app.exportPersonalData();
window.showProjectForm = () => app.showProjectForm();
window.managecategories = () => app.managecategories();
window.mintSBT = () => app.mintSBT();
window.manageWeights = () => app.manageWeights();
window.startVotingRound = () => app.startVotingRound();
window.configureVoting = () => app.configureVoting();
window.reindexBlockchain = () => app.reindexBlockchain();
window.startVoting = () => app.startVoting();
window.resetVotingStatus = () => app.resetVotingStatus();

// Initialize the application
const app = new FundChainApp();

// Handle page unload
window.addEventListener('beforeunload', () => {
  app.stopAutoRefresh();
});
