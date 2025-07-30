import { ChartConstructor, ChoroplethConstructor } from "../chart_constructor.js";
import {
    titleFont, axisFont, globalFont,
    themeColours, colourPalettes,
    dialectScatterPlotConfig,
    globalConfig, hiddenConfig,
    hoverLabelConfig,
    generations
} from "../graph_configurations.js";

let currentSortAttribute = "Average";
let currentDisplayAttribute = "macro_region"; // macro_region, generation, educational_background

async function createSentimentBarChart() {
    let sentimentBarChart = await new ChartConstructor("sentiment_percentages.json").init();

    const data = sentimentBarChart.getDataArrayKeys().map(sentiment => ({
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

    Plotly.newPlot("sentimentBarChart", data, layout, hiddenConfig);
}

async function createLemmaHeatmap(sortAttribute) {
    let lemmaHeatmap = await new ChartConstructor("top_lemmas.json", { sortAttribute: sortAttribute }).init();
    lemmaHeatmap.orderData();
    lemmaHeatmap.numDataArrays = lemmaHeatmap.metadata["top_n_lemmas"];

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
            hovertemplate: `Lemma: %{y}<br>Value: %{z}<extra></extra>`,
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

    const data = prosodicLineChart.getDataArrayKeys().map((prosodicFeature, colourNumber) => ({
        x: prosodicLineChart.xValues,
        y: prosodicLineChart.dataArray[prosodicFeature],
        name: prosodicFeature, // this is where the name comes in
        type: 'scatter',
        marker: { color: colourPalettes.eightColourPalette[colourNumber % colourPalettes.eightColourPalette.length] },
        hoverlabel: hoverLabelConfig,
        hovertemplate: `<b>%{x}</b><br>Frequency of prosodic feature: %{y}%<extra></extra>`, // all on one line with <br>
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
                text: `<b>Prosodic phrase feature</b>`,
                font: axisFont
            }
        },
        font: globalFont
    }

    Plotly.newPlot("prosodicLineChart", data, layout, hiddenConfig);
}

async function createThemesRadarChart() {
    let themesRadarChart = await new ChartConstructor("themes_by_generation.json", { sortAttribute: "No transformation" }).init(); // ! change JSON file

    const data = themesRadarChart.xValues.map((generation, index) => {
        const generationData = themesRadarChart.data[generation];

        const excludedMatches = ["Awkward Silence", "Comfortable Silence", "Non-Convergent Discourse", "Intervention"]; // not enough data...
        const thetaValues = Object.keys(generationData).filter(theme => !excludedMatches.includes(theme)).toSorted();

        const themeOccurences = Object.values(generationData);

        const radiusValues = themeOccurences.map(theme => theme.match);
        // const filteredLemmas = themeOccurences.map(theme => theme.filtered_lemmas.slice(0, 4));
        
            console.log(radiusValues);

        return {
            type: 'scatterpolar',
            theta: [...thetaValues, thetaValues[0]], // or use specific labels if available
            r: [...radiusValues, radiusValues[0]],
            fill: 'toself',
            name: generation,
            marker: { color: generations[generations.length - index - 1].shapeColour },
            hoverlabel: hoverLabelConfig,
            hovertemplate: `<b>${generation}</b><br>Theme: %{theta}<br>Occurence of theme: %{r}%<br><extra></extra>` // Top lemmas: ${filteredLemmas}
        };
    });

    const layout = {
        title: {
            text: `<b>Occurence percentages of themes in conversation chunks by generation</b>`,
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
                range: [0, 100], // ! must keep this
                tickangle: 22.5
            },
            // gridshape: 'linear' // comment this to make it circular (default)
        }
    }

    Plotly.newPlot("themesRadarChart", data, layout, globalConfig);
}

async function createDialectDeltaChoroplethMap() {
    let dialectsDeltaChoroplethMap = await new ChoroplethConstructor("dialect_delta_percentages.json", { sortAttribute: "No sort" }).init(); // {sortAttribute: "No sort"}
    let regionData = dialectsDeltaChoroplethMap.getRegionOrder();
    const filteredRegionData = regionData.filter(d => d.value !== -15);
    const noDataRegions = regionData.filter(d => d.value === -15).map(d => d.region);

    const data = [{
        type: "choroplethmap",
        geojson: dialectsDeltaChoroplethMap.geoData,
        locations: noDataRegions,
        z: noDataRegions.map(() => 0), // dummy values, won’t be shown
        featureidkey: "properties.reg_name",
        showscale: false,
        marker: {
            line: {
                width: 0.5,
                color: "#CCC"
            }
        },
        colorscale: [[0, "#f6f6f6"], [1, "#f6f6f6"]],
        hoverinfo: "text",
        hovertext: noDataRegions.map(r => `<b>Region: ${r}</b><br>Insufficient data`),
        hoverlabel: hoverLabelConfig
    },
    {
        type: "choroplethmap", // the new type
        geojson: dialectsDeltaChoroplethMap.geoData,
        locations: filteredRegionData.map(d => d.region),
        z: filteredRegionData.map(d => d.value),
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
        hovertext: filteredRegionData.map(d => `<b>Region: ${d.region}</b><br>Generational change in dialect spoken: ${d.value}%`),
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
    }
    ]

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
    Plotly.newPlot("dialectsDeltaChoroplethMap", data, layout, globalConfig)
}

async function createDialectScatterPlot(displayAttribute) {
    let dialectScatterPlot = await new ChartConstructor("dialect_comparisons.json", { sortAttribute: "No sort" }).init();
    let traces = {};

    dialectScatterPlot.getDataArrayKeys().forEach(conversationName => {
        const conversation = dialectScatterPlot.dataArray[conversationName];
        const [numParticipants, yValue, xValue, sortValues] = conversation;
        const sortValue = sortValues[displayAttribute]; // adjust this key if needed
        const sortValueData = dialectScatterPlotConfig[displayAttribute][sortValue]
        const hovertext = `Average participant age: ${xValue}<br>Dialect words used: ${yValue}%<br>Number of participants: ${numParticipants}`;

        if (yValue >= dialectScatterPlotConfig.rules.minY) {
            if (!traces[sortValue]) {
                traces[sortValue] = {
                    x: [],
                    y: [],
                    text: [],
                    hovertext: [],
                    size: [],
                    color: sortValueData.colour || "gray",
                    name: sortValueData.formatted || sortValue
                };
            }

            traces[sortValue].x.push(xValue);
            traces[sortValue].y.push(yValue);
            traces[sortValue].text.push(conversationName);
            traces[sortValue].hovertext.push(hovertext);
            traces[sortValue].size.push(numParticipants * dialectScatterPlotConfig.sizing.bubbleMultiplier);
        }
    });

    const data = dialectScatterPlotConfig[displayAttribute].order
        .filter(key => traces[key])
        .map(key => {
            const trace = traces[key];  // your original object
            return {
                name: trace.name,
                x: trace.x,
                y: trace.y,
                text: trace.text,
                hovertext: trace.hovertext,
                marker: {
                    size: trace.size,
                    color: trace.color
                },
                mode: "markers",
                type: "scatter",
                hoverinfo: "text",
                hoverlabel: hoverLabelConfig
            };
        });

    const layout = {
        title: {
            text: `<b>${dialectScatterPlot.metadata.title}</b>`,
            font: titleFont
        },
        xaxis: {
            title: {
                text: "Average participant age",
                font: axisFont
            },
            range: [82, 18] // ! temporary, MOVE TO CONSTANTS
        },
        yaxis: {
            title: {
                text: "Dialect words used in conversation (%)",
                font: axisFont
            },
            range: [0, 15], // ! temporary, KPN019 is an outlier
        },
        legend: {
            title: {
                text: `<b>${dialectScatterPlotConfig[displayAttribute].formatted}</b>`,
                font: axisFont
            },
            // showlegend: true,
        },
        font: globalFont,
        shapes: createGenerationGridLines(),
    };

    Plotly.newPlot("dialectScatterPlot", data, layout, globalConfig.responsive);
}

function createGenerationGridLines() {
    let generationGridLines = [];

    for (let i = 0; i < generations.length; i++) {
        const current = generations[i];
        const next = generations[i + 1];

        generationGridLines.push({
            type: "rect",
            xref: "x",
            yref: "paper", // spans full y-axis
            x0: current.ageStart,
            x1: next ? next.ageStart : 16, // if it's the last generation
            y0: 0,
            y1: 1,
            // fillcolor: i % 2 === 0 ? "rgba(0, 0, 0, 0.03)" : "rgba(0, 0, 0, 0)", // striped effect
            line: { width: 0 }
        });

        generationGridLines.push({
            type: "line",
            x0: current.ageStart,
            x1: current.ageStart,
            y0: -1,
            y1: 100,
            line: {
                color: themeColours.additionalLine,
                width: 1,
                dash: "solid"
            }
        });
    }

    return generationGridLines
}

function switchSortAttribute() {
    currentSortAttribute = (currentSortAttribute === "Average") ? "Average delta" : "Average";
    createLemmaHeatmap(currentSortAttribute);
}

document.addEventListener("DOMContentLoaded", () => {
    createSentimentBarChart();
    createProsodicLineChart();

    createLemmaHeatmap(currentSortAttribute);
    createThemesRadarChart(); // ! incomplete

    createDialectDeltaChoroplethMap(); // ! incomplete
    createDialectScatterPlot(currentDisplayAttribute); // ! incomplete

    document.querySelectorAll(".styled-button").forEach(button => {
        button.addEventListener("click", switchSortAttribute);
    });

    document.querySelectorAll(".sort-category").forEach(button => {
        button.addEventListener("click", () => {
            currentDisplayAttribute = button.id;
            createDialectScatterPlot(currentDisplayAttribute);
        })
    });
})