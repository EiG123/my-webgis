// สร้าง map
const map = L.map("map").setView([15.8700, 100.9925], 6);

// Tile Layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

// Layer groups
let layerGroups = {};
let markers = [];

// Function: Add marker
function addMarker(row) {
  const { name, lat, lng, color, description, group } = row;
  if (!lat || !lng) return;

  const marker = L.circleMarker([parseFloat(lat), parseFloat(lng)], {
    color: color || "blue",
    radius: 8,
    fillOpacity: 0.8
  });

  // Popup ข้อมูล
  marker.bindPopup(`
    <b>${name}</b><br>
    ${description || ""}<br>
    <button onclick="openStreetView(${lat},${lng})">Street View</button>
  `);

  // ถ้า group ยังไม่มี → สร้าง layerGroup
  if (!layerGroups[group]) {
    layerGroups[group] = L.layerGroup().addTo(map);
  }
  marker.addTo(layerGroups[group]);
  markers.push({ name, marker });
}

// Function: Import CSV
document.getElementById("csvFile").addEventListener("change", function (e) {
  const file = e.target.files[0];
  Papa.parse(file, {
    header: true,
    dynamicTyping: true,
    complete: function (results) {
      markers = [];
      layerGroups = {};

      results.data.forEach(addMarker);

      // สร้าง control สำหรับ layer
      L.control.layers(null, layerGroups, { collapsed: false }).addTo(map);

      // สร้าง search control
      addSearchControl();
    }
  });
});

// Function: Search
function addSearchControl() {
  const searchControl = L.Control.geocoder({
    defaultMarkGeocode: false
  })
    .on("markgeocode", function (e) {
      map.setView(e.geocode.center, 15);
    })
    .addTo(map);

  // เพิ่มช่อง search custom (ค้นจาก marker name)
  const searchBox = L.DomUtil.create("input", "search-box");
  searchBox.type = "text";
  searchBox.placeholder = "Search point...";
  searchBox.style.position = "absolute";
  searchBox.style.top = "10px";
  searchBox.style.right = "10px";
  searchBox.style.zIndex = 1000;

  document.body.appendChild(searchBox);

  searchBox.addEventListener("keyup", function () {
    const query = searchBox.value.toLowerCase();
    markers.forEach(({ name, marker }) => {
      if (name.toLowerCase().includes(query)) {
        marker.setStyle({ radius: 12, color: "yellow" });
        map.setView(marker.getLatLng(), 14);
        marker.openPopup();
      } else {
        marker.setStyle({ radius: 8 });
      }
    });
  });
}

// Function: Street View
function openStreetView(lat, lng) {
  const url = `https://www.google.com/maps?q=&layer=c&cbll=${lat},${lng}`;
  window.open(url, "_blank");
}
