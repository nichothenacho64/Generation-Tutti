import { ChartConstructor, ChoroplethConstructor } from "../chart_constructor.js";
import {
    titleFont, axisFont, globalFont,
    themeColours, colourPalettes,
    globalConfig, hoverLabelConfig
} from "../graph_configurations.js";

let currentSortAttribute = "Average";

async function createSentimentBarChart() {
    let sentimentBarChart = await new ChartConstructor("sentiment_percentages.json").init();
    sentimentBarChart.numDataArrays = sentimentBarChart.dataArray.length; // sentimentBarChart.dataArray.length

    const data = Object.keys(sentimentBarChart.dataArray).map(sentiment => ({
        x: sentimentBarChart.xValues,
        y: sentimentBarChart.dataArray[sentiment],
        name: sentiment.toLowerCase().split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
        type: "bar",
        marker: { color: colourPalettes.sentimentColours[sentiment] },
        textposition: "inside",
        insidetextanchor: "middle",
        text: sentimentBarChart.dataArray[sentiment].map(value => `${value}%`),
        textposition: "auto",
        hoverlabel: hoverLabelConfig,
        hovertemplate: `<b>%{x}</b><br>Sentiment: ${sentiment.toLowerCase().split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}<br>Value: %{text}<extra></extra>`, // all on one line with <br>
    }));

    const layout = {
        barmode: "stack",
        title: {
            text: `<b>${sentimentBarChart.metadata.title}</b>`,
            font: titleFont
        },
        xaxis: {
            title: {
                text: "Generation",
                font: axisFont
            },
        },
        yaxis: {
            title: {
                text: "Proportion of sentiments (%)",
            },
            automargin: true,
            range: [0, 100]
        },
        legend: {
            title: {
                text: `<b>Sentiments</b>`,
                font: axisFont
            }
        },
        font: globalFont
    };

    Plotly.newPlot("sentimentBarChart", data, layout, globalConfig);
}

async function createLemmaHeatmap(currentSortAttribute) {
    let lemmaHeatmap = await new ChartConstructor("top_lemmas.json", { sortAttribute: currentSortAttribute }).init();
    lemmaHeatmap.orderData();
    lemmaHeatmap.numDataArrays = 10;

    const lemmas = lemmaHeatmap.getDataArrayKeys();
    const frequencies = lemmaHeatmap.getDataArrayValues().map(row => row.slice(0, -2)); // all except the last columns
    const deltaFrequencies = lemmaHeatmap.getDataArrayValues().map(row => row.slice(-2, -1)); // average delta column
    const paddedDeltaFrequencies = deltaFrequencies.map(row => { // line up each row with the last column position
        return Array(lemmaHeatmap.xValues.length - 1).fill("").concat(row);
    });

    const data = [
        {
            x: lemmaHeatmap.xValues,
            y: lemmas,
            z: frequencies,
            // zmin: 0,
            // zmax: 22,
            type: "heatmap",
            colorscale: colourPalettes.lemmaHeatmap.valueColours,
            xgap: 1.25,
            ygap: 1.25,
            text: frequencies,
            texttemplate: "%{text}",
            hoverlabel: hoverLabelConfig,
            hovertemplate: `<b>%{x}</b><br>Lemma: %{y}<br>Value: %{z}<extra></extra>`, // all on one line with <br>
            hoverongaps: false,
            showscale: true,
            colorbar: {
                title: {
                    text: `Frequency (per 1000 words)`,
                    side: "right",
                    font: { size: 12 },
                },
                thickness: 14,
                len: 1.045,
                xanchor: "left",
                x: 0.625, // abs position
                xpad: 80, // minimum padding between chart and barx, improves responsivity
                tickfont: { size: 10 },
            }
        },
        {
            x: lemmaHeatmap.xValues,
            y: lemmas,
            z: paddedDeltaFrequencies,
            type: "heatmap",
            colorscale: colourPalettes.lemmaHeatmap.averageColours,
            xgap: 1.25,
            ygap: 1.25,
            text: paddedDeltaFrequencies,
            texttemplate: "%{text}",
            hoverlabel: hoverLabelConfig,
            hovertemplate:
                `Lemma: %{y}<br>Value: %{z}<extra></extra>`,
            hoverongaps: false,
            showscale: false
        }
    ];


    const layout = {
        title: {
            text: `<b>Occurrences of top ${lemmaHeatmap.metadata["top_n_lemmas"]} lemmas in each generation (per ${lemmaHeatmap.metadata["per_n_words"]} words)</b>`,
            font: titleFont
        },
        xaxis: {
            title: {
                text: "Generation",
                font: axisFont,
                standoff: 20,
            },
            tickangle: -45, // angled x axis labels
            scaleanchor: "y", // for square cells
            constrain: "domain",
        },
        yaxis: {
            title: {
                text: "Lemma",
                font: axisFont,
                standoff: 20,
            },
            autorange: "reversed",
            automargin: true
        },
        font: globalFont,
        margin: { b: 100 }
    };

    Plotly.newPlot("lemmaHeatmap", data, layout, globalConfig);
}

