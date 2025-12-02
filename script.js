// script.js
const CATEGORIES = {
    'prospecto': { label: 'Prospecto', color: 'var(--prospecto-color)', tagClass: 'tag-prospecto' },
    'en-proceso': { label: 'En Proceso', color: 'var(--en-proceso-color)', tagClass: 'tag-en-proceso' },
    'cerrado': { label: 'Cerrado', color: 'var(--cerrado-color)', tagClass: 'tag-cerrado' }
};

let allClients = [];
const STORAGE_KEY = 'mini_crm_clients_v1';

const searchInput = document.getElementById('search-input');
const btnOpenModal = document.getElementById('btn-open-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const clientModal = document.getElementById('client-modal');
const clientForm = document.getElementById('client-form');
const template = document.getElementById('client-card-template');

// Elementos Responsive
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.getElementById('sidebar');
const mobileOverlay = document.getElementById('mobile-overlay');

// Manejo del menú lateral en móvil
function toggleSidebar() {
    sidebar.classList.toggle('open');
    mobileOverlay.classList.toggle('visible');
}

mobileMenuBtn.addEventListener('click', toggleSidebar);
mobileOverlay.addEventListener('click', toggleSidebar);

// Cerrar sidebar después de seleccionar una vista en móvil
document.querySelectorAll('#sidebar a[data-view]').forEach(a => {
    a.addEventListener('click', (e) => {
        e.preventDefault(); 
        const view = a.dataset.view; 
        setActiveView(view);
        if (window.innerWidth < 768 && sidebar.classList.contains('open')) { 
            toggleSidebar();
        }
    });
});

function loadClients() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        allClients = raw ? JSON.parse(raw) : [];
    } catch (e) { allClients = []; }
}

function saveClients() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allClients));
}

function addClient(data) {
    const id = 'c_' + Date.now();
    const createdAt = new Date().toISOString();
    allClients.push({ id, ...data, createdAt });
    saveClients();
    renderClients(allClients);
    showNotification('Cliente añadido correctamente.');
}

function updateClient(id, updates) {
    const idx = allClients.findIndex(c => c.id === id);
    if (idx === -1) return showNotification('Cliente no encontrado.');
    allClients[idx] = { ...allClients[idx], ...updates };
    saveClients();
    renderClients(allClients);
    showNotification('Cliente actualizado.');
}

function deleteClient(id) {
    allClients = allClients.filter(c => c.id !== id);
    saveClients();
    renderClients(allClients);
    showNotification('Cliente eliminado.');
}

function renderClients(list) {
    const term = searchInput.value.trim().toLowerCase();
    const filtered = list.filter(c => !term || (c.name && c.name.toLowerCase().includes(term)) || (c.email && c.email.toLowerCase().includes(term)));

    const containers = {
        'prospecto': document.getElementById('clients-prospecto'),
        'en-proceso': document.getElementById('clients-en-proceso'),
        'cerrado': document.getElementById('clients-cerrado')
    };
    Object.values(containers).forEach(el => el.innerHTML = '');
    const counts = { 'prospecto': 0, 'en-proceso': 0, 'cerrado': 0 };

    filtered.forEach(client => {
        const node = template.content.cloneNode(true);
        const root = node.querySelector('div');
        root.dataset.id = client.id;
        root.querySelector('.name').textContent = client.name || '(sin nombre)';
        root.querySelector('.email').textContent = client.email || '';
        root.querySelector('.phone').textContent = client.phone || '';
        const tag = root.querySelector('.category-tag');
        const categoryData = CATEGORIES[client.category];
        tag.textContent = categoryData?.label || client.category;
        
        if (categoryData && categoryData.tagClass) {
            tag.classList.add(categoryData.tagClass);
        } else {
             tag.style.background = '#999'; 
        }
        
        root.querySelector('.btn-edit').addEventListener('click', () => openEditModal(client));
        root.querySelector('.btn-delete').addEventListener('click', () => confirmDelete(client.id, client.name));
        const remBtn = root.querySelector('.btn-reminder');
        if (remBtn) remBtn.addEventListener('click', () => scheduleReminderForClient(client.id));

        root.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', client.id);
            root.classList.add('opacity-70');
        });
        root.addEventListener('dragend', () => root.classList.remove('opacity-70'));

        containers[client.category].appendChild(node);
        counts[client.category]++;
    });

    document.getElementById('count-prospecto').textContent = counts['prospecto'];
    document.getElementById('count-en-proceso').textContent = counts['en-proceso'];
    document.getElementById('count-cerrado').textContent = counts['cerrado'];

    updateDashboardStats(list);
}

function openModal() { clientModal.classList.remove('opacity-0'); clientModal.classList.remove('pointer-events-none'); }
function closeModal() { clientModal.classList.add('opacity-0'); clientModal.classList.add('pointer-events-none'); clientForm.reset(); document.getElementById('client-id-field').value = ''; }

