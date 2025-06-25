// Inicialización Leaflet
const map = L.map('map').setView([38.7939, 0.1656], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
// Forzamos redraw tras layout
setTimeout(() => map.invalidateSize(), 300);

// Variables globales
let pueblo = '';
let markers = [];
let leafletMarkers = [];
let editIndex = -1;

// IPC con Electron
async function loadPueblo(name) {
  markers = await window.electronAPI.loadJSON(name);
}
async function savePueblo(name, data) {
  await window.electronAPI.saveJSON(name, data);
}

// Cargar/Crear pueblo
document.getElementById('load-pueblo').onclick = async () => {
    // 1) Leer del input libre
  const inp = document.getElementById('pueblo-input').value.trim();
  if (!inp) return alert('Pon nombre de pueblo');
  pueblo = inp;

  // 2) Si es nuevo, lo añadimos al datalist
  const dl = document.getElementById('pueblos-list');
  if (![...dl.options].some(o => o.value === pueblo)) {
    const opt = document.createElement('option');
    opt.value = pueblo;
    dl.appendChild(opt);
  }

  // 3) Ahora cargamos o creamos su JSON
  markers = await window.electronAPI.loadJSON(pueblo);
  updateList();
  renderMarkers();
};

// Añadir marcador
document.getElementById('add-marker').onclick = () => {
  map.once('click', e => {
    editIndex = -1;
    showForm(e.latlng);
  });
};

// Exportar JSON
document.getElementById('export-btn').onclick = async () => {
  if (!pueblo) return alert('Carga primero el pueblo');
  await savePueblo(pueblo, markers);
  alert(`Guardado ${pueblo}.json`);
};

// Mostrar formulario
function showForm(latlng) {
  // Desactivar interacciones del mapa
  map.dragging.disable();
  map.scrollWheelZoom.disable();
  document.getElementById('map').style.pointerEvents = 'none';

  // Mostrar backdrop y modal
  document.getElementById('modal-backdrop').style.display = 'block';
  const modal = document.getElementById('form-modal');
  modal.style.display = 'block';

  // Prefill si edición
  if (editIndex >= 0) {
    const m = markers[editIndex];
    document.getElementById('form-title').value = m.title;
    document.getElementById('form-description').value = m.description;
    document.getElementById('form-question').value = m.question;
    [1,2,3,4].forEach(i => {
      document.getElementById(`form-answer${i}`).value = m.answers[i-1];
    });
    document.getElementById('form-correct').value = m.correct;
    document.getElementById('form-lat').value = m.coords.lat;
    document.getElementById('form-lng').value = m.coords.lng;
  } else {
    // Limpia campos
    ['title','description','question','answer1','answer2','answer3','answer4','correct','lat','lng']
      .forEach(id => document.getElementById(`form-${id}`).value = '');
    document.getElementById('form-lat').value = latlng.lat;
    document.getElementById('form-lng').value = latlng.lng;
  }
}

// Guardar formulario
document.getElementById('form-save').onclick = () => {
  const data = {
    title: document.getElementById('form-title').value,
    description: document.getElementById('form-description').value,
    question: document.getElementById('form-question').value,
    answers: [
      document.getElementById('form-answer1').value,
      document.getElementById('form-answer2').value,
      document.getElementById('form-answer3').value,
      document.getElementById('form-answer4').value
    ],
    correct: parseInt(document.getElementById('form-correct').value),
    coords: {
      lat: parseFloat(document.getElementById('form-lat').value),
      lng: parseFloat(document.getElementById('form-lng').value)
    }
  };

  if (editIndex >= 0) markers[editIndex] = data;
  else markers.push(data);

  closeForm();
  updateList();
  renderMarkers();
};

// Cancelar formulario
document.getElementById('form-cancel').onclick = closeForm;

function closeForm() {
  // Ocultar modal y backdrop
  document.getElementById('form-modal').style.display = 'none';
  document.getElementById('modal-backdrop').style.display = 'none';
  // Reactivar mapa
  map.dragging.enable();
  map.scrollWheelZoom.enable();
  document.getElementById('map').style.pointerEvents = 'auto';
}

// Actualiza lista lateral
function updateList() {
  const list = document.getElementById('marker-list');
  list.innerHTML = '';
  markers.forEach((m,i) => {
    const d = document.createElement('div');
    d.className = 'marker-entry';
    d.innerHTML = `<strong>${m.title}</strong><br>${m.description}`;
    const btnEdit = document.createElement('button');
    btnEdit.textContent = '✏️'; btnEdit.className = 'btn-small';
    btnEdit.onclick = () => {
      editIndex = i;
      showForm(markers[i].coords);
    };
    const btnDel = document.createElement('button');
    btnDel.textContent = '🗑️'; btnDel.className = 'btn-small';
    btnDel.onclick = () => {
      if (confirm('Borrar este marcador?')) {
        markers.splice(i,1);
        updateList();
        renderMarkers();
      }
    };
    d.append(btnEdit, btnDel);
    list.appendChild(d);
  });
}

// Dibuja marcadores en mapa
function renderMarkers() {
  leafletMarkers.forEach(m => map.removeLayer(m));
  leafletMarkers = markers.map(m =>
    L.marker([m.coords.lat, m.coords.lng]).addTo(map)
      .bindPopup(`<b>${m.title}</b><br>${m.description}`)
  );
  setTimeout(() => map.invalidateSize(), 200);
}
