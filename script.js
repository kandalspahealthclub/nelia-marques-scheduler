
// 1. Configuração do Estado Inicial
var defaultState = {
    appointments: [],
    clients: [
        { id: 1, name: "Maria Garcia", phone: "912345678" }
    ],
    services: [
        { id: 1, name: "Consulta", duration: 30, price: 150 }
    ],
    messages: [],
    currentView: 'dashboard'
};

// 2. Configuração do Firebase
var firebaseConfig = {
  apiKey: "AIzaSyACxo7xuXIVlCnGvGE_QetIbWhyB6V73PM",
  authDomain: "nelia-marques-scheduler.firebaseapp.com",
  databaseURL: "https://nelia-marques-scheduler-default-rtdb.firebaseio.com",
  projectId: "nelia-marques-scheduler",
  storageBucket: "nelia-marques-scheduler.firebasestorage.app",
  messagingSenderId: "898663480243",
  appId: "1:898663480243:web:1690883d4bd926ac2229c6",
  measurementId: "G-6G7N5J5VPN"
};

// Inicialização segura do Firebase
var db, stateRef;
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
    stateRef = db.ref('state');
} catch (e) {
    console.error("Erro ao ligar ao Firebase:", e);
}

// 3. Gestão de Estado
var state = JSON.parse(JSON.stringify(defaultState));
var isSaving = false;
var isPendingSave = false;
var selectedServices = [];

// Indicador de Sincronização em PT-PT
function updateSyncStatus(status) {
    var indicator = document.getElementById('sync-indicator');
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
        indicator.innerHTML = '<i class="ph-fill ph-check-circle" style="color:var(--success);"></i> Nuvem Sincronizada';
        setTimeout(function() { if (!isSaving && !isPendingSave) indicator.style.opacity = '0'; }, 3000);
    } else if (status === 'error') {
        indicator.innerHTML = '<i class="ph-fill ph-warning-circle" style="color:var(--danger);"></i> Erro de ligação';
        indicator.style.opacity = '1';
    }
}

async function initializeDatafunction() {
    updateSyncStatus('saving');
    try {
        var snapshot = await stateRef.once('value');
        var val = snapshot.val();
        
        if (!val) {
            await saveState(); 
        } else {
            state = val;
            state.currentView = 'dashboard'; // Forçar Painel como homepage ao iniciar
            refreshCurrentView();
            updateClientDatalist();
            updateSyncStatus('synced');
        }

        stateRef.on('value', function(snapshot) { 
            var newVal = snapshot.val();
            if (!newVal) return;
            if (document.querySelector('.modal-overlay.open') || isSaving || isPendingSave) return;
            if (JSON.stringify(newVal) !== JSON.stringify(state)) {
                var activeView = state.currentView;
                state = newVal;
                state.currentView = activeView;
                refreshCurrentView();
                updateClientDatalist();
                updateSyncStatus('synced');
            }
        });
    } catch (error) {
        console.error("Firebase Init Error:", error);
        updateSyncStatus('error');
    }
}

function saveStatefunction() {
    isPendingSave = true;
    updateSyncStatus('saving');
    return stateRef.set(state).then(function() { 
        isPendingSave = false;
        updateSyncStatus('synced');
    }).catch(e => {
        isPendingSave = false;
        updateSyncStatus('error');
    });
}

// 4. DOM Elements
var contentArea, pageTitle, navItems, modalOverlay;
var btnNewAppt, btnNewService, btnNewClient, btnPrintReport, searchZone, clientSearchInput;
var appointmentModal, clientModal, serviceModal, messageModal;

function initDOMElementsfunction() {
    contentArea = document.getElementById('content-area');
    pageTitle = document.getElementById('page-title');
    navItems = document.querySelectorAll('.nav-item');
    modalOverlay = document.getElementById('modal-overlay');
    btnNewAppt = document.getElementById('btn-new-appointment');
    btnNewService = document.getElementById('btn-new-service');
    btnNewClient = document.getElementById('btn-new-client');
    btnPrintReport = document.getElementById('btn-print-report');
    searchZone = document.getElementById('search-zone');
    clientSearchInput = document.getElementById('client-search');
    appointmentModal = document.getElementById('appointment-modal');
    clientModal = document.getElementById('client-modal');
    serviceModal = document.getElementById('service-modal');
    messageModal = document.getElementById('message-modal');
}

