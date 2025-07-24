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
    darkRed: "#8d1818",
    lightRed: "#f85b52",
    labelColour: "#333333",
};

export const colourPalettes = {
    eightColourPalette: [themeColours.primaryRed, "#9b2424", "#ffcece", "#ff9d9d", "#333333", "#777777", "#BBBBBB"],
    sentimentColours: {
        negative: themeColours.mostNegativeColour,
        positive: themeColours.mostPositiveColour,
        neutral: themeColours.primaryRed,
        compound: themeColours.darkRed
    }
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