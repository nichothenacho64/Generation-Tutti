const regionData = [
    { region: "Lombardia", value: 42 },
    { region: "Veneto", value: 38 },
    { region: "Piemonte", value: 18 },
    { region: "Emilia-Romagna", value: 25 },
    { region: "Lazio", value: 4 },
    { region: "Campania", value: 35 },
    { region: "Puglia", value: 28 },
    { region: "Sicilia", value: 32 },
    { region: "Sardegna", value: 3 },
    { region: "Toscana", value: 0 },
    { region: "Calabria", value: 41 },
    { region: "Abruzzo", value: 14 },
    { region: "Marche", value: 16 },
    { region: "Umbria", value: 9 },
    { region: "Liguria", value: 6 },
    { region: "Friuli-Venezia Giulia", value: 39 },
    { region: "Trentino-Alto Adige/Südtirol", value: 45 },
    { region: "Molise", value: 29 },
    { region: "Basilicata", value: 30 },
    { region: "Valle d'Aosta/Vallée d'Aoste", value: 2 }
];

function getColorBinID(value) {
    if (value >= 40) return 5;
    if (value >= 30) return 4;
    if (value >= 20) return 3;
    if (value >= 10) return 2;
    if (value >= 5)  return 1;
    return 0;
}

const discreteColorScale = [
    [0.0, '#f7f7f7'],
    [0.2, '#c2e699'],
    [0.4, '#78c679'],
    [0.6, '#41ab5d'],
    [0.8, '#238443'],
    [1.0, '#004529']
];


document.addEventListener("DOMContentLoaded", () => {
    fetch("https://raw.githubusercontent.com/openpolis/geojson-italy/master/geojson/limits_IT_regions.geojson")
    .then(res => res.json())
    .then(geoData => {
        const locations = regionData.map(d => d.region);
        const z = regionData.map(d => getColorBinID(d.value)); // Use bin ID as z value
        const hovertext = regionData.map(d => `${d.region}<br>${d.value}%`);

        const data = [{
            type: "choroplethmapbox",
            geojson: geoData,
            locations: locations,
            z: z,
            featureidkey: "properties.reg_name",
            colorscale: discreteColorScale,
            zmin: 0,
            zmax: 5,
            showscale: false,
            hoverinfo: "text",
            text: hovertext,
            marker: {
                line: { width: 1, color: "#000" }
            }
        }];

        const layout = {
            title: {
                text: "Frequency of Dialect Use in Italy (2015)",
                font: { size: 20 }
            },
            width: 600, 
            height: 450,
            mapbox: {
                style: "carto-positron",
                center: { lat: 42.0, lon: 12.3 },
                zoom: 4.25
            },
            margin: { t: 50, b: 0 }
        };

        Plotly.newPlot("myDiv", data, layout, { responsive: true });
    });
})