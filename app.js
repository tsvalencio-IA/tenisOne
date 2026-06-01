const CONFIG = window.APP_CONFIG || {};
const campaign = CONFIG.campaign || {};
const TEAMS = campaign.teams || {};
const TRIAL_DAYS = Number(CONFIG.trialDays || 3);
const CONTACT_TEXT = `${CONFIG.contactChannel || "WhatsApp"} do ${CONFIG.contactPerson || "Thiago Ventura Valêncio"}`;
const TRIAL_KEY = "tenis_one_copa_trial_started_at_vFinal";
const LOCAL_STATE_KEY = "tenis_one_copa_state_vFinal";
const LOGIN_MEMORY_KEY = "tenis_one_copa_login_remember_v1";

const RARITIES = {
  legendary: { key: "legendary", label: "Lendária", shortLabel: "Holo", note: "Destaque máximo da coleção" },
  gold: { key: "gold", label: "Ouro", shortLabel: "Ouro", note: "Grande destaque da campanha" },
  silver: { key: "silver", label: "Prata", shortLabel: "Prata", note: "Figurinha premium" },
  classic: { key: "classic", label: "Clássica", shortLabel: "Clássica", note: "Figurinha oficial" }
};

const TITLE_OPTIONS = [
  "Craque da Rodada",
  "Artilheiro",
  "Camisa 10",
  "Capitão",
  "Destaque da Semana",
  "Revelação",
  "Muralha",
  "Vendedor Raiz",
  "Garçom dos Combos",
  "Defesa contra Cancelamentos",
  "Personalizado"
];

const SPECIAL_OPTIONS = [
  { value: "normal", label: "Figurinha normal" },
  { value: "artilheiro", label: "Especial Artilheiro" },
  { value: "campeao", label: "Especial Campeão" },
  { value: "craque", label: "Especial Craque da Rodada" },
  { value: "custom", label: "Especial personalizado" }
];

let services = {};
let session = { role: null, vendorId: null, email: null };
const state = { mode: "local", db: null, auth: null, data: createSeedData() };
let realtimeStarted = false;
let realtimeUnsubscribe = null;

const AUTH_CONFIG = CONFIG.auth || {};
const AUTH_ENABLED = AUTH_CONFIG.enabled !== false;
const managerEmailNormalized = String(AUTH_CONFIG.managerEmail || "").trim().toLowerCase();
const sellerEmailMap = new Map(
  (AUTH_CONFIG.sellers || [])
    .filter((item) => item && item.email && item.vendorId)
    .map((item) => [String(item.email).trim().toLowerCase(), String(item.vendorId).trim()])
);

const $ = (id) => document.getElementById(id);
const brl = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const safeId = () => `v_${Date.now()}_${Math.random().toString(16).slice(2)}`;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isoToday() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function teamName(teamId) {
  return TEAMS?.[teamId]?.name || (teamId === "azul" ? "França" : "Brasil");
}

function teamAccent(teamId) {
  return teamId === "azul"
    ? { primary: "#143f91", dark: "#0b2a63", soft: "#eef4ff", text: "#143f91" }
    : { primary: "#0b7f49", dark: "#07482e", soft: "#eefaf3", text: "#0b7f49" };
}

function getTrialInfo() {
  return {
    startDate: null,
    expiresAt: null,
    expired: false,
    daysLeft: null,
    production: true
  };
}

function updateTrialUI() {
  ["trialLoginNotice", "trialStatus"].forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.textContent = "";
    el.classList.add("hidden");
    el.classList.remove("expired");
  });
  document.querySelectorAll(".manager-action, #saleForm button, #closeTodayBtn, #closeRoundBtn, #applyBonusBtn, #seedBtn, #addVendorBtn, [data-save-vendor], [data-upload], [data-delete-vendor], [data-reset-vendor]")
    .forEach((el) => el.classList.remove("trial-lock"));
  return getTrialInfo();
}

function ensureCanSave(action = "salvar novos dados") {
  updateTrialUI();
  return true;
}

function toast(message) {
  const el = $("toast");
  if (!el) return;
  el.textContent = message;
  el.style.display = "block";
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.display = "none"; }, 3600);
}

function createSeedData() {
  const vendors = {};
  (campaign.vendors || []).forEach((vendor) => {
    vendors[vendor.id] = {
      id: vendor.id,
      name: vendor.name || "",
      shortName: vendor.shortName || vendor.name || "",
      team: vendor.team || "verde",
      shirtNumber: vendor.shirtNumber || "",
      rarity: vendor.rarity || "classic",
      title: vendor.title || "Craque de vendas",
      subtitle: vendor.subtitle || "Rumo à taça de vendas",
      albumOrder: Number(vendor.albumOrder || 99),
      specialType: vendor.specialType || "normal",
      customSpecialLabel: vendor.customSpecialLabel || "",
      showInAlbum: vendor.showInAlbum !== false,
      active: vendor.active !== false,
      imageUrl: vendor.imageUrl || "",
      position: vendor.position || vendor.role || "Vendedor",
      height: vendor.height || "1,70m",
      weight: vendor.weight || "70kg",
      birthDate: vendor.birthDate || vendor.nascimento || "",
      age: vendor.age || "18"
    };
  });
  return {
    settings: {
      name: campaign.name,
      store: campaign.store,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      productsRule: campaign.productsRule,
      prizes: campaign.prizes || {}
    },
    vendors,
    sales: {},
    rounds: {},
    bonuses: {}
  };
}

function localLoad() {
  const raw = localStorage.getItem(LOCAL_STATE_KEY);
  if (!raw) {
    state.data = createSeedData();
    localSave();
    return;
  }
  try {
    state.data = normalizeData(JSON.parse(raw));
  } catch {
    state.data = createSeedData();
    localSave();
  }
}

function localSave() {
  if (getTrialInfo().expired) return false;
  localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(state.data));
  return true;
}

function normalizeData(data) {
  const seed = createSeedData();
  const merged = {
    settings: { ...seed.settings, ...(data.settings || {}) },
    vendors: { ...seed.vendors, ...(data.vendors || {}) },
    sales: data.sales || {},
    rounds: data.rounds || {},
    bonuses: data.bonuses || {}
  };
  Object.values(merged.vendors).forEach((v, idx) => {
    v.id = v.id || Object.keys(merged.vendors)[idx] || safeId();
    v.name = v.name || "Vendedor";
    v.shortName = v.shortName || v.name;
    v.team = v.team || "verde";
    v.rarity = v.rarity || "classic";
    v.title = v.title || "Craque de vendas";
    v.subtitle = v.subtitle || "";
    v.albumOrder = Number(v.albumOrder || 99);
    v.specialType = v.specialType || "normal";
    v.showInAlbum = v.showInAlbum !== false;
    v.active = v.active !== false;
    v.imageUrl = v.imageUrl || "";
    v.position = v.position || v.role || "Vendedor";
    v.height = v.height || "1,70m";
    v.weight = v.weight || "70kg";
    v.birthDate = v.birthDate || v.nascimento || "";
    v.age = v.age || "18";
  });
  return merged;
}

function isConfigured(obj, keys) {
  return !!obj && keys.every((key) => typeof obj[key] === "string" && obj[key].trim());
}

async function loadSyncServices() {
  const [appModule, databaseModule, authModule] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js")
  ]);
  services = {
    initializeApp: appModule.initializeApp,
    getDatabase: databaseModule.getDatabase,
    ref: databaseModule.ref,
    set: databaseModule.set,
    onValue: databaseModule.onValue,
    get: databaseModule.get,
    getAuth: authModule.getAuth,
    signInWithEmailAndPassword: authModule.signInWithEmailAndPassword,
    onAuthStateChanged: authModule.onAuthStateChanged,
    signOut: authModule.signOut
  };
}

function firebaseReady() {
  return isConfigured(CONFIG.firebase, ["apiKey", "databaseURL", "appId"]);
}

function useFirebaseAuth() {
  return AUTH_ENABLED && firebaseReady();
}

function getSessionFromEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();

  if (normalized && managerEmailNormalized && normalized === managerEmailNormalized) {
    return {
      role: "manager",
      vendorId: null,
      email: normalized
    };
  }

  if (sellerEmailMap.has(normalized)) {
    return {
      role: "seller",
      vendorId: sellerEmailMap.get(normalized),
      email: normalized
    };
  }

  return null;
}

function shouldUseEmailLogin() {
  return AUTH_ENABLED;
}

function loadRememberedLogin() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOGIN_MEMORY_KEY) || "null");
    if (!saved) return;
    if ($("loginEmail") && saved.email) $("loginEmail").value = saved.email;
    if ($("loginPassword") && saved.password) $("loginPassword").value = saved.password;
    if ($("rememberAccess")) $("rememberAccess").checked = true;
  } catch {
    localStorage.removeItem(LOGIN_MEMORY_KEY);
  }
}

function saveRememberedLogin() {
  if (!$("rememberAccess")) return;
  if ($("rememberAccess").checked) {
    localStorage.setItem(LOGIN_MEMORY_KEY, JSON.stringify({
      email: $("loginEmail")?.value.trim() || "",
      password: $("loginPassword")?.value || ""
    }));
  } else {
    localStorage.removeItem(LOGIN_MEMORY_KEY);
  }
}

