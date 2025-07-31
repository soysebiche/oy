// -------------------------------------------------------------------
// Fase 2 (Revisada): Frontend Web - Lógica Principal (main.js)
// -------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {

    // 1. Initialize Leaflet Map and Global State
    // -------------------------------------------------------------------
    const map = L.map('map').setView([39.8283, -98.5795], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let selectedYear = 2023; // Default year
    let geojsonLayer;
    let detailedData;
    let geojsonData;

    // 2. Define Data Paths
    // -------------------------------------------------------------------
    const geojsonPath = 'data/metro_areas_oy.geojson';
    const detailedDataPath = 'data/metro_detailed_data.json';

    // 3. Define Color Scale for the Map
    // -------------------------------------------------------------------
    function getColor(d) {
        return d > 20 ? '#800026' :
               d > 15 ? '#BD0026' :
               d > 12 ? '#E31A1C' :
               d > 9  ? '#FC4E2A' :
               d > 6  ? '#FD8D3C' :
               d > 3  ? '#FEB24C' :
                          '#FFEDA0';
    }

    // 4. Load Data and Render Initial Map
    // -------------------------------------------------------------------
    Promise.all([
        d3.json(geojsonPath),
        d3.json(detailedDataPath)
    ]).then(([geojson, detailed]) => {
        geojsonData = geojson;
        detailedData = detailed;
        drawMap(); // Initial map draw for the default year
    }).catch(error => console.error('Error loading data:', error));

    // 5. Map Drawing and Styling Function
    // -------------------------------------------------------------------
    function drawMap() {
        if (geojsonLayer) {
            map.removeLayer(geojsonLayer);
        }

        geojsonLayer = L.geoJson(geojsonData, {
            style: feature => ({
                fillColor: getColor(feature.properties[`oy_percentage_${selectedYear}`]),
                weight: 1,
                opacity: 1,
                color: 'white',
                fillOpacity: 0.7
            }),
            onEachFeature: (feature, layer) => {
                const props = feature.properties;
                const percentage = props[`oy_percentage_${selectedYear}`] || 'N/A';
                layer.bindPopup(`<b>${props.NAME}</b><br>OY Percentage (${selectedYear}): ${percentage}%`);

                layer.on('click', e => {
                    updateInfoPanel(e.target.feature.properties);
                    updateDataTable(e.target.feature.properties.GEOID);
                    map.fitBounds(e.target.getBounds());
                });
            }
        }).addTo(map);
    }

    // 6. UI Update Functions
    // -------------------------------------------------------------------
    function updateInfoPanel(props) {
        const infoPanel = document.getElementById('info-panel');
        const percentage = props[`oy_percentage_${selectedYear}`] || 'N/A';
        const population = props[`total_youth_pop_${selectedYear}`] || 'N/A';
        const total_oy = props[`total_oy_${selectedYear}`] || 'N/A';

        infoPanel.innerHTML = `
            <h2>${props.NAME}</h2>
            <p><i>Displaying data for ${selectedYear}</i></p>
            <p><strong>Total Youth Population:</strong> ${population.toLocaleString()}</p>
            <p><strong>Total Opportunity Youth:</strong> ${total_oy.toLocaleString()}</p>
            <p><strong>Opportunity Youth Percentage:</strong> ${percentage}%</p>
        `;
    }

    function updateDataTable(geoId) {
        const tableBody = document.querySelector('#data-table tbody');
        const data = detailedData[geoId];
        tableBody.innerHTML = '';

        if (data) {
            data.forEach(row => {
                const p2022 = row.opp_youth_percent_2022 || 0;
                const p2023 = row.opp_youth_percent_2023 || 0;
                const change = (p2023 - p2022).toFixed(1);
                
                const changeHtml = `<td>${change > 0 ? '▲' : '▼'} ${change}%</td>`;

                const tableRow = `
                    <tr>
                        <td>${row.race_ethnicity}</td>
                        <td>${row.gender}</td>
                        <td>${row.opp_youth_percent_2022 || 'N/A'}%</td>
                        <td>${row.opp_youth_percent_2023 || 'N/A'}%</td>
                        <td>${(row.total_opportunity_youth_2022 || 0).toLocaleString()}</td>
                        <td>${(row.total_opportunity_youth_2023 || 0).toLocaleString()}</td>
                        ${changeHtml}
                    </tr>
                `;
                tableBody.innerHTML += tableRow;
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="7">No detailed data available for this area.</td></tr>';
        }
    }

    // 7. Event Listeners for Year Filter
    // -------------------------------------------------------------------
    document.getElementById('btn-2022').addEventListener('click', () => {
        selectedYear = 2022;
        document.getElementById('btn-2022').classList.add('active');
        document.getElementById('btn-2023').classList.remove('active');
        drawMap();
    });

    document.getElementById('btn-2023').addEventListener('click', () => {
        selectedYear = 2023;
        document.getElementById('btn-2023').classList.add('active');
        document.getElementById('btn-2022').classList.remove('active');
        drawMap();
    });
});