
// State Management with Persistence
const defaultState = {
    appointments: [], // Populated dynamically
    clients: [
        { id: 1, name: "Sarah Connor", phone: "11999999991" },
        { id: 2, name: "John Wick", phone: "11999999992" },
        { id: 3, name: "Ellen Ripley", phone: "11999999993" },
        { id: 4, name: "Marty McFly", phone: "11999999994" }
    ],
    services: [
        { id: 1, name: "Consulta", duration: 30, price: 150 },
        { id: 2, name: "Exame de Rotina", duration: 45, price: 200 },
        { id: 3, name: "Retorno", duration: 15, price: 0 }
    ],
    messages: []
};

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyACxo7xuXIVlCnGvGE_QetIbWhyB6V73PM",
  authDomain: "nelia-marques-scheduler.firebaseapp.com",
  databaseURL: "https://nelia-marques-scheduler-default-rtdb.firebaseio.com",
  projectId: "nelia-marques-scheduler",
  storageBucket: "nelia-marques-scheduler.firebasestorage.app",
  messagingSenderId: "898663480243",
  appId: "1:898663480243:web:1690883d4bd926ac2229c6",
  measurementId: "G-6G7N5J5VPN"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const stateRef = db.ref('state');

// State Management
let state = JSON.parse(JSON.stringify(defaultState));
let isSaving = false;
let isPendingSave = false;
let selectedServices = [];

// Create a small sync indicator in the UI
function updateSyncStatus(status) {
    let indicator = document.getElementById('sync-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'sync-indicator';
        indicator.style = 'position:fixed; bottom:20px; right:20px; font-size:0.75rem; color:var(--text-tertiary); background:white; padding:4px 10px; border-radius:20px; box-shadow:var(--shadow-md); z-index:9999; display:flex; align-items:center; gap:6px; border:1px solid var(--border-color); pointer-events:none; transition: opacity 0.3s;';
        document.body.appendChild(indicator);
    }

    if (status === 'saving') {
        indicator.innerHTML = '<i class="ph-fill ph-circle-notch ph-spin" style="color:var(--accent);"></i> A guardar na nuvem...';
        indicator.style.opacity = '1';
    } else if (status === 'synced') {
        indicator.innerHTML = '<i class="ph-fill ph-check-circle" style="color:var(--success);"></i> Sincronizado com a nuvem';
        setTimeout(() => { if (!isSaving && !isPendingSave) indicator.style.opacity = '0'; }, 3000);
    } else if (status === 'error') {
        indicator.innerHTML = '<i class="ph-fill ph-warning-circle" style="color:var(--danger);"></i> Erro de ligação';
        indicator.style.opacity = '1';
    }
}

function brandedConfirm(message) {
    return Promise.resolve(confirm(message));
}

// Initial Data Loading via Firebase
async function initializeData() {
    updateSyncStatus('saving');
    
    try {
        // Use .once() first for a more stable initial load on mobile
        const snapshot = await stateRef.once('value');
        const val = snapshot.val();
        
        if (!val) {
            console.log("Database empty, initializing...");
            await saveState();
        } else {
            console.log("Initial data loaded.");
            state = val;
            refreshCurrentView();
            updateSyncStatus('synced');
        }

        // After initial load, set up the real-time listener
        stateRef.on('value', (snapshot) => {
            const newVal = snapshot.val();
            if (!newVal) return;

            // Overwrite protection: Don't update if user is in a modal or saving
            if (document.querySelector('.modal-overlay.open') || isSaving || isPendingSave) return;

            if (JSON.stringify(newVal) !== JSON.stringify(state)) {
                console.log("Cloud update received...");
                const activeView = state.currentView;
                const activeMonth = state.selectedReportMonth;
                const activeArchive = state.showArchive;
                
                state = newVal;
                state.currentView = activeView;
                state.selectedReportMonth = activeMonth;
                state.showArchive = activeArchive;

                refreshCurrentView();
                updateSyncStatus('synced');
            }
        });

    } catch (error) {
        console.error("Firebase Init Error:", error);
        updateSyncStatus('error');
    }
}

function saveState() {
    isPendingSave = true;
    updateSyncStatus('saving');
    
    // Using Firebase set() for the entire state
    stateRef.set(state)
        .then(() => {
            isPendingSave = false;
            updateSyncStatus('synced');
            console.log("Cloud Save Successful");
        })
        .catch((error) => {
            isPendingSave = false;
            updateSyncStatus('error');
            console.error("Cloud Save Failed:", error);
        });
}

initializeData();

// DOM Elements
const contentArea = document.getElementById('content-area');
const pageTitle = document.getElementById('page-title');
const navItems = document.querySelectorAll('.nav-item');
const modalOverlay = document.getElementById('modal-overlay');

// Action Buttons
const btnNewAppt = document.getElementById('btn-new-appointment');
const btnNewService = document.getElementById('btn-new-service');
const btnPrintReport = document.getElementById('btn-print-report');
const searchZone = document.getElementById('search-zone');
const clientSearchInput = document.getElementById('client-search');