function openEditModal(client) {
    document.getElementById('modal-title').textContent = 'Editar cliente';
    document.getElementById('client-id-field').value = client.id;
    document.getElementById('client-name').value = client.name || '';
    document.getElementById('client-email').value = client.email || '';
    document.getElementById('client-phone').value = client.phone || '';
    document.getElementById('client-category').value = client.category || 'prospecto';
    openModal();
}

function confirmDelete(id, name) {
    if (confirm(`¿Eliminar al cliente "${name}"? Esta acción no se puede deshacer.`)) deleteClient(id);
}

clientForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('client-id-field').value;
    const data = {
        name: document.getElementById('client-name').value.trim(),
        email: document.getElementById('client-email').value.trim(),
        phone: document.getElementById('client-phone').value.trim(),
        category: document.getElementById('client-category').value
    };
    if (id) updateClient(id, data); else addClient(data);
    closeModal();
});

btnOpenModal.addEventListener('click', () => { document.getElementById('modal-title').textContent = 'Añadir cliente'; openModal(); });
btnCloseModal.addEventListener('click', closeModal);

const notificationModal = document.getElementById('notification-modal');
const notifMessage = document.getElementById('notification-message');
document.getElementById('btn-close-notification').addEventListener('click', () => { notificationModal.classList.add('opacity-0'); notificationModal.classList.add('pointer-events-none'); });

function showNotification(msg) {
    notifMessage.textContent = msg;
    notificationModal.classList.remove('opacity-0'); notificationModal.classList.remove('pointer-events-none');
    setTimeout(() => { notificationModal.classList.add('opacity-0'); notificationModal.classList.add('pointer-events-none'); }, 3500);
}

async function requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    try {
        const p = await Notification.requestPermission();
        return p === 'granted';
    } catch (e) { return false; }
}

async function scheduleReminderForClient(clientId) {
    const client = allClients.find(c => c.id === clientId);
    if (!client) return showNotification('Cliente no encontrado para recordatorio.');
    const minutes = parseInt(prompt('Recordarme en cuántos minutos?', '10'), 10);
    if (isNaN(minutes) || minutes <= 0) return;
    const granted = await requestNotificationPermission();
    if (!granted) return showNotification('Permiso de notificación denegado.');
    showNotification(`Recordatorio programado para ${client.name} en ${minutes} min`);
    setTimeout(() => {
        try {
            new Notification(`Recordatorio: ${client.name}`, { body: `${client.email || ''} ${client.phone ? '- ' + client.phone : ''}` });
        } catch (e) {
            console.error('No se pudo mostrar notificación:', e);
        }
    }, minutes * 60 * 1000);
}

searchInput.addEventListener('input', () => renderClients(allClients));

document.querySelectorAll('.kanban-column').forEach(col => {
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', (e) => {
        e.preventDefault(); col.classList.remove('drag-over');
        const id = e.dataTransfer.getData('text/plain');
        const targetCategory = col.dataset.category;
        const client = allClients.find(c => c.id === id);
        if (client && client.category !== targetCategory) {
            updateClient(id, { category: targetCategory });
        }
    });
});

