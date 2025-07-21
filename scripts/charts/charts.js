import ChartConstructor from "../chart_constructor.js";
import { titleFont, axisFont, globalFont, themeColours, globalConfig, hoverLabelConfig } from "../graph_configurations.js";


async function createSentimentBarChart() {
    let sentimentBarChart = await new ChartConstructor("sentiment_percentages.json").init();
    sentimentBarChart.numDataArrays = sentimentBarChart.dataArray.length; // sentimentBarChart.dataArray.length

    const colors = {
        negative: themeColours.mostNegativeColour,
        positive: themeColours.mostPositiveColour,
        neutral: themeColours.primaryRed,
        compound: themeColours.darkRed
    };


    const data = Object.keys(sentimentBarChart.dataArray).map(sentiment => ({
        x: sentimentBarChart.generations,
        y: sentimentBarChart.dataArray[sentiment],
        name: sentiment.toLowerCase().split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
        type: "bar",
        marker: { color: colors[sentiment] },
        textposition: "inside",   
        insidetextanchor: "middle",
        text: sentimentBarChart.dataArray[sentiment].map(value => `${value}%`),
        textposition: "auto",
        hoverlabel: hoverLabelConfig,
        hovertemplate: `Generation: %{x}<br>Sentiment: ${sentiment.toLowerCase().split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}<br>Value: %{text}<extra></extra>`, // all on one line with <br>
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

    Plotly.newPlot("sentimentChart", data, layout, globalConfig);
}

async function createLemmaHeatmap() {
    let lemmaHeatmap = await new ChartConstructor("top_lemmas.json").init();
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
            hovertemplate: `Generation: %{x}<br>Lemma: %{y}<br>Value: %{z}<extra></extra>`, // all on one line with <br>
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
                tickfont: { size: 10 }
            }
        },
        {
            x: lemmaHeatmap.generations,
            y: lemmas,
            z: paddedDeltaFrequencies,
            type: "heatmap",
            colorscale: [
                ["0.0", themeColours.mostNegativeColour],
                ["1.0", themeColours.mostPositiveColour]
            ],
            xgap: 1.25,
            ygap: 1.25,
            text: paddedDeltaFrequencies,
            texttemplate: "%{text}",
            hoverlabel: hoverLabelConfig,
            hovertemplate: 
                `Lemma: %{y}<br>Average delta value: %{z}<extra></extra>`,
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
        },
        font: globalFont,
        margin: { b: 100 }
    };

    Plotly.newPlot("heatmap", data, layout, globalConfig);
}

document.addEventListener("DOMContentLoaded", function () {
    createSentimentBarChart();
    createLemmaHeatmap();
});


/*

draft insights:
* tipo, cioè - increase, filler words
* okay - increase, incorporation of foreign words
* mamma, nonno - decrease, parent words
*/