// 5. Navigation
function initNavigationfunction() {
    navItems.forEach(nav => {
        nav.classList.toggle('active', nav.dataset.view === state.currentView);
    });

    navItems.forEach(item => {
        item.addEventListener('click', function(e) { 
            navItems.forEach(nav => nav.classList.remove('active'));
            e.currentTarget.classList.add('active');
            state.currentView = e.currentTarget.dataset.view;
            // Clear search when changing views
            state.clientSearchQuery = "";
            state.serviceSearchQuery = "";
            if (clientSearchInput) clientSearchInput.value = "";
            saveState();
            refreshCurrentView();
        });
    });
}

function refreshCurrentViewfunction() {
    var view = state.currentView || 'dashboard';
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
    else if (view === 'birthdays') renderBirthdays();
}

window.goToBirthdays = function() {
    state.currentView = 'birthdays';
    if (typeof refreshCurrentView === 'function') refreshCurrentView();
    else if (typeof refreshView === 'function') refreshView();
};

// Helper to get client observations
function getClientObs(name) {
    if (!name) return '';
    // Robust lookup: try direct match, then strip observations if present
    var client = state.clients.find(c => c.name === name);
    if (!client && name.includes(' - ')) {
        var cleanName = name.split(' - ')[0].trim();
        client = state.clients.find(c => c.name === cleanName);
    }
    return (client && client.observations) ? `<span style="opacity: 0.5; font-weight: 400; font-size: 0.85rem; margin-left: 8px;">(${client.observations})</span>` : '';
}

// Helper to get birthdays of the week
function getWeekBirthdaysfunction() {
    var today = new Date();
    var start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
    var weekDates = [];
    for (var i = 0; i < 7; i++) {
        var d = new Date(start);
        d.setDate(start.getDate() + i);
        weekDates.push({ m: d.getMonth() + 1, d: d.getDate(), s: d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }) });
    }
    return state.clients.filter(function(c) {
        if (!c.birthdate) return false;
        var parts = c.birthdate.split('-');
        var bm = parseInt(parts[1], 10);
        var bd = parseInt(parts[2], 10);
        return weekDates.some(function(wd) { return wd.m === bm && wd.d === bd; });
    }).map(function(c) {
        var parts = c.birthdate.split('-');
        var bm = parseInt(parts[1], 10);
        var bd = parseInt(parts[2], 10);
        var wd = weekDates.find(function(w) { return w.m === bm && w.d === bd; });
        return { name: c.name, dayDisplay: wd.s, phone: c.phone };
    });
}

