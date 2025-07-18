

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
      title: '<b>Sentiment percentages per generation (excluding neutral=1.0)<b>',
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

document.addEventListener("DOMContentLoaded", function () {
    // Data from the provided image
  const generations = ['Baby Boomers', 'Generation X', 'Generation Y', 'Generation Z'];
  const lemmas = ['mho', 'sapere', 'cioè', 'andare', 'dovere', 'vedere', 'volere', 'tipo', 'mangiare', 'prendere', 'mettere', 'nonno', 'okay', 'mhmh'];

  // The z-values (frequencies) should correspond to the y (lemmas) and x (generations) axes.
  // The order of rows here matches the order of the lemmas array.
  const frequencies = [
      // BB,   GenX, GenY, GenZ
      [19,    17,   22,   16],  // mho
      [14,    13,   14,   14],  // sapere
      [0,     11,   18,   18],  // cioè
      [13,    12,   11,   9.9], // andare
      [7.6,   9.4,  8.9,  8.6], // dovere
      [8.7,   8.8,  8.3,  8.1], // vedere
      [7.4,   5.8,  8.1,  6.2], // volere
      [0,     0,    11,   12],  // tipo
      [7.1,   6.6,  0,    5.7], // mangiare
      [7,     5.9,  0,    5.8], // prendere
      [7,     5.7,  0,    0],   // mettere
      [8.2,   0,    0,    0],   // nonno
      [0,     0,    7.9,  0],   // okay
      [0,     0,    7.7,  0]    // mhmh
  ];

  // Define the heatmap trace
  const data = [{
      x: generations,
      y: lemmas,
      z: frequencies,
      type: 'heatmap',
      // Replicating the purple-to-pink colorscale
      colorscale: 'PuRd',
      // Adding the white lines between cells
      xgap: 1.5,
      ygap: 1.5,
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
      title: '<b>Occurrences of top 10 lemmas in each generation</b>',
      xaxis: {
          title: 'Generation',
          tickangle: -45, // Angled labels
          scaleanchor: "y", // ← This enforces square cells
          constrain: "domain",
          automargin: true,
      },
      yaxis: {
          title: 'Lemma',
          // Reversing the y-axis to match the 'mho' at the top
          autorange: 'reversed',
          automargin: true, // Adjust margin to fit long lemma labels
      },
      plot_bgcolor: 'rgba(0,0,0,0)', // Transparent background
      paper_bgcolor: 'rgba(0,0,0,0)' // Transparent background
  };

  const config = {
      responsive: true // ! move this outside???
  }

  // Render the plot

  Plotly.newPlot('heatmap', data, layout, config);
});