function configureLoginMode() {
  const emailLogin = shouldUseEmailLogin();
  const professionalReady = useFirebaseAuth();

  $("loginEmailWrap")?.classList.toggle("hidden", !emailLogin);
  $("authLoginHint")?.classList.toggle("hidden", !emailLogin);
  $("legacyLoginHint")?.classList.toggle("hidden", emailLogin);
  $("legacyRoleWrap")?.classList.toggle("hidden", emailLogin);
  $("sellerPickerWrap")?.classList.toggle("hidden", emailLogin || $("loginRole")?.value !== "seller");
  $("rememberAccess")?.closest("label")?.classList.toggle("hidden", !emailLogin);

  if (emailLogin) {
    $("loginPassword").placeholder = professionalReady
      ? "Senha cadastrada no Firebase Auth"
      : "Senha do Firebase Auth";
  } else {
    $("loginPassword").placeholder = "Digite a senha de acesso";
  }
}

async function startRealtimeSync() {
  if (!state.db || realtimeStarted) return;
  realtimeStarted = true;

  const root = services.ref(state.db, "copaTenisOne");

  try {
    const snap = await services.get(root);
    if (!snap.exists() && session.role === "manager") {
      await services.set(root, state.data);
    }
  } catch (err) {
    console.warn("Não foi possível verificar dados iniciais no Firebase.", err);
  }

  realtimeUnsubscribe = services.onValue(root, (snapshot) => {
    if (snapshot.exists()) {
      state.data = normalizeData(snapshot.val() || createSeedData());
      renderVendorSelects();
      render();
    } else if (session.role === "manager") {
      state.data = normalizeData(state.data || createSeedData());
      renderVendorSelects();
      render();
    } else {
      toast("Banco ainda não inicializado. Entre primeiro com o gerente para criar a base.");
    }
  });
}

async function enterAppWithSession(nextSession) {
  session = nextSession;
  $("loginScreen").classList.add("hidden");
  $("appShell").classList.remove("hidden");
  setView("dashboard");
  renderVendorSelects();
  render();

  if (state.mode === "firebase" && state.db) {
    await startRealtimeSync();
  }
}

async function initStorage() {
  localLoad();
  configureLoginMode();

  const ready = firebaseReady();
  if (!ready) {
    state.mode = "local";
    return;
  }

  try {
    await loadSyncServices();
    const app = services.initializeApp(CONFIG.firebase);
    state.auth = services.getAuth(app);
    state.db = services.getDatabase(app);
    state.mode = "firebase";

    services.onAuthStateChanged(state.auth, async (user) => {
      if (!user) return;

      const nextSession = getSessionFromEmail(user.email);
      if (!nextSession) {
        toast("Email sem permissão no config.js. Verifique managerEmail e sellers.");
        await services.signOut(state.auth);
        return;
      }

      await enterAppWithSession(nextSession);
    });
  } catch (err) {
    console.warn(err);
    state.mode = "local";
    configureLoginMode();
  }
}

async function persist(renderAfter = true) {
  if (!ensureCanSave("salvar alterações")) return false;

  try {
    if (state.mode === "firebase" && state.db && session.role === "manager") {
      await services.set(services.ref(state.db, "copaTenisOne"), state.data);
    } else {
      localSave();
    }
  } catch (err) {
    console.error(err);
    toast("Não foi possível salvar no Firebase. Verifique as regras do banco e o email do gerente.");
    return false;
  }

  if (renderAfter) render();
  updateTrialUI();
  return true;
}

function vendorsArray({ activeOnly = false, albumOnly = false } = {}) {
  return Object.values(state.data.vendors || {})
    .filter((v) => !activeOnly || v.active !== false)
    .filter((v) => !albumOnly || v.showInAlbum !== false)
    .sort((a, b) => Number(a.albumOrder || 99) - Number(b.albumOrder || 99) || String(a.name).localeCompare(String(b.name)));
}

function salesArray() {
  return Object.entries(state.data.sales || {}).map(([id, sale]) => ({
    ...sale,
    id: sale?.id || id
  }));
}

function roundsArray() {
  return Object.values(state.data.rounds || {});
}

function bonusesArray() {
  return Object.values(state.data.bonuses || {});
}

function dayFromISO(date) {
  return Number(String(date || "").slice(-2));
}

function getGoalsForDate(date) {
  const day = dayFromISO(date);
  if (day <= 10) return 1;
  if (day <= 20) return 2;
  return 3;
}

function getDezena(date) {
  const day = dayFromISO(date);
  if (day <= 10) return 1;
  if (day <= 20) return 2;
  return 3;
}

function dateRangeForDezena(n) {
  const start = state.data.settings?.startDate || campaign.startDate || "2026-06-01";
  const [year, month] = start.split("-");
  if (Number(n) === 1) return [`${year}-${month}-01`, `${year}-${month}-10`];
  if (Number(n) === 2) return [`${year}-${month}-11`, `${year}-${month}-20`];
  return [`${year}-${month}-21`, state.data.settings?.endDate || `${year}-${month}-30`];
}

function getVendor(id) {
  return state.data.vendors?.[id] || null;
}

function getTeamTotalsForDate(date) {
  const totals = { verde: 0, azul: 0 };
  salesArray().filter((sale) => sale.date === date).forEach((sale) => {
    const vendor = getVendor(sale.vendorId);
    if (!vendor) return;
    totals[vendor.team] = (totals[vendor.team] || 0) + Number(sale.amount || 0);
  });
  return totals;
}

function getTeamTotalsForRange(start, end) {
  const totals = { verde: 0, azul: 0 };
  salesArray().filter((sale) => sale.date >= start && sale.date <= end).forEach((sale) => {
    const vendor = getVendor(sale.vendorId);
    if (!vendor) return;
    totals[vendor.team] = (totals[vendor.team] || 0) + Number(sale.amount || 0);
  });
  return totals;
}

function winnerFromTotals(totals) {
  if (Number(totals.verde || 0) === Number(totals.azul || 0)) return null;
  return Number(totals.verde || 0) > Number(totals.azul || 0) ? "verde" : "azul";
}

function hasSalesForDate(date) {
  return salesArray().some((sale) => sale.date === date && Number(sale.amount || 0) > 0);
}

function hasSalesForDezena(dezena) {
  const [start, end] = dateRangeForDezena(dezena);
  return salesArray().some((sale) => sale.date >= start && sale.date <= end && Number(sale.amount || 0) > 0);
}

function buildAutomaticRound(date) {
  const totals = getTeamTotalsForDate(date);
  const winnerTeam = winnerFromTotals(totals);
  const goalsAwarded = winnerTeam ? getGoalsForDate(date) : 0;
  return {
    id: date,
    date,
    dezena: getDezena(date),
    teamTotals: totals,
    winnerTeam,
    goalsAwarded,
    source: "automatico",
    ruleUsed: "Automático: maior faturamento diário.",
    closedBy: "sistema",
    closedAt: new Date().toISOString()
  };
}

function recomputeRoundForDate(date) {
  if (!date || !hasSalesForDate(date)) {
    if (date) delete state.data.rounds[date];
    return null;
  }
  const round = buildAutomaticRound(date);
  state.data.rounds[date] = round;
  return round;
}

function buildAutomaticBonus(dezena) {
  const [start, end] = dateRangeForDezena(dezena);
  const totals = getTeamTotalsForRange(start, end);
  const winnerTeam = winnerFromTotals(totals);
  return {
    id: `dezena_${dezena}`,
    dezena: Number(dezena),
    startDate: start,
    endDate: end,
    teamTotals: totals,
    winnerTeam,
    goalsAwarded: winnerTeam ? 3 : 0,
    source: "automatico",
    ruleUsed: "Automático: maior faturamento acumulado da dezena.",
    closedBy: "sistema",
    closedAt: new Date().toISOString()
  };
}

function recomputeBonusForDezena(dezena) {
  if (!dezena || !hasSalesForDezena(dezena)) {
    if (dezena) delete state.data.bonuses[`dezena_${dezena}`];
    return null;
  }
  const bonus = buildAutomaticBonus(dezena);
  state.data.bonuses[`dezena_${dezena}`] = bonus;
  return bonus;
}

function recomputeAutomaticsForDate(date) {
  const round = recomputeRoundForDate(date);
  const bonus = recomputeBonusForDezena(getDezena(date));
  return { round, bonus };
}

function recomputeAllAutomatics() {
  state.data.rounds = {};
  state.data.bonuses = {};
  const dates = [...new Set(salesArray().map((sale) => sale.date).filter(Boolean))].sort();
  dates.forEach((date) => recomputeRoundForDate(date));
  [1, 2, 3].forEach((dezena) => recomputeBonusForDezena(dezena));
}

function calculateScore() {
  const score = { verde: { goals: 0, sales: 0, wins: 0 }, azul: { goals: 0, sales: 0, wins: 0 } };
  salesArray().forEach((sale) => {
    const vendor = getVendor(sale.vendorId);
    if (!vendor) return;
    score[vendor.team].sales += Number(sale.amount || 0);
  });
  roundsArray().forEach((round) => {
    if (round.winnerTeam && score[round.winnerTeam]) {
      score[round.winnerTeam].goals += Number(round.goalsAwarded || 0);
      score[round.winnerTeam].wins += 1;
    }
  });
  bonusesArray().forEach((bonus) => {
    if (bonus.winnerTeam && score[bonus.winnerTeam]) {
      score[bonus.winnerTeam].goals += Number(bonus.goalsAwarded || 0);
    }
  });
  return score;
}