// 6. Render Functions (Premium Look Restored)
function renderDashboardfunction() {
    pageTitle.textContent = "Painel";
    var today = new Date();
    var tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    var todayStr = today.toISOString().split('T')[0];
    var tomorrowStr = tomorrow.toISOString().split('T')[0];
    var todayDisplay = today.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
    var tomorrowDisplay = tomorrow.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });

    var todaysAppts = state.appointments.filter(a => a.date === todayStr);
    var tomorrowAppts = state.appointments.filter(a => a.date === tomorrowStr);

    var formatAppt = function(appt) { 
        var types = Array.isArray(appt.type) ? appt.type : [appt.type];
        return `
            <div class="appointment-item">
                <div class="appt-time">${appt.time}</div>
                <div class="appt-details">
                    <span class="client-name">${appt.clientName}${getClientObs(appt.clientName)}</span>
                    <span class="appt-type"><i class="ph ph-sparkle"></i> ${types.join(', ')}</span>
                </div>
            </div>
        `;
    };
    var bdays = getWeekBirthdays();

    contentArea.innerHTML = `
        <div class="dashboard-grid">
            <div class="card stat-card">
                <div class="stat-header"><span class="stat-icon"><i class="ph ph-trend-up"></i></span></div>
                <div class="stat-info"><span class="label">Total de Marcações</span><span class="value">${state.appointments.length}</span></div>
            </div>
            <div class="card stat-card">
                <div class="stat-header"><span class="stat-icon"><i class="ph ph-users"></i></span></div>
                <div class="stat-info"><span class="label">Total de Clientes</span><span class="value">${state.clients.length}</span></div>
            </div>
            <div class="card stat-card" style="border-color: var(--rose); cursor: pointer;" onclick="goToBirthdays()">
                <div class="stat-header"><span class="stat-icon" style="background: var(--rose);"><i class="ph ph-cake"></i></span></div>
                <div class="stat-info">
                    <span class="label">Aniversários da Semana</span>
                    <div style="max-height: 100px; overflow-y: auto; font-size: 0.8rem; line-height: 1.3;">
                        ${bdays.length > 0 ? bdays.map(b => `<div style="color: var(--text-primary); font-weight: 600; margin-bottom: 2px;">${b.name} <span style="font-weight:400; opacity:0.8;">(${b.dayDisplay})</span></div>`).join('') : '<span class="value" style="font-size: 1.25rem;">0</span>'}
                    </div>
                </div>
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
            <div>
                <div class="section-header"><h2>Agenda de Hoje</h2><span class="date-badge">${todayDisplay}</span></div>
                <div class="appointments-list">${todaysAppts.length > 0 ? todaysAppts.map(formatAppt).join('') : '<div class="empty-state">Sem marcações para hoje.</div>'}</div>
            </div>
            <div>
                <div class="section-header"><h2>Previsão para Amanhã</h2><span class="date-badge" style="background: var(--rose); color: white;">${tomorrowDisplay}</span></div>
                <div class="appointments-list">${tomorrowAppts.length > 0 ? tomorrowAppts.map(formatAppt).join('') : '<div class="empty-state">Sem marcações para amanhã.</div>'}</div>
            </div>
        </div>
    `;
}

function renderCalendarfunction() {
    pageTitle.textContent = "Agenda";
    var today = new Date().toISOString().split('T')[0];
    var allSorted = [].concat(state.appointments).sort(function(a, b) { 
        return new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time);
    });
    var activeAppts = allSorted.filter(function(a) { return a.date >= today; });
    var pastAppts = allSorted.filter(function(a) { return a.date < today; });

    var renderGrouped = function(appts) { 
        var grouped = {};
        appts.forEach(function(appt) {
            if (!grouped[appt.date]) grouped[appt.date] = [];
            grouped[appt.date].push(appt);
        });
        var html = '';
        var entries = Object.keys(grouped).sort();
        for (var i = 0; i < entries.length; i++) {
            var date = entries[i];
            var dayAppts = grouped[date];
            var parts = date.split('-');
            var localDate = new Date(parts[0], parts[1] - 1, parts[2]);
            var dateStr = localDate.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
            html += `<div style="margin-top: 2rem; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-primary); font-size: 0.9rem; text-transform: capitalize;">${dateStr}</div>`;
            html += dayAppts.map(function(appt) {
                return `
                <div class="appointment-item">
                    <div class="appt-time">${appt.time}</div>
                    <div class="appt-details">
                        <span class="client-name">${appt.clientName}${getClientObs(appt.clientName)}</span>
                        <span class="appt-type"><i class="ph ph-sparkle"></i> ${Array.isArray(appt.type) ? appt.type.join(', ') : appt.type}</span>
                    </div>
                    <div class="appt-actions">
                        <button type="button" class="js-edit-btn" data-id="${appt.id}" title="Editar"><i class="ph ph-pencil-simple"></i></button>
                        <button type="button" class="js-msg-btn" data-name="${appt.clientName}" data-time="${appt.time}" title="Enviar Mensagem"><i class="ph ph-paper-plane-tilt"></i></button>
                        <button type="button" class="js-delete-btn btn-delete" data-type="appointment" data-id="${appt.id}" title="Eliminar"><i class="ph ph-trash"></i></button>
                    </div>
                </div>
            `;}).join('');
        }
        return html;
    };

    var fullHTML = `<div class="appointments-list">${activeAppts.length > 0 ? renderGrouped(activeAppts) : '<div class="empty-state">Nenhuma marcação futura encontrada.</div>'}</div>`;
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
    var btnToggle = document.getElementById('btn-toggle-archive');
    if (btnToggle) btnToggle.onclick = function() { state.showArchive = !state.showArchive; renderCalendar(); };
}