async function createProsodicLineChart() {
    let prosodicLineChart = await new ChartConstructor("prosodic_features.json").init();
    prosodicLineChart.numDataArrays = prosodicLineChart.dataArray.length;

    const data = Object.keys(prosodicLineChart.dataArray).map((prosodicFeature, colourNumber) => ({
        x: prosodicLineChart.xValues,
        y: prosodicLineChart.dataArray[prosodicFeature],
        name: prosodicFeature, // this is where the name comes in
        type: 'scatter',
        marker: { color: colourPalettes.eightColourPalette[colourNumber % colourPalettes.eightColourPalette.length] },
        hoverlabel: hoverLabelConfig,
        hovertemplate: `<b>%{x}</b><br>%{y}<extra></extra>`, // all on one line with <br>
    }));

    const layout = {
        title: {
            text: `<b>${prosodicLineChart.metadata.title}</b>`,
            font: titleFont
        },
        xaxis: {
            title: {
                text: "Generation",
                font: axisFont
            },
        },
        yaxis: {
            title: {
                text: "Average frequency per line (%)",
            },
            // automargin: true,
        },
        legend: {
            title: {
                text: `<b>Prosodic feature</b>`,
                font: axisFont
            }
        },
        font: globalFont
    }

    Plotly.newPlot("prosodicLineChart", data, layout, globalConfig);
}

async function createThemesRadarChart() {
    const data = [
        {
            type: 'scatterpolar',
            r: [0.39, 0.28, 0.8, 0.7, 0.28, 0.39, 0.45, 0.11, 0.27, 0.39],
            theta: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'A'],
            fill: 'toself',
            name: 'Baby Boomers',
        },
        {
            type: 'scatterpolar',
            r: [0.45, 0.90, 0.59, 0.71, 0.85, 0.15, 0.75, 1, 0.61, 0.45],
            theta: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'A'],
            fill: 'toself',
            name: 'Generation X',
            hovertemplate: `<b>Generation X<br></b>Theme: %{theta}<br>Correlation: %{r}<extra></extra>` // ! eventually replace with x values...
        }
        // ! to remember
        // ∞ 1. the R/theta lists need to have their first and last values DUPLICATED
        // ∞ 2. Apply the same mapping approach
        // ∞ 3. Use the same eight colours
    ]

    const layout = {
        title: {
            text: `<b>Correlation between themes and generational conversations</b>`,
            font: titleFont
        },
        xaxis: {
            title: {
                text: "Generation",
                font: axisFont
            },
        },
        yaxis: {
            title: {
                text: "Average frequency per line (%)",
            },
        },
        legend: {
            title: {
                text: `<b>Theme</b>`,
                font: axisFont
            }
        },
        font: globalFont,
        polar: {
            radialaxis: {
                visible: true, // ! important too?
                range: [0, 1], // ! must keep this
                tickangle: 22.5
            },
            // gridshape: 'linear' // comment this to make it circular (default)
        }
    }

    Plotly.newPlot("themesRadarChart", data, layout, globalConfig);
}