// Modals
const appointmentModal = document.getElementById('appointment-modal');
const clientModal = document.getElementById('client-modal');
const serviceModal = document.getElementById('service-modal');
const messageModal = document.getElementById('message-modal');
const btnQuickAddClient = document.getElementById('btn-quick-add-client');

// Titles
const modalTitle = document.getElementById('modal-title');
const serviceModalTitle = document.getElementById('service-modal-title');

// Forms
const formAppointment = document.getElementById('appointment-form');
const formClient = document.getElementById('client-form');
const formService = document.getElementById('service-form');

// Inputs
const inputId = document.getElementById('appt-id');
const inputName = document.getElementById('appt-name');
const inputDate = document.getElementById('appt-date');
const inputTime = document.getElementById('appt-time');
const inputType = document.getElementById('appt-type');

const clientInputId = document.getElementById('client-id');
const clientInputName = document.getElementById('client-name');
const clientInputPhone = document.getElementById('client-phone');
// clientInputObs will be retrieved dynamically to ensure safety

const serviceInputId = document.getElementById('service-id');
const serviceInputName = document.getElementById('service-name');
const serviceInputPrice = document.getElementById('service-price');

const msgRecipient = document.getElementById('msg-recipient');
const msgContent = document.getElementById('msg-content');
const msgPhoneHidden = document.getElementById('msg-phone-hidden');

const btnSendSms = document.getElementById('btn-send-sms');
const btnSendWhatsapp = document.getElementById('btn-send-whatsapp');
const btnSaveLog = document.getElementById('btn-save-log');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();

    // Add Icons to Nav (Mobile Polish)
    const navIcons = {
        'dashboard': 'ph-squares-four',
        'calendar': 'ph-calendar-blank',
        'clients': 'ph-users',
        'services': 'ph-briefcase',
        'reports': 'ph-chart-pie',
        'backup': 'ph-cloud-arrow-up'
    };

    document.querySelectorAll('.nav-item').forEach(item => {
        const view = item.dataset.view;
        if (navIcons[view] && !item.querySelector('i')) {
            const icon = document.createElement('i');
            icon.className = `ph ${navIcons[view]}`;
            icon.style.marginRight = '8px';
            icon.style.fontSize = '1.1rem';
            item.prepend(icon);
        }
    });

    refreshCurrentView();
    setupModals();
    setupEventDelegation();

    if (btnPrintReport) btnPrintReport.onclick = () => window.print();
    if (clientSearchInput) {
        clientSearchInput.oninput = (e) => {
            if (state.currentView === 'clients') {
                state.clientSearchQuery = e.target.value;
                renderClients();
            } else if (state.currentView === 'services') {
                state.serviceSearchQuery = e.target.value;
                renderServices();
            }
        };
    }
});

// Navigation Logic
function initNavigation() {
    // Set active class based on state
    navItems.forEach(nav => {
        nav.classList.toggle('active', nav.dataset.view === state.currentView);
    });

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            navItems.forEach(nav => nav.classList.remove('active'));
            e.currentTarget.classList.add('active');

            const view = e.currentTarget.dataset.view;
            state.currentView = view;
            saveState();
            refreshCurrentView();
        });
    });
}

const btnNewClient = document.getElementById('btn-new-client');

// ... (existing code) ...

function refreshCurrentView() {
    const view = state.currentView;

    // Explicit Visibility Logic
    if (btnNewAppt) btnNewAppt.style.display = (view === 'calendar') ? 'inline-flex' : 'none';
    if (btnNewService) btnNewService.style.display = (view === 'services') ? 'inline-flex' : 'none';
    if (btnNewClient) btnNewClient.style.display = (view === 'clients') ? 'inline-flex' : 'none';
    if (btnPrintReport) btnPrintReport.style.display = (view === 'reports') ? 'inline-flex' : 'none';
    if (searchZone) {
        searchZone.style.display = (view === 'clients' || view === 'services') ? 'block' : 'none';
        if (clientSearchInput) {
            clientSearchInput.placeholder = (view === 'services') ? "Pesquisar serviços..." : "Pesquisar Nome ou Contacto";
        }
    }

    if (view === 'dashboard') renderDashboard();
    else if (view === 'calendar') renderCalendar();
    else if (view === 'clients') renderClients();
    else if (view === 'services') renderServices();
    else if (view === 'reports') renderReports();
    else if (view === 'backup') renderBackup();
}

window.downloadBackup = function () {
    const backupData = JSON.stringify(state, null, 2);
    const blob = new Blob([backupData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_nelia_marques_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Backup concluído com sucesso!');
};

window.uploadBackup = function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                // Basic validation
                if (!data.clients || !data.appointments) {
                    alert("Arquivo de backup inválido.");
                    return;
                }

                if (await brandedConfirm("Isso irá substituir todos os dados atuais. Deseja continuar?")) {
                    state = data;
                    saveState();
                    refreshCurrentView();
                    showNotification('Dados restaurados com sucesso!');
                }
            } catch (err) {
                console.error("Erro ao ler backup:", err);
                alert("Erro ao ler o arquivo de backup. Certifique-se que é um arquivo JSON válido.");
            }
        };
        reader.readAsText(file);
    };
    input.click();
};