function renderClientsfunction() {
    pageTitle.textContent = "Clientes";
    var normalize = function(str) { return (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); };
    var filteredClients = state.clients;
    if (state.clientSearchQuery) {
        var query = normalize(state.clientSearchQuery);
        filteredClients = state.clients.filter(c => normalize(c.name).includes(query) || (c.phone && normalize(c.phone).includes(query)));
    }
    if (filteredClients.length === 0) {
        contentArea.innerHTML = '<div class="empty-state">Nenhum cliente encontrado.</div>';
        return;
    }
    contentArea.innerHTML = `<div class="appointments-list">${filteredClients.map(client => `
        <div class="appointment-item">
            <div class="appt-details">
                <span class="client-name">${client.name}</span>
                <span class="appt-type">
                    <span><i class="ph ph-phone"></i> ${client.phone || 'Sem contacto'}</span>
                    ${client.birthdate ? `<span style="margin-left: 15px;"><i class="ph ph-cake"></i> ${client.birthdate.split('-').reverse().join('/')}</span>` : ''}
                </span>
                ${(client.observations) ? `<div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 6px; padding-top: 4px; border-top: 1px dashed var(--border-color);">${client.observations}</div>` : ''}
            </div>
            <div class="appt-actions">
                <button type="button" class="js-edit-client-btn" data-id="${client.id}" title="Editar"><i class="ph ph-pencil-simple"></i></button>
                <button type="button" class="js-msg-btn" data-name="${client.name}" data-time="" title="Mensagem"><i class="ph ph-paper-plane-tilt"></i></button>
                <button type="button" class="js-delete-btn btn-delete" data-type="client" data-id="${client.id}" title="Eliminar"><i class="ph ph-trash"></i></button>
            </div>
        </div>
    `).join('')}</div>`;
}

function renderServicesfunction() {
    pageTitle.textContent = "Serviços";
    var filtered = state.services;
    var query = state.serviceSearchQuery ? state.serviceSearchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    if (query) filtered = state.services.filter(s => s.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query));
    if (filtered.length === 0) {
        contentArea.innerHTML = '<div class="empty-state">Nenhum serviço encontrado.</div>';
        return;
    }
    contentArea.innerHTML = `<div class="appointments-list">${filtered.map(service => `
        <div class="appointment-item">
            <div class="service-icon-box"><i class="ph ph-scissors"></i></div>
            <div class="appt-details">
                <span class="client-name">${service.name}</span>
                <span class="appt-type"><i class="ph ph-tag"></i> € ${parseFloat(service.price).toFixed(2)}</span>
            </div>
            <div class="appt-actions">
                <button type="button" class="js-edit-service-btn" data-id="${service.id}" title="Editar"><i class="ph ph-pencil-simple"></i> Editar</button>
                <button type="button" class="js-delete-btn btn-delete" data-type="service" data-id="${service.id}" title="Eliminar"><i class="ph ph-trash"></i></button>
            </div>
        </div>
    `).join('')}</div>`;
}

