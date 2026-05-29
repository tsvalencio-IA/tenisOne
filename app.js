// app.js – lógica principal para a versão profissional da Copa das Vendas

import { firebaseConfig, cloudinaryConfig, managerEmail, sellerEmails } from './config.js';

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getDatabase, ref, child, get, set, update, onValue } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Atalhos de elementos da interface
const loginWrapper = document.getElementById('loginWrapper');
const appShell = document.getElementById('appShell');
const loginButton = document.getElementById('loginButton');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const loginError = document.getElementById('loginError');
const logoutButton = document.getElementById('logoutButton');
const navButtons = document.querySelectorAll('.nav-btn');
const viewElems = document.querySelectorAll('.view');
const topTitle = document.getElementById('topTitle');
const topEyebrow = document.getElementById('topEyebrow');
const loggedUserEmail = document.getElementById('loggedUserEmail');

// Campos do dashboard
const greenGoalsEl = document.getElementById('greenGoals');
const blueGoalsEl = document.getElementById('blueGoals');
const greenSalesEl = document.getElementById('greenSales');
const blueSalesEl = document.getElementById('blueSales');
const todayWeightEl = document.getElementById('todayWeight');
const todayPeriodEl = document.getElementById('todayPeriod');
const sellerRankingEl = document.getElementById('sellerRanking');
const teamSummaryEl = document.getElementById('teamSummary');
const roundHistoryEl = document.getElementById('roundHistory');

// Campos de vendas
const saleForm = document.getElementById('saleForm');
const saleDate = document.getElementById('saleDate');
const saleVendor = document.getElementById('saleVendor');
const saleAmount = document.getElementById('saleAmount');
const saleNote = document.getElementById('saleNote');
const dailySalesList = document.getElementById('dailySalesList');

// Campos de vendedores
const vendorGrid = document.getElementById('vendorGrid');
const addVendorButton = document.getElementById('addVendorButton');

// Álbum
const albumGrid = document.getElementById('albumGrid');

// Estado
let currentUser = null;
let currentRole = null; // 'manager' ou 'seller'
let vendors = {}; // vendors[uid] = { name, team, number, rarity, title, photoUrl }
let sales = {}; // sales[date][uid] = { amount, note }

// Utilidades
function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseDateToKey(dateStr) {
  // Garante formato YYYY-MM-DD para usar como chave no DB
  const d = new Date(dateStr);
  return d.toISOString().split('T')[0];
}

function getDayWeight(day) {
  // Define o peso do gol conforme a dezena do mês
  if (day >= 1 && day <= 10) return 1;
  if (day >= 11 && day <= 20) return 2;
  return 3;
}

function getPeriodLabel(day) {
  if (day >= 1 && day <= 10) return '1ª dezena (dias 01–10)';
  if (day >= 11 && day <= 20) return '2ª dezena (dias 11–20)';
  return '3ª dezena (dias 21–30)';
}

// ---------- Autenticação ----------
loginButton.addEventListener('click', async () => {
  loginError.style.display = 'none';
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    loginError.innerText = 'Informe email e senha.';
    loginError.style.display = 'block';
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    console.error(err);
    loginError.innerText = 'Usuário ou senha inválidos.';
    loginError.style.display = 'block';
  }
});

logoutButton.addEventListener('click', async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    // Verifica perfil
    currentUser = user;
    const email = user.email || '';
    if (email === managerEmail) {
      currentRole = 'manager';
    } else if (sellerEmails.includes(email)) {
      currentRole = 'seller';
    } else {
      currentRole = null;
    }
    if (!currentRole) {
      // usuário sem permissão
      loginError.innerText = 'Usuário sem permissão para acessar o sistema.';
      loginError.style.display = 'block';
      signOut(auth);
      return;
    }
    // Mostra UI e carrega dados
    loginWrapper.classList.add('hidden');
    appShell.classList.remove('hidden');
    loggedUserEmail.innerText = email;
    configureRoleUI();
    loadData();
  } else {
    // Mostra login
    currentUser = null;
    currentRole = null;
    loginWrapper.classList.remove('hidden');
    appShell.classList.add('hidden');
    emailInput.value = '';
    passwordInput.value = '';
  }
});

function configureRoleUI() {
  // Esconde ou mostra itens do menu conforme o papel
  navButtons.forEach(btn => {
    const view = btn.getAttribute('data-view');
    if (currentRole === 'manager') {
      btn.classList.remove('hidden');
    } else {
      // vendedor só vê dashboard, album e regras
      if (view === 'dashboardView' || view === 'albumView' || view === 'rulesView') {
        btn.classList.remove('hidden');
      } else {
        btn.classList.add('hidden');
      }
    }
  });
}

