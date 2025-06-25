// app.js — Web Móvil con umbral de aprobación y reseteo

// --- CONFIGURACIÓN GITHUB ---
const USUARIO = "Xabian-hub";
const REPO    = "explora-pueblos";
const BRANCH  = "master";
const REPO_API = `https://api.github.com/repos/${USUARIO}/${REPO}/contents/json`;
const REPO_RAW = `https://raw.githubusercontent.com/${USUARIO}/${REPO}/${BRANCH}/json/`;

// --- PARÁMETROS DE JUEGO ---
const PASS_THRESHOLD = 0.75; // 75 %

// --- ELEMENTOS DOM ---
const datalist     = document.getElementById("pueblos-list");
const inputPueblo  = document.getElementById("pueblo-input");
const loadBtn      = document.getElementById("load-btn");
const scoreDiv     = document.getElementById("score");

// --- LEAFLET MAP ---
const map = L.map("map").setView([38.7939, 0.1656], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);
let leafletMarkers = [];

// --- ESTADO DE JUEGO ---
let puntosData = [];          // datos cargados desde JSON
let acertadas  = new Set();   // índices respondidos correctos
let falladas   = new Set();   // índices respondidos incorrectos
let currentPueblo = "";

// --- UTILIDADES ---
function updateScore() {
  const total = acertadas.size + falladas.size;
  scoreDiv.textContent = `Score: ${acertadas.size}/${total}`;
}

// LocalStorage key
function progressKey(pueblo) {
  return `explorapueblos_progress_${pueblo}`;
}

// Guardar progreso
function saveProgress() {
  const key = progressKey(currentPueblo);
  localStorage.setItem(key, JSON.stringify({
    acert: Array.from(acertadas),
    fallo: Array.from(falladas)
  }));
}

// Cargar progreso
function loadProgress() {
  acertadas.clear();
  falladas.clear();
  const key = progressKey(currentPueblo);
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      const obj = JSON.parse(raw);
      obj.acert?.forEach(i=>acertadas.add(i));
      obj.fallo?.forEach(i=>falladas.add(i));
    } catch {}
  }
}

// Reset completo de progreso al terminar
function resetGame() {
  localStorage.removeItem(progressKey(currentPueblo));
  acertadas.clear();
  falladas.clear();
  updateScore();
  renderMarkers();
}

// --- CARGA DINÁMICA DE JSON AL ARRANCAR ---
window.addEventListener("load", async () => {
  try {
    const resp = await fetch(REPO_API);
    if (!resp.ok) throw new Error(resp.statusText);
    const files = await resp.json();
    files.filter(f => f.name.endsWith(".json"))
         .forEach(f => {
           const opt = document.createElement("option");
           opt.value = f.name;
           datalist.appendChild(opt);
         });
  } catch (e) {
    console.warn("No pude listar JSONs:", e);
  }
});

// --- BOTÓN CARGAR PUEBLO ---
loadBtn.onclick = async () => {
  const nombre = inputPueblo.value.trim();
  if (!nombre) return alert("Selecciona o escribe un pueblo");
  currentPueblo = nombre;

  // Limpieza inicial
  puntosData = [];
  leafletMarkers.forEach(m=>map.removeLayer(m));
  leafletMarkers = [];
  loadProgress();
  updateScore();

  // Fetch JSON
  try {
    const resp = await fetch(REPO_RAW + nombre);
    if (!resp.ok) throw new Error(resp.statusText);
    puntosData = await resp.json();
    renderMarkers();
    updateScore();
  } catch (e) {
    alert("Error cargando JSON: " + e.message);
  }
};

// --- RENDERIZADO DE MARCADORES ---
function renderMarkers() {
  // Limpio viejos
  leafletMarkers.forEach(m=>map.removeLayer(m));
  leafletMarkers = puntosData.map((m, idx) => {
    const marker = L.marker([m.coords.lat, m.coords.lng])
      .addTo(map)
      .on("click", () => onMarkerClick(m, idx));
    return marker;
  });

  // Ajustar viewport
  if (leafletMarkers.length) {
    const group = new L.featureGroup(leafletMarkers);
    map.fitBounds(group.getBounds().pad(0.2));
  }
}

// --- CLICK EN UN MARKER ---
function onMarkerClick(m, idx) {
  // Si ya respondido, no mostrar
  if (acertadas.has(idx) || falladas.has(idx)) return;

  // Construir popup con botones
  let html = `<b>${m.title}</b><br>${m.description}<hr>`;
  html += `<b>${m.question}</b><br>`;
  m.answers.forEach((a,i) => {
    html += `<button class="resp" onclick="handleAnswer(${idx},${i})">${a}</button><br>`;
  });
  L.popup()
   .setLatLng([m.coords.lat, m.coords.lng])
   .setContent(html)
   .openOn(map);
}

// --- MANEJADOR DE RESPUESTA ---
window.handleAnswer = function(idx, resp) {
  const correctIdx = puntosData[idx].correct - 1;
  const ok = resp === correctIdx;
  if (ok) acertadas.add(idx);
  else falladas.add(idx);

  alert(ok ? "✅ ¡Correcto!" : "❌ Incorrecto.");
  map.closePopup();
  updateScore();
  saveProgress();

  // Comprobar fin de juego
  const totalResp = acertadas.size + falladas.size;
  const totalPuntos = puntosData.length;
  if (totalResp === totalPuntos) {
    const minCorrect = Math.ceil(totalPuntos * PASS_THRESHOLD);
    if (acertadas.size >= minCorrect) {
      alert("🎉 ¡Has aprobado! (" + acertadas.size + " de " + totalPuntos + ")");
    } else {
      alert("😓 Has suspendido. (" + acertadas.size + " de " + totalPuntos + ")");
    }
    resetGame();
  }
};
