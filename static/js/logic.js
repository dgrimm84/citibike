// API URLs
const stationInfoUrl = "https://gbfs.citibikenyc.com/gbfs/en/station_information.json";
const stationStatusUrl = "https://gbfs.citibikenyc.com/gbfs/en/station_status.json";

// Fetch data from both APIs
Promise.all([
  fetch(stationInfoUrl).then(res => res.json()),
  fetch(stationStatusUrl).then(res => res.json())
]).then(data => {
  const stationInfo = data[0].data.stations;
  const stationStatus = data[1].data.stations;

  // Combine station info and status
  const combinedStations = stationInfo.map(info => {
    const status = stationStatus.find(stat => stat.station_id === info.station_id);
    return { ...info, ...status };
  });

  createMap(combinedStations);
}).catch(error => console.error("Error fetching data:", error));

// Define the map creation function
function createMap(stations) {
  // Create the base map
  const map = L.map("map-id").setView([40.73, -74.0059], 12);

  // Add tile layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

  // Define layer groups
  const comingSoon = L.layerGroup();
  const emptyStations = L.layerGroup();
  const outOfOrder = L.layerGroup();
  const lowStations = L.layerGroup();
  const healthyStations = L.layerGroup();

  // Iterate through stations and add markers to the appropriate layer
  stations.forEach(station => {
    let marker;
    let status;
    let iconFilter;

    if (!station.is_installed) {
      // Coming Soon
      status = "Coming Soon";
      iconFilter = ""; // Blue
      marker = createMarker(station, status, iconFilter);
      comingSoon.addLayer(marker);
    } else if (station.num_bikes_available === 0) {
      // Empty Stations
      status = "Empty Station";
      iconFilter = "grayscale(100%) sepia(100%) hue-rotate(-90deg)"; // Red
      marker = createMarker(station, status, iconFilter);
      emptyStations.addLayer(marker);
    } else if (!station.is_renting) {
      // Out of Order
      status = "Out of Order";
      iconFilter = "grayscale(100%) sepia(100%) hue-rotate(180deg)"; // Black
      marker = createMarker(station, status, iconFilter);
      outOfOrder.addLayer(marker);
    } else if (station.num_bikes_available < 5) {
      // Low Stations
      status = "Low Station";
      iconFilter = "grayscale(100%) sepia(100%) hue-rotate(30deg)"; // Orange
      marker = createMarker(station, status, iconFilter);
      lowStations.addLayer(marker);
    } else {
      // Healthy Stations
      status = "Healthy Station";
      iconFilter = "grayscale(100%) sepia(100%) hue-rotate(90deg)"; // Green
      marker = createMarker(station, status, iconFilter);
      healthyStations.addLayer(marker);
    }
  });

  // Add layer control
  const overlays = {
    "Coming Soon": comingSoon,
    "Empty Stations": emptyStations,
    "Out of Order": outOfOrder,
    "Low Stations": lowStations,
    "Healthy Stations": healthyStations
  };

  L.control.layers(null, overlays).addTo(map);

  // Add default layers to the map
  comingSoon.addTo(map);
  emptyStations.addTo(map);
  outOfOrder.addTo(map);
  lowStations.addTo(map);
  healthyStations.addTo(map);

  // Create a legend with station statuses
  const legend = L.control({ position: "bottomright" });

  legend.onAdd = function() {
    let div = L.DomUtil.create("div", "info legend");
    div.innerHTML = `
      <i style="background: blue"></i> Coming Soon<br>
      <i style="background: purple"></i> Empty Stations<br>
      <i style="background: orange"></i> Low Stations<br>
      <i style="background: black"></i> Out of Order<br>
      <i style="background: green"></i> Healthy Stations<br>
      <br>
      <span>Updated: ${new Date().toLocaleTimeString()}</span>
    `;
    return div;
  };

  legend.addTo(map);
}

// Helper function to create markers with CSS filters for color
function createMarker(station, status, iconFilter) {
  // Set the icon for Citi Bike (the same icon for all statuses)
  const citibikeIcon = L.icon({
    iconUrl: "https://images.ctfassets.net/p6ae3zqfb1e3/1rbjR48QnBe6cL8Ti6tPmV/08f9e1a62a6ef6ec1cddc4bc5a12f8d1/imageedit_2_9337177880.png?w=1500&q=60&fm=",  // Replace with your actual Citi Bike icon path
    iconSize: [120, 60],  // Adjust the size if necessary
    iconAnchor: [16, 32], // Anchor the icon to the center bottom
    popupAnchor: [0, -32], // Adjust popup position
    className: "citi-bike-icon"
  });

  // Create the marker with the correct icon
  const marker = L.marker([station.lat, station.lon], {
    icon: citibikeIcon
  });

  // Use the onAdd function to apply the CSS filter when the marker is added to the map
  marker.on('add', function() {
    marker.getElement().style.filter = iconFilter;
  });

  // Bind a popup with station information
  marker.bindPopup(`
    <h3>${station.name}</h3>
    <p>Status: ${status}</p>
    <p>Bikes Available: ${station.num_bikes_available}</p>
  `);

  return marker;
}