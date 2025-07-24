export const titleFont = {
    color: 'black',
    size: 16
};

export const axisFont = {
    color: 'black',
    size: 14
};

export const globalFont = {
    family: "Lato, sans-serif"
};

export const hoverLabels = {
    font: globalFont
}

export const themeColours = {
    brightestGrey: "#EEEEEE",
    mostPositiveColour: "#DDDDDD",
    mostNegativeColour: "#222222",
    primaryRed: "#dd3333",
    lightRed: "#f85b52",
    darkRed: "#8d1818",
    lightRose: "#ffcece",
    darkRose:  "#ff9d9d",
    labelColour: "#333333",
};

export const colourPalettes = {
    eightColourPalette: [themeColours.primaryRed, "#9b2424", 
        themeColours.lightRose, themeColours.darkRose, 
        themeColours.labelColour, "#777777", "#BBBBBB"],
    sentimentColours: {
        negative: themeColours.mostNegativeColour,
        positive: themeColours.mostPositiveColour,
        neutral: themeColours.primaryRed,
        compound: themeColours.darkRed
    },
    lemmaHeatmap: {
        valueColours: [
            ["0.0", themeColours.brightestGrey],
            ["0.5", themeColours.primaryRed],
            ["1.0", themeColours.darkRed]
        ],
        averageColours: [
            ["0.0", themeColours.mostPositiveColour],
            ["1.0", themeColours.mostNegativeColour]
        ],
    },
    dialectsDeltaChoroplethMap: [
        ["0.0", themeColours.brightestGrey],
        ["0.5", themeColours.primaryRed],
        ["1.0", themeColours.darkRed]
    ]
};



export const hoverLabelConfig = {
    font: {
        size: 12,
        family: globalFont.family,
    },
    bgcolor: themeColours.labelColour
};

export const globalConfig = {
    responsive: true, 
    displayModeBar: false
};

// ! create a radar chart properties object!!!!