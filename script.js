// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyCE3ENkLRcJ4pQjqdm3SZWOhA",
    authDomain: "painelresumo.firebaseapp.com",
    projectId: "painelresumo",
    storageBucket: "painelresumo.appspot.com",
    messagingSenderId: "41539443437",
    appId: "1:41539443437:web:367fe080fdf16",
    measurementId: "G-003C0MC41F"
};

// Inicializa o Firebase e o Firestore
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- Lógica de Login ---
const loginForm = document.getElementById('login-form'), loginContainer = document.getElementById('login-container'), adminPanel = document.getElementById('admin-panel'), errorMessage = document.getElementById('error-message');
const correctEmail = "atestados@gmail.com", correctPassword = "atestados";
loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    if (document.getElementById('email').value === correctEmail && document.getElementById('password').value === correctPassword) {
        errorMessage.textContent = '';
        loginContainer.style.opacity = '0';
        loginContainer.style.transform = 'scale(0.8)';
        setTimeout(() => {
            loginContainer.style.display = 'none';
            adminPanel.style.display = 'block';
            listenToSales();
            listenToChat();
        }, 500);
    } else {
        errorMessage.textContent = 'Acesso Negado.';
        loginContainer.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(0)' }], { duration: 300, iterations: 1 });
    }
});

// --- LÓGICA DE CARREGAMENTO (LOADING) ---
const loadingOverlay = document.getElementById('loading-overlay');
function showLoading(duration = 2000) {
    loadingOverlay.classList.add('show');
    setTimeout(() => {
        loadingOverlay.classList.remove('show');
    }, duration);
}

// --- Lógica do Dashboard ---
const trackerForm = document.getElementById('tracker-form');
const saleValueInput = document.getElementById('sale-value');
const recordsBody = document.getElementById('records-body');
const myTotalProfitCard = document.getElementById('my-total-profit');
const jpTotalProfitCard = document.getElementById('jp-total-profit');
const totalPendingCard = document.getElementById('total-pending');
const salesCountCard = document.getElementById('sales-count');
const totalGatewayTaxCard = document.getElementById('total-gateway-tax');
const totalRepassedCard = document.getElementById('total-repassed');
const filtersContainer = document.querySelector('.filters');

let allRecords = [];
let currentFilter = 'all';

function listenToSales() {
    db.collection("sales").orderBy("createdAt", "desc").onSnapshot(snapshot => {
        allRecords = [];
        snapshot.forEach(doc => {
            allRecords.push({ id: doc.id, ...doc.data() });
        });
        renderFilteredData();
    });
}

trackerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const saleValue = parseFloat(saleValueInput.value);
    if (isNaN(saleValue) || saleValue <= 0) return;

    const myGrossProfit = 20.00;
    const taxaGatewayPercent = 0.05;
    const taxaGatewayFixed = 0.50;
    const gatewayTax = (saleValue * taxaGatewayPercent) + taxaGatewayFixed;
    const myNetProfit = myGrossProfit - gatewayTax;
    const friendNetProfit = saleValue - myGrossProfit;

    db.collection("sales").add({
        totalSale: saleValue,
        myNetProfit: myNetProfit,
        friendNetProfit: friendNetProfit,
        gatewayTax: gatewayTax,
        status: 'pending',
        createdAt: new Date()
    }).then(() => { saleValueInput.value = ''; });
});

// --- LÓGICA DOS FILTROS DE DATA ---
filtersContainer.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        showLoading();
        const filter = e.target.dataset.filter;
        currentFilter = filter;
        
        document.querySelector('.filter-btn.active').classList.remove('active');
        e.target.classList.add('active');
        
        setTimeout(renderFilteredData, 500);
    }
});

function getFilteredRecords() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    switch (currentFilter) {
        case 'today':
            return allRecords.filter(r => r.createdAt.toDate() >= today);
        case 'yesterday':
            return allRecords.filter(r => {
                const recordDate = r.createdAt.toDate();
                return recordDate >= yesterday && recordDate < today;
            });
        case 'this_month':
            return allRecords.filter(r => r.createdAt.toDate() >= startOfMonth);
        case 'this_year':
            return allRecords.filter(r => r.createdAt.toDate() >= startOfYear);
        case 'all':
        default:
            return allRecords;
    }
}

