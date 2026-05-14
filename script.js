
// 1. Estado e Configuração
var defaultState = {
    appointments: [],
    clients: [],
    services: [],
    messages: [],
    currentView: 'dashboard'
};

var state = JSON.parse(JSON.stringify(defaultState));
var isSaving = false;
var isPendingSave = false;

// DOM Elements
var contentArea, pageTitle, navItems, appointmentModal, serviceModal, clientModal, messageModal, modalOverlay, clientSearchInput;

function updateSyncStatus(status) {
    var indicator = document.getElementById('sync-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'sync-indicator';
        indicator.style = 'position:fixed; bottom:20px; right:20px; font-size:0.75rem; background:white; padding:4px 10px; border-radius:20px; box-shadow:0 2px 10px rgba(0,0,0,0.1); z-index:9999; border:1px solid #eee; transition: opacity 0.3s;';
        document.body.appendChild(indicator);
    }
    if (status === 'saving') { indicator.innerHTML = 'A guardar...'; indicator.style.opacity = '1'; }
    else if (status === 'synced') { indicator.innerHTML = 'Sincronizado'; setTimeout(function() { if (!isSaving) indicator.style.opacity = '0'; }, 3000); }
    else if (status === 'error') { indicator.innerHTML = 'Erro de ligação'; indicator.style.opacity = '1'; }
}

// Lógica de Sincronização Local (Server.py / Flask)
function initializeData() {
    updateSyncStatus('saving');
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/state?t=' + Date.now(), true);
    xhr.onload = function() {
        if (xhr.status === 200) {
            try {
                var data = JSON.parse(xhr.responseText);
                state = data;
                state.currentView = 'dashboard';
                refreshCurrentView();
                updateClientDatalist();
                updateSyncStatus('synced');
            } catch (e) { console.error("Erro ao processar dados", e); }
        }
    };
    xhr.send();

    // Polling opcional para manter sincronizado com outros dispositivos
    setInterval(function() {
        if (isSaving || document.querySelector('.modal-overlay.open')) return;
        var pollXhr = new XMLHttpRequest();
        pollXhr.open('GET', '/api/state?t=' + Date.now(), true);
        pollXhr.onload = function() {
            if (pollXhr.status === 200) {
                var newData = JSON.parse(pollXhr.responseText);
                if (JSON.stringify(newData) !== JSON.stringify(state)) {
                    var currentView = state.currentView;
                    state = newData;
                    state.currentView = currentView;
                    refreshCurrentView();
                    updateClientDatalist();
                }
            }
        };
        pollXhr.send();
    }, 5000);
}

function saveState() {
    isSaving = true;
    updateSyncStatus('saving');
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/state', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
        isSaving = false;
        updateSyncStatus('synced');
    };
    xhr.onerror = function() {
        isSaving = false;
        updateSyncStatus('error');
    };
    xhr.send(JSON.stringify(state));
}

function getClientObs(name) {
    if (!name) return '';
    var client = state.clients.find(function(c) { return c.name === name; });
    if (!client && name.indexOf(' - ') !== -1) {
        client = state.clients.find(function(c) { return c.name === name.split(' - ')[0].trim(); });
    }
    return (client && client.observations) ? ' <span style="opacity:0.5; font-size:0.8rem;">(' + client.observations + ')</span>' : '';
}

function getWeekBirthdays() {
    var today = new Date();
    var start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
    var weekDates = [];
    for (var i = 0; i < 7; i++) {
        var d = new Date(start);
        d.setDate(start.getDate() + i);
        weekDates.push({ m: d.getMonth() + 1, d: d.getDate(), s: d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }) });
    }
    return (state.clients || []).filter(function(c) {
        if (!c.birthdate) return false;
        var p = c.birthdate.split('-');
        var bm = parseInt(p[1], 10), bd = parseInt(p[2], 10);
        return weekDates.some(function(wd) { return wd.m === bm && wd.d === bd; });
    }).map(function(c) {
        var p = c.birthdate.split('-');
        var bm = parseInt(p[1], 10), bd = parseInt(p[2], 10);
        var wd = weekDates.find(function(w) { return w.m === bm && w.d === bd; });
        return { name: c.name, dayDisplay: wd.s, phone: c.phone };
    });
}

