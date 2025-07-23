import ChartConstructor from "../chart_constructor.js";
import { titleFont, axisFont, globalFont, 
    themeColours, colourPalettes, 
    globalConfig, hoverLabelConfig 
} from "../graph_configurations.js";

let currentSortAttribute = "Average";

async function createSentimentBarChart() {
    let sentimentBarChart = await new ChartConstructor("sentiment_percentages.json").init();
    sentimentBarChart.numDataArrays = sentimentBarChart.dataArray.length; // sentimentBarChart.dataArray.length

    const data = Object.keys(sentimentBarChart.dataArray).map(sentiment => ({
        x: sentimentBarChart.generations,
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
        return Array(lemmaHeatmap.generations.length - 1).fill("").concat(row);
    });

    const data = [
        {
            x: lemmaHeatmap.generations,
            y: lemmas,
            z: frequencies,
            // zmin: 0,
            // zmax: 22,
            type: "heatmap",
            colorscale: [
                ["0.0", themeColours.brightestGrey],
                ["0.5", themeColours.primaryRed],
                ["1.0", themeColours.darkRed]
            ],
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
                // range: [0, 22],
            }
        },
        {
            x: lemmaHeatmap.generations,
            y: lemmas,
            z: paddedDeltaFrequencies,
            type: "heatmap",
            colorscale: [
                ["0.0", themeColours.mostPositiveColour],
                ["1.0", themeColours.mostNegativeColour]
            ],
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
} // ! add sort attribute later

async function createProsodicLineChart() {
    let prosodicLineChart = await new ChartConstructor("prosodic_features.json").init();
    prosodicLineChart.numDataArrays = prosodicLineChart.dataArray.length;

    const data = Object.keys(prosodicLineChart.dataArray).map((prosodicFeature, colourNumber) => ({
        x: prosodicLineChart.generations,
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
            name: 'Group A'
        },
        {
            type: 'scatterpolar',
            r: [0.45, 0.90, 0.59, 0.71, 0.85, 0.15, 0.75, 0.89, 0.61, 0.45],
            theta: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'A'],
            fill: 'toself',
            name: 'Group B'
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
                text: `<b>Prosodic feature</b>`,
                font: axisFont
            }
        },
        font: globalFont,
        polar: {
            radialaxis: {
                visible: true, // ! important too?
                range: [0, 1], // ! must keep this
            },
            // gridshape: 'linear' // ← This makes it polygonal instead of circular
        }

    }

    Plotly.newPlot("themesRadarChart", data, layout)
}

function switchSortAttribute() {
    currentSortAttribute = (currentSortAttribute === "Average") ? "Average delta" : "Average";
    createLemmaHeatmap(currentSortAttribute);
}

document.addEventListener("DOMContentLoaded", () => {
    createSentimentBarChart();
    createProsodicLineChart();

    createLemmaHeatmap(currentSortAttribute);
    createThemesRadarChart(); // Q2

    // ! change the ID depending on the graph
    document.getElementById("lemmaHeatmapSort").addEventListener("click", switchSortAttribute);
});

/*

draft insights:
* tipo, cioè - increase, filler words
* okay - increase, incorporation of foreign words
* mamma, nonno - decrease, parent words

! explain the meaning of delta vs average delta

*/