function renderReportsfunction() {
    pageTitle.textContent = "Relatórios";
    if (!state.selectedReportMonth) state.selectedReportMonth = new Date().toISOString().substring(0, 7);
    var selectedMonth = state.selectedReportMonth;
    var monthAppts = state.appointments.filter(a => a.date.startsWith(selectedMonth));
    var serviceSummary = {};
    var totalRevenue = 0;
    monthAppts.forEach(appt => {
        var types = Array.isArray(appt.type) ? appt.type : [appt.type];
        types.forEach(serviceName => {
            var service = state.services.find(s => s.name === serviceName);
            var price = service ? parseFloat(service.price) : 0;
            if (!serviceSummary[serviceName]) serviceSummary[serviceName] = { count: 0, revenue: 0 };
            serviceSummary[serviceName].count++;
            serviceSummary[serviceName].revenue += price;
            totalRevenue += price;
        });
    });
    var displayMonth = new Date(selectedMonth + '-01').toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
    contentArea.innerHTML = `
        <div class="report-controls no-print" style="margin-bottom: 2rem; display: flex; align-items: center; gap: 1rem; padding: 1rem; background: white; border-radius: 12px;">
            <div style="font-weight: 600; font-size: 0.9rem;">Mês:</div>
            <input type="month" id="report-month-picker" value="${selectedMonth}" style="padding: 8px; border-radius: 8px; border: 1px solid var(--border-color);">
            <button class="btn btn-ghost" onclick="downloadBackup()" style="margin-left: auto;"><i class="ph ph-cloud-arrow-down"></i> Backup</button>
        </div>
        <div class="report-paper">
            <h3>Relatório de ${displayMonth}</h3>
            <div class="dashboard-grid" style="margin-top: 1rem;">
                <div class="card"><span class="label">Faturamento</span><span class="value">€ ${totalRevenue.toFixed(2)}</span></div>
                <div class="card"><span class="label">Total</span><span class="value">${monthAppts.length}</span></div>
            </div>
        </div>
    `;
    var picker = document.getElementById('report-month-picker');
    if (picker) picker.onchange = function(e) { state.selectedReportMonth = e.target.value; saveState(); renderReports(); };
}

function renderBackupfunction() {
    pageTitle.textContent = "Backup";
    contentArea.innerHTML = `
        <div class="card" style="max-width: 500px; margin: 2rem auto; text-align: center; padding: 2rem;">
            <i class="ph ph-shield-check" style="font-size: 3rem; color: var(--accent); margin-bottom: 1rem;"></i>
            <h2>Segurança de Dados</h2>
            <div style="display: grid; gap: 1rem; margin-top: 1.5rem;">
                <button class="btn btn-primary" onclick="downloadBackup()">Baixar Cópia</button>
                <button class="btn btn-ghost" onclick="uploadBackup()">Restaurar Cópia</button>
            </div>
        </div>
    `;
}

// 7. Actions & Modals
window.triggerDelete = async function(type, id) {
    if(!(await brandedConfirm('Deseja eliminar este item?'))) return;
    if(type === 'appointment') state.appointments = state.appointments.filter(a => a.id != id);
    else if(type === 'client') state.clients = state.clients.filter(c => c.id != id);
    else if(type === 'service') state.services = state.services.filter(s => s.id != id);
    saveState(); refreshCurrentView();
};

function openModal(modalEl) {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    modalEl.style.display = 'block';
    modalOverlay.classList.add('open');
    modalOverlay.style.display = 'flex';
}
window.closeModals = function() { 
    modalOverlay.classList.remove('open'); 
    setTimeout(function() { modalOverlay.style.display = 'none'; }, 200); 
};

// 8. Event Delegation (Restore edit/msg logic)
function setupEventDelegationfunction() {
    contentArea.addEventListener('click', function(e) { 
        var editBtn = e.target.closest('.js-edit-btn');
        if (editBtn) triggerEditAppt(editBtn.dataset.id);
        var editClientBtn = e.target.closest('.js-edit-client-btn');
        if (editClientBtn) triggerEditClient(editClientBtn.dataset.id);
        var editServiceBtn = e.target.closest('.js-edit-service-btn');
        if (editServiceBtn) triggerEditService(editServiceBtn.dataset.id);
        var msgBtn = e.target.closest('.js-msg-btn');
        if (msgBtn) triggerMessage(msgBtn.dataset.name, msgBtn.dataset.time);
        var delBtn = e.target.closest('.js-delete-btn');
        if (delBtn) triggerDelete(delBtn.dataset.type, delBtn.dataset.id);
    });
}

