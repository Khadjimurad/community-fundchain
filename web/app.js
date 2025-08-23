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
    
    this.init();
  }

  // Initialize the application
  init() {
    this.setupEventListeners();
    this.loadInitialData();
    this.startAutoRefresh();
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      this.showError(`API Error: ${error.message}`);
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
          <div><strong>${this.escapeHtml(project.name)}</strong></div>
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
          <button class="btn btn-primary btn-sm" onclick="app.supportProject('${project.id}')">Support</button>
          <button class="btn btn-secondary btn-sm ml-2" onclick="app.viewProject('${project.id}')">Details</button>
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
          <div><strong>${this.escapeHtml(project.name)}</strong></div>
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
          <button class="btn btn-primary btn-sm" onclick="app.supportProject('${project.id}')">Support</button>
          <button class="btn btn-secondary btn-sm ml-2" onclick="app.viewProject('${project.id}')">Details</button>
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
      this.displayCurrentVotingRound(currentRound);
      
      // Load voting results
      const votingResults = await this.fetchJSON('/votes/priority/summary');
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
    
    // Add instructions
    const instructions = document.createElement('div');
    instructions.className = 'alert alert-info mb-3';
    instructions.innerHTML = `
      <h6>Commit Phase Instructions:</h6>
      <p>Select your votes for each project. Your choices will be encrypted and submitted to the blockchain.</p>
      <p>You will need to reveal your votes during the reveal phase to make them count.</p>
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
      <label for="vote-salt">Secret Salt (keep this safe for reveal phase):</label>
      <input type="text" class="form-control" id="vote-salt" 
             value="${this.generateRandomSalt()}" readonly>
      <small class="form-text text-muted">
        Save this value! You'll need it to reveal your votes.
      </small>
    `;
    form.appendChild(saltDiv);

    // Add submit button
    const submitDiv = document.createElement('div');
    submitDiv.className = 'text-center mt-4';
    submitDiv.innerHTML = `
      <button type="button" class="btn btn-primary btn-lg" onclick="app.submitCommitVote(${roundInfo.round_id})">
        Submit Commit Vote
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
          <label>Your Vote:</label>
          <div class="btn-group btn-group-toggle d-block" data-toggle="buttons">
            <label class="btn btn-outline-success">
              <input type="radio" name="vote-${project.id}" value="for"> For
            </label>
            <label class="btn btn-outline-danger">
              <input type="radio" name="vote-${project.id}" value="against"> Against
            </label>
            <label class="btn btn-outline-info">
              <input type="radio" name="vote-${project.id}" value="abstain"> Abstain
            </label>
            <label class="btn btn-outline-secondary active">
              <input type="radio" name="vote-${project.id}" value="not_participating" checked> Not Participating
            </label>
          </div>
        </div>
        <div class="row mt-2">
          <div class="col-sm-6">
            <small class="text-muted">Target: ${this.formatETH(project.target)} ETH</small>
          </div>
          <div class="col-sm-6">
            <small class="text-muted">Allocated: ${this.formatETH(project.total_allocated)} ETH</small>
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

    form.innerHTML = `
      <div class="alert alert-warning mb-3">
        <h6>Reveal Phase:</h6>
        <p>Enter your secret salt and confirm your votes to make them count.</p>
        <p><strong>Warning:</strong> Your votes must match exactly what you committed!</p>
      </div>
      <div class="form-group">
        <label for="reveal-salt">Secret Salt:</label>
        <input type="text" class="form-control" id="reveal-salt" 
               placeholder="Enter the salt from your commit phase">
      </div>
      <div id="reveal-votes-summary" class="mt-3">
        <h6>Your Committed Votes:</h6>
        <p class="text-muted">Please recreate your exact votes from the commit phase.</p>
      </div>
      <div class="text-center mt-4">
        <button type="button" class="btn btn-success btn-lg" onclick="app.submitRevealVote(${roundInfo.round_id})">
          Reveal Votes
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
    
    projects.forEach(project => {
      const progressPercent = (project.total_allocated / project.target * 100).toFixed(1);
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div><strong>${this.escapeHtml(project.name)}</strong></div>
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
          <div class="text-muted">Pending reveal</div>
        </td>
        <td>
          <button class="btn btn-info btn-sm" onclick="app.viewProject('${project.id}')">
            Details
          </button>
        </td>
      `;
      
      tbody.appendChild(row);
    });
  }

  // Display voting results
  displayVotingResults(results) {
    const tbody = document.getElementById('voting-results-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (results.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No voting results available</td></tr>';
      return;
    }
    
    results.forEach((result, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${result.project_id.substring(0, 8)}...</td>
        <td class="text-center">
          <span class="badge badge-success">${result.for_weight}</span>
        </td>
        <td class="text-center">
          <span class="badge badge-danger">${result.against_weight}</span>
        </td>
        <td class="text-center">
          <span class="badge badge-info">${result.abstained_count}</span>
        </td>
        <td class="text-center">
          <span class="badge badge-secondary">${result.not_participating_count}</span>
        </td>
        <td class="text-center">${result.turnout_percentage}%</td>
        <td class="text-center">
          <strong>${index + 1}</strong>
        </td>
      `;
      
      tbody.appendChild(row);
    });
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
        this.showError('Please enter a wallet address');
        return;
      }
      
      this.walletAddress = address;
      
      const params = new URLSearchParams();
      params.append('user_address', address);
      
      const stats = await this.fetchJSON(`/me/stats?${params}`);
      this.displayPersonalStats(stats);
      
      // Show the stats content
      const statsContent = document.getElementById('personal-stats-content');
      if (statsContent) {
        statsContent.classList.remove('hidden');
      }
      
    } catch (error) {
      console.error('Failed to load personal stats:', error);
      this.showError('Failed to load personal statistics. Please check the wallet address.');
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

  updateLastUpdated() {
    const now = new Date();
    this.updateElement('last-updated', now.toLocaleTimeString());
  }

  // Auto-refresh functionality
  startAutoRefresh() {
    this.refreshTimer = setInterval(() => {
      this.loadSectionData(this.currentSection);
      this.updateLastUpdated();
    }, this.refreshInterval);
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

  // Action functions
  async supportProject(projectId) {
    alert(`Support project feature would open donation interface for project ${projectId}`);
  }

  async viewProject(projectId) {
    try {
      const project = await this.fetchJSON(`/projects/${projectId}`);
      const progress = await this.fetchJSON(`/projects/${projectId}/progress`);
      
      // Create a simple modal or navigate to project details
      alert(`Project: ${project.name}\nProgress: ${progress.progress_to_target_percent}%\nTarget: ${this.formatETH(project.target)} ETH`);
      
    } catch (error) {
      this.showError('Failed to load project details');
    }
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
      
      alert('Vote committed successfully! Keep your salt safe for the reveal phase.');
      
      // Refresh voting section
      this.loadVotingSection();
      
    } catch (error) {
      console.error('Failed to submit commit vote:', error);
      this.showError('Failed to submit commit vote');
    }
  }

  // Submit reveal vote
  async submitRevealVote(roundId) {
    try {
      const saltInput = document.getElementById('reveal-salt');
      
      if (!saltInput || !saltInput.value) {
        this.showError('Salt is required for reveal voting');
        return;
      }
      
      const salt = saltInput.value;
      
      // Try to get stored vote data
      const storedVoteData = localStorage.getItem(`vote-data-${roundId}`);
      if (storedVoteData) {
        const voteData = JSON.parse(storedVoteData);
        if (voteData.salt !== salt) {
          this.showError('Salt does not match committed vote data');
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
        
        alert('Vote revealed successfully!');
        
        // Clean up stored data
        localStorage.removeItem(`vote-data-${roundId}`);
        
      } else {
        this.showError('No committed vote data found. Please ensure you committed a vote in this browser.');
        return;
      }
      
      // Refresh voting section
      this.loadVotingSection();
      
    } catch (error) {
      console.error('Failed to reveal vote:', error);
      this.showError('Failed to reveal vote');
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
    const modalTitle = 'Export Data & Reports';
    const modalBody = `
      <div class="form-section">
        <h5>Quick Exports</h5>
        <div class="action-grid">
          <button class="btn btn-primary" onclick="app.exportAllDonations()">Export All Donations</button>
          <button class="btn btn-primary" onclick="app.exportAllAllocations()">Export All Allocations</button>
          <button class="btn btn-primary" onclick="app.exportVotingResults()">Export Voting Results</button>
          <button class="btn btn-primary" onclick="app.exportComprehensiveReport()">Comprehensive Report</button>
        </div>
      </div>
      
      <div class="form-section">
        <h5>Custom Export</h5>
        <form id="custom-export-form">
          <div class="form-row">
            <div class="form-group">
              <label for="export-type">Data Type</label>
              <select class="form-control" id="export-type">
                <option value="donations">Donations</option>
                <option value="allocations">Allocations</option>
                <option value="voting-results">Voting Results</option>
                <option value="comprehensive">Comprehensive Report</option>
              </select>
            </div>
            <div class="form-group">
              <label for="export-format">Format</label>
              <select class="form-control" id="export-format">
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="export-date-from">From Date (optional)</label>
              <input type="date" class="form-control" id="export-date-from">
            </div>
            <div class="form-group">
              <label for="export-date-to">To Date (optional)</label>
              <input type="date" class="form-control" id="export-date-to">
            </div>
          </div>
          
          <div class="form-group">
            <label for="export-limit">Record Limit</label>
            <input type="number" class="form-control" id="export-limit" value="10000" min="1" max="50000">
            <div class="form-text">Maximum number of records to export</div>
          </div>
          
          <div class="checkbox-group">
            <input type="checkbox" id="include-personal-data">
            <label for="include-personal-data">Include personal/sensitive data (admin only)</label>
          </div>
        </form>
      </div>
      
      <div class="form-section">
        <h5>Analytics Reports</h5>
        <div class="action-grid">
          <button class="btn btn-secondary" onclick="app.generateProjectAnalytics()">Project Analytics</button>
          <button class="btn btn-secondary" onclick="app.generateVotingAnalytics()">Voting Analytics</button>
          <button class="btn btn-secondary" onclick="app.generateTreasuryAnalytics()">Treasury Analytics</button>
          <button class="btn btn-secondary" onclick="app.generatePrivacyReport()">Privacy Report</button>
        </div>
      </div>
    `;
    
    const modalFooter = `
      <button class="btn btn-secondary" onclick="app.closeModal()">Close</button>
      <button class="btn btn-primary" onclick="app.executeCustomExport()">Execute Custom Export</button>
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
        
        alert(`${filename} exported successfully!`);
      } else {
        throw new Error(`Export failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      this.showError(`Failed to export ${filename}`);
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
          throw new Error('Invalid export type');
      }
      
      await this.performExport(endpoint, exportType, format);
      this.closeModal();
      
    } catch (error) {
      this.showError('Failed to execute custom export');
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
          <h4>Project Analytics Report</h4>
          <p>Generated: ${analytics.generated_at}</p>
          <p>Period: ${analytics.period_days} days | Category: ${analytics.category}</p>
        </div>
        
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${analytics.summary.total_projects}</div>
            <div class="metric-label">Total Projects</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${this.formatETH(analytics.summary.total_target)}</div>
            <div class="metric-label">Total Target (ETH)</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${this.formatETH(analytics.summary.total_allocated)}</div>
            <div class="metric-label">Total Allocated (ETH)</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${(analytics.summary.total_allocated / analytics.summary.total_target * 100).toFixed(1)}%</div>
            <div class="metric-label">Funding Progress</div>
          </div>
        </div>
        
        <div class="section">
          <h5>By Status</h5>
          <table class="data-table">
            <thead><tr><th>Status</th><th>Count</th><th>Target</th><th>Allocated</th></tr></thead>
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
          <h5>Funding Progress Distribution</h5>
          <div class="progress-stats">
            <div>Fully Funded: ${analytics.funding_progress.fully_funded}</div>
            <div>Over 50%: ${analytics.funding_progress.over_50_percent}</div>
            <div>Under 50%: ${analytics.funding_progress.under_50_percent}</div>
            <div>No Funding: ${analytics.funding_progress.no_funding}</div>
          </div>
        </div>
      </div>
    `;
  }

  renderVotingAnalytics(analytics) {
    return `
      <div class="analytics-report">
        <div class="report-header">
          <h4>Voting Analytics Report</h4>
          <p>Generated: ${analytics.generated_at}</p>
          <p>Round: ${analytics.round_id}</p>
        </div>
        
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${analytics.participation_metrics.total_projects_voted}</div>
            <div class="metric-label">Projects Voted On</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${analytics.participation_metrics.total_for_votes}</div>
            <div class="metric-label">Total For Votes</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${analytics.participation_metrics.total_against_votes}</div>
            <div class="metric-label">Total Against Votes</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${analytics.participation_metrics.average_turnout.toFixed(1)}%</div>
            <div class="metric-label">Average Turnout</div>
          </div>
        </div>
        
        ${analytics.project_analysis ? `
          <div class="section">
            <h5>Project Analysis</h5>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Turnout</th>
                  <th>Support Ratio</th>
                  <th>Engagement</th>
                  <th>Consensus</th>
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
          <h4>Treasury Analytics Report</h4>
          <p>Generated: ${analytics.generated_at}</p>
          <p>Period: ${analytics.period_days} days</p>
        </div>
        
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${this.formatETH(analytics.treasury_overview.total_balance)}</div>
            <div class="metric-label">Total Balance (ETH)</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${this.formatETH(analytics.treasury_overview.total_donations)}</div>
            <div class="metric-label">Total Donations (ETH)</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${analytics.flow_analysis.allocation_rate.toFixed(1)}%</div>
            <div class="metric-label">Allocation Rate</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${analytics.flow_analysis.payout_rate.toFixed(1)}%</div>
            <div class="metric-label">Payout Rate</div>
          </div>
        </div>
        
        <div class="section">
          <h5>Flow Analysis</h5>
          <div class="flow-chart">
            <div>💰 Donations: ${this.formatETH(analytics.flow_analysis.total_inflow)} ETH</div>
            <div>📋 Allocated: ${this.formatETH(analytics.flow_analysis.total_allocated)} ETH</div>
            <div>💸 Paid Out: ${this.formatETH(analytics.flow_analysis.total_paid_out)} ETH</div>
            <div>🏦 Unallocated: ${this.formatETH(analytics.flow_analysis.unallocated_balance)} ETH</div>
          </div>
        </div>
        
        <div class="section">
          <h5>Recent Activity</h5>
          <div>
            <p>Recent Donations: ${analytics.recent_activity.recent_donations_count}</p>
            <p>Recent Allocations: ${analytics.recent_activity.recent_allocations_count}</p>
            <p>Average Donation Size: ${this.formatETH(analytics.recent_activity.average_donation_size)} ETH</p>
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
    const modalTitle = 'Create New Project';
    const modalBody = `
      <form id="create-project-form">
        <div class="form-row">
          <div class="form-group">
            <label for="project-name">Project Name *</label>
            <input type="text" class="form-control" id="project-name" required maxlength="200">
          </div>
          <div class="form-group">
            <label for="project-category">Category *</label>
            <select class="form-control" id="project-category" required>
              <option value="">Select Category</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="healthcare">Healthcare</option>
              <option value="education">Education</option>
              <option value="aid">Emergency Aid</option>
              <option value="environment">Environment</option>
              <option value="technology">Technology</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label for="project-description">Description *</label>
          <textarea class="form-control textarea" id="project-description" required maxlength="2000" 
                    placeholder="Detailed description of the project goals and expected outcomes..."></textarea>
        </div>
        
        <div class="form-section">
          <h5>Funding Configuration</h5>
          <div class="form-row">
            <div class="form-group">
              <label for="project-target">Target Amount (ETH) *</label>
              <input type="number" class="form-control" id="project-target" step="0.01" min="0.01" required>
            </div>
            <div class="form-group">
              <label for="project-soft-cap">Soft Cap (ETH) *</label>
              <input type="number" class="form-control" id="project-soft-cap" step="0.01" min="0.01" required>
            </div>
            <div class="form-group">
              <label for="project-hard-cap">Hard Cap (ETH)</label>
              <input type="number" class="form-control" id="project-hard-cap" step="0.01" min="0.01">
            </div>
          </div>
          
          <div class="checkbox-group">
            <input type="checkbox" id="soft-cap-enabled">
            <label for="soft-cap-enabled">Enable soft cap (allow payout when soft cap is reached)</label>
          </div>
        </div>
        
        <div class="form-section">
          <h5>Timeline</h5>
          <div class="form-group">
            <label for="project-deadline">Deadline (optional)</label>
            <input type="datetime-local" class="form-control" id="project-deadline">
            <div class="form-text">If no deadline is set, the project will remain active indefinitely</div>
          </div>
        </div>
      </form>
    `;
    
    const modalFooter = `
      <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="app.submitCreateProject()">Create Project</button>
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
      this.showError('Please fill all required fields');
      return;
    }
    
    if (projectData.soft_cap > projectData.target) {
      this.showError('Soft cap cannot be greater than target amount');
      return;
    }
    
    if (projectData.hard_cap && projectData.hard_cap < projectData.target) {
      this.showError('Hard cap cannot be less than target amount');
      return;
    }
    
    try {
      // In a real implementation, this would call the API to create the project
      console.log('Creating project:', projectData);
      alert('Project creation simulated. In production, this would call the smart contract.');
      this.closeModal();
    } catch (error) {
      this.showError('Failed to create project');
    }
  }

  async manageCategories() {
    const modalTitle = 'Manage Project Categories';
    const modalBody = `
      <div class="form-section">
        <h5>Add New Category</h5>
        <div class="form-row">
          <div class="form-group">
            <label for="new-category-name">Category Name</label>
            <input type="text" class="form-control" id="new-category-name" placeholder="e.g., Community Development">
          </div>
          <div class="form-group">
            <label for="new-category-limit">Max Active Projects</label>
            <input type="number" class="form-control" id="new-category-limit" value="10" min="1">
          </div>
        </div>
        <button class="btn btn-primary" onclick="app.addCategory()">Add Category</button>
      </div>
      
      <div class="form-section">
        <h5>Existing Categories</h5>
        <table class="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Active Projects</th>
              <th>Max Limit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="categories-table-body">
            <tr>
              <td>Infrastructure</td>
              <td>3</td>
              <td>10</td>
              <td class="action-buttons">
                <button class="btn btn-xs btn-secondary">Edit</button>
                <button class="btn btn-xs btn-danger">Delete</button>
              </td>
            </tr>
            <tr>
              <td>Healthcare</td>
              <td>2</td>
              <td>8</td>
              <td class="action-buttons">
                <button class="btn btn-xs btn-secondary">Edit</button>
                <button class="btn btn-xs btn-danger">Delete</button>
              </td>
            </tr>
            <tr>
              <td>Education</td>
              <td>1</td>
              <td>5</td>
              <td class="action-buttons">
                <button class="btn btn-xs btn-secondary">Edit</button>
                <button class="btn btn-xs btn-danger">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
    
    this.showModal(modalTitle, modalBody);
  }

  async showMintSBTForm() {
    const modalTitle = 'Mint SBT (Soulbound Token)';
    const modalBody = `
      <form id="mint-sbt-form">
        <div class="alert alert-info">
          <strong>Note:</strong> SBTs are non-transferable tokens that represent voting weight in the DAO.
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="sbt-recipient">Recipient Address *</label>
            <input type="text" class="form-control" id="sbt-recipient" 
                   placeholder="0x..." pattern="^0x[a-fA-F0-9]{40}$" required>
          </div>
          <div class="form-group">
            <label for="sbt-donation-amount">Donation Amount (ETH) *</label>
            <input type="number" class="form-control" id="sbt-donation-amount" 
                   step="0.01" min="0.01" required>
            <div class="form-text">This determines the initial voting weight</div>
          </div>
        </div>
        
        <div class="form-section">
          <h5>Weight Configuration</h5>
          <div class="form-row">
            <div class="form-group">
              <label for="weight-mode">Weight Calculation Mode</label>
              <select class="form-control" id="weight-mode">
                <option value="linear">Linear (1:1 ratio)</option>
                <option value="quadratic">Quadratic (diminishing returns)</option>
                <option value="logarithmic">Logarithmic (heavy diminishing returns)</option>
              </select>
            </div>
            <div class="form-group">
              <label for="calculated-weight">Calculated Weight</label>
              <input type="text" class="form-control" id="calculated-weight" readonly>
            </div>
          </div>
        </div>
      </form>
    `;
    
    const modalFooter = `
      <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="app.submitMintSBT()">Mint SBT</button>
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
    const modalTitle = 'Start New Voting Round';
    const modalBody = `
      <form id="start-voting-form">
        <div class="alert alert-warning">
          <strong>Warning:</strong> Starting a new voting round will override any currently active round.
        </div>
        
        <div class="form-section">
          <h5>Timing Configuration</h5>
          <div class="form-row">
            <div class="form-group">
              <label for="commit-duration">Commit Phase Duration (hours)</label>
              <input type="number" class="form-control" id="commit-duration" value="168" min="1">
              <div class="form-text">Default: 168 hours (7 days)</div>
            </div>
            <div class="form-group">
              <label for="reveal-duration">Reveal Phase Duration (hours)</label>
              <input type="number" class="form-control" id="reveal-duration" value="72" min="1">
              <div class="form-text">Default: 72 hours (3 days)</div>
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h5>Voting Configuration</h5>
          <div class="form-row">
            <div class="form-group">
              <label for="counting-method">Counting Method</label>
              <select class="form-control" id="counting-method">
                <option value="weighted">Weighted Voting</option>
                <option value="borda">Borda Count</option>
              </select>
            </div>
            <div class="form-group">
              <label for="cancellation-threshold">Auto-cancellation Threshold (%)</label>
              <input type="number" class="form-control" id="cancellation-threshold" value="66" min="1" max="100">
              <div class="form-text">Minimum turnout required for project cancellation</div>
            </div>
          </div>
          
          <div class="checkbox-group">
            <input type="checkbox" id="enable-auto-cancellation" checked>
            <label for="enable-auto-cancellation">Enable automatic project cancellation</label>
          </div>
        </div>
        
        <div class="form-section" id="project-selection">
          <h5>Select Projects for Voting</h5>
          <div class="text-muted mb-2">Loading available projects...</div>
        </div>
      </form>
    `;
    
    const modalFooter = `
      <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="app.submitStartVoting()">Start Voting Round</button>
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
          <h5>Select Projects for Voting</h5>
          <div class="alert alert-warning">No active projects available for voting.</div>
        `;
        return;
      }
      
      let html = '<h5>Select Projects for Voting</h5>';
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
      alert('Blockchain reindexing initiated');
      // Refresh indexer status
      this.loadAdminSection();
    } catch (error) {
      this.showError('Failed to start reindexing');
    }
  }

  // Modal system
  showModal(title, body, footer = '') {
    const modal = document.getElementById('admin-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal-footer').innerHTML = footer || `
      <button class="btn btn-secondary" onclick="app.closeModal()">Close</button>
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
        <button class="btn btn-primary" onclick="app.showProjectForm()">Add New Project</button>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Status</th>
            <th>Target</th>
            <th>Allocated</th>
            <th>Progress</th>
            <th>Actions</th>
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
            <button class="btn btn-xs btn-secondary" onclick="app.editProject('${project.id}')">Edit</button>
            <button class="btn btn-xs btn-warning" onclick="app.pauseProject('${project.id}')">Pause</button>
            <button class="btn btn-xs btn-danger" onclick="app.cancelProject('${project.id}')">Cancel</button>
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
        <button class="btn btn-primary" onclick="app.showMintSBTForm()">Mint New SBT</button>
        <button class="btn btn-secondary ml-2" onclick="app.bulkUpdateWeights()">Bulk Update Weights</button>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Address</th>
            <th>SBT Weight</th>
            <th>Total Donated</th>
            <th>Voting Power</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    members.forEach(member => {
      html += `
        <tr>
          <td><code>${member.address}</code></td>
          <td>${member.sbt_weight.toFixed(3)}</td>
          <td>${this.formatETH(member.total_donated)} ETH</td>
          <td>${member.voting_power.toFixed(3)}</td>
          <td><span class="badge badge-${member.status === 'active' ? 'success' : 'secondary'}">${member.status}</span></td>
          <td class="action-buttons">
            <button class="btn btn-xs btn-secondary" onclick="app.updateMemberWeight('${member.address}')">Update Weight</button>
            <button class="btn btn-xs btn-warning" onclick="app.toggleMemberStatus('${member.address}')">Toggle Status</button>
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
        <button class="btn btn-primary" onclick="app.showStartVotingForm()">Start New Round</button>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Round ID</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Status</th>
            <th>Participants</th>
            <th>Turnout</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    rounds.forEach(round => {
      html += `
        <tr>
          <td><strong>#${round.round_id}</strong></td>
          <td>${round.start_date}</td>
          <td>${round.end_date}</td>
          <td><span class="badge badge-${round.status === 'completed' ? 'success' : 'warning'}">${round.status}</span></td>
          <td>${round.participants}</td>
          <td>${round.turnout}%</td>
          <td class="action-buttons">
            <button class="btn btn-xs btn-secondary" onclick="app.viewRoundDetails(${round.round_id})">View Details</button>
            <button class="btn btn-xs btn-secondary" onclick="app.exportRoundResults(${round.round_id})">Export</button>
          </td>
        </tr>
      `;
    });
    
    html += '</tbody></table>';
    return html;
  }

  async showSystemConfig() {
    const modalTitle = 'System Configuration';
    const modalBody = `
      <div class="form-section">
        <h5>Smart Contract Addresses</h5>
        <div class="form-group">
          <label for="treasury-address">Treasury Contract</label>
          <input type="text" class="form-control" id="treasury-address" value="0x..." readonly>
        </div>
        <div class="form-group">
          <label for="ballot-address">Ballot Contract</label>
          <input type="text" class="form-control" id="ballot-address" value="0x..." readonly>
        </div>
        <div class="form-group">
          <label for="sbt-address">GovernanceSBT Contract</label>
          <input type="text" class="form-control" id="sbt-address" value="0x..." readonly>
        </div>
      </div>
      
      <div class="form-section">
        <h5>System Parameters</h5>
        <div class="form-row">
          <div class="form-group">
            <label for="k-anonymity">K-Anonymity Threshold</label>
            <input type="number" class="form-control" id="k-anonymity" value="5" min="2">
          </div>
          <div class="form-group">
            <label for="max-export">Max Export Records</label>
            <input type="number" class="form-control" id="max-export" value="10000" min="100">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="default-commit-duration">Default Commit Duration (hours)</label>
            <input type="number" class="form-control" id="default-commit-duration" value="168" min="1">
          </div>
          <div class="form-group">
            <label for="default-reveal-duration">Default Reveal Duration (hours)</label>
            <input type="number" class="form-control" id="default-reveal-duration" value="72" min="1">
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h5>Security Settings</h5>
        <div class="checkbox-group">
          <input type="checkbox" id="enable-privacy-filters" checked>
          <label for="enable-privacy-filters">Enable privacy filtering for public data</label>
        </div>
        <div class="checkbox-group">
          <input type="checkbox" id="require-sbt-voting" checked>
          <label for="require-sbt-voting">Require SBT for voting participation</label>
        </div>
        <div class="checkbox-group">
          <input type="checkbox" id="enable-auto-finalization">
          <label for="enable-auto-finalization">Enable automatic voting round finalization</label>
        </div>
      </div>
    `;
    
    const modalFooter = `
      <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="app.saveSystemConfig()">Save Configuration</button>
    `;
    
    this.showModal(modalTitle, modalBody, modalFooter);
  }

  displayAdminContent(title, content) {
    document.getElementById('admin-content-title').textContent = title;
    document.getElementById('admin-content-body').innerHTML = content;
  }

  // Placeholder functions for additional admin actions
  async addCategory() {
    const name = document.getElementById('new-category-name').value;
    const limit = document.getElementById('new-category-limit').value;
    
    if (!name) {
      this.showError('Category name is required');
      return;
    }
    
    alert(`Add category "${name}" with limit ${limit} - simulated`);
  }

  async submitMintSBT() {
    const recipient = document.getElementById('sbt-recipient').value;
    const donationAmount = document.getElementById('sbt-donation-amount').value;
    const weightMode = document.getElementById('weight-mode').value;
    
    if (!recipient || !donationAmount) {
      this.showError('Please fill all required fields');
      return;
    }
    
    alert(`Mint SBT for ${recipient} with ${donationAmount} ETH (${weightMode} weight) - simulated`);
    this.closeModal();
  }

  async submitStartVoting() {
    const selectedProjects = Array.from(document.querySelectorAll('.voting-project:checked')).map(cb => cb.value);
    
    if (selectedProjects.length === 0) {
      this.showError('Please select at least one project for voting');
      return;
    }
    
    alert(`Start voting round with ${selectedProjects.length} projects - simulated`);
    this.closeModal();
  }

  async manageWeights() { alert('Weight management interface - simulated'); }
  async showVotingConfig() { alert('Voting configuration interface - simulated'); }
  async showLogsAdmin() { alert('System logs interface - simulated'); }
  async editProject(id) { alert(`Edit project ${id} - simulated`); }
  async pauseProject(id) { alert(`Pause project ${id} - simulated`); }
  async cancelProject(id) { alert(`Cancel project ${id} - simulated`); }
  async updateMemberWeight(address) { alert(`Update weight for ${address} - simulated`); }
  async toggleMemberStatus(address) { alert(`Toggle status for ${address} - simulated`); }
  async viewRoundDetails(roundId) { alert(`View details for round ${roundId} - simulated`); }
  async exportRoundResults(roundId) { alert(`Export results for round ${roundId} - simulated`); }
  async saveSystemConfig() { alert('Save system configuration - simulated'); this.closeModal(); }

  async startVoting() {
    alert('Start new voting round interface would open here');
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

// Initialize the application
const app = new FundChainApp();

// Handle page unload
window.addEventListener('beforeunload', () => {
  app.stopAutoRefresh();
});
