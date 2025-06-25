// app.js — Web Móvil con puntuación y localStorage

// --- CONFIGURACIÓN GITHUB ---
const USUARIO = "Xabian-hub";
const REPO    = "explora-pueblos";
const BRANCH  = "master";
const REPO_API = `https://api.github.com/repos/${USUARIO}/${REPO}/contents/json`;
const REPO_RAW = `https://raw.githubusercontent.com/${USUARIO}/${REPO}/${BRANCH}/json/`;

// --- ELEMENTOS DOM ---
const datalist     = document.getElementById("pueblos-list");
const inputPueblo  = document.getElementById("pueblo-input");
const loadBtn      = document.getElementById("load-btn");
const scoreDiv     = document.getElementById("score");

// --- MAPA LEAFLET ---
const map = L.map("map").setView([38.7939, 0.1656], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);
let leafletMarkers = [];

// --- ESTADO DE JUEGO ---
let puntosData = [];         // Array de marcadores JSON
let currentQ   = null;       // { idx, correct }
let acertadas  = new Set();  // índices respondidos correctamente
let falladas   = new Set();  // índices respondidos incorrectamente

// --- UTILS ---
function updateScore() {
  const tot = acertadas.size + falladas.size;
  scoreDiv.textContent = `Score: ${acertadas.size}/${tot}`;
}
function saveProgress(pueblo) {
  const key = `explorapueblos_progress_${pueblo}`;
  const data = {
    acert: [...acertadas],
    fallo: [...falladas]
  };
  localStorage.setItem(key, JSON.stringify(data));
}
function loadProgress(pueblo) {
  acertadas.clear();
  falladas.clear();
  const key = `explorapueblos_progress_${pueblo}`;
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      const obj = JSON.parse(raw);
      obj.acert?.forEach(i=>acertadas.add(i));
      obj.fallo?.forEach(i=>falladas.add(i));
    } catch {}
  }
  updateScore();
}

// --- CARGA DINÁMICA DE JSON ---
window.addEventListener("load", async () => {
  try {
    const resp = await fetch(REPO_API);
    if (!resp.ok) throw new Error(resp.statusText);
    const files = await resp.json();
    files.filter(f=>f.name.endsWith(".json"))
         .forEach(f=>{
           const opt = document.createElement("option");
           opt.value = f.name;
           datalist.appendChild(opt);
         });
  } catch(e) {
    console.warn("No pude listar JSONs:", e);
  }
});

// --- EVENTO BOTÓN CARGAR ---
loadBtn.onclick = async () => {
  const nombre = inputPueblo.value.trim();
  if (!nombre) {
    alert("Selecciona o escribe el nombre de un pueblo");
    return;
  }
  // Reset estado
  puntosData = [];
  leafletMarkers.forEach(m=>map.removeLayer(m));
  leafletMarkers = [];
  currentQ = null;
  acertadas.clear();
  falladas.clear();
  loadProgress(nombre);

  // Carga JSON
  try {
    const url = REPO_RAW + nombre;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(resp.statusText);
    puntosData = await resp.json();
    renderMarkers();
    updateScore();
  } catch(e) {
    alert("Error cargando el JSON: " + e.message);
  }
};

// --- RENDERIZADO DE MARCADORES ---
function renderMarkers() {
  leafletMarkers.forEach(m=>map.removeLayer(m));
  leafletMarkers = puntosData.map((m,i) => {
    const marker = L.marker([m.coords.lat, m.coords.lng])
      .addTo(map)
      .on("click", ()=>onMarkerClick(m,i));
    return marker;
  });
  if (leafletMarkers.length) {
    const group = new L.featureGroup(leafletMarkers);
    map.fitBounds(group.getBounds().pad(0.2));
  }
}

function onMarkerClick(m, idx) {
  // Si ya respondido, no abrimos
  if (acertadas.has(idx) || falladas.has(idx)) return;

  // Construye popup
  let html = `<b>${m.title}</b><br>${m.description}<hr>`;
  html += `<b>${m.question}</b><br>`;
  m.answers.forEach((a,i)=>{
    html += `<button class="resp" onclick="handleAnswer(${idx},${i})">${a}</button><br>`;
  });
  L.popup()
   .setLatLng([m.coords.lat,m.coords.lng])
   .setContent(html)
   .openOn(map);
  currentQ = { idx, correct: m.correct-1 };
}

// --- MANEJO DE RESPUESTA ---
window.handleAnswer = function(idx, resp) {
  if (!currentQ || currentQ.idx!==idx) return;
  const ok = resp === currentQ.correct;
  if (ok) acertadas.add(idx);
  else falladas.add(idx);

  alert(ok ? "✅ ¡Correcto!" : "❌ Incorrecto.");
  map.closePopup();
  updateScore();
  saveProgress( inputPueblo.value.trim() );
  currentQ = null;
};