function triggerEditAppt(id) {
    var appt = state.appointments.find(a => a.id == id);
    if (!appt) return;
    document.getElementById('appt-id').value = appt.id;
    document.getElementById('appt-name').value = appt.clientName;
    document.getElementById('appt-date').value = appt.date;
    document.getElementById('appt-time').value = appt.time;
    selectedServices = Array.isArray(appt.type) ? [...appt.type] : [appt.type];
    renderSelectedServicesList();
    document.getElementById('modal-title').textContent = "Editar Marcação";
    updateServiceOptions();
    updateClientDatalist();
    openModal(appointmentModal);
}

function triggerEditClient(id) {
    var client = state.clients.find(c => c.id == id);
    if (!client) return;
    document.getElementById('client-id').value = client.id;
    document.getElementById('client-name').value = client.name;
    document.getElementById('client-phone').value = client.phone || '';
    document.getElementById('client-birthdate').value = client.birthdate || '';
    document.getElementById('client-observations').value = client.observations || '';
    openModal(clientModal);
}

function triggerEditService(id) {
    var service = state.services.find(s => s.id == id);
    if (!service) return;
    document.getElementById('service-id').value = service.id;
    document.getElementById('service-name').value = service.name;
    document.getElementById('service-price').value = service.price;
    document.getElementById('service-modal-title').textContent = "Editar Serviço";
    openModal(serviceModal);
}

function triggerMessage(name, time) {
    // Robust lookup: try direct match, then strip observations if present (from old data)
    var client = state.clients.find(c => c.name === name);
    if (!client && name.includes(' - ')) {
        var cleanName = name.split(' - ')[0].trim();
        client = state.clients.find(c => c.name === cleanName);
    }

    document.getElementById('msg-recipient').value = client ? client.name : name;
    document.getElementById('msg-phone-hidden').value = client ? client.phone : '';
    var hourLabel = time || '[Hora]';
    var firstName = (client ? client.name : name).split(' ')[0];
    document.getElementById('msg-content').value = `Olá, ${firstName}! ✨\nAqui é a Nélia a relembrar que tem marcação amanhã às ${hourLabel}.\nSe não conseguir comparecer, agradeço que me avise.\nMuito obrigada\nAté breve! 😊`;
    openModal(messageModal);
}

function updateServiceOptionsfunction() {
    var inputType = document.getElementById('appt-type');
    if (!inputType) return;
    inputType.innerHTML = '<option value="" disabled selected>Adicionar serviço...</option>' + state.services.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
}

function updateClientDatalistfunction() {
    var dataList = document.getElementById('client-list');
    if (!dataList) return;
    dataList.innerHTML = state.clients.map(c => {
        // Keeping the value as the name only, but showing observations in the dropdown text
        return `<option value="${c.name}">${c.name}${c.observations ? ' - ' + c.observations : ''}</option>`;
    }).join('');
}

function renderSelectedServicesListfunction() {
    var container = document.getElementById('selected-services-container');
    if (container) container.innerHTML = selectedServices.map(function(s, i) { 
        return `<div style="background:var(--accent-light); padding:4px 12px; border-radius:20px; font-size:0.85rem; display:flex; align-items:center; gap:8px;">${s} <i class="ph ph-x" onclick="removeServiceFromAppt(${i})" style="cursor:pointer"></i></div>`;
    }).join('');
}
window.removeServiceFromAppt = function(i) { selectedServices.splice(i, 1); renderSelectedServicesList(); };