function renderDashboard() {
    pageTitle.textContent = "Painel";
    var todayStr = new Date().toISOString().split('T')[0];
    var tAppts = (state.appointments || []).filter(function(a) { return a.date === todayStr; });
    var bdays = getWeekBirthdays();

    var bHTML = bdays.length > 0 ? bdays.map(function(b) {
        return '<div style="font-weight:600; margin-bottom:2px;">' + b.name + ' <span style="font-weight:400; opacity:0.7;">(' + b.dayDisplay + ')</span></div>';
    }).join('') : '0';

    contentArea.innerHTML = '<div class="dashboard-grid">' +
        '<div class="card stat-card"><div class="stat-info"><span class="label">Total Hoje</span><span class="value">' + tAppts.length + '</span></div></div>' +
        '<div class="card stat-card"><div class="stat-info"><span class="label">Clientes</span><span class="value">' + (state.clients ? state.clients.length : 0) + '</span></div></div>' +
        '<div class="card stat-card" style="border-color:var(--rose); cursor:pointer;" onclick="window.goToBirthdays()">' +
            '<div class="stat-info"><span class="label">Aniversários</span>' +
            '<div style="max-height:80px; overflow-y:auto; font-size:0.8rem;">' + bHTML + '</div></div>' +
        '</div>' +
    '</div>' +
    '<div class="section-header" style="margin-top:2rem;"><h3>Agenda de Hoje</h3></div>' +
    '<div class="appointments-list">' + (tAppts.length > 0 ? tAppts.map(function(a) {
        return '<div class="appointment-item"><b>' + a.time + '</b> - ' + a.clientName + getClientObs(a.clientName) + '</div>';
    }).join('') : '<div style="padding:20px; color:#aaa; text-align:center;">Vazio hoje.</div>') + '</div>';
}

function renderCalendar() {
    pageTitle.textContent = "Agenda";
    var appts = [].concat(state.appointments || []).sort(function(a,b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    contentArea.innerHTML = '<div class="appointments-list">' + (appts.length > 0 ? appts.map(function(a) {
        return '<div class="appointment-item"><b>' + a.date + ' ' + a.time + '</b> - ' + a.clientName + 
               ' <div class="appt-actions"><button onclick="triggerEditAppt(\'' + a.id + '\')">Editar</button></div></div>';
    }).join('') : 'Sem marcações.') + '</div>';
}

function renderClients() {
    pageTitle.textContent = "Clientes";
    contentArea.innerHTML = '<div class="appointments-list">' + (state.clients || []).map(function(c) {
        return '<div class="appointment-item"><b>' + c.name + '</b> - ' + (c.phone || 'S/T') + 
               ' <div class="appt-actions"><button onclick="triggerEditClient(\'' + c.id + '\')">Editar</button></div></div>';
    }).join('') + '</div>';
}

function renderServices() {
    pageTitle.textContent = "Serviços";
    contentArea.innerHTML = '<div class="appointments-list">' + (state.services || []).map(function(s) {
        return '<div class="appointment-item"><b>' + s.name + '</b> - €' + s.price + '</div>';
    }).join('') + '</div>';
}

function renderBirthdays() {
    pageTitle.textContent = "Aniversários da Semana";
    var bdays = getWeekBirthdays();
    if (bdays.length === 0) {
        contentArea.innerHTML = '<div style="padding:40px; text-align:center;"><p>Nenhum esta semana.</p><br><button class="btn" onclick="state.currentView=\'dashboard\'; refreshCurrentView();">Voltar</button></div>';
        return;
    }
    contentArea.innerHTML = '<div class="appointments-list">' + bdays.map(function(b) {
        return '<div class="appointment-item"><b>' + b.name + '</b> (' + b.dayDisplay + ') - ' + (b.phone || 'S/T') + 
               ' <div class="appt-actions"><button onclick="triggerMessage(\'' + b.name + '\', \'\')">Mensagem</button></div></div>';
    }).join('') + '</div>';
}

window.goToBirthdays = function() { state.currentView = 'birthdays'; refreshCurrentView(); };

function refreshCurrentView() {
    var v = state.currentView;
    if (v === 'dashboard') renderDashboard();
    else if (v === 'calendar') renderCalendar();
    else if (v === 'clients') renderClients();
    else if (v === 'services') renderServices();
    else if (v === 'reports') renderDashboard(); // Placeholder
    else if (v === 'birthdays') renderBirthdays();
}

function openModal(el) { el.style.display = 'block'; modalOverlay.style.display = 'flex'; }
window.closeModals = function() {
    document.querySelectorAll('.modal').forEach(function(m) { m.style.display = 'none'; });
    modalOverlay.style.display = 'none';
};

function updateClientDatalist() {
    var dl = document.getElementById('client-list');
    if (dl && state.clients) dl.innerHTML = state.clients.map(function(c) { return '<option value="' + c.name + '">'; }).join('');
}

document.addEventListener('DOMContentLoaded', function() {
    contentArea = document.getElementById('content-area');
    pageTitle = document.getElementById('page-title');
    navItems = document.querySelectorAll('.nav-item');
    appointmentModal = document.getElementById('appointment-modal');
    serviceModal = document.getElementById('service-modal');
    clientModal = document.getElementById('client-modal');
    messageModal = document.getElementById('message-modal');
    modalOverlay = document.getElementById('modal-overlay');

    for (var i = 0; i < navItems.length; i++) {
        navItems[i].onclick = function() {
            state.currentView = this.dataset.view;
            refreshCurrentView();
        };
    }

    document.querySelectorAll('.close-modal, .close-modal-btn').forEach(function(b) { b.onclick = window.closeModals; });
    modalOverlay.onclick = function(e) { if (e.target === modalOverlay) window.closeModals(); };

    initializeData();
});
