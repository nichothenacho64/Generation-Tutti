import ChartConstructor from "../chart_constructor.js";
import {axisFont, chartFont, globalConfig} from "../graph_configurations.js";

async function createSentimentBarChart() {
    let sentimentBarChart = await new ChartConstructor("sentiment_percentages.json").init();
    sentimentBarChart.numDataArrays = sentimentBarChart.dataArray.length;
    // const frequencies = sentimentBarChart.getDataArrayValues();
    // console.log(sentimentBarChart.getDataArrayKeys());
    console.log(sentimentBarChart.dataArray)
    // console.log(frequencies);
}

document.addEventListener("DOMContentLoaded", function () {
    const generations = ["Baby Boomers", "Generation X", "Generation Y", "Generation Z"];

    const data = {
        Negative: [46.3, 50, 10.5, 10.4], // 2nd set correct
        Positive: [10.4, 12.8, 28.2, 28.1],
        Neutral: [28.6, 26.9, 47.5, 47.5],
        Compound: [14.8, 10.4, 13.8, 14.1]
    };

    const colors = {
        Negative: "#dd3333",
        Positive: "rgb(95, 147, 69)",
        Neutral: "#dddddd",
        Compound: "#7c7c7cff"
    };

    const traces = Object.keys(data).map(sentiment => ({
        x: generations,
        y: data[sentiment],
        name: sentiment,
        type: "bar",
        marker: { color: colors[sentiment] },
        textposition: "inside",               // <--- center text vertically
        insidetextanchor: "middle",
        text: data[sentiment].map(v => `${v.toFixed(1)}%`),
        textposition: "auto"
    }));

    const layout = {
        barmode: "stack",
        title: {
            text: "<b>Sentiment percentages per generation (excluding neutral=1.0)</b>",
            font: axisFont
        },
        yaxis: {
            title: "Proportion of sentiments (%)",
            range: [0, 100]
        },
        legend: {
            title: { text: "Sentiments" }
        },
        font: chartFont
    };

    Plotly.newPlot("sentimentChart", traces, layout, { responsive: true });
});

async function createLemmaHeatmap() {
    let lemmaHeatmap = await new ChartConstructor("top_lemmas.json").init();
    lemmaHeatmap.orderData();
    lemmaHeatmap.numDataArrays = 10; // change later.?
    const frequencies = lemmaHeatmap.getDataArrayValues();

    const data = [{
        x: lemmaHeatmap.generations,
        y: lemmaHeatmap.getDataArrayKeys(),
        z: frequencies,
        type: "heatmap", // the actual graph type

        colorscale: [
            ["0.0", "#EEEEEE"],
            ["0.5", "#dd3333"],
            ["1.0", "#8d1818"]
        ],
        xgap: 1.25,
        ygap: 1.25,
        text: frequencies,
        texttemplate: "%{text}",
        hoverongaps: false, // just because...
        colorbar: {
            title: {
                text: `Frequency (per 1000 words)`,
                side: "right",
                font: {
                    size: 12
                },
            },
            thickness: 14, // the thickness of the title thing
            len: 1, // length as a scale of the total
            xanchor: "left",
            tickfont: {
                size: 10 // for the colorbar
            }
        }
    }];

    const layout = {
        title: {
            text: `<b>Occurrences of top ${lemmaHeatmap.metadata["top_n_lemmas"]} lemmas in each generation (per ${lemmaHeatmap.metadata["per_n_words"]} words)</b>`,
            font: axisFont
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
        font: chartFont,
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