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
    darkGrey: "#444444",
    primaryRed: "#dd3333",
    lightRed: "#f85b52",
    darkRed: "#8d1818",
    lightRose: "#ffd8d8ff", // ffcece
    mediumRose: "#ff9d9d",
    darkRose: "#ff6c6c",
    labelColour: "#333333",
    additionalLine: "rgba(0, 0, 0, 0.15)"
};

export const colourPalettes = {
    eightColourPalette: [themeColours.primaryRed, "#9b2424",
    themeColours.lightRose, themeColours.mediumRose,
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
        ["0.0", themeColours.darkGrey],
        ["0.9", themeColours.brightestGrey],
        ["1.0", themeColours.primaryRed]
    ]
};

export const generations = [
    { name: "Baby Boomers", ageStart: 66, ageEnd: 83, shapeColour: themeColours.lightRose, textColour: "black" },
    { name: "Generation X", ageStart: 51, ageEnd: 65, shapeColour: themeColours.darkRose, textColour: "white" },
    { name: "Generation Y", ageStart: 26, ageEnd: 50, shapeColour: themeColours.primaryRed, textColour: "white" },
    { name: "Generation Z", ageStart: 16, ageEnd: 25, shapeColour: themeColours.darkRed, textColour: "white" },
];

export const hoverLabelConfig = {
    font: {
        size: 12,
        family: globalFont.family,
    },
    bgcolor: themeColours.labelColour
};

export const dialectScatterPlotConfig = {
    sortCategories: ["generation", "macro_region", "educational_background"],
    sizing: {
        bubbleMultiplier: 6
    },
    rules: {
        minY: 0.5
    },
    generation: {
        formatted: "Generation",
        order: ["Baby Boomers", "Generation X", "Generation Y", "Generation Z"],
        "Baby Boomers": {
            colour: themeColours.lightRose,
        },
        "Generation X": {
            colour: themeColours.darkRose,
        },
        "Generation Y": {
            colour: themeColours.primaryRed,
        },
        "Generation Z": {
            colour: themeColours.darkRed,
        }
    },
    macro_region: {
        formatted: "Macro region",
        order: ["north", "centre", "south"],
        north: {
            colour: themeColours.lightRose,
            formatted: "North"
        },
        centre: {
            colour: themeColours.primaryRed,
            formatted: "Centre"
        },
        south: {
            colour: themeColours.darkRed,
            formatted: "South"
        },
    },
    educational_background: {
        formatted: "Educational background",
        order: ["laurea", "laurea in corso", "dip_lic", "dip_tec_prof", "med", "elem"],
        "laurea": {
            formatted: "Laurea",
            colour: themeColours.lightRose
        },
        "laurea in corso": {
            formatted: "Laurea (in corso)",
            colour: themeColours.mediumRose
        },
        "dip_lic": {
            formatted: "Diploma di Liceo",
            colour: themeColours.primaryRed
        },
        "dip_tec_prof": {
            formatted: "Tecnico/Professionale",
            colour: themeColours.darkRed
        },
        "med": {
            formatted: "Scuola Media",
            colour: themeColours.mostPositiveColour
        },
        "elem": {
            formatted: "Scuola Elementare",
            colour: themeColours.darkGrey
        }
    }
};

export const globalConfig = {
    responsive: true,
    displayModeBar: 'hover',        
    displaylogo: false,           
    modeBarButtonsToRemove: [
        'select2d', 'lasso2d',
        'zoomIn2d', 'zoomOut2d',
        'autoScale2d',
        'hoverCompareCartesian', 'hoverClosestCartesian',
        'toggleSpikelines'
    ],
    toImageButtonOptions: { format: 'png', filename: 'my_chart' }
};

export const hiddenConfig = {
    responsive: true,
    displayModeBar: false, 
}

// ! create a radar chart properties object!!!!

/*

Generation X {
    theme1: {
        chunk_percentage: 90%
        all_lemmas: []
        filtered_lemmas: [] // choose 3-5, also judge based top lemmas in the heatmap
    }
}

 */