function calculateSellerRanking({ activeOnly = false } = {}) {
  const totals = {};
  vendorsArray({ activeOnly }).forEach((vendor) => {
    totals[vendor.id] = { ...vendor, total: 0, salesCount: 0 };
  });
  salesArray().forEach((sale) => {
    if (!totals[sale.vendorId]) return;
    totals[sale.vendorId].total += Number(sale.amount || 0);
    totals[sale.vendorId].salesCount += 1;
  });
  return Object.values(totals).sort((a, b) =>
    (b.total - a.total) ||
    (Number(a.albumOrder || 99) - Number(b.albumOrder || 99)) ||
    String(a.name).localeCompare(String(b.name))
  );
}

function getLeaderTeam() {
  const score = calculateScore();
  if (score.verde.goals !== score.azul.goals) return score.verde.goals > score.azul.goals ? "verde" : "azul";
  if (score.verde.sales !== score.azul.sales) return score.verde.sales > score.azul.sales ? "verde" : "azul";
  return null;
}

function getCollectionSummary() {
  const vendors = vendorsArray({ albumOnly: true });
  const withPhotos = vendors.filter((vendor) => !!vendor.imageUrl).length;
  const ranking = calculateSellerRanking({ activeOnly: true });
  return {
    total: vendors.length,
    withPhotos,
    missingPhotos: vendors.length - withPhotos,
    topSeller: ranking[0] || null,
    leaderTeam: getLeaderTeam()
  };
}

function getVendorNumber(vendor, index = 0) {
  return Number(vendor?.shirtNumber || index + 1);
}

function getStickerNumber(index) {
  return String(index + 1).padStart(2, "0");
}

function getSpecialLabel(vendor) {
  if (vendor.specialType === "artilheiro") return "Especial Artilheiro";
  if (vendor.specialType === "campeao") return "Especial Campeão";
  if (vendor.specialType === "craque") return "Especial Craque";
  if (vendor.specialType === "custom") return vendor.customSpecialLabel || "Especial";
  return "";
}

function titleSelectOptions(current) {
  return TITLE_OPTIONS.map((title) => `<option value="${escapeHtml(title)}" ${title === current ? "selected" : ""}>${escapeHtml(title)}</option>`).join("");
}

function raritySelectOptions(current) {
  return Object.values(RARITIES).map((rarity) => `<option value="${rarity.key}" ${rarity.key === current ? "selected" : ""}>${rarity.label}</option>`).join("");
}

function specialSelectOptions(current) {
  return SPECIAL_OPTIONS.map((item) => `<option value="${item.value}" ${item.value === current ? "selected" : ""}>${item.label}</option>`).join("");
}

function teamSelectOptions(current) {
  return Object.values(TEAMS).map((team) => `<option value="${team.id}" ${team.id === current ? "selected" : ""}>${team.name}</option>`).join("");
}


function getStickerIndex(vendor) {
  const vendorId = String(vendor?.id || "");
  const albumVendors = vendorsArray({ albumOnly: true });
  let index = albumVendors.findIndex((item) => String(item.id) === vendorId);
  if (index < 0) {
    index = vendorsArray({ activeOnly: false }).findIndex((item) => String(item.id) === vendorId);
  }
  return Math.max(0, index);
}

function getStickerMeta(vendor) {
  const team = vendor?.team === "azul" ? "azul" : "verde";
  const rarity = RARITIES[vendor?.rarity] || RARITIES.classic;
  const teamLabel = teamName(team);
  const stickerNumber = getStickerNumber(getStickerIndex(vendor));
  const birthDate = String(vendor?.birthDate || vendor?.nascimento || "").trim();
  const age = String(vendor?.age || "").trim();
  const birthLabel = birthDate && birthDate !== "A definir" ? "NASC." : "IDADE";
  const birthValue = birthDate && birthDate !== "A definir" ? birthDate : (age || "18");

  return {
    team,
    teamLabel,
    teamCode: team === "azul" ? "FR" : "BR",
    rarity,
    stickerNumber,
    displayName: String(vendor?.shortName || vendor?.name || "Vendedor").trim(),
    fullName: String(vendor?.name || "Vendedor").trim(),
    position: String(vendor?.position || vendor?.role || "Vendedor").trim(),
    height: String(vendor?.height || "1,70m").trim(),
    weight: String(vendor?.weight || "70kg").trim(),
    birthLabel,
    birthValue
  };
}

function renderSticker(vendor, mode = "full") {
  const normalizedMode = ["full", "mini", "export"].includes(mode) ? mode : "full";
  const meta = getStickerMeta(vendor);
  const initials = meta.displayName.slice(0, 2).toUpperCase() || "CV";
  const photo = vendor?.imageUrl
    ? `<img src="${escapeHtml(vendor.imageUrl)}" crossorigin="anonymous" loading="eager" referrerpolicy="no-referrer" alt="${escapeHtml(meta.fullName)}" />`
    : `<div class="official-sticker-placeholder">${escapeHtml(initials)}</div>`;

  return `
    <article class="official-sticker official-sticker--${normalizedMode} official-sticker--${meta.team} rarity-${meta.rarity.key}" data-sticker-vendor="${escapeHtml(vendor?.id || "")}" data-sticker-mode="${normalizedMode}">
      <div class="official-sticker-frame">
        <div class="official-sticker-stadium"></div>
        <div class="official-sticker-brush official-sticker-brush-a"></div>
        <div class="official-sticker-brush official-sticker-brush-b"></div>
        <div class="official-sticker-lights"></div>
        <div class="official-sticker-confetti"></div>
        <div class="official-sticker-lines"></div>

        <div class="official-sticker-badge">
          <div class="official-sticker-tournament-mark" aria-hidden="true">
            <span class="tournament-cup"></span>
            <span class="tournament-base"></span>
          </div>
          <span>COPA DAS</span>
          <strong>VENDAS</strong>
          <small>2026</small>
        </div>

        <div class="official-sticker-team-card" aria-label="${escapeHtml(meta.teamLabel)}">
          <div class="official-sticker-team-mark official-sticker-team-mark--${meta.team}" aria-hidden="true">
            <span class="team-mark-shield"><i></i><b></b></span>
            <em>${escapeHtml(meta.teamCode)}</em>
          </div>
          <small>EQUIPE</small>
          <strong>${escapeHtml(meta.teamLabel.toUpperCase())}</strong>
          <span>#${meta.stickerNumber}</span>
        </div>

        <div class="official-sticker-stats">
          <div><i>N</i><span><small>${escapeHtml(meta.birthLabel)}</small><strong>${escapeHtml(meta.birthValue)}</strong></span></div>
          <div><i>A</i><span><small>ALTURA</small><strong>${escapeHtml(meta.height)}</strong></span></div>
          <div><i>P</i><span><small>PESO</small><strong>${escapeHtml(meta.weight)}</strong></span></div>
        </div>

        <div class="official-sticker-photo">
          ${photo}
        </div>

        <div class="official-sticker-footer-medal">CV</div>
        <div class="official-sticker-footer-cup">26</div>

        <div class="official-sticker-footer">
          <strong>${escapeHtml(meta.displayName.toUpperCase())}</strong>
          <span>${escapeHtml(meta.position.toUpperCase())}</span>
          <small>#${meta.stickerNumber} - ${escapeHtml(meta.teamLabel.toUpperCase())}</small>
        </div>
      </div>
    </article>
  `;
}

function buildStickerCard(vendor, _index, options = {}) {
  const meta = getStickerMeta(vendor);
  const showManagerActions = !!options.showManagerActions && session.role === "manager";

  return `
    <article class="official-sticker-shell" data-sticker-card="${escapeHtml(vendor.id)}">
      ${renderSticker(vendor, "full")}
      <div class="official-sticker-caption">
        <div class="official-sticker-caption-top">
          <span class="official-sticker-caption-chip ${meta.rarity.key}">${escapeHtml(meta.rarity.label)}</span>
          <span class="official-sticker-caption-number">#${meta.stickerNumber}</span>
        </div>
        <p>${escapeHtml(meta.fullName)} - ${escapeHtml(meta.position)} - ${escapeHtml(meta.teamLabel)} - ${escapeHtml(meta.height)} - ${escapeHtml(meta.weight)} - ${escapeHtml(meta.birthLabel)}: ${escapeHtml(meta.birthValue)}</p>
        ${showManagerActions ? `
          <div class="official-sticker-actions">
            <button class="btn btn-light" data-upload="${escapeHtml(vendor.id)}">Enviar foto</button>
            <button class="btn btn-primary" data-camera="${escapeHtml(vendor.id)}">Bater foto</button>
            <button class="btn btn-outline" data-clear-photo="${escapeHtml(vendor.id)}">Limpar foto</button>
            <button class="btn btn-blue full-download" data-download-sticker="${escapeHtml(vendor.id)}">Baixar PNG</button>
          </div>
        ` : ""}
      </div>
    </article>
  `;
}

