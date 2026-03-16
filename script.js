// 1. Configuração do Estado Inicial
const defaultState = {
    appointments: [],
    clients: [
        { id: 1, name: "Maria Garcia", phone: "912345678" }
    ],
    services: [
        { id: 1, name: "Consulta", duration: 30, price: 150 },
        { id: 2, name: "Manicure", duration: 45, price: 20 },
    ],
    messages: [],
    currentView: 'dashboard'
};

// 2. Configuração do Firebase
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

// Inicialização segura do Firebase
let db, stateRef;
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
let state = JSON.parse(JSON.stringify(defaultState));
let isSaving = false;
let isPendingSave = false;
let selectedServices = [];

// Indicador de Sincronização em PT-PT
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
        indicator.innerHTML = '<i class="ph-fill ph-check-circle" style="color:var(--success);"></i> Nuvem Sincronizada';
        setTimeout(() => { if (!isSaving && !isPendingSave) indicator.style.opacity = '0'; }, 3000);
    } else if (status === 'error') {
        indicator.innerHTML = '<i class="ph-fill ph-warning-circle" style="color:var(--danger);"></i> Erro de ligação';
        indicator.style.opacity = '1';
    }
}

async function initializeData() {
    updateSyncStatus('saving');
    try {
        const snapshot = await stateRef.once('value');
        const val = snapshot.val();
        
        if (!val) {
            await saveState(); 
        } else {
            state = val;
            refreshCurrentView();
            updateSyncStatus('synced');
        }

        // Ouvinte em tempo real
        stateRef.on('value', (snapshot) => {
            const newVal = snapshot.val();
            if (!newVal) return;
            if (document.querySelector('.modal-overlay.open') || isSaving || isPendingSave) return;
            
            if (JSON.stringify(newVal) !== JSON.stringify(state)) {
                const activeView = state.currentView;
                state = newVal;
                state.currentView = activeView;
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
    return stateRef.set(state).then(() => {
        isPendingSave = false;
        updateSyncStatus('synced');
    }).catch(e => {
        isPendingSave = false;
        updateSyncStatus('error');
    });
}

// 4. Elementos do DOM
let contentArea, pageTitle, navItems, modalOverlay;
function initDOMElements() {
    contentArea = document.getElementById('content-area');
    pageTitle = document.getElementById('page-title');
    navItems = document.querySelectorAll('.nav-item');
    modalOverlay = document.getElementById('modal-overlay');
}

// 5. Renderização das Vistas (PT-PT)
function refreshCurrentView() {
    const view = state.currentView || 'dashboard';
    
    // Visibilidade dos botões
    document.getElementById('btn-new-appointment').style.display = (view === 'calendar') ? 'inline-flex' : 'none';
    document.getElementById('btn-new-service').style.display = (view === 'services') ? 'inline-flex' : 'none';
    document.getElementById('btn-new-client').style.display = (view === 'clients') ? 'inline-flex' : 'none';
    document.getElementById('btn-print-report').style.display = (view === 'reports') ? 'inline-flex' : 'none';
    document.getElementById('search-zone').style.display = (view === 'clients' || view === 'services') ? 'block' : 'none';

    if (view === 'dashboard') renderDashboard();
    else if (view === 'calendar') renderCalendar();
    else if (view === 'clients') renderClients();
    else if (view === 'services') renderServices();
    else if (view === 'reports') renderReports();
    else if (view === 'backup') renderBackup();
}

function renderDashboard() {
    pageTitle.textContent = "Painel Principal";
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysAppts = state.appointments.filter(a => a.date === todayStr);

    contentArea.innerHTML = `
        <div class="dashboard-grid">
            <div class="card stat-card">
                <div class="stat-info"><span class="label">Total de Marcações</span><span class="value">${state.appointments.length}</span></div>
            </div>
            <div class="card stat-card">
                <div class="stat-info"><span class="label">Total de Clientes</span><span class="value">${state.clients.length}</span></div>
            </div>
        </div>
        <div class="section-header"><h2>Marcações para Hoje</h2></div>
        <div class="appointments-list">
            ${todaysAppts.length > 0 ? todaysAppts.map(a => `<div class="appointment-item"><b>${a.time}</b> - ${a.clientName} (${Array.isArray(a.type)?a.type.join(', '):a.type})</div>`).join('') : '<div class="empty-state">Sem marcações para hoje.</div>'}
        </div>
    `;
}

function renderCalendar() {
    pageTitle.textContent = "Agenda de Marcações";
    const today = new Date().toISOString().split('T')[0];
    const sorted = [...state.appointments].sort((a,b) => a.time.localeCompare(b.time));
    const future = sorted.filter(a => a.date >= today);

    contentArea.innerHTML = `
        <div class="appointments-list">
            ${future.length > 0 ? future.map(a => `
                <div class="appointment-item">
                    <div class="appt-details">
                        <b>${a.date} | ${a.time}</b><br>
                        <span>${a.clientName} - ${Array.isArray(a.type)?a.type.join(', '):a.type}</span>
                    </div>
                    <div class="appt-actions">
                        <button onclick="triggerEditAppt('${a.id}')"><i class="ph ph-pencil"></i></button>
                        <button class="btn-delete" onclick="triggerDelete('appointment', '${a.id}')"><i class="ph ph-trash"></i></button>
                    </div>
                </div>
            `).join('') : '<div class="empty-state">Nenhuma marcação encontrada.</div>'}
        </div>
    `;
}

function renderClients() {
    pageTitle.textContent = "Gestão de Clientes";
    contentArea.innerHTML = `<div class="appointments-list">
        ${state.clients.map(c => `
            <div class="appointment-item">
                <div class="appt-details"><b>${c.name}</b><br>${c.phone || 'Sem contacto'}</div>
                <div class="appt-actions">
                    <button onclick="triggerEditClient('${c.id}')"><i class="ph ph-pencil"></i></button>
                    <button class="btn-delete" onclick="triggerDelete('client', '${c.id}')"><i class="ph ph-trash"></i></button>
                </div>
            </div>
        `).join('')}
    </div>`;
}

function renderServices() {
    pageTitle.textContent = "Serviços e Preços";
    contentArea.innerHTML = `<div class="appointments-list">
        ${state.services.map(s => `
            <div class="appointment-item">
                <div class="appt-details"><b>${s.name}</b><br>€ ${parseFloat(s.price).toFixed(2)}</div>
                <div class="appt-actions">
                    <button onclick="triggerEditService('${s.id}')"><i class="ph ph-pencil"></i></button>
                    <button class="btn-delete" onclick="triggerDelete('service', '${s.id}')"><i class="ph ph-trash"></i></button>
                </div>
            </div>
        `).join('')}
    </div>`;
}

function renderReports() {
    pageTitle.textContent = "Relatórios de Faturamento";
    let total = state.appointments.reduce((acc, a) => acc + (parseFloat(a.price) || 0), 0);
    contentArea.innerHTML = `
        <div class="card">
            <h3>Resumo Geral</h3>
            <p>Faturamento Total: <b>€ ${total.toFixed(2)}</b></p>
        </div>
    `;
}

function renderBackup() {
    pageTitle.textContent = "Segurança e Backup";
    contentArea.innerHTML = `
        <div class="card" style="text-align:center; padding: 2rem;">
            <button class="btn btn-primary" onclick="downloadBackup()" style="margin: 1rem;">Baixar Cópia (JSON)</button>
            <button class="btn btn-ghost" onclick="uploadBackup()" style="margin: 1rem;">Restaurar Cópia</button>
        </div>
    `;
}

// 6. Ações e Triggers
window.triggerDelete = async function(type, id) {
    if(!confirm("Tem a certeza que deseja eliminar?")) return;
    if(type === 'appointment') state.appointments = state.appointments.filter(a => a.id != id);
    else if(type === 'client') state.clients = state.clients.filter(c => c.id != id);
    else if(type === 'service') state.services = state.services.filter(s => s.id != id);
    await saveState();
    refreshCurrentView();
};

window.triggerEditAppt = function(id) {
    const a = state.appointments.find(x => x.id == id);
    if(!a) return;
    document.getElementById('appt-id').value = a.id;
    document.getElementById('appt-name').value = a.clientName;
    document.getElementById('appt-date').value = a.date;
    document.getElementById('appt-time').value = a.time;
    selectedServices = Array.isArray(a.type) ? [...a.type] : [a.type];
    renderSelectedServicesList();
    openModal(document.getElementById('appointment-modal'));
};

// Funções de Modal e Utilitários
function openModal(el) {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    el.style.display = 'block';
    modalOverlay.style.display = 'flex';
}
window.closeModals = function() { modalOverlay.style.display = 'none'; };

function renderSelectedServicesList() {
    const container = document.getElementById('selected-services-container');
    if (container) container.innerHTML = selectedServices.map((s, i) => `<span class="tag" style="background:#eee; padding:2px 8px; border-radius:10px; margin:2px; display:inline-block;">${s} <i onclick="removeServiceFromAppt(${i})" style="cursor:pointer">&times;</i></span>`).join('');
}
window.removeServiceFromAppt = (i) => { selectedServices.splice(i, 1); renderSelectedServicesList(); };

// Inicialização Final
document.addEventListener('DOMContentLoaded', () => {
    initDOMElements();
    
    // Navegação
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentView = btn.dataset.view;
            refreshCurrentView();
        }
    });

    // Close Modals
    document.querySelectorAll('.close-modal, .close-modal-btn').forEach(b => b.onclick = closeModals);

    // Form Submits
    document.getElementById('appointment-form').onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('appt-id').value;
        const newAppt = {
            id: id || Date.now(),
            clientName: document.getElementById('appt-name').value,
            date: document.getElementById('appt-date').value,
            time: document.getElementById('appt-time').value,
            type: selectedServices,
            price: selectedServices.reduce((acc, sName) => {
                const s = state.services.find(ser => ser.name === sName);
                return acc + (s ? parseFloat(s.price) : 0);
            }, 0)
        };
        if(id) {
            const idx = state.appointments.findIndex(x => x.id == id);
            state.appointments[idx] = newAppt;
        } else {
            state.appointments.push(newAppt);
        }
        await saveState();
        closeModals();
        refreshCurrentView();
    };

    document.getElementById('btn-add-service-to-appt').onclick = () => {
        const val = document.getElementById('appt-type').value;
        if(val && !selectedServices.includes(val)) {
            selectedServices.push(val);
            renderSelectedServicesList();
        }
    };

    // Populando datalists
    const apptType = document.getElementById('appt-type');
    if(apptType) apptType.innerHTML = state.services.map(s => `<option value="${s.name}">${s.name}</option>`).join('');

    initializeData();
});

// Funções globais de Backup
window.downloadBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'backup_agenda.json';
    a.click();
};