function showNotification(msg) {
    var container = document.getElementById('notification-container');
    if (!container) return;
    var toast = document.createElement('div'); toast.className = 'toast';
    toast.innerHTML = `<i class="ph ph-check-circle"></i><span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(function() { 
        toast.style.opacity = '0'; 
        setTimeout(function() { toast.remove(); }, 300); 
    }, 3000);
}

async function brandedConfirm(message) {
    return new Promise(function(resolve) { 
        var modal = document.getElementById('confirm-modal');
        var overlay = document.getElementById('modal-overlay');
        var msgEl = document.getElementById('confirm-msg');
        var btnYes = document.getElementById('confirm-yes');
        var btnNo = document.getElementById('confirm-no');

        if (!modal || !overlay) {
            resolve(window.confirm(message));
            return;
        }

        msgEl.textContent = message;
        
        var cleanup = function(result) { 
            btnYes.onclick = null;
            btnNo.onclick = null;
            modal.style.display = 'none';
            overlay.classList.remove('open');
            setTimeout(function() { overlay.style.display = 'none'; }, 200);
            resolve(result);
        };

        btnYes.onclick = function() { cleanup(true); };
        btnNo.onclick = function() { cleanup(false); };

        // Abrir
        document.querySelectorAll('.modal').forEach(function(m) { m.style.display = 'none'; });
        modal.style.display = 'block';
        modalOverlay.classList.add('open');
        modalOverlay.style.display = 'flex';
    });
}

// 9. Startup & Form Listeners
document.addEventListener('DOMContentLoaded', function() { 
    initDOMElements();
    initNavigation();
    setupEventDelegation();

    document.querySelectorAll('.close-modal, .close-modal-btn, .close-client-btn, .close-service-btn, .close-msg-btn').forEach(function(b) { b.onclick = closeModals; });
    modalOverlay.onclick = function(e) { if (e.target === modalOverlay) closeModals(); };

    document.getElementById('btn-new-appointment').onclick = function() { 
        document.getElementById('appointment-form').reset();
        document.getElementById('appt-id').value = '';
        selectedServices = [];
        renderSelectedServicesList();
        document.getElementById('modal-title').textContent = "Nova Marcação";
        document.getElementById('appt-date').value = new Date().toISOString().split('T')[0];
        updateServiceOptions();
        updateClientDatalist();
        openModal(appointmentModal);
    };

    document.getElementById('btn-new-service').onclick = function() { 
        document.getElementById('service-form').reset();
        document.getElementById('service-id').value = '';
        document.getElementById('service-modal-title').textContent = "Novo Serviço";
        openModal(serviceModal);
    };

    document.getElementById('btn-new-client').onclick = function() { 
        document.getElementById('client-form').reset();
        document.getElementById('client-id').value = '';
        openModal(clientModal);
    };

    document.getElementById('appointment-form').onsubmit = async function(e) { 
        e.preventDefault();
        var id = document.getElementById('appt-id').value;
        
        var clientName = document.getElementById('appt-name').value;
        // Clean name if user selected it with observation suffix from old datalist version
        if (clientName.includes(' - ')) {
            clientName = clientName.split(' - ')[0].trim();
        }

        var newAppt = {
            id: id || Date.now(),
            clientName: clientName,
            date: document.getElementById('appt-date').value,
            time: document.getElementById('appt-time').value,
            type: selectedServices,
            price: selectedServices.reduce(function(acc, sName) { 
                var s = state.services.find(function(ser) { return ser.name === sName; });
                return acc + (s ? parseFloat(s.price) : 0);
            }, 0)
        };
        if(id) {
            var idx = state.appointments.findIndex(function(a) { return a.id == id; });
            if(idx !== -1) state.appointments[idx] = newAppt;
        } else {
            state.appointments.push(newAppt);
        }
        await saveState(); closeModals(); refreshCurrentView(); showNotification('Guardado!');
    };

function renderBirthdaysfunction() {
    pageTitle.textContent = "Aniversários da Semana";
    var bdays = getWeekBirthdays();
    
    if (bdays.length === 0) {
        contentArea.innerHTML = `
            <div class="empty-state">
                <i class="ph ph-balloon" style="font-size: 3rem; margin-bottom: 1rem; color: var(--rose);"></i>
                <p>Nenhum aniversário esta semana.</p>
                <button class="btn btn-ghost" onclick="state.currentView='dashboard'; refreshCurrentView();" style="margin-top: 1rem;">Voltar ao Painel</button>
            </div>`;
        return;
    }
    
    contentArea.innerHTML = `
        <div style="margin-bottom: 1.5rem;">
            <button class="btn btn-ghost" onclick="state.currentView='dashboard'; refreshCurrentView();">
                <i class="ph ph-arrow-left"></i> Voltar ao Painel
            </button>
        </div>
        <div class="appointments-list">
            ${bdays.map(client => `
                <div class="appointment-item" style="border-left: 4px solid var(--rose);">
                    <div class="appt-details">
                        <span class="client-name">${client.name}</span>
                        <span class="appt-type">
                            <span><i class="ph ph-cake"></i> ${client.dayDisplay}</span>
                            <span style="margin-left: 15px;"><i class="ph ph-phone"></i> ${client.phone || 'Sem contacto'}</span>
                        </span>
                    </div>
                    <div class="appt-actions">
                        <button onclick="openMsgModal('${client.name}', '')" title="Enviar Mensagem de Parabéns"><i class="ph ph-paper-plane-tilt"></i></button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

    document.getElementById('client-form').onsubmit = async function(e) { 
        e.preventDefault();
        var id = document.getElementById('client-id').value;
        var cData = {
            id: id || Date.now(),
            name: document.getElementById('client-name').value,
            phone: document.getElementById('client-phone').value,
            birthdate: document.getElementById('client-birthdate').value,
            observations: document.getElementById('client-observations').value
        };
        if(id) {
            var idx = state.clients.findIndex(function(c) { return c.id == id; });
            if(idx !== -1) state.clients[idx] = cData;
        } else {
            state.clients.push(cData);
        }
        await saveState(); closeModals(); refreshCurrentView(); updateClientDatalist(); showNotification('Cliente Guardado!');
    };

    document.getElementById('service-form').onsubmit = async function(e) { 
        e.preventDefault();
        var id = document.getElementById('service-id').value;
        var sData = {
            id: id || Date.now(),
            name: document.getElementById('service-name').value,
            price: document.getElementById('service-price').value
        };
        if(id) {
            var idx = state.services.findIndex(function(s) { return s.id == id; });
            if(idx !== -1) state.services[idx] = sData;
        } else {
            state.services.push(sData);
        }
        await saveState(); closeModals(); refreshCurrentView(); showNotification('Serviço Guardado!');
    };

    document.getElementById('btn-add-service-to-appt').onclick = function() { 
        var val = document.getElementById('appt-type').value;
        if(val && !selectedServices.includes(val)) { selectedServices.push(val); renderSelectedServicesList(); }
    };

    document.getElementById('btn-send-whatsapp').onclick = function() { 
        var phone = document.getElementById('msg-phone-hidden').value.replace(/\D/g, '');
        if(phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(document.getElementById('msg-content').value)}`, '_blank');
        else showNotification('Sem telefone');
    };

    document.getElementById('btn-send-sms').onclick = function() { 
        var phone = document.getElementById('msg-phone-hidden').value.replace(/\D/g, '');
        if(phone) window.location.href = `sms:${phone}?&body=${encodeURIComponent(document.getElementById('msg-content').value)}`;
        else showNotification('Sem telefone');
    };

    if (clientSearchInput) {
        clientSearchInput.addEventListener('input', function(e) { 
            var query = e.target.value;
            if (state.currentView === 'clients') {
                state.clientSearchQuery = query;
                renderClients();
            } else if (state.currentView === 'services') {
                state.serviceSearchQuery = query;
                renderServices();
            }
        });
    }

    initializeData();
});

window.downloadBackup = function() { 
    var blob = new Blob([JSON.stringify(state, null, 2)], {type: 'application/json'});
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'backup_agenda.json'; a.click();
};

window.uploadBackup = function() { 
    var input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = async function(e) { 
        var file = e.target.files[0]; if(!file) return;
        var reader = new FileReader();
        reader.onload = async function(ev) { 
            var data = JSON.parse(ev.target.result);
            if(data.clients && data.appointments) { state = data; await saveState(); refreshCurrentView(); showNotification('Restaurado!'); }
        };
        reader.readAsText(file);
    };
    input.click();
};