function buildAlbumSpread() {
  const vendors = vendorsArray({ albumOnly: true });
  const summary = getCollectionSummary();
  const leaderText = summary.leaderTeam ? teamName(summary.leaderTeam) : "Empate no momento";
  const topSeller = summary.topSeller;
  const albumCards = vendors.map((vendor) => `
    <div class="official-album-slot">
      ${renderSticker(vendor, "full")}
    </div>
  `).join("");

  return `
    <div class="album-spread-book official-album-book">
      <section class="album-page official-album-page">
        <div class="album-page-top">
          <div class="album-logo-badge">CV</div>
          <div>
            <p class="album-mini-label">Album oficial</p>
            <h3>Copa das Vendas</h3>
            <p class="album-description">Colecao completa da campanha interna com os 5 vendedores ativos.</p>
          </div>
        </div>
        <div class="official-album-grid">${albumCards || "<p class='muted'>Nenhuma figurinha publicada.</p>"}</div>
        <div class="album-special-strip green">
          <div class="album-special-copy">
            <span>Artilheiro da campanha</span>
            <strong>${escapeHtml(topSeller?.shortName || topSeller?.name || "A definir")}</strong>
            <small>Maior faturamento individual acumulado.</small>
          </div>
          <div class="album-special-icon">#1</div>
          <div class="album-special-slot">${vendors.length}</div>
        </div>
        <div class="album-foot-note">Lider atual: ${escapeHtml(leaderText)}. Todas as paginas usam o mesmo componente oficial de figurinha.</div>
      </section>
    </div>
  `;
}

function buildEmptyAlbumSlot(number, team, label = "Reserva") {
  return `
    <article class="album-empty-slot ${team}">
      <div class="album-empty-jersey">${String(number).padStart(2, "0")}</div>
      <strong>${label}</strong>
      <span>Espaço disponível</span>
    </article>
  `;
}

function setView(viewId) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.remove("active"));
  const view = $(viewId);
  if (view) view.classList.add("active");
  const btn = document.querySelector(`[data-view="${viewId}"]`);
  if (btn) btn.classList.add("active");

  const titles = {
    dashboard: "Corrida das Dezenas",
    sellerPanel: "Meu desempenho",
    sales: "Lançar vendas",
    rounds: "Rodadas e bônus",
    vendors: "Gerenciar vendedores",
    album: "Álbum e figurinhas",
    report: "Relatórios",
    rules: "Regras da campanha"
  };
  $("pageTitle").textContent = titles[viewId] || "Sistema";
}

function applyRoleUI() {
  const isManager = session.role === "manager";
  document.body.classList.toggle("seller-mode", !isManager);
  document.body.classList.toggle("manager-mode", isManager);
  document.querySelectorAll(".manager-only").forEach((el) => el.classList.toggle("hidden", !isManager));
  document.querySelectorAll(".seller-only").forEach((el) => el.classList.toggle("hidden", isManager));

  $("activeProfileLabel").textContent = isManager ? "Gerente / Administrador" : "Vendedor / Acompanhamento";
  $("activeUserLabel").textContent = isManager ? (AUTH_CONFIG.managerName || "Saulo") : (getVendor(session.vendorId)?.name || "Vendedor");
}

function renderVendorSelects() {
  const activeVendors = vendorsArray({ activeOnly: true });
  const opts = activeVendors.map((vendor) => `<option value="${vendor.id}">${escapeHtml(vendor.name)} — ${escapeHtml(teamName(vendor.team))}</option>`).join("");
  ["saleVendor", "sellerPicker"].forEach((id) => {
    const el = $(id);
    if (el) el.innerHTML = opts;
  });
}

function buildBoardVendorSlot(vendor, slotNumber) {
  if (!vendor) {
    return `
      <div class="race-vendor-slot empty">
        <div class="race-vendor-name">A definir</div>
      </div>
    `;
  }

  return `
    <div class="race-vendor-slot ${escapeHtml(vendor.team)}">
      ${renderSticker(vendor, "mini")}
    </div>
  `;
}

function buildBoardRoster(teamId) {
  const vendors = vendorsArray({ activeOnly: true }).filter((vendor) => vendor.team === teamId);

  if (!vendors.length) {
    return `
      <div class="race-roster-grid">
        ${buildBoardVendorSlot(null, 1)}
      </div>
    `;
  }

  return `
    <div class="race-roster-grid dynamic-roster count-${vendors.length}">
      ${vendors.map((vendor, index) => buildBoardVendorSlot(vendor, index + 1)).join("")}
    </div>
  `;
}

function buildBoardMarker(teamId, active, extraClass = '') {
  return `<span class="race-marker ${escapeHtml(teamId)} ${active ? 'active' : ''} ${extraClass}"></span>`;
}

function buildBoardDezena(dezena) {
  const [startDate, endDate] = dateRangeForDezena(dezena);
  const startDay = Number(String(startDate).slice(-2));
  const endDay = Number(String(endDate).slice(-2));
  const rows = [];

  for (let day = startDay; day <= endDay; day += 1) {
    const isoDate = `${String(startDate).slice(0, 8)}${String(day).padStart(2, '0')}`;
    const round = state.data.rounds?.[isoDate];
    rows.push(`
      <div class="race-day-row ${round?.winnerTeam ? 'has-winner' : ''}">
        <strong>Dia ${String(day).padStart(2, '0')}</strong>
        <div class="race-day-markers">
          ${buildBoardMarker('verde', round?.winnerTeam === 'verde')}
          ${buildBoardMarker('azul', round?.winnerTeam === 'azul')}
        </div>
      </div>
    `);
  }

  const bonus = state.data.bonuses?.[`dezena_${dezena}`];
  rows.push(`
    <div class="race-day-row finish-row ${bonus?.winnerTeam ? 'has-winner' : ''}">
      <strong>Fim da Dezena</strong>
      <div class="race-day-markers">
        ${buildBoardMarker('verde', bonus?.winnerTeam === 'verde', 'bonus')}
        ${buildBoardMarker('azul', bonus?.winnerTeam === 'azul', 'bonus')}
      </div>
    </div>
  `);

  return rows.join('');
}

function renderDashboard() {
  const score = calculateScore();
  const ranking = calculateSellerRanking({ activeOnly: true });
  const leader = getLeaderTeam();
  const today = isoToday();

  if ($('greenGoalsBoard')) $('greenGoalsBoard').textContent = score.verde.goals;
  if ($('blueGoalsBoard')) $('blueGoalsBoard').textContent = score.azul.goals;
  if ($('todayGoals')) $('todayGoals').textContent = `${getGoalsForDate(today)} gol(s)`;
  if ($('todayDezena')) $('todayDezena').textContent = `${getDezena(today)}ª dezena da campanha`;
  if ($('topSellerName')) $('topSellerName').textContent = ranking[0]?.name || 'A definir';
  if ($('topSellerAmount')) $('topSellerAmount').textContent = ranking[0] ? brl(ranking[0].total) : brl(0);
  if ($('leaderTeam')) $('leaderTeam').textContent = leader ? teamName(leader) : 'Empate';

  if ($('boardGreenRoster')) $('boardGreenRoster').innerHTML = buildBoardRoster('verde');
  if ($('boardBlueRoster')) $('boardBlueRoster').innerHTML = buildBoardRoster('azul');
  if ($('boardDezena1')) $('boardDezena1').innerHTML = buildBoardDezena(1);
  if ($('boardDezena2')) $('boardDezena2').innerHTML = buildBoardDezena(2);
  if ($('boardDezena3')) $('boardDezena3').innerHTML = buildBoardDezena(3);

  if ($('boardTopRanking')) {
    $('boardTopRanking').innerHTML = ranking.map((row, idx) => `
      <div class="race-ranking-row place-${idx + 1}">
        <span class="race-ranking-medal">${idx + 1}º</span>
        <strong>${escapeHtml(row.name)}</strong>
        <b>${brl(row.total)}</b>
      </div>
    `).join('') || `<div class="race-ranking-row"><strong>Aguardando vendas</strong></div>`;
  }

  $('sellerRanking').innerHTML = ranking.map((row, idx) => `
    <div class="ranking-row ${idx === 0 ? 'first' : ''}">
      <span>${idx + 1}</span>
      <div>
        <strong>${escapeHtml(row.name)}</strong>
        <small>${escapeHtml(teamName(row.team))} • ${row.salesCount} lançamento(s)</small>
      </div>
      <b>${brl(row.total)}</b>
    </div>
  `).join('');

  $('teamSummary').innerHTML = ['verde', 'azul'].map((team) => `
    <div class="team-box ${team}">
      <span>${escapeHtml(teamName(team))}</span>
      <strong>${score[team].goals} gol(s)</strong>
      <p>${brl(score[team].sales)} em vendas</p>
      <small>${score[team].wins} rodada(s) vencida(s)</small>
    </div>
  `).join('');
}