// ---------- Navegação ----------
navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.getAttribute('data-view');
    viewElems.forEach(v => {
      if (v.id === target) v.classList.remove('hidden');
      else v.classList.add('hidden');
    });
    // Atualiza título
    const titles = {
      dashboardView: 'Placar',
      salesView: 'Lançar vendas',
      vendorsView: 'Vendedores & Figurinhas',
      albumView: 'Álbum',
      rulesView: 'Regras'
    };
    topTitle.innerText = titles[target] || 'Copa das Vendas';
  });
});

// ---------- Carregamento de dados ----------
function loadData() {
  loadVendors();
  loadSales();
}

function loadVendors() {
  onValue(ref(database, 'vendors'), (snapshot) => {
    vendors = snapshot.val() || {};
    // Preenche a lista de seleção para vendas
    populateVendorSelect();
    // Atualiza grid de vendedores para edição
    renderVendorGrid();
    // Atualiza ranking e album
    updateDashboard();
    renderAlbum();
  });
}

function loadSales() {
  onValue(ref(database, 'sales'), (snapshot) => {
    sales = snapshot.val() || {};
    updateDashboard();
    renderDailySales();
  });
}

function populateVendorSelect() {
  saleVendor.innerHTML = '';
  Object.entries(vendors).forEach(([uid, v]) => {
    const option = document.createElement('option');
    option.value = uid;
    option.textContent = v.name;
    saleVendor.appendChild(option);
  });
}

function renderVendorGrid() {
  vendorGrid.innerHTML = '';
  if (currentRole !== 'manager') return;
  Object.entries(vendors).forEach(([uid, v]) => {
    const card = document.createElement('div');
    card.style.border = '1px solid #ddd';
    card.style.borderRadius = '6px';
    card.style.padding = '10px';
    card.style.marginBottom = '10px';
    card.innerHTML = `
      <strong>${v.name}</strong> – ${v.team.toUpperCase()}<br>
      <small>Nº ${v.number || ''} | Raridade: ${v.rarity || 'normal'} | Título: ${v.title || ''}</small><br>
      <button data-uid="${uid}" class="editVendorBtn" style="margin-top:5px; background:#2a5298; color:#fff; border:none; padding:5px 8px; border-radius:4px; cursor:pointer;">Editar</button>
    `;
    vendorGrid.appendChild(card);
  });
  // Botões de edição
  document.querySelectorAll('.editVendorBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.getAttribute('data-uid');
      openVendorEditor(uid);
    });
  });
}

