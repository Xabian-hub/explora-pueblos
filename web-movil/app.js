// app.js — Web Móvil para Explorapueblos

// GitHub Constants
const REPO_API = "https://api.github.com/repos/Xabian-hub/explora-pueblos/contents/json";
const REPO_RAW = "https://raw.githubusercontent.com/Xabian-hub/explora-pueblos/master/json/";

// DOM Elements
const datalist = document.getElementById('pueblos-list');
const inputPueblo = document.getElementById('pueblo-input');
const loadBtn = document.getElementById('load-btn');

// Inicializar Leaflet
const map = L.map('map').setView([38.7939, 0.1656], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Mantener referencias a los marcadores actuales
let leafletMarkers = [];

// 1) Al cargar la página, pide la lista de JSON en GitHub
window.addEventListener('load', async () => {
  try {
    const resp = await fetch(REPO_API);
    if (!resp.ok) throw new Error(resp.statusText);
    const files = await resp.json();
    files
      .filter(f => f.name.endsWith('.json'))
      .forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.name;
        datalist.appendChild(opt);
      });
  } catch (e) {
    console.warn('No pude listar JSONs:', e);
  }
});

// 2) Al hacer clic en "Cargar", descarga el JSON y muestra marcadores
loadBtn.onclick = async () => {
  const nombre = inputPueblo.value.trim();
  if (!nombre) {
    alert("Selecciona o escribe el nombre de un pueblo");
    return;
  }
  const url = REPO_RAW + nombre;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(resp.statusText);
    const data = await resp.json();
    cargarMarcadores(data);
  } catch (e) {
    alert("Error cargando el JSON: " + e.message);
  }
};

// Función para renderizar puntos en el mapa
function cargarMarcadores(puntos) {
  // Limpia marcadores anteriores
  leafletMarkers.forEach(m => map.removeLayer(m));
  leafletMarkers = [];

  // Añade nuevos marcadores
  puntos.forEach((m, idx) => {
    const marker = L.marker([m.coords.lat, m.coords.lng])
      .addTo(map)
      .on('click', () => mostrarPopup(m, idx));
    leafletMarkers.push(marker);
  });

  // Ajusta vista para englobar todos los marcadores si hay alguno
  if (leafletMarkers.length) {
    const group = new L.featureGroup(leafletMarkers);
    map.fitBounds(group.getBounds().pad(0.2));
  }
}

// Muestra el popup con la pregunta tipo test
function mostrarPopup(m, idx) {
  let html = `<b>${m.title}</b><br>${m.description}<hr>`;
  html += `<b>${m.question}</b><br>`;
  m.answers.forEach((a, i) => {
    html += `<button class="resp" onclick="responde(${idx},${i})">${a}</button><br>`;
  });
  L.popup()
    .setLatLng([m.coords.lat, m.coords.lng])
    .setContent(html)
    .openOn(map);
  window.currentQ = { idx, correct: m.correct - 1 };
}

// Función global para validar respuesta
window.responde = function(idx, resp) {
  if (!window.currentQ || window.currentQ.idx !== idx) return;
  if (resp === window.currentQ.correct) {
    alert("✅ ¡Correcto!");
  } else {
    alert("❌ Incorrecto.");
  }
  map.closePopup();
};