function renderSellerPanel() {
  const vendor = getVendor(session.vendorId);
  if (!vendor) {
    $("sellerPersonalPanel").innerHTML = `<p class="muted">Selecione um vendedor no login.</p>`;
    return;
  }
  const ranking = calculateSellerRanking({ activeOnly: true });
  const position = ranking.findIndex((item) => item.id === vendor.id) + 1;
  const personalSales = salesArray().filter((sale) => sale.vendorId === vendor.id).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const total = personalSales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0);

  $("sellerPersonalPanel").innerHTML = `
    <div class="seller-hero ${vendor.team}">
      ${renderSticker(vendor, "full")}
      <div>
        <span>${escapeHtml(teamName(vendor.team))}</span>
        <h3>${escapeHtml(vendor.name)}</h3>
        <strong>${brl(total)}</strong>
        <p>Posição no ranking: ${position || "A definir"}º</p>
      </div>
    </div>
    <div class="sales-list">
      ${personalSales.map((sale) => `
        <div class="sale-row">
          <div>
            <strong>${sale.date.split("-").reverse().join("/")}</strong>
            <small>${escapeHtml(sale.note || "Sem observação")}</small>
          </div>
          <b>${brl(sale.amount)}</b>
        </div>
      `).join("") || `<p class="muted">Nenhuma venda lançada ainda.</p>`}
    </div>
  `;
}

function renderDailySales() {
  const date = $("saleDate")?.value || isoToday();
  if ($("dailyTitle")) $("dailyTitle").textContent = date.split("-").reverse().join("/");

  const totals = getTeamTotalsForDate(date);
  const winnerTeam = winnerFromTotals(totals);
  const goals = winnerTeam ? getGoalsForDate(date) : 0;
  const round = state.data.rounds?.[date];
  const finalizedText = round?.status === "finalizado"
    ? `Dia finalizado pelo gerente em ${new Date(round.finalizedAt).toLocaleString("pt-BR")}.`
    : "Dia ainda em conferência. O gerente pode finalizar quando terminar os lançamentos.";

  const groupSummary = `
    <div class="daily-final-status ${round?.status === "finalizado" ? "closed" : ""}">
      ${finalizedText}
    </div>
    <div class="daily-group-summary">
      <div class="daily-group-card verde ${winnerTeam === "verde" ? "winner" : ""}">
        <span>${escapeHtml(teamName('verde'))}</span>
        <strong>${brl(totals.verde || 0)}</strong>
        <small>${escapeHtml(vendorsArray({ activeOnly: true }).filter((vendor) => vendor.team === 'verde').map((vendor) => vendor.shortName || vendor.name).join(' + ') || 'Sem vendedores')}</small>
      </div>
      <div class="daily-group-card azul ${winnerTeam === "azul" ? "winner" : ""}">
        <span>${escapeHtml(teamName('azul'))}</span>
        <strong>${brl(totals.azul || 0)}</strong>
        <small>${escapeHtml(vendorsArray({ activeOnly: true }).filter((vendor) => vendor.team === 'azul').map((vendor) => vendor.shortName || vendor.name).join(' + ') || 'Sem vendedores')}</small>
      </div>
      <div class="daily-result-card">
        <span>Resultado do dia</span>
        <strong>${winnerTeam ? `${teamName(winnerTeam)} +${goals} gol(s)` : "Empate / sem vencedor"}</strong>
        <small>${round ? "Rodada automática calculada" : "Ao lançar venda, o sistema calcula automaticamente"}</small>
      </div>
    </div>
  `;

  const daySales = salesArray()
    .filter((sale) => sale.date === date)
    .sort((a, b) => String(a.createdAt || a.updatedAt || a.id).localeCompare(String(b.createdAt || b.updatedAt || b.id)));

  const rows = vendorsArray({ activeOnly: true }).map((vendor) => {
    const vendorSales = daySales.filter((item) => item.vendorId === vendor.id);
    const total = vendorSales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0);
    return `
      <div class="sale-row daily-vendor-row">
        <div>
          <strong>${escapeHtml(vendor.name)}</strong>
          <small>${escapeHtml(teamName(vendor.team))} - ${vendorSales.length} lançamento(s)</small>
        </div>
        <b>${brl(total)}</b>
      </div>
    `;
  }).join("");

  const entries = daySales.map((sale) => {
    const vendor = getVendor(sale.vendorId);
    const createdAt = sale.createdAt || sale.updatedAt || "";
    const timeText = createdAt ? new Date(createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "horário não informado";
    return `
      <div class="sale-row daily-entry-row">
        <div>
          <strong>${escapeHtml(vendor?.name || "Vendedor removido")} - ${brl(sale.amount)}</strong>
          <small>${escapeHtml(timeText)} - ${escapeHtml(sale.note || "Sem observação")}</small>
        </div>
        ${session.role === "manager" ? `<button class="btn btn-danger" type="button" data-delete-sale="${escapeHtml(sale.id)}">Excluir</button>` : ""}
      </div>
    `;
  }).join("");

  if ($("dailySalesList")) {
    $("dailySalesList").innerHTML = `
      ${groupSummary}
      <div class="daily-individual-title">Total do dia por vendedor</div>
      ${rows}
      <div class="daily-individual-title">Lançamentos do dia</div>
      ${entries || `<p class="muted">Nenhuma venda lançada nesta data.</p>`}
    `;
    document.querySelectorAll("[data-delete-sale]").forEach((button) => {
      button.addEventListener("click", () => deleteSale(button.dataset.deleteSale));
    });
  }
}

function renderRounds() {
  const roundRows = roundsArray().sort((a, b) => String(b.date).localeCompare(String(a.date))).map((round) => `
    <div class="timeline-row ${round.status === "finalizado" ? "closed" : ""}">
      <strong>${round.date.split("-").reverse().join("/")} — ${round.winnerTeam ? teamName(round.winnerTeam) : "Empate"}</strong>
      <span>${round.status === "finalizado" ? "Finalizado pelo gerente" : "Automático em aberto"} • Verde ${brl(round.teamTotals?.verde || 0)} x Azul ${brl(round.teamTotals?.azul || 0)} • ${round.goalsAwarded || 0} gol(s)</span>
    </div>
  `).join("");

  const bonusRows = bonusesArray().sort((a, b) => Number(b.dezena) - Number(a.dezena)).map((bonus) => `
    <div class="timeline-row bonus">
      <strong>Bônus automático ${bonus.dezena}ª dezena — ${bonus.winnerTeam ? teamName(bonus.winnerTeam) : "Sem vencedor"}</strong>
      <span>${bonus.startDate} a ${bonus.endDate} • +${bonus.goalsAwarded || 0} gol(s) • ${escapeHtml(bonus.ruleUsed || "")}</span>
    </div>
  `).join("");

  $("roundHistory").innerHTML = bonusRows + roundRows || `<p class="muted">Nenhuma rodada calculada ainda. Ao salvar vendas, o sistema atualiza automaticamente.</p>`;
}