document.getElementById('btn-export-csv').addEventListener('click', () => {
    if (!allClients.length) return showNotification('No hay clientes para exportar.');
    const header = ['ID','Nombre','Email','Teléfono','Categoría','Fecha Creación'];
    const rows = allClients.map(c => [c.id, c.name, c.email, c.phone || '', c.category, c.createdAt || ''].map(v => '"'+String(v).replace(/"/g,'""')+'"').join(','));
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'clientes_crm.csv'; document.body.appendChild(a); a.click(); a.remove();
    showNotification('Exportado a clientes_crm.csv');
});

function updateDashboardStats(clients) {
    const total = clients.length;
    const closed = clients.filter(c => c.category === 'cerrado').length;
    const inProcess = clients.filter(c => c.category === 'en-proceso').length;
    const closureRate = total ? ((closed / total) * 100).toFixed(1) + '%' : '0%';
    document.getElementById('stat-total-clients').textContent = total;
    document.getElementById('stat-in-process').textContent = inProcess;
    
    const closureRateEl = document.getElementById('stat-closure-rate');
    if(closureRateEl) closureRateEl.textContent = closureRate; 
    
    ['stat-total-clients','stat-in-process','stat-closure-rate','count-prospecto','count-en-proceso','count-cerrado'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.add('pop');
        setTimeout(() => el.classList.remove('pop'), 220);
    });
}

// --- Lógica del Dashboard Interactivo ---
const DASHBOARD_DATA = {
    week: {
        title1: 'Últimos 7 Días', title2: 'Últimas 4 Semanas',
        val1: '$7,500', diff1: '+5% vs semana anterior', 
        val2: '35%', diff2: '+2% vs semana anterior', 
        val3: '4', diff3: '1 nuevo cierre', 
        val4: '8 días', diff4: 'Objetivo: 7 días',
        donut: 'var(--chart-bg-1) 0% 50%, var(--chart-bg-2) 50% 80%, var(--chart-bg-3) 80% 100%',
        d_legend: ['Prospecto (50%)', 'En Proceso (30%)', 'Cerrado (20%)'],
        bar_heights: ['70%', '40%', '85%', '60%', '90%', '55%'],
        bar_labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    },
    month: {
        title1: 'Mes', title2: 'Últimos 6 Meses',
        val1: '$45,200', diff1: '+12% vs mes anterior', 
        val2: '28.5%', diff2: '-1.5% vs mes anterior', 
        val3: '18', diff3: '5 nuevos cierres', 
        val4: '14 días', diff4: 'Objetivo: 12 días',
        donut: 'var(--chart-bg-1) 0% 45%, var(--chart-bg-2) 45% 75%, var(--chart-bg-3) 75% 100%',
        d_legend: ['Prospecto (45%)', 'En Proceso (30%)', 'Cerrado (25%)'],
        bar_heights: ['40%', '65%', '50%', '80%', '95%', '75%'],
        bar_labels: ['Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene'],
    },
    year: {
        title1: 'Año', title2: 'Últimos 5 Años',
        val1: '$540,000', diff1: '+20% vs año anterior', 
        val2: '24%', diff2: '+3% vs año anterior', 
        val3: '205', diff3: 'Récord histórico', 
        val4: '25 días', diff4: 'Objetivo: 20 días',
        donut: 'var(--chart-bg-1) 0% 30%, var(--chart-bg-2) 30% 60%, var(--chart-bg-3) 60% 100%',
        d_legend: ['Prospecto (30%)', 'En Proceso (30%)', 'Cerrado (40%)'],
        bar_heights: ['50%', '70%', '80%', '90%', '98%', '85%'],
        bar_labels: ['2020', '2021', '2022', '2023', '2024', '2025'],
    }
};

const statCards = document.querySelectorAll('#stat-cards-container .stat-card');

function updateDashboard(timeFrame) {
    const data = DASHBOARD_DATA[timeFrame];
    if (!data) return;

    document.getElementById('chart-title-1').textContent = data.title1;
    document.getElementById('chart-title-2').textContent = data.title2;

    statCards.forEach((card, index) => {
        const i = index + 1;
        const valueEl = card.querySelector(`[data-value="val-${i}"]`);
        const diffEl = card.querySelector(`[data-diff="diff-${i}"]`);

        card.classList.remove('fadeIn'); 
        void card.offsetWidth; 
        card.classList.add('fadeIn');

        valueEl.textContent = data[`val${i}`];
        diffEl.textContent = data[`diff${i}`];
    });

    const donut = document.getElementById('donut-chart');
    donut.style.background = `conic-gradient(${data.donut})`;
    
    const legendDiv = document.getElementById('donut-legend');
    legendDiv.innerHTML = '';
    const colors = ['var(--chart-bg-1)', 'var(--chart-bg-2)', 'var(--chart-bg-3)'];

    data.d_legend.forEach((legendText, idx) => {
        const item = document.createElement('div');
        item.className = 'flex items-center';
        item.innerHTML = `<span class="w-2 h-2 rounded-full mr-1" style="background: ${colors[idx]};"></span> ${legendText}`;
        legendDiv.appendChild(item);
    });


    const barChart = document.getElementById('bar-chart');
    const bars = barChart.querySelectorAll('.bar');
    const labels = barChart.querySelectorAll('[data-label]');

    bars.forEach((bar, index) => {
        bar.style.height = data.bar_heights[index];
    });
    labels.forEach((label, index) => {
        label.textContent = data.bar_labels[index];
    });

    showNotification(`Datos del Dashboard filtrados por ${timeFrame.toUpperCase()}`);
}

document.getElementById('dashboard-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    
    btn.classList.add('active');
    
    updateDashboard(btn.dataset.time);
});

function setActiveView(view) {
    document.getElementById('view-kanban').classList.toggle('hidden', view !== 'kanban');
    document.getElementById('view-dashboard').classList.toggle('hidden', view !== 'dashboard');
    document.getElementById('current-view-title').textContent = view === 'kanban' ? 'Tablero Kanban' : 'Dashboard';

    if (view === 'dashboard') {
        const activeBtn = document.querySelector('.filter-btn.active');
        const timeFrame = activeBtn ? activeBtn.dataset.time : 'week';
        updateDashboard(timeFrame);
    }
}

loadClients();
renderClients(allClients);
setActiveView('kanban');