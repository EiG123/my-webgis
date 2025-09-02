// Initialize the map - ใช้พิกัดที่คุณกำหนด
const map = L.map("map").setView([15.8700, 100.9925], 6);

// Add base layers
const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
});

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
});

// Add default layer
osmLayer.addTo(map);

// Base layer control
const baseLayers = {
  "OpenStreetMap": osmLayer,
  "Satellite": satelliteLayer
};

// Layer groups for data organization
let layerGroups = {};
let markers = [];
let csvData = [];
let layerControl = null;

// Color schemes for different groups
const colorSchemes = {
  categorical: ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'],
  sequential: ['#feedde', '#fdbe85', '#fd8d3c', '#e6550d', '#a63603']
};

// Status functions
function showStatus(message, type = 'info') {
  const statusBar = document.getElementById('statusBar');
  statusBar.textContent = message;
  statusBar.style.display = 'block';
  statusBar.className = `status-bar status-${type}`;
  
  setTimeout(() => {
    statusBar.style.display = 'none';
  }, 5000);
}

function showLoading(show = true) {
  document.getElementById('loading').style.display = show ? 'block' : 'none';
}

// Function: Add marker with enhanced features
function addMarker(row, index) {
  // รองรับหลายรูปแบบของ column names
  const lat = row.lat || row.latitude || row.y || row.LAT || row.LATITUDE;
  const lng = row.lng || row.lon || row.longitude || row.x || row.LNG || row.LON || row.LONGITUDE;
  const name = row.name || row.NAME || row.title || row.TITLE || `Point ${index + 1}`;
  const description = row.description || row.DESC || row.details || '';
  const color = row.color || row.COLOR || colorSchemes.categorical[index % colorSchemes.categorical.length];
  const group = row.group || row.GROUP || row.category || row.CATEGORY || 'Default';

  if (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
    return false;
  }

  const marker = L.circleMarker([parseFloat(lat), parseFloat(lng)], {
    color: color,
    fillColor: color,
    radius: 8,
    fillOpacity: 0.8,
    weight: 2,
    opacity: 1
  });

  // Enhanced popup with Street View button
  const popupContent = `
    <div style="max-width: 300px;">
      <h4 style="margin: 0 0 10px 0; color: ${color};">${name}</h4>
      ${description ? `<p style="margin: 5px 0;">${description}</p>` : ''}
      <div style="margin-top: 10px;">
        <strong>Coordinates:</strong> ${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}<br>
        <button onclick="openStreetView(${lat},${lng})" 
                style="margin-top: 8px; padding: 5px 10px; background: #3498db; color: white; border: none; border-radius: 3px; cursor: pointer;">
          🗺️ Street View
        </button>
      </div>
    </div>
  `;

  marker.bindPopup(popupContent);

  // Create layer group if not exists
  if (!layerGroups[group]) {
    layerGroups[group] = L.layerGroup().addTo(map);
  }
  
  marker.addTo(layerGroups[group]);
  markers.push({ name, marker, lat: parseFloat(lat), lng: parseFloat(lng), group });
  
  return true;
}

// Function: Import and process CSV
function processCSVData(data) {
  showLoading(true);
  
  setTimeout(() => {
    try {
      // Clear existing data
      markers = [];
      Object.values(layerGroups).forEach(layer => map.removeLayer(layer));
      layerGroups = {};
      
      // Remove existing layer control
      if (layerControl) {
        map.removeControl(layerControl);
      }

      let validPoints = 0;
      const bounds = [];

      data.forEach((row, index) => {
        if (addMarker(row, index)) {
          validPoints++;
          const lat = row.lat || row.latitude || row.y || row.LAT || row.LATITUDE;
          const lng = row.lng || row.lon || row.longitude || row.x || row.LNG || row.LON || row.LONGITUDE;
          bounds.push([parseFloat(lat), parseFloat(lng)]);
        }
      });

      if (validPoints > 0) {
        // Add layer control with base layers and data layers
        layerControl = L.control.layers(baseLayers, layerGroups, { 
          collapsed: false,
          position: 'topright'
        }).addTo(map);

        // Fit map to show all markers
        if (bounds.length > 0) {
          map.fitBounds(bounds, { padding: [20, 20] });
        }

        // Add search functionality
        addSearchControl();
        
        // Create legend
        createLegend();

        showStatus(`Successfully loaded ${validPoints} points from ${data.length} records in ${Object.keys(layerGroups).length} groups`, 'success');
      } else {
        throw new Error('No valid coordinate data found in CSV');
      }

    } catch (error) {
      showStatus(`Error processing data: ${error.message}`, 'error');
    } finally {
      showLoading(false);
    }
  }, 100);
}

