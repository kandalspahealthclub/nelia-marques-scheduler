
// 1. Estado e Configuração
var defaultState = {
    appointments: [],
    clients: [{ id: 1, name: "Maria Garcia", phone: "912345678" }],
    services: [{ id: 1, name: "Consulta", duration: 30, price: 150 }],
    messages: [],
    currentView: 'dashboard'
};

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

var db, stateRef;
try {
    if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
    db = firebase.database();
    stateRef = db.ref('state');
} catch (e) { console.error("Firebase Error", e); }

var state = JSON.parse(JSON.stringify(defaultState));
var isSaving = false;
var isPendingSave = false;
var selectedServices = [];

// DOM Elements
var contentArea, pageTitle, navItems, appointmentModal, serviceModal, clientModal, messageModal, modalOverlay, clientSearchInput;

function saveState() {
    isSaving = true;
    updateSyncStatus('saving');
    stateRef.set(state).then(function() {
        isSaving = false;
        updateSyncStatus('synced');
        if (isPendingSave) { isPendingSave = false; saveState(); }
    }).catch(function() {
        isSaving = false;
        updateSyncStatus('error');
    });
}

function updateSyncStatus(status) {
    var indicator = document.getElementById('sync-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'sync-indicator';
        indicator.style = 'position:fixed; bottom:20px; right:20px; font-size:0.75rem; background:white; padding:4px 10px; border-radius:20px; box-shadow:0 2px 10px rgba(0,0,0,0.1); z-index:9999; border:1px solid #eee;';
        document.body.appendChild(indicator);
    }
    if (status === 'saving') { indicator.innerHTML = 'A guardar...'; indicator.style.opacity = '1'; }
    else if (status === 'synced') { indicator.innerHTML = 'Sincronizado'; setTimeout(function() { indicator.style.opacity = '0'; }, 3000); }
    else if (status === 'error') { indicator.innerHTML = 'Erro de ligação'; }
}

