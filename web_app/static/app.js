const TABLE_COLUMNS = [
  "name",
  "clean_name",
  "set_name",
  "set_code",
  "set_id",
  "card_number",
  "rarity",
  "card_type",
  "hp",
  "stage",
  "weakness",
  "resistance",
  "retreat_cost",
  "TCGPlayer (USD)",
  "CardMarket (EUR)",
  "TCGPlayer URL",
  "CardMarket URL",
];

let allSets = [];
let allCards = [];

const setFilter = document.getElementById("setFilter");
const setSelect = document.getElementById("setSelect");
const loadSetsBtn = document.getElementById("loadSetsBtn");
const statusText = document.getElementById("statusText");
const columnFilter = document.getElementById("columnFilter");
const tableFilter = document.getElementById("tableFilter");
const loadPricesBtn = document.getElementById("loadPricesBtn");
const tableHead = document.querySelector("#cardsTable thead");
const tableBody = document.querySelector("#cardsTable tbody");

function setStatus(text) {
  statusText.textContent = text;
}

function toRowData(card) {
  const info = card.card_info || {};
  return {
    id: card.id || "",
    name: info.name || "",
    clean_name: info.clean_name || "",
    set_name: info.set_name || "",
    set_code: info.set_code || "",
    set_id: info.set_id || "",
    card_number: info.card_number || "",
    rarity: info.rarity || "",
    card_type: info.card_type || "",
    hp: info.hp || "",
    stage: info.stage || "",
    weakness: info.weakness || "",
    resistance: info.resistance || "",
    retreat_cost: info.retreat_cost || "",
    "TCGPlayer (USD)": formatTcgPrices(card.tcgplayer),
    "CardMarket (EUR)": formatCmPrices(card.cardmarket),
    "TCGPlayer URL": card.tcgplayer?.url || "",
    "CardMarket URL": card.cardmarket?.product_url || "",
  };
}

function formatTcgPrices(tcg) {
  if (!tcg || !Array.isArray(tcg.prices) || tcg.prices.length === 0) return "—";
  return tcg.prices
    .slice(0, 6)
    .map((p) => `${p.sub_type_name || "?"}: mkt ${p.market_price ?? "-"} · low ${p.low_price ?? "-"}`)
    .join(" | ");
}

function formatCmPrices(cm) {
  if (!cm || !Array.isArray(cm.prices) || cm.prices.length === 0) return "—";
  return cm.prices
    .slice(0, 6)
    .map((p) => `${p.variant_type || "?"}: trend ${p.trend ?? "-"} · avg ${p.avg ?? "-"} · low ${p.low ?? "-"}`)
    .join(" | ");
}

function buildColumnFilter() {
  columnFilter.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "__all__";
  allOpt.textContent = "Todas las columnas";
  columnFilter.appendChild(allOpt);
  TABLE_COLUMNS.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    columnFilter.appendChild(opt);
  });
}

function renderTable(cards) {
  tableHead.innerHTML = "";
  tableBody.innerHTML = "";

  const tr = document.createElement("tr");
  const selTh = document.createElement("th");
  selTh.textContent = "Sel";
  tr.appendChild(selTh);
  TABLE_COLUMNS.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col;
    tr.appendChild(th);
  });
  tableHead.appendChild(tr);

  cards.forEach((card) => {
    const rowData = toRowData(card);
    const row = document.createElement("tr");
    row.dataset.cardId = rowData.id;

    const selTd = document.createElement("td");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "row-check";
    selTd.appendChild(cb);
    row.appendChild(selTd);

    TABLE_COLUMNS.forEach((col) => {
      const td = document.createElement("td");
      const value = rowData[col] ?? "";
      if ((col === "TCGPlayer URL" || col === "CardMarket URL") && value) {
        const a = document.createElement("a");
        a.href = value;
        a.target = "_blank";
        a.rel = "noreferrer";
        a.textContent = value;
        td.appendChild(a);
      } else {
        td.textContent = value;
      }
      row.appendChild(td);
    });
    tableBody.appendChild(row);
  });
  applyTableFilter();
}