// Function: Enhanced search control
function addSearchControl() {
  // Add geocoder
  const geocoder = L.Control.geocoder({
    defaultMarkGeocode: false,
    position: 'topleft'
  }).on('markgeocode', function(e) {
    map.setView(e.geocode.center, 15);
    L.popup()
      .setLatLng(e.geocode.center)
      .setContent(e.geocode.name)
      .openOn(map);
  }).addTo(map);

  // Custom search box for markers
  const searchContainer = L.DomUtil.create('div', 'leaflet-control leaflet-control-custom');
  searchContainer.style.backgroundColor = 'white';
  searchContainer.style.padding = '5px';
  searchContainer.style.borderRadius = '5px';
  searchContainer.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  
  const searchBox = L.DomUtil.create('input', 'search-box');
  searchBox.type = 'text';
  searchBox.placeholder = '🔍 Search markers...';
  searchBox.style.border = '1px solid #ccc';
  searchBox.style.padding = '8px';
  searchBox.style.borderRadius = '3px';
  searchBox.style.width = '200px';
  
  searchContainer.appendChild(searchBox);

  const searchControl = L.control({position: 'topright'});
  searchControl.onAdd = function() {
    return searchContainer;
  };
  searchControl.addTo(map);

  // Search functionality
  let searchTimeout;
  searchBox.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const query = searchBox.value.toLowerCase().trim();
      
      markers.forEach(({ name, marker, lat, lng }) => {
        if (query === '') {
          marker.setStyle({ radius: 8 });
        } else if (name.toLowerCase().includes(query)) {
          marker.setStyle({ radius: 12, weight: 4 });
          if (markers.filter(m => m.name.toLowerCase().includes(query)).length === 1) {
            map.setView([lat, lng], 14);
            marker.openPopup();
          }
        } else {
          marker.setStyle({ radius: 6, weight: 1, opacity: 0.5 });
        }
      });
    }, 300);
  });

  // Clear search on escape
  searchBox.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      searchBox.value = '';
      markers.forEach(({ marker }) => {
        marker.setStyle({ radius: 8, weight: 2, opacity: 1 });
      });
    }
  });
}

// Function: Street View
function openStreetView(lat, lng) {
  const url = `https://www.google.com/maps?q=&layer=c&cbll=${lat},${lng}`;
  window.open(url, '_blank');
}

// Create enhanced legend
function createLegend() {
  const legend = L.control({position: 'bottomright'});
  
  legend.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'legend');
    let content = '<h4>📊 Data Groups</h4>';
    
    Object.keys(layerGroups).forEach(groupName => {
      const groupMarkers = markers.filter(m => m.group === groupName);
      const color = groupMarkers.length > 0 ? 
        groupMarkers[0].marker.options.color : 
        colorSchemes.categorical[0];
      
      content += `
        <div class="legend-item">
          <div class="legend-color" style="background-color: ${color}"></div>
          <span>${groupName} (${groupMarkers.length})</span>
        </div>
      `;
    });
    
    div.innerHTML = content;
    return div;
  };
  
  legend.addTo(map);
}

// File upload handler
document.getElementById('csvFile').addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById('fileInfo').textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    complete: function(results) {
      if (results.errors.length > 0) {
        showStatus(`CSV parsing errors: ${results.errors[0].message}`, 'error');
        return;
      }

      csvData = results.data;
      
      if (csvData.length === 0) {
        showStatus('No data found in CSV file', 'error');
        return;
      }

      processCSVData(csvData);
    },
    error: function(error) {
      showStatus(`Error reading file: ${error.message}`, 'error');
    }
  });
});

// Add scale control
L.control.scale({
  position: 'bottomleft',
  imperial: false
}).addTo(map);

// Welcome message
showStatus('Welcome! Upload a CSV file with coordinate data to get started. Expected columns: lat/latitude, lng/longitude, name, description, color, group', 'info');