function openVendorEditor(uid) {
  const v = vendors[uid] || {};
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'rgba(0,0,0,0.7)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  const modal = document.createElement('div');
  modal.style.background = '#fff';
  modal.style.padding = '20px';
  modal.style.borderRadius = '8px';
  modal.style.maxWidth = '400px';
  modal.style.width = '90%';
  modal.innerHTML = `
    <h3>Editar vendedor</h3>
    <label>Nome</label>
    <input type="text" id="editName" value="${v.name || ''}" style="width:100%; margin-bottom:10px;">
    <label>Equipe (green/blue)</label>
    <input type="text" id="editTeam" value="${v.team || ''}" style="width:100%; margin-bottom:10px;">
    <label>Número da camisa</label>
    <input type="number" id="editNumber" value="${v.number || ''}" style="width:100%; margin-bottom:10px;">
    <label>Raridade (classic/prata/ouro/lendaria)</label>
    <input type="text" id="editRarity" value="${v.rarity || ''}" style="width:100%; margin-bottom:10px;">
    <label>Título (capitão/craque/...). Deixe em branco se não houver.</label>
    <input type="text" id="editTitle" value="${v.title || ''}" style="width:100%; margin-bottom:10px;">
    <button id="uploadPhotoBtn" style="margin-bottom:10px; background:#546e7a; color:#fff; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">Enviar foto</button>
    <br>
    <button id="saveVendorBtn" style="background:#2a5298; color:#fff; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">Salvar</button>
    <button id="cancelVendorBtn" style="margin-left:10px; background:#aaa; color:#fff; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">Cancelar</button>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  // Upload widget
  const uploadWidget = cloudinary.createUploadWidget({
    cloudName: cloudinaryConfig.cloudName,
    uploadPreset: cloudinaryConfig.uploadPreset,
    cropping: false,
    multiple: false
  }, (error, result) => {
    if (!error && result && result.event === 'success') {
      v.photoUrl = result.info.secure_url;
    }
  });
  document.getElementById('uploadPhotoBtn').addEventListener('click', () => {
    uploadWidget.open();
  });
  document.getElementById('saveVendorBtn').addEventListener('click', async () => {
    const name = document.getElementById('editName').value.trim();
    const team = document.getElementById('editTeam').value.trim().toLowerCase();
    const number = parseInt(document.getElementById('editNumber').value || '0');
    const rarity = document.getElementById('editRarity').value.trim();
    const title = document.getElementById('editTitle').value.trim();
    // Atualiza no banco
    await update(ref(database, `vendors/${uid}`), {
      name, team, number, rarity, title, photoUrl: v.photoUrl || ''
    });
    document.body.removeChild(overlay);
  });
  document.getElementById('cancelVendorBtn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
}

addVendorButton.addEventListener('click', () => {
  if (currentRole !== 'manager') return;
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'rgba(0,0,0,0.7)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  const modal = document.createElement('div');
  modal.style.background = '#fff';
  modal.style.padding = '20px';
  modal.style.borderRadius = '8px';
  modal.style.maxWidth = '400px';
  modal.style.width = '90%';
  modal.innerHTML = `
    <h3>Novo vendedor</h3>
    <p style="font-size:0.8rem; color:#666;">Para que este cadastro funcione, o usuário deve existir em Firebase Authentication e você precisa saber o UID dele (copiado do console do Firebase).  Caso não saiba, crie a conta primeiro no console e copie o UID.</p>
    <label>UID do usuário</label>
    <input type="text" id="newUid" style="width:100%; margin-bottom:8px;">
    <label>Nome</label>
    <input type="text" id="newName" style="width:100%; margin-bottom:8px;">
    <label>Equipe (green/blue)</label>
    <input type="text" id="newTeam" style="width:100%; margin-bottom:8px;">
    <button id="createVendorBtn" style="background:#2a5298; color:#fff; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">Criar</button>
    <button id="cancelCreateVendorBtn" style="margin-left:10px; background:#aaa; color:#fff; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">Cancelar</button>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  document.getElementById('createVendorBtn').addEventListener('click', async () => {
    const uid = document.getElementById('newUid').value.trim();
    const name = document.getElementById('newName').value.trim();
    const team = document.getElementById('newTeam').value.trim().toLowerCase();
    if (!uid || !name || !team) return;
    await set(ref(database, `vendors/${uid}`), {
      name,
      team,
      number: 0,
      rarity: 'classic',
      title: '',
      photoUrl: ''
    });
    document.body.removeChild(overlay);
  });
  document.getElementById('cancelCreateVendorBtn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
});

// ---------- Gestão de vendas ----------
saleForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (currentRole !== 'manager') return;
  const dateKey = parseDateToKey(saleDate.value);
  const uid = saleVendor.value;
  const amount = parseFloat(saleAmount.value || '0');
  const note = saleNote.value.trim();
  if (!dateKey || !uid || !amount) return;
  await set(ref(database, `sales/${dateKey}/${uid}`), {
    amount,
    note,
    uid
  });
  saleAmount.value = '';
  saleNote.value = '';
});

function renderDailySales() {
  dailySalesList.innerHTML = '';
  const date = saleDate.value || new Date().toISOString().split('T')[0];
  const records = sales[date] || {};
  Object.entries(records).forEach(([uid, record]) => {
    const div = document.createElement('div');
    div.style.borderBottom = '1px solid #eee';
    div.style.padding = '4px 0';
    const v = vendors[uid] || {};
    div.innerHTML = `<strong>${v.name || uid}</strong>: ${formatCurrency(record.amount)} <small>${record.note || ''}</small>`;
    dailySalesList.appendChild(div);
  });
}

// Atualiza lista ao mudar a data
saleDate.addEventListener('change', renderDailySales);