function applySetFilter() {
  const query = setFilter.value.trim().toLowerCase();
  setSelect.innerHTML = '<option value="">Selecciona un set...</option>';
  allSets.forEach((s) => {
    const name = s.name || "Sin nombre";
    const code = s.set_code || "sin-codigo";
    const setId = String(s.set_id || "");
    const lang = s.language || "n/a";
    const haystack = `${name} ${code} ${setId} ${lang}`.toLowerCase();
    if (query && !haystack.includes(query)) return;
    const opt = document.createElement("option");
    opt.value = setId;
    opt.textContent = `${name} (${code}) [${lang}]`;
    setSelect.appendChild(opt);
  });
}

function applyTableFilter() {
  const query = tableFilter.value.trim().toLowerCase();
  const selectedColumn = columnFilter.value;
  [...tableBody.rows].forEach((row) => {
    if (!query) {
      row.hidden = false;
      return;
    }
    let textToSearch = "";
    if (selectedColumn === "__all__") {
      textToSearch = row.textContent.toLowerCase();
    } else {
      const idx = TABLE_COLUMNS.indexOf(selectedColumn);
      const cell = row.cells[idx + 1];
      textToSearch = (cell?.textContent || "").toLowerCase();
    }
    row.hidden = !textToSearch.includes(query);
  });
}

async function loadSets() {
  loadSetsBtn.disabled = true;
  setStatus("Cargando sets...");
  try {
    const res = await fetch("/api/sets");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudieron cargar sets");
    allSets = data.sets || [];
    applySetFilter();
    setStatus(`Sets cargados: ${allSets.length}`);
  } catch (error) {
    setStatus(`Error cargando sets: ${error.message}`);
  } finally {
    loadSetsBtn.disabled = false;
  }
}

async function loadCardsForSelectedSet() {
  const setId = setSelect.value;
  if (!setId) return;
  setStatus(`Cargando cartas del set ${setId}...`);
  loadPricesBtn.disabled = true;
  try {
    const res = await fetch(`/api/sets/${encodeURIComponent(setId)}/cards`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudieron cargar cartas");
    allCards = data.cards || [];
    renderTable(allCards);
    loadPricesBtn.disabled = allCards.length === 0;
    setStatus(`Cartas cargadas: ${allCards.length} · Selecciona filas y carga precios solo de esas cartas.`);
  } catch (error) {
    setStatus(`Error cargando cartas: ${error.message}`);
  }
}

async function loadPricesForSelection() {
  const selectedRows = [...tableBody.rows].filter((r) => {
    const cb = r.querySelector(".row-check");
    return cb && cb.checked;
  });
  if (selectedRows.length === 0) {
    alert("Selecciona al menos una carta.");
    return;
  }
  const cardIds = selectedRows.map((r) => r.dataset.cardId).filter(Boolean);
  if (cardIds.length === 0) return;

  loadPricesBtn.disabled = true;
  setStatus(`Cargando precios de ${cardIds.length} carta(s)...`);
  try {
    const res = await fetch("/api/cards/details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_ids: cardIds }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudieron cargar detalles");

    const byId = new Map();
    (data.details || []).forEach((detail) => {
      if (detail && detail.id) byId.set(detail.id, detail);
    });
    allCards = allCards.map((card) => byId.get(card.id) || card);
    renderTable(allCards);

    [...tableBody.rows].forEach((r) => {
      if (cardIds.includes(r.dataset.cardId)) {
        const cb = r.querySelector(".row-check");
        if (cb) cb.checked = true;
      }
    });
    setStatus("Precios y URLs actualizados para la seleccion.");
  } catch (error) {
    setStatus(`Error cargando precios: ${error.message}`);
  } finally {
    loadPricesBtn.disabled = allCards.length === 0;
  }
}

buildColumnFilter();
setFilter.addEventListener("input", applySetFilter);
setSelect.addEventListener("change", loadCardsForSelectedSet);
loadSetsBtn.addEventListener("click", loadSets);
columnFilter.addEventListener("change", applyTableFilter);
tableFilter.addEventListener("input", applyTableFilter);
loadPricesBtn.addEventListener("click", loadPricesForSelection);