function renderBackup() {
    pageTitle.textContent = "Backup e Segurança";
    
    contentArea.innerHTML = `
        <div class="card" style="max-width: 600px; margin: 2rem auto; padding: 2rem; border-radius: 16px; box-shadow: var(--shadow-xl);">
            <div style="text-align: center; margin-bottom: 2rem;">
                <div style="width: 64px; height: 64px; background: var(--accent-light); color: var(--accent); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; font-size: 2rem;">
                    <i class="ph-fill ph-shield-check"></i>
                </div>
                <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">Proteja seus Dados</h2>
                <p style="color: var(--text-secondary); margin-top: 0.5rem;">Exporte uma cópia de segurança ou restaure dados de um arquivo anterior.</p>
            </div>

            <div style="display: grid; gap: 1.5rem;">
                <!-- Download Card -->
                <div class="backup-option-card" onclick="downloadBackup()" style="cursor: pointer; padding: 1.5rem; border: 1px solid var(--border-color); border-radius: 12px; transition: all 0.2s; display: flex; align-items: center; gap: 1.5rem;">
                    <div style="font-size: 1.5rem; color: var(--accent);">
                        <i class="ph ph-download-simple"></i>
                    </div>
                    <div style="flex: 1;">
                        <h4 style="font-weight: 600; color: var(--text-primary);">Baixar Backup</h4>
                        <p style="font-size: 0.85rem; color: var(--text-tertiary);">Cria um arquivo .json com todos os seus clientes e agendamentos.</p>
                    </div>
                    <i class="ph ph-caret-right" style="color: var(--text-tertiary);"></i>
                </div>

                <!-- Upload Card -->
                <div class="backup-option-card" onclick="uploadBackup()" style="cursor: pointer; padding: 1.5rem; border: 1px solid var(--border-color); border-radius: 12px; transition: all 0.2s; display: flex; align-items: center; gap: 1.5rem;">
                    <div style="font-size: 1.5rem; color: var(--rose);">
                        <i class="ph ph-upload-simple"></i>
                    </div>
                    <div style="flex: 1;">
                        <h4 style="font-weight: 600; color: var(--text-primary);">Restaurar Dados</h4>
                        <p style="font-size: 0.85rem; color: var(--text-tertiary);">Importa dados de um arquivo de backup. Isso substituirá os dados atuais.</p>
                    </div>
                    <i class="ph ph-caret-right" style="color: var(--text-tertiary);"></i>
                </div>
            </div>

            <div style="margin-top: 2rem; padding: 1rem; background: var(--bg-app); border-radius: 8px; font-size: 0.8rem; color: var(--text-secondary); display: flex; gap: 0.75rem; align-items: flex-start;">
                <i class="ph ph-info" style="font-size: 1.2rem; color: var(--accent);"></i>
                <p>Recomendamos fazer um backup semanalmente para garantir que suas informações estejam sempre seguras fora do sistema.</p>
            </div>
        </div>
    `;
}

// Render Functions
function renderDashboard() {
    pageTitle.textContent = "Painel";

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const todayDisplay = today.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    const tomorrowDisplay = tomorrow.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });

    const todaysAppts = state.appointments.filter(a => a.date === todayStr);
    const tomorrowAppts = state.appointments.filter(a => a.date === tomorrowStr);

    const formatAppt = (appt) => {
        const types = Array.isArray(appt.type) ? appt.type : [appt.type];
        return `
            <div class="appointment-item">
                <div class="appt-time">${appt.time}</div>
                <div class="appt-details">
                    <span class="client-name">${appt.clientName}</span>
                    <span class="appt-type"><i class="ph ph-sparkle"></i> ${types.join(', ')}</span>
                </div>
            </div>
        `;
    };

    const todayHTML = todaysAppts.length > 0 ? todaysAppts.map(formatAppt).join('') : '<div class="empty-state">🎉 Sem agendamentos.</div>';
    const tomorrowHTML = tomorrowAppts.length > 0 ? tomorrowAppts.map(formatAppt).join('') : '<div class="empty-state">📅 Sem agendamentos.</div>';

    contentArea.innerHTML = `
        <div class="dashboard-grid">
            <div class="card stat-card">
                <div class="stat-header"><span class="stat-icon"><i class="ph ph-trend-up"></i></span></div>
                <div class="stat-info"><span class="label">Total Agendamentos</span><span class="value">${state.appointments.length}</span></div>
            </div>
            <div class="card stat-card">
                <div class="stat-header"><span class="stat-icon"><i class="ph ph-users"></i></span></div>
                <div class="stat-info"><span class="label">Total Clientes</span><span class="value">${state.clients.length}</span></div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
            <div>
                <div class="section-header">
                    <h2>Agenda de Hoje</h2>
                    <span class="date-badge">${todayDisplay}</span>
                </div>
                <div class="appointments-list">${todayHTML}</div>
            </div>
            <div>
                <div class="section-header">
                    <h2>Previsão Amanhã</h2>
                    <span class="date-badge" style="background: var(--rose); color: white;">${tomorrowDisplay}</span>
                </div>
                <div class="appointments-list">${tomorrowHTML}</div>
            </div>
        </div>
    `;
}

