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
    let nationalSummary = { detailed: [] }; // To store calculated national totals

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

    // New function to calculate national summary (only detailed breakdown)
    function calculateNationalSummary() {
        const nationalDetailedAggregated = {};

        for (const geoId in detailedData) {
            detailedData[geoId].forEach(row => {
                const key = `${row.race_ethnicity}_${row.gender}`;
                if (!nationalDetailedAggregated[key]) {
                    nationalDetailedAggregated[key] = {
                        race_ethnicity: row.race_ethnicity,
                        gender: row.gender,
                        youth_population_2022: 0,
                        youth_population_2023: 0,
                        total_opportunity_youth_2022: 0,
                        total_opportunity_youth_2023: 0,
                    };
                }
                nationalDetailedAggregated[key].youth_population_2022 += row.youth_population_2022 || 0;
                nationalDetailedAggregated[key].youth_population_2023 += row.youth_population_2023 || 0;
                nationalDetailedAggregated[key].total_opportunity_youth_2022 += row.total_opportunity_youth_2022 || 0;
                nationalDetailedAggregated[key].total_opportunity_youth_2023 += row.total_opportunity_youth_2023 || 0;
            });
        }

        for (const key in nationalDetailedAggregated) {
            const row = nationalDetailedAggregated[key];
            row.opp_youth_percent_2022 = row.youth_population_2022 > 0 ? ((row.total_opportunity_youth_2022 / row.youth_population_2022) * 100).toFixed(1) : 'N/A';
            row.opp_youth_percent_2023 = row.youth_population_2023 > 0 ? ((row.total_opportunity_youth_2023 / row.youth_population_2023) * 100).toFixed(1) : 'N/A';
            nationalSummary.detailed.push(row);
        }
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
        const tableBodyRate = document.getElementById('data-table-body-rate');
        const tableFooterRate = document.getElementById('data-table-footer-rate');
        const tableBodyShare = document.getElementById('data-table-body-share');
        const tableFooterShare = document.getElementById('data-table-footer-share');
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

        tableBodyRate.innerHTML = '';
        tableFooterRate.innerHTML = '';
        tableBodyShare.innerHTML = '';
        tableFooterShare.innerHTML = '';

        if (dataToDisplay && dataToDisplay.length > 0) {
            let totalOY2022 = 0;
            let totalOY2023 = 0;
            let totalPop2022 = 0;
            let totalPop2023 = 0;

            dataToDisplay.forEach(row => {
                totalOY2022 += row.total_opportunity_youth_2022 || 0;
                totalOY2023 += row.total_opportunity_youth_2023 || 0;
                totalPop2022 += row.youth_population_2022 || 0;
                totalPop2023 += row.youth_population_2023 || 0;
            });

            dataToDisplay.forEach(row => {
                const oy2022 = row.total_opportunity_youth_2022 || 0;
                const oy2023 = row.total_opportunity_youth_2023 || 0;
                const pop2022 = row.youth_population_2022 || 0;
                const pop2023 = row.youth_population_2023 || 0;

                const p2022 = row.opp_youth_percent_2022 || 'N/A';
                const p2023 = row.opp_youth_percent_2023 || 'N/A';
                const change = (parseFloat(p2023) - parseFloat(p2022)).toFixed(1);
                const changeHtml = `<td>${p2022 === 'N/A' || p2023 === 'N/A' ? 'N/A' : (change > 0 ? '▲' : '▼') + ` ${Math.abs(change)}%`}</td>`;

                const tableRowRate = `
                    <tr>
                        <td>${row.race_ethnicity}</td>
                        <td>${row.gender}</td>
                        <td>${oy2022.toLocaleString()}</td>
                        <td>${p2022}%</td>
                        <td>${pop2022.toLocaleString()}</td>
                        <td>${oy2023.toLocaleString()}</td>
                        <td>${p2023}%</td>
                        <td>${pop2023.toLocaleString()}</td>
                        <td>${(oy2022 + oy2023).toLocaleString()}</td>
                        ${changeHtml}
                    </tr>
                `;
                tableBodyRate.innerHTML += tableRowRate;

                const share2022 = totalOY2022 > 0 ? ((oy2022 / totalOY2022) * 100).toFixed(1) : 'N/A';
                const share2023 = totalOY2023 > 0 ? ((oy2023 / totalOY2023) * 100).toFixed(1) : 'N/A';
                const shareChange = (parseFloat(share2023) - parseFloat(share2022)).toFixed(1);
                const shareChangeHtml = `<td>${share2022 === 'N/A' || share2023 === 'N/A' ? 'N/A' : (shareChange > 0 ? '▲' : '▼') + ` ${Math.abs(shareChange)}%`}</td>`;

                const tableRowShare = `
                    <tr>
                        <td>${row.race_ethnicity}</td>
                        <td>${row.gender}</td>
                        <td>${oy2022.toLocaleString()}</td>
                        <td>${share2022}%</td>
                        <td>${oy2023.toLocaleString()}</td>
                        <td>${share2023}%</td>
                        ${shareChangeHtml}
                    </tr>
                `;
                tableBodyShare.innerHTML += tableRowShare;
            });

            // Calculate totals for the footer
            const totalPercent2022 = totalPop2022 > 0 ? ((totalOY2022 / totalPop2022) * 100).toFixed(1) : 'N/A';
            const totalPercent2023 = totalPop2023 > 0 ? ((totalOY2023 / totalPop2023) * 100).toFixed(1) : 'N/A';
            const totalChange = (parseFloat(totalPercent2023) - parseFloat(totalPercent2022)).toFixed(1);
            const totalChangeHtml = `<td>${totalPercent2022 === 'N/A' || totalPercent2023 === 'N/A' ? 'N/A' : (totalChange > 0 ? '▲' : '▼') + ` ${Math.abs(totalChange)}%`}</td>`;

            // Render footer with totals
            const footerRowRate = `
                <tr>
                    <td colspan="2">Total</td>
                    <td>${totalOY2022.toLocaleString()}</td>
                    <td>${totalPercent2022}%</td>
                    <td>${totalPop2022.toLocaleString()}</td>
                    <td>${totalOY2023.toLocaleString()}</td>
                    <td>${totalPercent2023}%</td>
                    <td>${totalPop2023.toLocaleString()}</td>
                    <td>${(totalOY2022 + totalOY2023).toLocaleString()}</td>
                    ${totalChangeHtml}
                </tr>
            `;
            tableFooterRate.innerHTML = footerRowRate;

            const footerRowShare = `
                <tr>
                    <td colspan="2">Total</td>
                    <td>${totalOY2022.toLocaleString()}</td>
                    <td>100%</td>
                    <td>${totalOY2023.toLocaleString()}</td>
                    <td>100%</td>
                    <td>-</td>
                </tr>
            `;
            tableFooterShare.innerHTML = footerRowShare;

        } else {
            tableBodyRate.innerHTML = '<tr><td colspan="10">No detailed data available for this selection.</td></tr>';
            tableBodyShare.innerHTML = '<tr><td colspan="7">No detailed data available for this selection.</td></tr>';
        }
    }

    // New function to display national totals
    function displayNationalTotals() {
        currentSelectedGeoID = 'national'; // Indicate national totals are displayed

        // Filter national detailed data based on current filters
        let filteredNationalDetailed = nationalSummary.detailed.filter(row => {
            const genderMatch = selectedGender === 'all' || row.gender === selectedGender;
            const raceMatch = selectedRace === 'all' || row.race_ethnicity === selectedRace;
            return genderMatch && raceMatch;
        });

        // Calculate overall totals for the info panel from the filtered data
        let currentTotalYouthPop = 0;
        let currentTotalOY = 0;

        filteredNationalDetailed.forEach(row => {
            currentTotalYouthPop += row[`youth_population_${selectedYear}`] || 0;
            currentTotalOY += row[`total_opportunity_youth_${selectedYear}`] || 0;
        });

        const currentOYPercentage = currentTotalYouthPop > 0 ? ((currentTotalOY / currentTotalYouthPop) * 100).toFixed(2) : 'N/A';

        // Update Info Panel for National Totals
        const infoPanel = document.getElementById('info-panel');
        infoPanel.innerHTML = `
            <h2>National Totals (${selectedYear})</h2>
            <p><strong>Total Youth Population:</strong> ${currentTotalYouthPop.toLocaleString()}</p>
            <p><strong>Total Opportunity Youth:</strong> ${currentTotalOY.toLocaleString()}</p>
            <p><strong>Opportunity Youth Percentage:</strong> ${currentOYPercentage}%</p>
        `;

        // Update Data Table for National Totals (applies filters)
        updateDataTable('national');
    }

    // 7. Event Listeners for Year Filter
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

    // Event listeners for filter dropdowns
    document.getElementById('gender-filter').addEventListener('change', (event) => {
        selectedGender = event.target.value;
        // If a metro is selected, update its table. Otherwise, update national table.
        updateDataTable(currentSelectedGeoID || 'national');
    });

    document.getElementById('race-filter').addEventListener('change', (event) => {
        selectedRace = event.target.value;
        // If a metro is selected, update its table. Otherwise, update national table.
        updateDataTable(currentSelectedGeoID || 'national');
    });

    // Event listener for Export button
    document.getElementById('export-table-btn').addEventListener('click', () => {
        const table = document.getElementById('data-table');
        const ws = XLSX.utils.table_to_sheet(table);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Opportunity Youth Data");
        XLSX.writeFile(wb, "opportunity_youth_data.xlsx");
    });
});