function renderFilteredData() {
    const filteredRecords = getFilteredRecords();
    renderTable(filteredRecords);
    updateDashboard(filteredRecords);
}

// --- Funções de Renderização ---
window.toggleStatus = (id, currentStatus) => db.collection("sales").doc(id).update({ status: currentStatus === 'pending' ? 'paid' : 'pending' });
window.deleteRecord = (id) => { if (confirm("Tem certeza?")) { db.collection("sales").doc(id).delete(); }};

function renderTable(records) {
    recordsBody.innerHTML = '';
    records.forEach(record => {
        const date = record.createdAt.toDate();
        recordsBody.innerHTML += `
            <tr>
                <td>${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}</td>
                <td>R$ ${record.totalSale.toFixed(2)}</td>
                <td>R$ ${record.myNetProfit.toFixed(2)}</td>
                <td>R$ ${record.friendNetProfit.toFixed(2)}</td>
                <td><button class="status-button ${record.status}" onclick="toggleStatus('${record.id}', '${record.status}')">${record.status === 'pending' ? 'Pendente' : 'Pago'}</button></td>
                <td><button class="delete-button" onclick="deleteRecord('${record.id}')">🗑️</button></td>
            </tr>`;
    });
}

function updateDashboard(records) {
    let myTotal = 0, jpTotal = 0, repassedTotal = 0, gatewayTaxTotal = 0, pendingTotal = 0;
    records.forEach(record => {
        myTotal += record.myNetProfit;
        jpTotal += record.friendNetProfit;
        gatewayTaxTotal += record.gatewayTax;
        if (record.status === 'paid') {
            repassedTotal += record.friendNetProfit;
        } else {
            pendingTotal += record.friendNetProfit;
        }
    });
    myTotalProfitCard.textContent = `R$ ${myTotal.toFixed(2)}`;
    jpTotalProfitCard.textContent = `R$ ${jpTotal.toFixed(2)}`;
    totalPendingCard.textContent = `R$ ${pendingTotal.toFixed(2)}`;
    salesCountCard.textContent = records.length;
    totalGatewayTaxCard.textContent = `R$ ${gatewayTaxTotal.toFixed(2)}`;
    totalRepassedCard.textContent = `R$ ${repassedTotal.toFixed(2)}`;
}

// --- Lógica do Chat ---
const chatForm = document.getElementById('chat-form'), chatMessages = document.getElementById('chat-messages'), chatTextInput = document.getElementById('chat-text');
function listenToChat() {
    db.collection("chat").orderBy("createdAt", "asc").onSnapshot(snapshot => {
        chatMessages.innerHTML = '';
        snapshot.forEach(doc => {
            const msg = doc.data();
            const date = msg.createdAt.toDate();
            chatMessages.innerHTML += `<div class="chat-message"><div class="msg-header"><span class="msg-author">${msg.author}</span><span class="msg-timestamp">${date.toLocaleTimeString('pt-BR')}</span></div><p class="msg-text">${msg.text}</p></div>`;
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const author = document.querySelector('input[name="author"]:checked').value;
    const text = chatTextInput.value;
    if (text.trim() === '') return;
    db.collection("chat").add({ author, text, createdAt: new Date() }).then(() => { chatTextInput.value = ''; });
});

// --- Lógica da Interface ---
const optionsMenuBtn = document.getElementById('options-menu-btn'), dropdownMenu = document.getElementById('dropdown-menu'), openChatItem = document.getElementById('open-chat-item'), sidebar = document.getElementById('sidebar-content'), closeSidebarBtn = document.getElementById('close-sidebar-btn');
const livePixItem = document.getElementById('live-pix-item'); 

optionsMenuBtn.addEventListener('click', () => dropdownMenu.classList.toggle('show'));

openChatItem.addEventListener('click', () => { 
    showLoading();
    setTimeout(() => {
        sidebar.classList.add('open'); 
        dropdownMenu.classList.remove('show');
    }, 500);
});

// CÓDIGO CORRIGIDO AQUI
livePixItem.addEventListener('click', () => {
    showLoading();
    setTimeout(() => {
        window.open('https://livepix.gg/user1524', '_blank');
    }, 500);
});

closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));