async function createDialectsDeltaChoroplethMap() {
    let dialectsDeltaChoroplethMap = await new ChoroplethConstructor("dialect_delta_percentages.json", {sortAttribute: "No sort"}).init(); // {sortAttribute: "No sort"}
    dialectsDeltaChoroplethMap.numDataArrays = dialectsDeltaChoroplethMap.dataArray.length;
    let regionData = dialectsDeltaChoroplethMap.getRegionOrder();

    const data = [{
        type: "choroplethmap", // the new type
        geojson: dialectsDeltaChoroplethMap.geoData,
        locations: regionData.map(d => d.region),
        z: regionData.map(d => d.value),
        featureidkey: "properties.reg_name", // ?
        colorscale: colourPalettes.dialectsDeltaChoroplethMap,
        marker: {
            line: {
                width: 0.5, // the border for the map
                color: "#000"
            }
        },
        // ! extra
        zmax: -15,
        hoverinfo: "text",
        hovertext: regionData.map(d =>`<b>${d.region}</b><br>${d.value === -15 ? "Insufficient data" : d.value + "%"}`), // regionData.map(d => ${d.region}<br>${d.value}%),
        hoverlabel: hoverLabelConfig,
        colorbar: {
            title: {
                text: `Delta change (%)`,
                side: "right",
                font: { size: 12 },
            },
            thickness: 14,
            len: 1.045,
            tickfont: { size: 10 },
        }
    }]

    const layout = {
        title: {
            text: `<b>${dialectsDeltaChoroplethMap.metadata.title}</b>`,
            font: titleFont
        },
        map: {
            style: "carto-positron",
            center: { lat: 42.0, lon: 12.3 },
            zoom: 4.25
        },
        font: globalFont,
    }

    Plotly.newPlot("dialectsDeltaChoroplethMap", data, layout, { responsive: true }); // no label removal just in case
}

async function createDialectScatterPlot() {
    const data = [{
        x: [1, 2, 3, 4, 5],
        y: [1, 6, 3, 6, 1],
        mode: 'markers',
        type: 'scatter',
        name: 'Team A',
        text: ['A-1', 'A-2', 'A-3', 'A-4', 'A-5'],
        marker: { size: 12 }
    },
    {
        x: [1.5, 2.5, 3.5, 4.5, 5.5],
        y: [4, 1, 7, 1, 4],
        mode: 'markers',
        type: 'scatter',
        name: 'Team B',
        text: ['B-a', 'B-b', 'B-c', 'B-d', 'B-e'],
        marker: { size: 12 }
    }];

    const layout = {
        title: {
            text: `<b>(Relationship between generations and dialect words spoken (% of all words))</b>`,
            font: titleFont
        },
        xaxis: {
            title: {
                text: "Generation",
                range: [0.75, 5.25], // ! temporary
                font: axisFont
            },
        },
        yaxis: {
            title: {
                text: "Y (%)",
                range: [0, 8], // ! temporary
                font: axisFont
            },
        },
        legend: {
            title: {
                text: `<b>X</b>`,
                font: axisFont
            }
        },
        font: globalFont,

        updatemenus: [
            {
                buttons: [
                    {
                        method: 'restyle',
                        args: ['marker.color', 'red'],
                        label: 'Red markers'
                    },
                    {
                        method: 'restyle',
                        args: ['marker.color', 'blue'],
                        label: 'Blue markers'
                    },
                    {
                        method: 'restyle',
                        args: ['marker.color', 'green'],
                        label: 'Green markers'
                    }
                ],
                direction: 'down',
                showactive: true,
            },
        ]
    };

    Plotly.newPlot("dialectScatterPlot", data, layout, globalConfig);
}

function switchSortAttribute() {
    currentSortAttribute = (currentSortAttribute === "Average") ? "Average delta" : "Average";
    createLemmaHeatmap(currentSortAttribute);
}

document.addEventListener("DOMContentLoaded", () => {
    // ?? Question 1
    createSentimentBarChart();
    createProsodicLineChart();

    // ?? Question 2
    createLemmaHeatmap(currentSortAttribute);
    createThemesRadarChart(); // ! incomplete

    // ?? Question 3
    createDialectsDeltaChoroplethMap(); // ! incomplete
    createDialectScatterPlot(); // ! incomplete

    document.querySelectorAll(".styled-button").forEach(button => {
        button.addEventListener("click", switchSortAttribute);
    });

    // ! change the ID depending on the graph
    // ! maybe do a query selector if there are multiple changing buttons
});