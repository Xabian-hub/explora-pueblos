// renderer.js — Editor de Pueblos con marcadores arrastrables y persistencia

// Inicialización de Leaflet
document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('map').setView([38.7939, 0.1656], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  // Forzamos un redraw tras layout
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

  // Cargar o crear pueblo
  document.getElementById('load-pueblo').onclick = async () => {
    const sel = document.getElementById('pueblo-input')
                       ? document.getElementById('pueblo-input').value.trim()
                       : document.getElementById('pueblo-select').value.trim();
    if (!sel) return alert('Pon nombre de pueblo');
    pueblo = sel;
    await loadPueblo(pueblo);
    updateList();
    renderMarkers();
  };

  // Añadir marcador por click en el mapa
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

  // Mostrar formulario (creación o edición)
  function showForm(latlng) {
    // Desactivar interacciones del mapa
    map.dragging.disable();
    map.scrollWheelZoom.disable();
    document.getElementById('map').style.pointerEvents = 'none';

    // Mostrar backdrop y modal
    document.getElementById('modal-backdrop').style.display = 'block';
    const modal = document.getElementById('form-modal');
    modal.style.display = 'block';

    // Prefill si es edición
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
  document.getElementById('form-save').onclick = async () => {
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

    // Ocultar modal y backdrop
    document.getElementById('form-modal').style.display = 'none';
    document.getElementById('modal-backdrop').style.display = 'none';
    map.dragging.enable();
    map.scrollWheelZoom.enable();
    document.getElementById('map').style.pointerEvents = '';

    // Actualizar lista y marcadores
    updateList();
    renderMarkers();
  };

  // Cancelar formulario
  document.getElementById('form-cancel').onclick = () => {
    document.getElementById('form-modal').style.display = 'none';
    document.getElementById('modal-backdrop').style.display = 'none';
    map.dragging.enable();
    map.scrollWheelZoom.enable();
    document.getElementById('map').style.pointerEvents = '';
  };

  // Actualiza la lista lateral
  function updateList() {
    const list = document.getElementById('marker-list');
    list.innerHTML = '';
    markers.forEach((m,i) => {
      const d = document.createElement('div');
      d.className = 'marker-entry';
      d.innerHTML = `<strong>${m.title}</strong><br>${m.description}`;
      const btnEdit = document.createElement('button');
      btnEdit.textContent = '✏️';
      btnEdit.className = 'btn-small';
      btnEdit.onclick = () => {
        editIndex = i;
        showForm(markers[i].coords);
      };
      const btnDel = document.createElement('button');
      btnDel.textContent = '🗑️';
      btnDel.className = 'btn-small';
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

  // Renderiza los marcadores y los hace arrastrables
  function renderMarkers() {
    leafletMarkers.forEach(m => map.removeLayer(m));
    leafletMarkers = markers.map((m,i) => {
      const marker = L.marker([m.coords.lat, m.coords.lng], { draggable: true })
        .addTo(map)
        .bindPopup(`<b>${m.title}</b><br>${m.description}`);
      // al soltar, actualiza coords y guarda JSON
      marker.on('dragend', async e => {
        const { lat, lng } = e.target.getLatLng();
        markers[i].coords = { lat, lng };
        updateList();
        if (pueblo) await savePueblo(pueblo, markers);
      });
      return marker;
    });
    setTimeout(() => map.invalidateSize(), 200);
  }
});