function initializeData() {
    updateSyncStatus('saving');
    stateRef.once('value').then(function(snapshot) {
        var val = snapshot.val();
        if (val) {
            state = val;
            state.currentView = 'dashboard';
            refreshCurrentView();
            updateClientDatalist();
            updateSyncStatus('synced');
        } else {
            saveState();
        }
    });
    stateRef.on('value', function(snapshot) {
        var newVal = snapshot.val();
        if (!newVal || isSaving) return;
        if (JSON.stringify(newVal) !== JSON.stringify(state)) {
            var activeView = state.currentView;
            state = newVal;
            state.currentView = activeView;
            refreshCurrentView();
            updateClientDatalist();
        }
    });
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
    return state.clients.filter(function(c) {
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
    var tAppts = state.appointments.filter(function(a) { return a.date === todayStr; });
    var bdays = getWeekBirthdays();

    var bHTML = bdays.length > 0 ? bdays.map(function(b) {
        return '<div style="font-weight:600; margin-bottom:2px;">' + b.name + ' <span style="font-weight:400; opacity:0.7;">(' + b.dayDisplay + ')</span></div>';
    }).join('') : '0';

    contentArea.innerHTML = '<div class="dashboard-grid">' +
        '<div class="card stat-card"><div class="stat-info"><span class="label">Marcações</span><span class="value">' + state.appointments.length + '</span></div></div>' +
        '<div class="card stat-card"><div class="stat-info"><span class="label">Clientes</span><span class="value">' + state.clients.length + '</span></div></div>' +
        '<div class="card stat-card" style="border-color:var(--rose); cursor:pointer;" onclick="window.goToBirthdays()">' +
            '<div class="stat-info"><span class="label">Aniversários</span>' +
            '<div style="max-height:80px; overflow-y:auto; font-size:0.8rem;">' + bHTML + '</div></div>' +
        '</div>' +
    '</div>' +
    '<div class="section-header"><h2>Agenda de Hoje</h2></div>' +
    '<div class="appointments-list">' + (tAppts.length > 0 ? tAppts.map(function(a) {
        return '<div class="appointment-item"><b>' + a.time + '</b> - ' + a.clientName + getClientObs(a.clientName) + '</div>';
    }).join('') : 'Vazio hoje.') + '</div>';
}

function renderCalendar() {
    pageTitle.textContent = "Agenda";
    var appts = [].concat(state.appointments).sort(function(a,b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    contentArea.innerHTML = '<div class="appointments-list">' + appts.map(function(a) {
        return '<div class="appointment-item"><b>' + a.date + ' ' + a.time + '</b> - ' + a.clientName + 
               ' <button onclick="triggerEditAppt(\'' + a.id + '\')">Editar</button></div>';
    }).join('') + '</div>';
}

function renderClients() {
    pageTitle.textContent = "Clientes";
    contentArea.innerHTML = '<div class="appointments-list">' + state.clients.map(function(c) {
        return '<div class="appointment-item"><b>' + c.name + '</b> - ' + (c.phone || 'S/T') + 
               ' <button onclick="triggerEditClient(\'' + c.id + '\')">Editar</button></div>';
    }).join('') + '</div>';
}

function renderServices() {
    pageTitle.textContent = "Serviços";
    contentArea.innerHTML = '<div class="appointments-list">' + state.services.map(function(s) {
        return '<div class="appointment-item"><b>' + s.name + '</b> - €' + s.price + '</div>';
    }).join('') + '</div>';
}

function renderReports() {
    pageTitle.textContent = "Relatórios";
    contentArea.innerHTML = '<div class="card">Total de Clientes: ' + state.clients.length + '</div>';
}

function renderBirthdays() {
    pageTitle.textContent = "Aniversários da Semana";
    var bdays = getWeekBirthdays();
    if (bdays.length === 0) {
        contentArea.innerHTML = '<p>Nenhum esta semana.</p><button onclick="state.currentView=\'dashboard\'; refreshCurrentView();">Voltar</button>';
        return;
    }
    contentArea.innerHTML = '<div class="appointments-list">' + bdays.map(function(b) {
        return '<div class="appointment-item"><b>' + b.name + '</b> (' + b.dayDisplay + ') - ' + (b.phone || 'S/T') + 
               ' <button onclick="triggerMessage(\'' + b.name + '\', \'\')">Mensagem</button></div>';
    }).join('') + '</div>';
}

window.goToBirthdays = function() { state.currentView = 'birthdays'; refreshCurrentView(); };

function refreshCurrentView() {
    var v = state.currentView;
    if (v === 'dashboard') renderDashboard();
    else if (v === 'calendar') renderCalendar();
    else if (v === 'clients') renderClients();
    else if (v === 'services') renderServices();
    else if (v === 'reports') renderReports();
    else if (v === 'birthdays') renderBirthdays();
}

function triggerEditAppt(id) {
    var a = state.appointments.find(function(i) { return i.id == id; });
    if (!a) return;
    document.getElementById('appt-id').value = a.id;
    document.getElementById('appt-name').value = a.clientName;
    document.getElementById('appt-date').value = a.date;
    document.getElementById('appt-time').value = a.time;
    openModal(appointmentModal);
}

function triggerEditClient(id) {
    var c = state.clients.find(function(i) { return i.id == id; });
    if (!c) return;
    document.getElementById('client-id').value = c.id;
    document.getElementById('client-name').value = c.name;
    document.getElementById('client-phone').value = c.phone || '';
    openModal(clientModal);
}

function triggerMessage(name, time) {
    var c = state.clients.find(function(i) { return i.name === name; });
    document.getElementById('msg-recipient').value = name;
    document.getElementById('msg-phone-hidden').value = c ? c.phone : '';
    document.getElementById('msg-content').value = "Olá " + name + "! Parabéns! ✨";
    openModal(messageModal);
}

function openModal(el) { el.style.display = 'block'; modalOverlay.style.display = 'flex'; }
window.closeModals = function() {
    appointmentModal.style.display = 'none';
    serviceModal.style.display = 'none';
    clientModal.style.display = 'none';
    messageModal.style.display = 'none';
    modalOverlay.style.display = 'none';
};

function updateClientDatalist() {
    var dl = document.getElementById('client-list');
    if (dl) dl.innerHTML = state.clients.map(function(c) { return '<option value="' + c.name + '">'; }).join('');
}

document.addEventListener('DOMContentLoaded', function() {
    initDOMElements();
    initNavigation();
    
    document.querySelectorAll('.close-modal, .close-modal-btn').forEach(function(b) { b.onclick = window.closeModals; });
    modalOverlay.onclick = function(e) { if (e.target === modalOverlay) window.closeModals(); };

    document.getElementById('appointment-form').onsubmit = function(e) {
        e.preventDefault();
        var id = document.getElementById('appt-id').value;
        var appt = {
            id: id || Date.now(),
            clientName: document.getElementById('appt-name').value,
            date: document.getElementById('appt-date').value,
            time: document.getElementById('appt-time').value
        };
        if (id) {
            var idx = state.appointments.findIndex(function(a) { return a.id == id; });
            state.appointments[idx] = appt;
        } else {
            state.appointments.push(appt);
        }
        saveState(); window.closeModals(); refreshCurrentView();
    };

    initializeData();
});