function renderVendorAdmin() {
  const html = vendorsArray({ activeOnly: false }).map((vendor, index) => `
    <article class="vendor-editor" data-vendor-form="${escapeHtml(vendor.id)}">
      <div class="vendor-editor-preview">
        ${renderSticker(vendor, "mini")}
      </div>

      <div class="vendor-editor-form">
        <div class="editor-title">
          <strong>${escapeHtml(vendor.name)}</strong>
          <span>${escapeHtml(teamName(vendor.team))}</span>
        </div>

        <div class="form-grid compact">
          <label>Nome completo
            <input data-field="name" value="${escapeHtml(vendor.name)}" />
          </label>
          <label>Nome curto na figurinha
            <input data-field="shortName" maxlength="14" value="${escapeHtml(vendor.shortName || vendor.name)}" />
          </label>
          <label>Equipe
            <select data-field="team">${teamSelectOptions(vendor.team)}</select>
          </label>
          <label>Número da camisa
            <input data-field="shirtNumber" type="number" min="1" max="99" value="${escapeHtml(vendor.shirtNumber || "")}" />
          </label>
          <label>Função / posição
            <input data-field="position" maxlength="18" value="${escapeHtml(vendor.position || vendor.role || vendor.title || "Vendedor")}" />
          </label>
          <label>Altura
            <input data-field="height" maxlength="8" placeholder="Ex.: 1,75m" value="${escapeHtml(vendor.height || "")}" />
          </label>
          <label>Peso
            <input data-field="weight" maxlength="8" placeholder="Ex.: 88kg" value="${escapeHtml(vendor.weight || "")}" />
          </label>
          <label>Nascimento
            <input data-field="birthDate" maxlength="12" placeholder="Ex.: 27/12/1987" value="${escapeHtml(vendor.birthDate || vendor.nascimento || "")}" />
          </label>
          <label>Idade
            <input data-field="age" maxlength="4" placeholder="Ex.: 18" value="${escapeHtml(vendor.age || "")}" />
          </label>
          <label>Raridade
            <select data-field="rarity">${raritySelectOptions(vendor.rarity)}</select>
          </label>
          <label>Título/destaque da figurinha
            <select data-field="titleSelect">${titleSelectOptions(TITLE_OPTIONS.includes(vendor.title) ? vendor.title : "Personalizado")}</select>
          </label>
          <label class="custom-title-wrap ${TITLE_OPTIONS.includes(vendor.title) ? "hidden" : ""}">Título/destaque personalizado
            <input data-field="title" value="${escapeHtml(vendor.title || "")}" />
          </label>
          <label>Subtítulo / frase curta
            <input data-field="subtitle" maxlength="36" value="${escapeHtml(vendor.subtitle || "")}" />
          </label>
          <label>Ordem no álbum
            <input data-field="albumOrder" type="number" min="1" value="${escapeHtml(vendor.albumOrder || 99)}" />
          </label>
          <label>Tipo de destaque
            <select data-field="specialType">${specialSelectOptions(vendor.specialType)}</select>
          </label>
          <label class="custom-special-wrap ${vendor.specialType === "custom" ? "" : "hidden"}">Destaque personalizado
            <input data-field="customSpecialLabel" value="${escapeHtml(vendor.customSpecialLabel || "")}" />
          </label>
          <label>Status no álbum
            <select data-field="showInAlbum">
              <option value="true" ${vendor.showInAlbum !== false ? "selected" : ""}>Mostrar no álbum</option>
              <option value="false" ${vendor.showInAlbum === false ? "selected" : ""}>Ocultar do álbum</option>
            </select>
          </label>
          <label>Status na campanha
            <select data-field="active">
              <option value="true" ${vendor.active !== false ? "selected" : ""}>Ativo</option>
              <option value="false" ${vendor.active === false ? "selected" : ""}>Inativo</option>
            </select>
          </label>
        </div>

        <div class="editor-actions">
          <button class="btn btn-light" data-upload="${escapeHtml(vendor.id)}">Enviar foto</button>
          <button class="btn btn-blue" data-camera="${escapeHtml(vendor.id)}">Bater foto</button>
          <button class="btn btn-primary" data-save-vendor="${escapeHtml(vendor.id)}">Salvar alterações</button>
          <button class="btn btn-outline" data-reset-vendor="${escapeHtml(vendor.id)}">Limpar foto</button>
          <button class="btn btn-danger" data-delete-vendor="${escapeHtml(vendor.id)}">Excluir</button>
        </div>
      </div>
    </article>
  `).join("");

  $("vendorAdminGrid").innerHTML = html;

  document.querySelectorAll('[data-field="titleSelect"]').forEach((select) => {
    select.addEventListener("change", () => {
      const form = select.closest("[data-vendor-form]");
      form.querySelector(".custom-title-wrap").classList.toggle("hidden", select.value !== "Personalizado");
    });
  });

  document.querySelectorAll('[data-field="specialType"]').forEach((select) => {
    select.addEventListener("change", () => {
      const form = select.closest("[data-vendor-form]");
      form.querySelector(".custom-special-wrap").classList.toggle("hidden", select.value !== "custom");
    });
  });

  document.querySelectorAll("[data-save-vendor]").forEach((button) => {
    button.addEventListener("click", async () => { await saveVendorFromForm(button.dataset.saveVendor); });
  });

  document.querySelectorAll("[data-delete-vendor]").forEach((button) => {
    button.addEventListener("click", async () => { await deleteVendor(button.dataset.deleteVendor); });
  });

  document.querySelectorAll("[data-reset-vendor]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!ensureCanSave("limpar foto")) return;
      state.data.vendors[button.dataset.resetVendor].imageUrl = "";
      await persist();
      toast("Foto removida.");
    });
  });

  bindPhotoButtons();
}


async function saveVendorFromForm(vendorId) {
  if (!ensureCanSave("salvar vendedor")) return;
  const form = document.querySelector(`[data-vendor-form="${CSS.escape(vendorId)}"]`);
  if (!form) return;
  const vendor = state.data.vendors[vendorId];
  const get = (field) => form.querySelector(`[data-field="${field}"]`)?.value ?? "";

  const selectedTitle = get("titleSelect");
  const title = selectedTitle === "Personalizado" ? get("title") : selectedTitle;

  Object.assign(vendor, {
    name: get("name").trim() || "Vendedor",
    shortName: get("shortName").trim() || get("name").trim() || "Vendedor",
    team: get("team") || "verde",
    shirtNumber: Number(get("shirtNumber") || 0),
    position: get("position").trim() || "Vendedor",
    height: get("height").trim() || "1,70m",
    weight: get("weight").trim() || "70kg",
    birthDate: get("birthDate").trim(),
    age: get("age").trim() || "18",
    rarity: get("rarity") || "classic",
    title: title || "Craque de vendas",
    subtitle: get("subtitle").trim(),
    albumOrder: Number(get("albumOrder") || 99),
    specialType: get("specialType") || "normal",
    customSpecialLabel: get("customSpecialLabel").trim(),
    showInAlbum: get("showInAlbum") === "true",
    active: get("active") === "true"
  });

  await persist();
  toast("Vendedor e figurinha atualizados.");
}


async function addVendor() {
  if (!ensureCanSave("adicionar vendedor")) return;
  const id = safeId();
  state.data.vendors[id] = {
    id,
    name: "Novo vendedor",
    shortName: "Novo",
    team: "verde",
    shirtNumber: vendorsArray().length + 1,
    position: "Vendedor",
    height: "1,70m",
    weight: "70kg",
    birthDate: "",
    age: "18",
    rarity: "classic",
    title: "Craque de vendas",
    subtitle: "Copa das Vendas",
    albumOrder: vendorsArray().length + 1,
    specialType: "normal",
    customSpecialLabel: "",
    showInAlbum: true,
    active: true,
    imageUrl: ""
  };
  await persist();
  toast("Vendedor criado. Edite os dados no painel.");
}


async function deleteVendor(vendorId) {
  if (!ensureCanSave("excluir vendedor")) return;
  const vendor = getVendor(vendorId);
  if (!vendor) return;
  if (!confirm(`Excluir ${vendor.name}? As vendas antigas continuam salvas, mas não aparecerão no ranking se o vendedor for removido.`)) return;
  delete state.data.vendors[vendorId];
  await persist();
  toast("Vendedor excluído.");
}

function bindPhotoButtons() {
  document.querySelectorAll("[data-upload]").forEach((button) => {
    button.addEventListener("click", () => uploadPhoto(button.dataset.upload, "upload"));
  });
  document.querySelectorAll("[data-camera]").forEach((button) => {
    button.addEventListener("click", () => uploadPhoto(button.dataset.camera, "camera"));
  });
  document.querySelectorAll("[data-clear-photo]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!ensureCanSave("limpar foto")) return;
      state.data.vendors[button.dataset.clearPhoto].imageUrl = "";
      await persist();
      toast("Foto removida.");
    });
  });
  document.querySelectorAll("[data-download-sticker]").forEach((button) => {
    button.addEventListener("click", async () => {
      const vendor = getVendor(button.dataset.downloadSticker);
      await downloadStickerPng(vendor);
    });
  });
}

function renderAlbum() {
  const summary = getCollectionSummary();
  $("albumCoverStore").textContent = state.data.settings?.store || campaign.store || "Tênis One";
  $("albumCoverProgress").textContent = `${summary.withPhotos}/${summary.total} figurinhas com foto`;
  $("albumStats").innerHTML = `
    <div class="album-stat-card premium">
      <span>Figurinhas no álbum</span>
      <strong>${summary.total}</strong>
      <small>${summary.withPhotos} com foto • ${summary.missingPhotos} sem foto</small>
    </div>
    <div class="album-stat-card premium">
      <span>Artilheiro atual</span>
      <strong>${escapeHtml(summary.topSeller?.name || "A definir")}</strong>
      <small>${summary.topSeller ? brl(summary.topSeller.total) : "Sem vendas"}</small>
    </div>
    <div class="album-stat-card premium">
      <span>Equipe em destaque</span>
      <strong>${summary.leaderTeam ? teamName(summary.leaderTeam) : "Empate"}</strong>
      <small>Critério: gols, depois faturamento</small>
    </div>
  `;
  $("albumPageGrid").innerHTML = buildAlbumSpread();
  $("stickerGrid").innerHTML = vendorsArray({ albumOnly: true }).map((vendor, index) => buildStickerCard(vendor, index, { showManagerActions: session.role === "manager" })).join("");
  if (session.role === "manager") bindPhotoButtons();
}

function renderRules() {
  const rows = [
    ["Campanha", state.data.settings?.name || campaign.name],
    ["Loja", state.data.settings?.store || campaign.store],
    ["Período", `${state.data.settings?.startDate || campaign.startDate} a ${state.data.settings?.endDate || campaign.endDate}`],
    ["Formato", `Disputa por duplas / seleções internas: ${teamName("verde")} x ${teamName("azul")}.`],
    ["Controle", "Somente o gerente cadastra, edita figurinhas, envia fotos e lança vendas. Rodadas, gols e bônus são calculados automaticamente pelo sistema."],
    ["Acesso vendedor", "Vendedor apenas acompanha placar, ranking, vendas, álbum e figurinhas. Não altera dados."],
    ["Produtos", state.data.settings?.productsRule || "Todos os produtos da loja contam."],
    ["Lançamento", "O gerente lança vendas por vendedor. Ao salvar, o sistema soma por equipe, atualiza a rodada do dia, aplica os gols e recalcula o bônus da dezena."],
    ["Regra diária", "A dupla com maior faturamento no dia marca gol."],
    ["Dias 01 a 10", "Vitória do dia = 1 gol."],
    ["Dias 11 a 20", "Vitória do dia = 2 gols."],
    ["Dias 21 a 30", "Vitória do dia = 3 gols."],
    ["Bônus da dezena", "+3 gols automáticos para a dupla com maior faturamento acumulado na dezena. Se a venda for corrigida, o bônus é recalculado."],
    ["Artilheiro individual", "Vendedor com maior faturamento acumulado no mês."],
    ["Prêmio dupla campeã", state.data.settings?.prizes?.teamChampion || campaign.prizes?.teamChampion],
    ["Prêmio artilheiro", state.data.settings?.prizes?.topSeller || campaign.prizes?.topSeller],
    ["Figurinhas", "Gerente escolhe foto, título, raridade, número, frase, ordem, status e destaque de cada vendedor."]
  ];
  $("rulesBox").innerHTML = rows.map(([label, value]) => `
    <div class="rule-row">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(value)}</span>
    </div>
  `).join("");
}

