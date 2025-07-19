// scripts/charts/charts.js
import ChartConstructor from '../chart_constructor.js';

const globalConfig = {
    responsive: true, // ! move this outside???
    displayModeBar: false
}

// ! don't forget to make average sortt optional



document.addEventListener("DOMContentLoaded", function () {
    const generations = ['Baby Boomers', 'Generation X', 'Generation Y', 'Generation Z'];

    const data = {
        Negative: [45.5, 50.3, 10.3, 10.3],
        Positive: [10.2, 12.6, 28.2, 28.0],
        Neutral: [29.2, 26.6, 47.6, 47.6],
        Compound: [15.0, 10.4, 14.0, 14.2]
    };

    const colors = {
        Negative: '#dd3333',
        Positive: 'rgb(95, 147, 69)',
        Neutral: '#dddddd',
        Compound: '#7c7c7cff'
    };

    const traces = Object.keys(data).map(sentiment => ({
      x: generations,
      y: data[sentiment],
      name: sentiment,
      type: 'bar',
      marker: { color: colors[sentiment] },
      textposition: 'inside',               // <--- center text vertically
      insidetextanchor: 'middle', 
      text: data[sentiment].map(v => `${v.toFixed(1)}%`),
      textposition: 'auto'
    }));

    const layout = {
      barmode: 'stack',
      title: '<b>Sentiment percentages per generation (excluding neutral=1.0)</b>',
      yaxis: {
        title: 'Proportion of sentiments (%)',
        range: [0, 100]
      },
      legend: {
        title: { text: 'Sentiments' }
      },
      font: {
        family: 'Lato, sans-serif'
      },
    };

    Plotly.newPlot('sentimentChart', traces, layout, {responsive: true});
});

async function createLemmaHeatmap() {
    let lemmaHeatmap = await new ChartConstructor("top_lemmas.json").init();
    lemmaHeatmap.orderData();

    lemmaHeatmap.numDataArrays = 10 // change later...

    const frequencies = lemmaHeatmap.getDataArrayValues();

  // Define the heatmap trace
    const data = [{
      x: lemmaHeatmap.generations,
      y: lemmaHeatmap.getDataArrayKeys(),
      z: frequencies,
      type: 'heatmap',
      // Replicating the purple-to-pink colorscale
    //   colorscale: 'PuRd',
    colorscale: [
        ['0.0', '#EEEEEE'],
        ['0.5', '#dd3333'],
        ['1.0', '#8d1818']
    ],
      // Adding the white lines between cells
      xgap: 1.25,
      ygap: 1.25,
      // Displaying the frequency values on the cells
      text: frequencies,
      texttemplate: "%{text}",
      hoverongaps: false,
      colorbar: {
        title: {
            text: `Frequency (per 1000 words)`,
            side: 'right',
            font: {
            size: 12
            },
        },
        thickness: 14,     // Adjust as needed
        len: 1,            // Full vertical length
        xanchor: 'left',
        tickfont: {
          size: 10
        }
      }
  }];

  // Define the layout for the plot
  const layout = {
    // title: `<b>${lemmaHeatmap.metadata}</b>`,
    title: {
        text: `<b>Occurrences of top ${lemmaHeatmap.metadata["top_n_lemmas"]} lemmas in each generation (per ${lemmaHeatmap.metadata["per_n_words"]} words)</b>`,
        font: {
            color: 'black',
            size: 16
        }
    },
    xaxis: {
        title: 'Generation',
        tickangle: -45, // Angled labels
        scaleanchor: "y", // ← This enforces square cells
        constrain: "domain",
        automargin: true,
    },
    yaxis: {
        title: 'Lemma',
        autorange: 'reversed',
        automargin: true, // Adjust margin to fit long lemma labels
    },
    font: {
        family: 'Lato, sans-serif'
    },
    };

  // Render the plot

  Plotly.newPlot('heatmap', data, layout, globalConfig);
}
document.addEventListener("DOMContentLoaded", function () {
    createLemmaHeatmap();
});
