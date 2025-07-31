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
    let detailedData; // Stores detailed data for all metros
    let geojsonData; // Stores geojson data for all metros
    let currentSelectedGeoID = null; // To track the currently selected metro area
    let nationalSummary = {}; // To store calculated national totals

    // Filter states
    let selectedGender = 'all';
    let selectedRace = 'all';

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

        calculateNationalSummary(); // Calculate national totals once data is loaded
        
        drawMap(); // Initial map draw for the default year
        displayNationalTotals(); // Show national totals initially

    }).catch(error => console.error('Error loading data:', error));

    // New function to calculate national summary
    function calculateNationalSummary() {
        nationalSummary = {
            '2022': { total_youth_pop: 0, total_oy: 0, oy_percentage: 0, detailed: [] },
            '2023': { total_youth_pop: 0, total_oy: 0, oy_percentage: 0, detailed: [] }
        };

        // Aggregate detailed data for national totals
        const nationalDetailed = {};

        for (const geoId in detailedData) {
            detailedData[geoId].forEach(row => {
                const key = `${row.race_ethnicity}_${row.gender}`;
                if (!nationalDetailed[key]) {
                    nationalDetailed[key] = {
                        race_ethnicity: row.race_ethnicity,
                        gender: row.gender,
                        youth_population_2022: 0,
                        youth_population_2023: 0,
                        total_opportunity_youth_2022: 0,
                        total_opportunity_youth_2023: 0,
                        opp_youth_percent_2022: 0,
                        opp_youth_percent_2023: 0
                    };
                }
                nationalDetailed[key].youth_population_2022 += row.youth_population_2022 || 0;
                nationalDetailed[key].youth_population_2023 += row.youth_population_2023 || 0;
                nationalDetailed[key].total_opportunity_youth_2022 += row.total_opportunity_youth_2022 || 0;
                nationalDetailed[key].total_opportunity_youth_2023 += row.total_opportunity_youth_2023 || 0;
            });
        }

        // Calculate percentages for national detailed
        for (const key in nationalDetailed) {
            const row = nationalDetailed[key];
            row.opp_youth_percent_2022 = row.youth_population_2022 > 0 ? ((row.total_opportunity_youth_2022 / row.youth_population_2022) * 100).toFixed(1) : 'N/A';
            row.opp_youth_percent_2023 = row.youth_population_2023 > 0 ? ((row.total_opportunity_youth_2023 / row.youth_population_2023) * 100).toFixed(1) : 'N/A';
            nationalSummary.detailed.push(row);
        }

        // Calculate overall national totals (for info panel)
        geojsonData.features.forEach(feature => {
            const props = feature.properties;
            if (props.total_youth_pop_2022) {
                nationalSummary['2022'].total_youth_pop += props.total_youth_pop_2022;
                nationalSummary['2022'].total_oy += props.total_oy_2022;
            }
            if (props.total_youth_pop_2023) {
                nationalSummary['2023'].total_youth_pop += props.total_youth_pop_2023;
                nationalSummary['2023'].total_oy += props.total_oy_2023;
            }
        });

        nationalSummary['2022'].oy_percentage = nationalSummary['2022'].total_youth_pop > 0 ? 
            ((nationalSummary['2022'].total_oy / nationalSummary['2022'].total_youth_pop) * 100).toFixed(2) : 'N/A';
        nationalSummary['2023'].oy_percentage = nationalSummary['2023'].total_youth_pop > 0 ?
            ((nationalSummary['2023'].total_oy / nationalSummary['2023'].total_youth_pop) * 100).toFixed(2) : 'N/A';
    }

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
                    currentSelectedGeoID = e.target.feature.properties.GEOID; // Set the selected GEOID
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
        const tableBody = document.getElementById('data-table-body');
        const tableFooter = document.getElementById('data-table-footer');
        let dataToDisplay = [];

        if (geoId === 'national') {
            dataToDisplay = nationalSummary.detailed;
        } else {
            dataToDisplay = detailedData[geoId];
        }

        // Apply filters
        dataToDisplay = dataToDisplay.filter(row => {
            const genderMatch = selectedGender === 'all' || row.gender === selectedGender;
            const raceMatch = selectedRace === 'all' || row.race_ethnicity === selectedRace;
            return genderMatch && raceMatch;
        });

        tableBody.innerHTML = '';
        tableFooter.innerHTML = '';

        if (dataToDisplay && dataToDisplay.length > 0) {
            let totalOY2022 = 0;
            let totalOY2023 = 0;
            let totalPop2022 = 0;
            let totalPop2023 = 0;

            dataToDisplay.forEach(row => {
                const oy2022 = row.total_opportunity_youth_2022 || 0;
                const oy2023 = row.total_opportunity_youth_2023 || 0;
                const pop2022 = row.youth_population_2022 || 0;
                const pop2023 = row.youth_population_2023 || 0;

                totalOY2022 += oy2022;
                totalOY2023 += oy2023;
                totalPop2022 += pop2022;
                totalPop2023 += pop2023;

                const p2022 = row.opp_youth_percent_2022 || 'N/A';
                const p2023 = row.opp_youth_percent_2023 || 'N/A';
                const change = (parseFloat(p2023) - parseFloat(p2022)).toFixed(1);
                const changeHtml = `<td>${p2022 === 'N/A' || p2023 === 'N/A' ? 'N/A' : (change > 0 ? '▲' : '▼') + ` ${Math.abs(change)}%`}</td>`;

                const tableRow = `
                    <tr>
                        <td>${row.race_ethnicity}</td>
                        <td>${row.gender}</td>
                        <td>${p2022}%</td>
                        <td>${p2023}%</td>
                        <td>${oy2022.toLocaleString()}</td>
                        <td>${oy2023.toLocaleString()}</td>
                        <td>${(oy2022 + oy2023).toLocaleString()}</td>
                        ${changeHtml}
                    </tr>
                `;
                tableBody.innerHTML += tableRow;
            });

            // Calculate totals for the footer
            const totalPercent2022 = totalPop2022 > 0 ? ((totalOY2022 / totalPop2022) * 100).toFixed(1) : 'N/A';
            const totalPercent2023 = totalPop2023 > 0 ? ((totalOY2023 / totalPop2023) * 100).toFixed(1) : 'N/A';
            const totalChange = (parseFloat(totalPercent2023) - parseFloat(totalPercent2022)).toFixed(1);
            const totalChangeHtml = `<td>${totalPercent2022 === 'N/A' || totalPercent2023 === 'N/A' ? 'N/A' : (totalChange > 0 ? '▲' : '▼') + ` ${Math.abs(totalChange)}%`}</td>`;

            // Render footer with totals
            const footerRow = `
                <tr>
                    <td colspan="2">Total</td>
                    <td>${totalPercent2022}%</td>
                    <td>${totalPercent2023}%</td>
                    <td>${totalOY2022.toLocaleString()}</td>
                    <td>${totalOY2023.toLocaleString()}</td>
                    <td>${(totalOY2022 + totalOY2023).toLocaleString()}</td>
                    ${totalChangeHtml}
                </tr>
            `;
            tableFooter.innerHTML = footerRow;

        } else {
            tableBody.innerHTML = '<tr><td colspan="8">No detailed data available for this selection.</td></tr>';
        }
    }

    // New function to display national totals
    function displayNationalTotals() {
        currentSelectedGeoID = 'national'; // Indicate national totals are displayed

        // Update Info Panel for National Totals
        const infoPanel = document.getElementById('info-panel');
        const currentNationalSummary = nationalSummary[selectedYear];
        infoPanel.innerHTML = `
            <h2>National Totals (${selectedYear})</h2>
            <p><strong>Total Youth Population:</strong> ${currentNationalSummary.total_youth_pop.toLocaleString()}</p>
            <p><strong>Total Opportunity Youth:</strong> ${currentNationalSummary.total_oy.toLocaleString()}</p>
            <p><strong>Opportunity Youth Percentage:</strong> ${currentNationalSummary.oy_percentage}%</p>
        `;

        // Update Data Table for National Totals
        updateDataTable('national');
    }

    // 7. Event Listeners for Year Filter and Clear Selection
    // -------------------------------------------------------------------
    document.getElementById('btn-2022').addEventListener('click', () => {
        selectedYear = 2022;
        document.getElementById('btn-2022').classList.add('active');
        document.getElementById('btn-2023').classList.remove('active');
        drawMap();
        if (currentSelectedGeoID && currentSelectedGeoID !== 'national') {
            const selectedFeature = geojsonData.features.find(f => f.properties.GEOID === currentSelectedGeoID);
            if (selectedFeature) {
                updateInfoPanel(selectedFeature.properties);
                updateDataTable(selectedFeature.properties.GEOID);
            }
        } else {
            displayNationalTotals();
        }
    });

    document.getElementById('btn-2023').addEventListener('click', () => {
        selectedYear = 2023;
        document.getElementById('btn-2023').classList.add('active');
        document.getElementById('btn-2022').classList.remove('active');
        drawMap();
        if (currentSelectedGeoID && currentSelectedGeoID !== 'national') {
            const selectedFeature = geojsonData.features.find(f => f.properties.GEOID === currentSelectedGeoID);
            if (selectedFeature) {
                updateInfoPanel(selectedFeature.properties);
                updateDataTable(selectedFeature.properties.GEOID);
            }
        } else {
            displayNationalTotals();
        }
    });

    // Event listener for the new Clear Selection button
    document.getElementById('clear-selection-btn').addEventListener('click', () => {
        displayNationalTotals();
        map.setView([39.8283, -98.5795], 4); // Reset map view
    });

    // Event listeners for filter dropdowns
    document.getElementById('gender-filter').addEventListener('change', (event) => {
        selectedGender = event.target.value;
        if (currentSelectedGeoID) {
            updateDataTable(currentSelectedGeoID);
        }
    });

    document.getElementById('race-filter').addEventListener('change', (event) => {
        selectedRace = event.target.value;
        if (currentSelectedGeoID) {
            updateDataTable(currentSelectedGeoID);
        }
    });
});