function renderReportSummary() {
  const score = calculateScore();
  const ranking = calculateSellerRanking({ activeOnly: true });
  const leader = getLeaderTeam();
  $("reportSummary").innerHTML = `
    <div class="summary-card">
      <span>Placar final/parcial</span>
      <strong>Verde ${score.verde.goals} x ${score.azul.goals} Azul</strong>
      <p>Líder: ${leader ? teamName(leader) : "Empate"}</p>
    </div>
    <div class="summary-card">
      <span>Artilheiro</span>
      <strong>${escapeHtml(ranking[0]?.name || "A definir")}</strong>
      <p>${ranking[0] ? brl(ranking[0].total) : brl(0)}</p>
    </div>
    <div class="summary-card">
      <span>Rodadas fechadas</span>
      <strong>${roundsArray().length}</strong>
      <p>Bônus aplicados: ${bonusesArray().length}</p>
    </div>
  `;
}

function render() {
  if (!$("appShell")) return;
  renderVendorSelects();
  applyRoleUI();
  renderDashboard();
  renderSellerPanel();
  renderDailySales();
  renderRounds();
  renderVendorAdmin();
  renderAlbum();
  renderRules();
  renderReportSummary();
  updateTrialUI();
}

async function saveSale(event) {
  event.preventDefault();
  if (!ensureCanSave("salvar venda")) return;
  const date = $("saleDate").value;
  const vendorId = $("saleVendor").value;
  const amount = Number($("saleAmount").value || 0);
  if (!date || !vendorId || amount <= 0) return toast("Informe data, vendedor e valor válido.");

  const id = `sale_${Date.now()}_${safeId()}`;
  state.data.sales[id] = {
    id,
    date,
    vendorId,
    amount,
    note: $("saleNote").value || "",
    createdAt: new Date().toISOString(),
    createdBy: "gerente",
  };

  recomputeAutomaticsForDate(date);
  await persist();

  $("saleAmount").value = "";
  $("saleNote").value = "";
  const round = state.data.rounds[date];
  const bonus = state.data.bonuses[`dezena_${getDezena(date)}`];
  const roundText = round?.winnerTeam
    ? `${teamName(round.winnerTeam)} recebeu ${round.goalsAwarded} gol(s) da rodada.`
    : "Rodada empatada no momento.";
  const bonusText = bonus?.winnerTeam
    ? `Bônus da ${getDezena(date)}ª dezena recalculado para ${teamName(bonus.winnerTeam)}.`
    : `Bônus da ${getDezena(date)}ª dezena sem vencedor no momento.`;
  toast(`Venda salva. ${roundText} ${bonusText}`);
}

async function deleteSale(saleId) {
  if (!ensureCanSave("excluir venda")) return;
  const sale = state.data.sales?.[saleId];
  if (!sale) return toast("Venda não encontrada.");
  const vendor = getVendor(sale.vendorId);
  if (!confirm(`Excluir o lançamento de ${vendor?.name || "vendedor"} no valor de ${brl(sale.amount)}?`)) return;

  delete state.data.sales[saleId];
  recomputeAutomaticsForDate(sale.date);
  await persist();
  toast("Venda excluída e placar recalculado.");
}

async function closeRound(date) {
  if (!ensureCanSave("finalizar dia")) return;
  if (!date) return toast("Escolha uma data para finalizar.");
  const { round, bonus } = recomputeAutomaticsForDate(date);
  if (!round) return toast("Nenhuma venda encontrada para essa data.");
  state.data.rounds[date] = {
    ...round,
    status: "finalizado",
    finalizedAt: new Date().toISOString(),
    finalizedBy: "gerente"
  };
  await persist();
  const roundText = round.winnerTeam
    ? `${teamName(round.winnerTeam)} venceu o dia e recebeu ${round.goalsAwarded} gol(s).`
    : "Dia finalizado empatado. Nenhum gol aplicado.";
  const bonusText = bonus?.winnerTeam
    ? ` Bônus da ${round.dezena}ª dezena atualizado para ${teamName(bonus.winnerTeam)}.`
    : ` Bônus da ${round.dezena}ª dezena sem vencedor no momento.`;
  toast(`Dia ${date.split("-").reverse().join("/")} finalizado. ${roundText}${bonusText}`);
}

async function applyBonus() {
  if (!ensureCanSave("recalcular bônus automático")) return;
  const dezena = Number($("bonusDezena").value || 1);
  const bonus = recomputeBonusForDezena(dezena);
  await persist();
  if (!bonus) return toast(`Nenhuma venda encontrada na ${dezena}ª dezena.`);
  toast(bonus.winnerTeam ? `Bônus automático: ${teamName(bonus.winnerTeam)} recebeu +3 gols.` : "Bônus automático recalculado sem vencedor.");
}

async function recalculateAllAutomatics() {
  if (!ensureCanSave("recalcular placar automático")) return;
  recomputeAllAutomatics();
  await persist();
  toast("Placar, rodadas e bônus recalculados automaticamente.");
}


function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function pickImageFile(mode = "upload") {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (mode === "camera") input.setAttribute("capture", "user");
    input.onchange = () => resolve(input.files?.[0] || null);
    input.click();
  });
}

