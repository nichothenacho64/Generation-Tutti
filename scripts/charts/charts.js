document.addEventListener("DOMContentLoaded", function () {
    var data = [
    {
        x: [1, 2, 3, 4, 5],
        y: [10, 15, 13, 17, 21],
        type: 'scatter',
        mode: 'lines+markers',
        marker: { color: 'blue' }
    }
    ];

    var layout = {
        title: 'Simple Line Chart',
        xaxis: { title: 'X Axis' },
        yaxis: { title: 'Y Axis' }
    };

    Plotly.newPlot('myChart', data, layout);
});

document.addEventListener("DOMContentLoaded", function () {
  // Sample data (realistic but simplified)
  const years = [
    1960, 1965, 1970, 1975, 1980, 1985, 1990,
    1995, 2000, 2005, 2010, 2015, 2020
  ];

  const co2Emissions = [9.4, 11.2, 14.3, 17.6, 20.2, 21.8, 22.4, 23.9, 24.7, 28.5, 32.1, 35.6, 36.4]; // Gigatons

  const tempAnomalies = [-0.02, 0.01, 0.03, 0.09, 0.15, 0.12, 0.32, 0.38, 0.42, 0.55, 0.64, 0.87, 1.02]; // °C deviation

  const co2Trace = {
    x: years,
    y: co2Emissions,
    name: 'CO₂ Emissions (Gt)',
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: 'green', width: 3 },
    yaxis: 'y1'
  };

  const tempTrace = {
    x: years,
    y: tempAnomalies,
    name: 'Temperature Anomaly (°C)',
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: 'red', dash: 'dash', width: 3 },
    yaxis: 'y2'
  };

  const layout = {
    title: 'CO₂ Emissions vs Global Temperature Anomaly (1960–2020)',
    xaxis: {
      title: 'Year',
      tickformat: 'd'
    },
    yaxis: {
      title: 'CO₂ Emissions (Gigatons)',
      side: 'left',
      showgrid: false
    },
    yaxis2: {
      title: 'Temperature Anomaly (°C)',
      overlaying: 'y',
      side: 'right',
      showgrid: false
    },
    legend: {
    x: 0.5,
    y: -0.2,
    xanchor: 'center',
    orientation: 'h'
    },
    hovermode: 'x unified',
    margin: { t: 50, l: 50, r: 50, b: 50 }
  };

  Plotly.newPlot('climateChart', [co2Trace, tempTrace], layout, { responsive: true });
});