// ---------- Dashboard e placar ----------
function updateDashboard() {
  // Calcula totals por vendedor e por equipe
  const vendorTotals = {};
  const teamTotals = { green: 0, blue: 0 };
  const dailyWinners = {}; // { dateKey: 'green'|'blue'|'tie' }
  const goals = { green: 0, blue: 0 };
  const bonusTotals = { green: {1: 0, 2: 0, 3: 0}, blue: {1: 0, 2: 0, 3: 0} };

  Object.entries(sales).forEach(([dateKey, vendorsSales]) => {
    let dailyGreen = 0;
    let dailyBlue = 0;
    Object.entries(vendorsSales).forEach(([uid, record]) => {
      const amount = parseFloat(record.amount) || 0;
      vendorTotals[uid] = (vendorTotals[uid] || 0) + amount;
      const team = vendors[uid]?.team || 'green';
      if (team === 'green') {
        dailyGreen += amount;
      } else {
        dailyBlue += amount;
      }
    });
    // Determina vencedor da rodada
    if (dailyGreen > dailyBlue) dailyWinners[dateKey] = 'green';
    else if (dailyBlue > dailyGreen) dailyWinners[dateKey] = 'blue';
    else dailyWinners[dateKey] = 'tie';
    // Adiciona ao acumulado por equipe
    teamTotals.green += dailyGreen;
    teamTotals.blue += dailyBlue;
    // Calcula gols
    const day = parseInt(dateKey.split('-')[2]);
    const weight = getDayWeight(day);
    if (dailyGreen > dailyBlue) goals.green += weight;
    else if (dailyBlue > dailyGreen) goals.blue += weight;
    // acumula para bônus
    const dezena = day <= 10 ? 1 : (day <= 20 ? 2 : 3);
    bonusTotals.green[dezena] += dailyGreen;
    bonusTotals.blue[dezena] += dailyBlue;
  });
  // Aplica bônus de +3 gols por dezena
  for (let d = 1; d <= 3; d++) {
    if (bonusTotals.green[d] > bonusTotals.blue[d]) goals.green += 3;
    else if (bonusTotals.blue[d] > bonusTotals.green[d]) goals.blue += 3;
  }
  // Atualiza UI principal
  greenGoalsEl.innerText = goals.green;
  blueGoalsEl.innerText = goals.blue;
  greenSalesEl.innerText = formatCurrency(teamTotals.green);
  blueSalesEl.innerText = formatCurrency(teamTotals.blue);
  // Rodada atual
  const today = new Date();
  const td = today.getDate();
  todayWeightEl.innerText = getDayWeight(td) + ' gol(s)';
  todayPeriodEl.innerText = getPeriodLabel(td);
  // Ranking individual
  const rankingArray = Object.entries(vendorTotals).map(([uid, amount]) => {
    return { uid, amount, name: vendors[uid]?.name || uid, team: vendors[uid]?.team || 'green' };
  }).sort((a, b) => b.amount - a.amount);
  sellerRankingEl.innerHTML = rankingArray.map(r => `<div><strong>${r.name}</strong> (${r.team}) — ${formatCurrency(r.amount)}</div>`).join('');
  // Resumo de duplas
  teamSummaryEl.innerHTML = `
    <div><strong>Time Verde</strong>: ${formatCurrency(teamTotals.green)} | Gols: ${goals.green}</div>
    <div><strong>Time Azul</strong>: ${formatCurrency(teamTotals.blue)} | Gols: ${goals.blue}</div>
  `;
  // Histórico de rodadas
  const historyLines = Object.keys(dailyWinners).sort().map(dateKey => {
    const winner = dailyWinners[dateKey];
    const day = parseInt(dateKey.split('-')[2]);
    const weight = getDayWeight(day);
    let result;
    if (winner === 'tie') result = 'Empate';
    else result = `${winner === 'green' ? 'Verde' : 'Azul'} +${weight} gol(s)`;
    return `<div>${dateKey}: ${result}</div>`;
  });
  roundHistoryEl.innerHTML = historyLines.join('');
}

// ---------- Álbum ----------
function renderAlbum() {
  albumGrid.innerHTML = '';
  Object.entries(vendors).forEach(([uid, v]) => {
    const card = document.createElement('div');
    card.style.display = 'inline-block';
    card.style.margin = '10px';
    card.style.width = '120px';
    card.style.textAlign = 'center';
    card.style.border = '1px solid #ddd';
    card.style.borderRadius = '6px';
    card.style.padding = '6px';
    const img = document.createElement('img');
    img.src = v.photoUrl || 'https://via.placeholder.com/100x120.png?text=Foto';
    img.alt = v.name;
    img.style.width = '100px';
    img.style.height = '120px';
    img.style.objectFit = 'cover';
    const nameSpan = document.createElement('div');
    nameSpan.innerText = v.name;
    nameSpan.style.fontSize = '0.8rem';
    nameSpan.style.marginTop = '4px';
    card.appendChild(img);
    card.appendChild(nameSpan);
    albumGrid.appendChild(card);
  });
}

// Inicialização de data default para vendas
saleDate.valueAsDate = new Date();