function renderCalendar() {
    pageTitle.textContent = "Agenda";
    const today = new Date().toISOString().split('T')[0];

    // Sort all
    const allSorted = [...state.appointments].sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));

    const activeAppts = allSorted.filter(a => a.date >= today);
    const pastAppts = allSorted.filter(a => a.date < today);

    const renderGrouped = (appts) => {
        const grouped = {};
        appts.forEach(appt => {
            if (!grouped[appt.date]) grouped[appt.date] = [];
            grouped[appt.date].push(appt);
        });

        let html = '';
        for (const [date, dayAppts] of Object.entries(grouped)) {
            const [y, m, d] = date.split('-');
            const localDate = new Date(y, m - 1, d);
            const dateStr = localDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

            html += `<div style="margin-top: 2rem; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary); font-size: 0.9rem; text-transform: capitalize;">${dateStr}</div>`;
            html += dayAppts.map(appt => `
                <div class="appointment-item">
                    <div class="appt-time">${appt.time}</div>
                    <div class="appt-details">
                        <span class="client-name">${appt.clientName}</span>
                        <span class="appt-type"><i class="ph ph-sparkle"></i> ${Array.isArray(appt.type) ? appt.type.join(', ') : appt.type}</span>
                    </div>
                    <div class="appt-actions">
                        <button type="button" class="js-edit-btn" data-id="${appt.id}" title="Editar"><i class="ph ph-pencil-simple"></i></button>
                        <button type="button" class="js-msg-btn" data-name="${appt.clientName}" data-time="${appt.time}" title="Enviar Mensagem"><i class="ph ph-paper-plane-tilt"></i></button>
                        <button type="button" class="js-delete-btn btn-delete" data-type="appointment" data-id="${appt.id}" title="Excluir"><i class="ph ph-trash"></i></button>
                    </div>
                </div>
            `).join('');
        }
        return html;
    };

    let fullHTML = `<div class="appointments-list">${activeAppts.length > 0 ? renderGrouped(activeAppts) : '<div class="empty-state">Nenhum agendamento futuro encontrado.</div>'}</div>`;

    if (pastAppts.length > 0) {
        fullHTML += `
            <div style="margin-top: 3rem; text-align: center; border-top: 1px dashed var(--border-color); padding-top: 2rem;">
                <button type="button" class="btn btn-ghost" id="btn-toggle-archive" style="font-size: 0.85rem; color: var(--text-tertiary);">
                    <i class="ph ph-archive-box"></i> ${state.showArchive ? 'Esconder Histórico' : 'Ver Histórico (' + pastAppts.length + ')'}
                </button>
            </div>
            <div id="archive-container" class="appointments-list" style="display: ${state.showArchive ? 'block' : 'none'}; opacity: 0.7;">
                ${renderGrouped(pastAppts)}
            </div>
        `;
    }

    contentArea.innerHTML = fullHTML;

    const btnToggle = document.getElementById('btn-toggle-archive');
    if (btnToggle) {
        btnToggle.onclick = () => {
            state.showArchive = !state.showArchive;
            saveState();
            renderCalendar();
        };
    }
}