async function uploadFileToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CONFIG.cloudinary.uploadPreset);
  formData.append("folder", "tenis-one-copa-vendas");

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CONFIG.cloudinary.cloudName}/image/upload`, {
    method: "POST",
    body: formData
  });
  const json = await response.json();
  if (!response.ok || json.error) {
    throw new Error(json?.error?.message || `HTTP ${response.status}`);
  }
  return json.secure_url;
}

async function uploadPhoto(vendorId, mode = "upload") {
  if (!ensureCanSave(mode === "camera" ? "bater foto" : "enviar foto")) return;
  const file = await pickImageFile(mode);
  if (!file) return;

  try {
    const cloudinaryReady = isConfigured(CONFIG.cloudinary, ["cloudName", "uploadPreset"]);
    const imageUrl = cloudinaryReady
      ? await uploadFileToCloudinary(file)
      : await readFileAsDataUrl(file);

    state.data.vendors[vendorId].imageUrl = imageUrl;
    await persist();
    toast(mode === "camera" ? "Foto capturada e salva." : "Foto enviada e salva.");
  } catch (err) {
    console.error(err);
    toast(`Falha ao enviar foto: ${err?.message || 'verifique Cloudinary/preset.'}`);
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = Array.from(document.scripts).find((script) => script.src === src);
    if (existing) return resolve();
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function loadPhotoWidget() {
  if (window.cloudinary?.createUploadWidget) return true;
  try {
    await loadScript("https://upload-widget.cloudinary.com/global/all.js");
    return !!window.cloudinary?.createUploadWidget;
  } catch {
    return false;
  }
}

async function loadHtml2Canvas() {
  if (window.html2canvas) return true;
  try {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
    return !!window.html2canvas;
  } catch {
    return false;
  }
}

function waitForImages(root) {
  const images = Array.from(root.querySelectorAll("img"));
  return Promise.all(images.map((img) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));
}

async function elementToCanvas(element, scale = 2) {
  const ready = await loadHtml2Canvas();
  if (!ready || !element) return null;
  const host = document.createElement("div");
  host.className = "canvas-export-host";
  const clone = element.cloneNode(true);
  clone.classList?.add("canvas-export-node");
  clone.querySelectorAll("[loading='lazy']").forEach((node) => node.setAttribute("loading", "eager"));
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    await waitForImages(clone);
    return await window.html2canvas(clone, {
      backgroundColor: null,
      scale,
      useCORS: true,
      allowTaint: false,
      logging: false,
      imageTimeout: 15000,
      windowWidth: Math.max(document.documentElement.clientWidth, clone.scrollWidth, element.scrollWidth),
      windowHeight: Math.max(document.documentElement.clientHeight, clone.scrollHeight, element.scrollHeight)
    });
  } catch (err) {
    console.warn("Falha ao gerar canvas", err);
    return null;
  } finally {
    host.remove();
  }
}

function filenameSafe(value) {
  return String(value || "vendedor")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "vendedor";
}

async function downloadElementAsImage(element, filename, scale = 2) {
  const canvas = await elementToCanvas(element, scale);
  if (!canvas) return toast("Não foi possível gerar a imagem agora.");
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  link.click();
}

async function downloadStickerPng(vendor) {
  if (!vendor) return toast("Vendedor não encontrado.");
  const host = document.createElement("div");
  host.className = "sticker-export-source";
  host.innerHTML = renderSticker(vendor, "export");
  document.body.appendChild(host);
  const sticker = host.querySelector(".official-sticker");
  await downloadElementAsImage(sticker, `figurinha-${filenameSafe(vendor.shortName || vendor.name)}.png`, 2);
  host.remove();
}

async function exportAlbumPDF() {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) return toast("Biblioteca de PDF ainda não carregou.");
  const ready = await loadHtml2Canvas();
  if (!ready) return toast("Não foi possível preparar o álbum visual agora.");

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const cover = await elementToCanvas(document.querySelector(".album-cover-card"), 3);
  const spread = await elementToCanvas(document.querySelector(".album-spread-book"), 2.5);

  function place(canvas, page = pdf) {
    const pageW = page.internal.pageSize.getWidth();
    const pageH = page.internal.pageSize.getHeight();
    const ratio = Math.min((pageW - 10) / canvas.width, (pageH - 10) / canvas.height);
    const drawW = canvas.width * ratio;
    const drawH = canvas.height * ratio;
    page.addImage(canvas.toDataURL("image/png"), "PNG", (pageW - drawW) / 2, (pageH - drawH) / 2, drawW, drawH);
  }

  if (cover) place(cover);
  if (spread) {
    pdf.addPage("a4", "landscape");
    place(spread);
  }

  const frames = Array.from(document.querySelectorAll("#stickerGrid .official-sticker"));
  for (let i = 0; i < frames.length; i += 2) {
    pdf.addPage("a4", "portrait");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const first = await elementToCanvas(frames[i], 2.2);
    const second = frames[i + 1] ? await elementToCanvas(frames[i + 1], 2.2) : null;

    const placeCard = (canvas, y, maxH) => {
      const ratio = Math.min((pageW - 20) / canvas.width, maxH / canvas.height);
      const drawW = canvas.width * ratio;
      const drawH = canvas.height * ratio;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", (pageW - drawW) / 2, y + (maxH - drawH) / 2, drawW, drawH);
    };

    if (first) placeCard(first, 10, second ? (pageH - 25) / 2 : pageH - 20);
    if (second) placeCard(second, 15 + (pageH - 25) / 2, (pageH - 25) / 2);
  }

  pdf.save("album-copa-das-vendas-tenis-one.pdf");
}

async function exportReportPDF() {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) return toast("Biblioteca de PDF ainda não carregou.");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const left = 14;
  let y = 16;

  function header(title) {
    pdf.setFillColor(8, 100, 58);
    pdf.rect(0, 0, 210, 32, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(title, left, 13);
    pdf.setFontSize(10);
    pdf.text("Tênis One — Copa do Mundo das Vendas", left, 22);
    y = 42;
  }

  function pageCheck(extra = 10) {
    if (y + extra > 282) {
      pdf.addPage();
      header("Relatório da Gincana");
    }
  }

  function line(label, value) {
    pageCheck(9);
    pdf.setTextColor(16, 32, 24);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(`${label}:`, left, y);
    pdf.setFont("helvetica", "normal");
    const wrapped = pdf.splitTextToSize(String(value || "Não informado"), 130);
    pdf.text(wrapped, left + 45, y);
    y += Math.max(7, wrapped.length * 5);
  }

  const score = calculateScore();
  const ranking = calculateSellerRanking({ activeOnly: true });
  const summary = getCollectionSummary();

  header("Relatório da Gincana");
  line("Campanha", state.data.settings?.name);
  line("Loja", state.data.settings?.store);
  line("Período", `${state.data.settings?.startDate} a ${state.data.settings?.endDate}`);
  line(teamName("verde"), `${score.verde.goals} gols — ${brl(score.verde.sales)} em vendas`);
  line(teamName("azul"), `${score.azul.goals} gols — ${brl(score.azul.sales)} em vendas`);
  line("Líder", summary.leaderTeam ? teamName(summary.leaderTeam) : "Empate");
  line("Artilheiro", ranking[0] ? `${ranking[0].name} — ${brl(ranking[0].total)}` : "A definir");
  line("Figurinhas", `${summary.withPhotos}/${summary.total} com foto`);

  y += 4;
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(8, 100, 58);
  pdf.setFontSize(13);
  pdf.text("Ranking individual", left, y);
  y += 8;

  ranking.forEach((row, index) => {
    line(`${index + 1}º`, `${row.name} — ${teamName(row.team)} — ${brl(row.total)}`);
  });

  y += 4;
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(8, 100, 58);
  pdf.setFontSize(13);
  pdf.text("Rodadas e bônus", left, y);
  y += 8;

  [...bonusesArray(), ...roundsArray()].forEach((item) => {
    line(item.date || `${item.dezena}ª dezena`, `${item.winnerTeam ? teamName(item.winnerTeam) : "Sem vencedor"} — ${item.goalsAwarded || 0} gol(s)`);
  });

  pdf.save("relatorio-copa-das-vendas-tenis-one.pdf");
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "copa-das-vendas-tenis-one-dados.json";
  link.click();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  configureLoginMode();

  $("loginRole")?.addEventListener("change", configureLoginMode);

  $("loginBtn").addEventListener("click", async () => {
    const password = $("loginPassword").value;

    if (shouldUseEmailLogin()) {
      const email = $("loginEmail").value.trim();
      if (!email || !password) return toast("Informe email e senha.");

      const nextSession = getSessionFromEmail(email);
      if (!nextSession) return toast("Email sem permissão. Confira managerEmail e sellers no config.js.");

      if (!useFirebaseAuth() || !state.auth) {
        return toast("Firebase Auth ainda não está pronto. Confira apiKey, authDomain, databaseURL e appId no config.js e publique no GitHub Pages.");
      }

      try {
        saveRememberedLogin();
        await services.signInWithEmailAndPassword(state.auth, email, password);
      } catch (err) {
        console.warn(err);
        toast("Não foi possível entrar. Confira se o email existe no Firebase Authentication e se a senha está correta.");
      }
      return;
    }

    const role = $("loginRole").value;
    if (role === "manager" && password !== String(CONFIG.managerPassword || "2026")) return toast("Senha do gerente incorreta.");
    if (role === "seller" && password !== String(CONFIG.sellerPassword || "vendas")) return toast("Senha dos vendedores incorreta.");

    await enterAppWithSession({
      role,
      vendorId: role === "seller" ? $("sellerPicker").value : null,
      email: null
    });
  });

  $("logoutBtn").addEventListener("click", async () => {
    if (useFirebaseAuth() && state.auth) {
      await services.signOut(state.auth);
    }

    session = { role: null, vendorId: null, email: null };
    realtimeStarted = false;
    if (typeof realtimeUnsubscribe === "function") {
      realtimeUnsubscribe();
      realtimeUnsubscribe = null;
    }
    $("appShell").classList.add("hidden");
    $("loginScreen").classList.remove("hidden");
    if ($("rememberAccess")?.checked) {
      loadRememberedLogin();
    } else {
      $("loginPassword").value = "";
      if ($("loginEmail")) $("loginEmail").value = "";
    }
    configureLoginMode();
  });

  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  $("saleDate").value = isoToday();
  $("roundDate").value = isoToday();
  $("saleDate").addEventListener("change", renderDailySales);
  $("saleForm").addEventListener("submit", saveSale);
  $("finalizeSelectedDayBtn")?.addEventListener("click", () => closeRound($("saleDate").value));
  $("finalizeDailyBtn")?.addEventListener("click", () => closeRound($("saleDate").value));
  $("closeTodayBtn")?.addEventListener("click", () => closeRound(isoToday()));
  $("closeRoundBtn").addEventListener("click", () => closeRound($("roundDate").value));
  $("applyBonusBtn").addEventListener("click", applyBonus);
  $("recalculateAllBtn")?.addEventListener("click", recalculateAllAutomatics);
  $("addVendorBtn").addEventListener("click", async () => { await addVendor(); });
  $("seedBtn")?.addEventListener("click", async () => {
    if (!ensureCanSave("recriar dados")) return;
    if (!confirm("Restaurar os dados iniciais da campanha? Isso substitui os dados atuais.")) return;
    state.data = createSeedData();
    await persist();
    toast("Dados iniciais restaurados.");
  });

  $("downloadReportBtn").addEventListener("click", exportReportPDF);
  $("downloadReportBtn2").addEventListener("click", exportReportPDF);
  $("downloadStickerPackBtn").addEventListener("click", exportAlbumPDF);
  $("downloadStickerPackBtn2").addEventListener("click", exportAlbumPDF);
  $("downloadAlbumPngBtn").addEventListener("click", async () => {
    await downloadElementAsImage(document.querySelector(".album-spread-book"), "album-copa-das-vendas.png", 2);
  });
  $("exportJsonBtn").addEventListener("click", exportJSON);
}

window.addEventListener("DOMContentLoaded", async () => {
  await initStorage();
  bindEvents();
  loadRememberedLogin();
  renderVendorSelects();
  updateTrialUI();
  render();
});

