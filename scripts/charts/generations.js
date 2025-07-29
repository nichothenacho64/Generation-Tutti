import { globalConfig, generations } from "../graph_configurations.js";

document.addEventListener("DOMContentLoaded", function () {
    generations.forEach(gen => {
        gen.birthStart = 2025 - gen.ageEnd;
        gen.birthEnd = 2025 - gen.ageStart;
    });

    const shapes = generations.map((gen, i) => ({
        type: "rect",
        x0: gen.birthStart,
        x1: gen.birthEnd,
        y0: i - 0.3,
        y1: i + 0.3,
        fillcolor: `#${gen.shapeColour}`,
        line: { width: 0 }
    }));

    const annotations = [];

    generations.forEach((gen, i) => {
        annotations.push({
            x: (gen.birthStart + gen.birthEnd) / 2,
            y: i,
            text: `Born ${gen.birthStart}-${gen.birthEnd}`,
            showarrow: false,
            font: { color: "white", size: 10 },
            xanchor: "center"
        });

        annotations.push({
            x: 2011,
            y: i,
            text: `<b>${gen.name}</b><br>Ages ${gen.ageStart} - ${gen.ageEnd}`,
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