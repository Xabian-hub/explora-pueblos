// renderer.js

// ─── Inicialización del mapa Leaflet ─────────────────────────────────────────
const map = L.map('map').setView([38.7939, 0.1656], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
// Forzar redraw en caso de resize inicial
setTimeout(() => map.invalidateSize(), 300);

// ─── Estado global ───────────────────────────────────────────────────────────
let pueblo = '';
let markers = [];
let leafletMarkers = [];
let editIndex = -1;

// ─── Referencias al DOM ──────────────────────────────────────────────────────
const puebloSelect  = document.getElementById('pueblo-select');
const loadBtn       = document.getElementById('load-pueblo');
const addBtn        = document.getElementById('add-marker');
const exportBtn     = document.getElementById('export-btn');
const backdrop      = document.getElementById('modal-backdrop');
const modal         = document.getElementById('form-modal');
const formSave      = document.getElementById('form-save');
const formCancel    = document.getElementById('form-cancel');

// Campos del formulario
const formFields = {
  title:       document.getElementById('form-title'),
  description: document.getElementById('form-description'),
  question:    document.getElementById('form-question'),
  answer1:     document.getElementById('form-answer1'),
  answer2:     document.getElementById('form-answer2'),
  answer3:     document.getElementById('form-answer3'),
  answer4:     document.getElementById('form-answer4'),
  correct:     document.getElementById('form-correct'),
  lat:         document.getElementById('form-lat'),
  lng:         document.getElementById('form-lng'),
};

// ─── Poblar dinámicamente el selector de pueblos ────────────────────────────
async function populatePueblos() {
  const files = await window.electronAPI.listJSONFiles();
  puebloSelect.innerHTML = '<option value="">-- Selecciona un pueblo --</option>';
  files.forEach(f => {
    const name = f.replace('.json','');
    const opt  = document.createElement('option');
    opt.value   = name;
    opt.text    = name;
    puebloSelect.appendChild(opt);
  });
}
populatePueblos();

// ─── Cargar / Crear pueblo ──────────────────────────────────────────────────
loadBtn.addEventListener('click', async () => {
  const sel = puebloSelect.value.trim();
  if (!sel) return alert('Selecciona un pueblo');
  pueblo   = sel;
  markers  = await window.electronAPI.loadJSON(pueblo) || [];
  updateList();
  renderMarkers();
});

// ─── Añadir nuevo marcador con click en el mapa ─────────────────────────────
addBtn.addEventListener('click', () => {
  map.once('click', e => {
    editIndex = -1;
    showForm(e.latlng);
  });
});

// ─── Exportar JSON y refrescar listado ──────────────────────────────────────
exportBtn.addEventListener('click', async () => {
  if (!pueblo) return alert('Carga primero un pueblo');
  await window.electronAPI.saveJSON(pueblo, markers);
  await populatePueblos();
  alert(`Guardado ${pueblo}.json`);
});

// ─── Función para mostrar el modal de formulario ────────────────────────────
function showForm(latlng) {
  // Desactivar interacciones del mapa
  map.dragging.disable();
  map.scrollWheelZoom.disable();
  document.getElementById('map').style.pointerEvents = 'none';

  // Mostrar backdrop y formulario
  backdrop.style.display = 'block';
  modal.style.display    = 'block';

  // Prefill si es edición
  if (editIndex >= 0) {
    const m = markers[editIndex];
    formFields.title.value       = m.title;
    formFields.description.value = m.description;
    formFields.question.value    = m.question;
    formFields.answer1.value     = m.answers[0];
    formFields.answer2.value     = m.answers[1];
    formFields.answer3.value     = m.answers[2];
    formFields.answer4.value     = m.answers[3];
    formFields.correct.value     = m.correct;
    formFields.lat.value         = m.coords.lat;
    formFields.lng.value         = m.coords.lng;
  } else {
    // Limpiar campos
    formFields.title.value = '';
    formFields.description.value = '';
    formFields.question.value = '';
    formFields.answer1.value = '';
    formFields.answer2.value = '';
    formFields.answer3.value = '';
    formFields.answer4.value = '';
    formFields.correct.value = '';
    formFields.lat.value = latlng.lat;
    formFields.lng.value = latlng.lng;
  }
}

// ─── Guardar datos del formulario ───────────────────────────────────────────
formSave.addEventListener('click', () => {
  const data = {
    title:       formFields.title.value,
    description: formFields.description.value,
    question:    formFields.question.value,
    answers: [
      formFields.answer1.value,
      formFields.answer2.value,
      formFields.answer3.value,
      formFields.answer4.value
    ],
    correct: parseInt(formFields.correct.value, 10),
    coords: {
      lat: parseFloat(formFields.lat.value),
      lng: parseFloat(formFields.lng.value)
    }
  };

  if (editIndex >= 0) markers[editIndex] = data;
  else markers.push(data);

  // Cerrar modal y reactivar mapa
  modal.style.display    = 'none';
  backdrop.style.display = 'none';
  map.dragging.enable();
  map.scrollWheelZoom.enable();
  document.getElementById('map').style.pointerEvents = 'auto';

  updateList();
  renderMarkers();
});

// ─── Cancelar formulario ────────────────────────────────────────────────────
formCancel.addEventListener('click', () => {
  modal.style.display    = 'none';
  backdrop.style.display = 'none';
  map.dragging.enable();
  map.scrollWheelZoom.enable();
  document.getElementById('map').style.pointerEvents = 'auto';
});

// ─── Actualizar la lista lateral de marcadores ──────────────────────────────
function updateList() {
  const list = document.getElementById('marker-list');
  list.innerHTML = '';
  markers.forEach((m, i) => {
    const entry = document.createElement('div');
    entry.className = 'marker-entry';
    entry.innerHTML = `<strong>${m.title}</strong><br>${m.description}`;
    // Botones editar / eliminar
    const btnEdit = document.createElement('button');
    btnEdit.textContent = '✏️';
    btnEdit.className   = 'btn-small';
    btnEdit.onclick     = () => { editIndex = i; showForm(markers[i].coords); };

    const btnDel  = document.createElement('button');
    btnDel.textContent = '🗑️';
    btnDel.className   = 'btn-small';
    btnDel.onclick     = () => {
      if (confirm('Borrar este marcador?')) {
        markers.splice(i,1);
        updateList();
        renderMarkers();
      }
    };

    entry.appendChild(btnEdit);
    entry.appendChild(btnDel);
    list.appendChild(entry);
  });
}

// ─── Renderizar todos los marcadores en el mapa ─────────────────────────────
function renderMarkers() {
  // Limpiar viejos
  leafletMarkers.forEach(m => map.removeLayer(m));
  leafletMarkers = markers.map((m, i) => {
    const marker = L.marker([m.coords.lat, m.coords.lng], { draggable: true })
      .addTo(map)
      .bindPopup(`<b>${m.title}</b><br>${m.description}`);

    // Al empezar drag, desactivar paneo del mapa
    marker.on('dragstart', () => {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
    });

    // Al soltar, actualiza coords y guarda
    marker.on('dragend', async e => {
      const { lat, lng } = e.target.getLatLng();
      markers[i].coords  = { lat, lng };
      await window.electronAPI.saveJSON(pueblo, markers);
      updateList();
      map.dragging.enable();
      map.scrollWheelZoom.enable();
    });

    return marker;
  });

  // Reajustar vista si hay marcadores
  if (leafletMarkers.length) {
    const group = new L.featureGroup(leafletMarkers);
    map.fitBounds(group.getBounds().pad(0.2));
  }

  // Asegurar tamaño correcto
  setTimeout(() => map.invalidateSize(), 200);
}
