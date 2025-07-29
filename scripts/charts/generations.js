import { globalConfig, generations } from "../graph_configurations.js";

document.addEventListener("DOMContentLoaded", function () {
    generations.forEach(gen => {
        gen.birthStart = 2025 - gen.ageEnd;
        gen.birthEnd = 2025 - gen.ageStart;
    });

    const shapes = generations.map((generation, index) => ({
        type: "rect",
        x0: generation.birthStart,
        x1: generation.birthEnd,
        y0: index - 0.3,
        y1: index + 0.3,
        fillcolor: generation.shapeColour,
        line: { width: 0 }
    }));

    const annotations = [];

    generations.forEach((generation, index) => {
        annotations.push({
            x: (generation.birthStart + generation.birthEnd) / 2,
            y: index,
            text: `Born ${generation.birthStart}-${generation.birthEnd}`,
            showarrow: false,
            font: { color: generation.textColour, size: 10 },
            xanchor: "center"
        });

        annotations.push({
            x: 2011,
            y: index,
            text: `<b>${generation.name}</b><br>Ages ${generation.ageStart} - ${generation.ageEnd}`,
            showarrow: false,
            xanchor: "left",
            align: "left",
            font: { color: "black", size: 13 }
        });
    });

    const verticalGridShapes = [];
    for (let year = 1940; year <= 2020; year += 2) { // every 2 years
        verticalGridShapes.push({
            type: "line",
            x0: year,
            x1: year,
            y0: -1,
            y1: generations.length,
            line: {
                color: "rgba(0,0,0,0.15)",
                width: year % 10 === 0 ? 2 : 1,
                dash: "solid"
            }
        });
    }

    const trace = {
        x: [],
        y: [],
        mode: "markers",
        type: "scatter"
    };

    const layout = {
        title: {
            text: "<b>Defining each age generation</b>",
            x: 10,               // Center it horizontally
            xanchor: 'center',    // Anchor from the middle
        },
        shapes: verticalGridShapes.concat(shapes),
        annotations: annotations,
        xaxis: {
            title: "Year of Birth",
            range: [1935, 2011],
            tick0: 1940,
            dtick: 10,
            zeroline: false,
            showline: false,
            showgrid: false
        },
        yaxis: {
            showticklabels: false, // y-axis
            range: [-1, generations.length],
            fixedrange: true,
            zeroline: false,
            showline: false,
            showgrid: false
        },
        margin: { t: 60, l: 0 }, // top and right margin
        font: {
            family: 'Lato, sans-serif'
        },
        showlegend: false
    };

    Plotly.newPlot("generationsGraph", [trace], layout, globalConfig);
});