function renderClients() {
    pageTitle.textContent = "Clientes";

    const normalize = (str) => (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    let filteredClients = state.clients;
    if (state.clientSearchQuery) {
        const query = normalize(state.clientSearchQuery);
        filteredClients = state.clients.filter(c =>
            normalize(c.name).includes(query) ||
            (c.phone && normalize(c.phone).includes(query))
        );
    }

    if (filteredClients.length === 0) {
        contentArea.innerHTML = '<div class="empty-state">Nenhum cliente encontrado.</div>';
        return;
    }

    const clientHTML = filteredClients.map(client => `
        <div class="appointment-item">
            <div class="appt-details">
                <span class="client-name">${client.name}</span>
                <span class="appt-type">
                    <i class="ph ph-phone"></i> ${client.phone || 'Sem telefone'}
                </span>
                ${(client.observations && client.observations.trim().length > 0) ? `<div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 6px; padding-top: 4px; border-top: 1px dashed var(--border-color);">${client.observations}</div>` : ''}
            </div>
            <div class="appt-actions">
                <button type="button" class="js-edit-client-btn" data-id="${client.id}" title="Editar"><i class="ph ph-pencil-simple"></i></button>
                <button type="button" class="js-msg-btn" data-name="${client.name}" data-time="" title="Mensagem"><i class="ph ph-paper-plane-tilt"></i></button>
                <button type="button" class="js-delete-btn btn-delete" data-type="client" data-id="${client.id}" title="Excluir"><i class="ph ph-trash"></i></button>
            </div>
        </div>
    `).join('');
    contentArea.innerHTML = `<div class="appointments-list">${clientHTML}</div>`;
}

function renderServices() {
    pageTitle.textContent = "Serviços";

    let filtered = state.services;
    const query = state.serviceSearchQuery ? state.serviceSearchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

    if (query) {
        filtered = state.services.filter(s =>
            s.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query)
        );
    }

    if (filtered.length === 0) {
        contentArea.innerHTML = query ?
            '<div class="empty-state">Nenhum serviço encontrado para esta pesquisa.</div>' :
            '<div class="empty-state">Nenhum serviço cadastrado. Pressione "Novo Serviço" para adicionar.</div>';
        return;
    }

    const serviceHTML = filtered.map(service => `
        <div class="appointment-item">
            <div class="service-icon-box">
                <i class="ph ph-scissors"></i>
            </div>
            <div class="appt-details">
                <span class="client-name">${service.name}</span>
                <span class="appt-type">
                   <i class="ph ph-tag"></i> € ${parseFloat(service.price).toFixed(2)}
                </span>
            </div>
            <div class="appt-actions">
                <button type="button" class="js-edit-service-btn" data-id="${service.id}" title="Editar"><i class="ph ph-pencil-simple"></i> Editar</button>
                <button type="button" class="js-delete-btn btn-delete" data-type="service" data-id="${service.id}" title="Excluir"><i class="ph ph-trash"></i></button>
            </div>
        </div>
    `).join('');
    contentArea.innerHTML = `<div class="appointments-list">${serviceHTML}</div>`;
}

function renderReports() {
    pageTitle.textContent = "Relatórios";

    // Default to current month if not set
    if (!state.selectedReportMonth) {
        state.selectedReportMonth = new Date().toISOString().substring(0, 7);
    }

    const selectedMonth = state.selectedReportMonth;

    // Monthly stats
    const monthAppts = state.appointments.filter(a => a.date.startsWith(selectedMonth));

    const serviceSummary = {};
    let totalRevenue = 0;

    monthAppts.forEach(appt => {
        const types = Array.isArray(appt.type) ? appt.type : [appt.type];

        types.forEach(serviceName => {
            const service = state.services.find(s => s.name === serviceName);
            const price = service ? parseFloat(service.price) : 0;

            if (!serviceSummary[serviceName]) {
                serviceSummary[serviceName] = { count: 0, revenue: 0 };
            }
            serviceSummary[serviceName].count++;
            serviceSummary[serviceName].revenue += price;
            totalRevenue += price;
        });
    });

    const displayMonth = new Date(selectedMonth + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    let reportHTML = `
        <div class="report-controls no-print" style="margin-bottom: 2rem; display: flex; align-items: center; gap: 1rem; padding: 1rem; background: white; border-radius: 12px; border: 1px solid var(--border-color);">
            <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-secondary);">Mês de Referência:</div>
            <input type="month" id="report-month-picker" value="${selectedMonth}" style="padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-family: inherit;">
            <button class="btn" onclick="downloadBackup()" style="margin-left: auto; background: var(--bg-app); border: 1px solid var(--border-color); color: var(--text-secondary);">
                <i class="ph ph-cloud-arrow-down"></i> Fazer Backup de Segurança
            </button>
        </div>

        <div class="report-paper" id="printable-report">
            <div class="report-header-professional no-screen">
                <img src="logo.png" style="width: 80px; height: auto; margin: 0;">
                <div class="report-header-text">
                    <h1 style="color: #000 !important;">RELATÓRIO MENSAL</h1>
                    <p>Referente a ${displayMonth}</p>
                </div>
            </div>

            <div class="report-dashboard-grid">
                <div class="card report-summary-item">
                    <div class="report-label">Faturamento Total</div>
                    <div class="report-value">€ ${totalRevenue.toFixed(2)}</div>
                </div>
                <div class="card report-summary-item">
                    <div class="report-label">Total de Atendimentos</div>
                    <div class="report-value">${monthAppts.length}</div>
                </div>
            </div>

            <div class="card report-details-card">
                <div class="report-details-header">
                    <span>Detalhes dos Serviços (v3)</span>
                </div>
                <div class="report-table">
                    <div class="table-header">
                        <div class="col-service">Serviço</div>
                        <div class="col-qty">Qtd</div>
                        <div class="col-total">Total</div>
                    </div>
                    ${Object.entries(serviceSummary).length > 0 ? Object.entries(serviceSummary).map(([name, data]) => `
                        <div class="report-row">
                            <div class="col-service">${name}</div>
                            <div class="col-qty">${data.count}</div>
                            <div class="col-total" style="font-weight: 600;">€ ${data.revenue.toFixed(2)}</div>
                        </div>
                    `).join('') : '<div style="padding: 3rem; text-align: center; color: var(--text-tertiary);">Nenhum serviço realizado.</div>'}
                </div>
            </div>

            <div class="report-signature no-screen">
                <!-- Signature area removed as requested -->
            </div>
        </div>
    `;

    contentArea.innerHTML = reportHTML;

    // Listener for picker
    const picker = document.getElementById('report-month-picker');
    if (picker) {
        picker.addEventListener('change', (e) => {
            state.selectedReportMonth = e.target.value;
            saveState();
            renderReports();
        });
    }
}

// Event Delegation
function setupEventDelegation() {
    contentArea.addEventListener('click', (e) => {
        // Edit Appt
        const editBtn = e.target.closest('.js-edit-btn');
        if (editBtn) triggerEditAppt(editBtn.dataset.id);

        // Edit Client
        const editClientBtn = e.target.closest('.js-edit-client-btn');
        if (editClientBtn) triggerEditClient(editClientBtn.dataset.id);

        // Edit Service
        const editServiceBtn = e.target.closest('.js-edit-service-btn');
        if (editServiceBtn) triggerEditService(editServiceBtn.dataset.id);

        // Message
        const msgBtn = e.target.closest('.js-msg-btn');
        if (msgBtn) triggerMessage(msgBtn.dataset.name, msgBtn.dataset.time);

        // Delete
        const delBtn = e.target.closest('.js-delete-btn');
        if (delBtn) triggerDelete(delBtn.dataset.type, delBtn.dataset.id);
    });
}

async function triggerDelete(type, id) {
    if (!(await brandedConfirm('Tem certeza que deseja excluir?'))) return;

    if (type === 'appointment') {
        state.appointments = state.appointments.filter(a => a.id != id);
        showNotification('Agendamento excluído');
    } else if (type === 'client') {
        const client = state.clients.find(c => c.id == id);
        if (client) {
            const apptsToRemove = state.appointments.filter(a => a.clientName === client.name).length;
            if (apptsToRemove > 0) {
                if (await brandedConfirm(`Este cliente possui ${apptsToRemove} agendamento(s). Excluir tudo?`)) {
                    state.appointments = state.appointments.filter(a => a.clientName !== client.name);
                    state.clients = state.clients.filter(c => c.id != id);
                    showNotification('Cliente e dados excluídos');
                } else { return; }
            } else {
                state.clients = state.clients.filter(c => c.id != id);
                showNotification('Cliente excluído');
            }
        }
    } else if (type === 'service') {
        state.services = state.services.filter(s => s.id != id);
        showNotification('Serviço excluído');
    } else if (type === 'message') {
        state.messages = state.messages.filter(m => m.id != id);
        showNotification('Mensagem excluída');
    }

    saveState();
    refreshCurrentView();
}

// ... Triggers (Same as before) ...
function triggerEditAppt(id) {
    const appt = state.appointments.find(a => a.id == id);
    if (!appt) return;
    updateServiceOptions();
    updateClientOptions();
    if (inputId) inputId.value = appt.id;
    if (inputName) inputName.value = appt.clientName;
    if (inputDate) inputDate.value = appt.date;
    if (inputTime) inputTime.value = appt.time;

    // Set selected services
    selectedServices = Array.isArray(appt.type) ? [...appt.type] : [appt.type];
    renderSelectedServicesList();

    if (modalTitle) modalTitle.textContent = "Editar Agendamento";
    openModal(appointmentModal);
}

function renderSelectedServicesList() {
    const container = document.getElementById('selected-services-container');
    if (!container) return;
    container.innerHTML = selectedServices.map((s, index) => `
        <div style="background: var(--accent-light); color: var(--accent-text); padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; display: flex; align-items: center; gap: 6px; border: 1px solid rgba(99, 102, 241, 0.2);">
            ${s}
            <i class="ph ph-x" style="cursor: pointer;" onclick="removeServiceFromAppt(${index})"></i>
        </div>
    `).join('');
}

window.removeServiceFromAppt = (index) => {
    selectedServices.splice(index, 1);
    renderSelectedServicesList();
};

function triggerEditClient(id) {
    const client = state.clients.find(c => c.id == id);
    if (!client) return;
    if (clientInputId) clientInputId.value = client.id;
    if (clientInputName) clientInputName.value = client.name;
    if (clientInputPhone) clientInputPhone.value = client.phone || '';
    const obsInput = document.getElementById('client-observations');
    if (obsInput) obsInput.value = client.observations || '';
    openModal(clientModal);
}

function triggerEditService(id) {
    const service = state.services.find(s => s.id == id);
    if (!service) return;
    if (serviceInputId) serviceInputId.value = service.id;
    if (serviceInputName) serviceInputName.value = service.name;
    if (serviceInputPrice) serviceInputPrice.value = service.price;
    if (serviceModalTitle) serviceModalTitle.textContent = "Editar Serviço";
    openModal(serviceModal);
}

function triggerMessage(name, time) {
    const client = state.clients.find(c => c.name === name);
    if (msgRecipient) msgRecipient.value = name;

    if (msgPhoneHidden) msgPhoneHidden.value = client ? client.phone : '';

    if (btnSendSms) {
        btnSendSms.style.opacity = (client && client.phone) ? '1' : '0.5';
        btnSendSms.disabled = !(client && client.phone);
    }
    if (btnSendWhatsapp) {
        btnSendWhatsapp.style.opacity = (client && client.phone) ? '1' : '0.5';
        btnSendWhatsapp.disabled = !(client && client.phone);
    }

    if (msgContent) {
        const hourLabel = time || '[Hora]';
        const firstName = name ? name.split(' ')[0] : '[Nome]';
        msgContent.value = `Olá, ${firstName}! ✨\nAqui é a Nélia a relembrar que tem marcação amanhã às ${hourLabel}.\nSe não conseguir comparecer, agradeço que me avise.\nMuito obrigado\nAté breve! 😊`;
        setTimeout(() => msgContent.focus(), 100);
    }
    openModal(messageModal);
}

function updateServiceOptions() {
    if (!inputType) return;
    inputType.innerHTML = '<option value="" disabled selected>Adicionar serviço...</option>' +
        state.services.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    inputType.value = "";
}

// Add Service to current Appointment
function setupServiceAddLogic() {
    const btnAddService = document.getElementById('btn-add-service-to-appt');
    if (btnAddService) {
        btnAddService.onclick = () => {
            const serviceName = inputType.value ? inputType.value.trim() : "";
            if (serviceName && !selectedServices.includes(serviceName)) {
                selectedServices.push(serviceName);
                renderSelectedServicesList();
                inputType.value = "";
            }
        };
    }
}

function updateClientOptions() {
    const datalist = document.getElementById('client-list');
    if (!datalist) return;

    // Sort clients and generate options for the datalist
    datalist.innerHTML = state.clients
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(c => `<option value="${c.name}">${c.observations ? c.observations : ''}</option>`)
        .join('');
}

function showNotification(message) {
    if (!document.getElementById('notification-container')) return;
    const container = document.getElementById('notification-container');
    const toast = document.createElement('div');
    toast.className = `toast`;
    toast.innerHTML = `<i class="ph ph-check-circle"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function openModal(modalEl) {
    if (modalOverlay && modalEl) {
        [appointmentModal, clientModal, serviceModal, messageModal].forEach(m => {
            if (m) m.style.display = 'none';
        });
        const confirmModal = document.getElementById('confirm-modal');
        if (confirmModal) confirmModal.style.display = 'none';

        modalEl.style.display = 'block';
        modalOverlay.classList.add('open');
        modalOverlay.style.display = 'flex';
    }
}

function closeModals() {
    if (modalOverlay) modalOverlay.classList.remove('open');
    setTimeout(() => {
        if (modalOverlay) modalOverlay.style.display = 'none';
        [appointmentModal, clientModal, serviceModal, messageModal].forEach(m => {
            if (m) m.style.display = 'none';
        });
    }, 200);
}

function setupModals() {
    if (modalOverlay) modalOverlay.style.display = 'none';

    // Button Listeners
    setupServiceAddLogic();
    if (btnNewAppt) {
        btnNewAppt.addEventListener('click', () => {
            try {
                if (formAppointment) formAppointment.reset();
                updateServiceOptions();
                updateClientOptions();
                selectedServices = [];
                renderSelectedServicesList();
                if (inputId) inputId.value = '';
                if (modalTitle) modalTitle.textContent = "Novo Agendamento";
                if (inputDate) inputDate.value = new Date().toISOString().split('T')[0];
                openModal(appointmentModal);
            } catch (e) { console.error("Error opening appt modal:", e); }
        });
    }

    if (btnNewService) {
        btnNewService.addEventListener('click', () => {
            try {
                if (formService) formService.reset();
                if (serviceInputId) serviceInputId.value = '';
                if (serviceModalTitle) serviceModalTitle.textContent = "Novo Serviço";
                openModal(serviceModal);
            } catch (e) { console.error("Error opening service modal:", e); }
        });
    }

    if (btnNewClient) {
        btnNewClient.addEventListener('click', () => {
            try {
                if (formClient) formClient.reset();
                if (clientInputId) clientInputId.value = '';
                const obsInput = document.getElementById('client-observations');
                if (obsInput) obsInput.value = '';
                openModal(clientModal);
            } catch (e) { console.error("Error opening client modal:", e); }
        });
    }

    if (btnQuickAddClient) {
        btnQuickAddClient.addEventListener('click', () => {
            try {
                if (formClient) formClient.reset();
                if (clientInputId) clientInputId.value = '';
                const obsInput = document.getElementById('client-observations');
                if (obsInput) obsInput.value = '';
                openModal(clientModal);
            } catch (e) { console.error("Error opening quick add client modal:", e); }
        });
    }

    const allCloseBtns = document.querySelectorAll('.close-modal, .close-modal-client, .close-modal-service, .close-modal-msg, .close-modal-btn, .close-msg-btn, .close-client-btn, .close-service-btn');
    allCloseBtns.forEach(btn => btn.addEventListener('click', closeModals));

    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModals();
        });
    }

    // Submits
    if (formAppointment) {
        formAppointment.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = inputId.value;
            const clientName = inputName.value;

            if (!clientName.trim()) return;
            if (selectedServices.length === 0) {
                alert('Por favor, adicione pelo menos um serviço.');
                return;
            }

            const btnSubmit = e.target.querySelector('button[type="submit"]');
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<i class="ph ph-circle-notch ph-spin"></i> Salvando...';
            }

            let totalPrice = 0;
            selectedServices.forEach(sName => {
                const s = state.services.find(serv => serv.name === sName);
                if (s) totalPrice += parseFloat(s.price || 0);
            });

            const newAppt = {
                id: id || Date.now(),
                clientName,
                date: inputDate.value,
                time: inputTime.value,
                type: selectedServices, // Now an array
                price: totalPrice
            };

            const today = new Date().toISOString().split('T')[0];
            if (inputDate.value < today) {
                if (!(await brandedConfirm('A data selecionada já passou. Deseja continuar mesmo assim?'))) return;
            }

            const isOverlap = state.appointments.some(a => a.id != id && a.date === inputDate.value && a.time === inputTime.value);
            if (isOverlap) {
                if (!(await brandedConfirm('Já existe um agendamento neste horário. Deseja continuar mesmo assim?'))) return;
            }

            if (id) {
                const index = state.appointments.findIndex(a => a.id == id);
                if (index !== -1) state.appointments[index] = newAppt;
                showNotification('Agendamento Atualizado');
            } else {
                if (!state.clients.find(c => c.name === clientName)) {
                    state.clients.push({
                        id: Date.now(),
                        name: clientName,
                        phone: ''
                    });
                }
                state.appointments.push(newAppt);
                showNotification('Agendamento Criado');
            }
            saveState();
            closeModals();
            refreshCurrentView();

            // Re-enable button after small delay
            setTimeout(() => {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Salvar';
                }
            }, 1000);
        });
    }

    if (formClient) {
        formClient.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = clientInputId.value;
            const name = clientInputName.value;

            if (!name.trim()) return;

            if (id) {
                const index = state.clients.findIndex(c => c.id == id);
                if (index !== -1) {
                    const oldName = state.clients[index].name;
                    state.clients[index] = {
                        ...state.clients[index],
                        name,
                        phone: clientInputPhone.value,
                        observations: document.getElementById('client-observations') ? document.getElementById('client-observations').value : ''
                    };

                    if (oldName !== name) {
                        state.appointments.forEach(a => {
                            if (a.clientName === oldName) a.clientName = name;
                        });
                    }
                    showNotification('Cliente Atualizado');
                }
            } else {
                state.clients.push({
                    id: Date.now(),
                    name,
                    phone: clientInputPhone.value,
                    observations: document.getElementById('client-observations') ? document.getElementById('client-observations').value : ''
                });
                showNotification('Cliente Adicionado');
            }
            saveState();
            closeModals();
            refreshCurrentView();
        });
    }

    if (formService) {
        formService.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = serviceInputId.value;
            const name = serviceInputName.value;

            if (!name.trim()) return;

            if (id) {
                const index = state.services.findIndex(s => s.id == id);
                if (index !== -1) {
                    state.services[index] = { ...state.services[index], name, price: serviceInputPrice.value };
                    showNotification('Serviço Atualizado');
                }
            } else {
                state.services.push({
                    id: Date.now(),
                    name, price: serviceInputPrice.value
                });
                showNotification('Serviço Criado');
            }
            saveState();
            closeModals();
            refreshCurrentView();
        });
    }

    // Message Logic
    function logMessage(method) {
        const recipient = msgRecipient.value;
        const content = msgContent.value;

        if (!content.trim()) return;

        state.messages.push({
            id: Date.now(),
            to: recipient,
            content: content,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            method: method
        });
        saveState();
        refreshCurrentView();
    }

    if (btnSendSms) {
        btnSendSms.addEventListener('click', () => {
            const phone = msgPhoneHidden.value.replace(/\D/g, '');
            const text = encodeURIComponent(msgContent.value);
            if (phone) {
                // SMS Protocol - using location.href is more reliable for protocols than window.open
                console.log('Sending SMS to:', phone);
                window.location.href = `sms:${phone}?&body=${text}`;
                logMessage('SMS');
                showNotification('Abrindo aplicativo de SMS...');
                closeModals();
            } else {
                showNotification('Cliente sem telefone cadastrado');
            }
        });
    }

    if (btnSendWhatsapp) {
        btnSendWhatsapp.addEventListener('click', () => {
            const phone = msgPhoneHidden.value.replace(/\D/g, '');
            const text = encodeURIComponent(msgContent.value);
            if (phone) {
                window.open(`https://wa.me/55${phone}?text=${text}`, '_blank');
                logMessage('WhatsApp');
                showNotification('WhatsApp Aberto');
                closeModals();
            } else {
                showNotification('Cliente sem telefone cadastrado');
            }
        });
    }



    if (btnSaveLog) {
        btnSaveLog.addEventListener('click', () => {
            if (msgContent.value.trim()) {
                logMessage('Interno');
                showNotification('Mensagem Salva');
                closeModals();
            }
        });
    }
}
