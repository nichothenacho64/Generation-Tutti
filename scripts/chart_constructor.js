export class ChartConstructor {
	constructor(fileName, sortOptions) {
        /**
         * @param {Object} sortOptions
         * @param {string} fileLocation
         */

		this.fileLocation = "data/" + fileName;
		this._metadata = null;
		this.data = null;
		this._xValues = ['Baby Boomers', 'Generation X', 'Generation Y', 'Generation Z'];
		this.ready = this.loadData();
        this._numDataArrays = 0;
        this._dataArray = null;

        if (!sortOptions) {
            this.sortAttribute = null;
        } else {
            this.sortAttribute = sortOptions.sortAttribute;
        }
	}

    async init() {
		await this.ready;
		return this;
	}

	async loadData() {
		const response = await fetch(this.fileLocation); // const jsonString = await readFile(this.fileLocation, 'utf-8'); /* plain JS */
		const jsonData = await response.json(); // const jsonData = JSON.parse(jsonString); /* plain JS */
		this._metadata = jsonData.metadata;
		this.data = jsonData.data;

        if (this.sortAttribute !== "No sort") {
            this.transformDataFormat();
        }

        if (this.sortAttribute === "Average") {
            this.addAverages();
        } else if (this.sortAttribute === "Average delta") {
            this.addAverageDeltas();
        }

        this.createDataArray();
	}

	transformDataFormat() {
		const generations = Object.keys(this.data);
		const allLabels = new Set();

		for (const generation of generations) {
			const scores = this.data[generation];
			for (const label in scores) {
				allLabels.add(label);
			}
		}

		let modifiedValues = {};

        for (const label of allLabels) {
            modifiedValues[label] = {};
            for (const generation of generations) {
                modifiedValues[label][generation] = 0;
            }
        }

        for (const generation of generations) {
            const scores = this.data[generation];
            for (const [label, value] of Object.entries(scores)) {
                modifiedValues[label][generation] = value;
            }
        }

		this.data = modifiedValues;
	}

	addAverages() {
		for (const key in this.data) {
			const scores = Object.values(this.data[key]);
			const total = scores.reduce((sum, value) => sum + value, 0);
			const average = total / scores.length;
			this.data[key]['average'] = average; // invisible...
            this.data[key]['Average'] = average; // better
		}
        this.xValues.push("Average");
	}

    addAverageDeltas() {
        for (const key in this.data) {
            const values = Object.values(this.data[key]);
            const deltas = [];

            for (let i = 1; i < values.length; i++) {
                const delta = values[i] - values[i - 1];
                // const delta = Math.abs(values[i] - values[i - 1]);
                deltas.push(delta);
            }

            const totalDelta = deltas.reduce((sum, d) => sum + d, 0);
            const averageDelta = deltas.length > 0 ? totalDelta / deltas.length : 0;

            this.data[key]['averageDelta'] = averageDelta;
            this.data[key]['absAverageData'] = Math.abs(averageDelta); // for sorting only
        }

        this.xValues.push("Average delta"); 
    }


    createDataArray() {
        let dataArray = {};

        for (const label in this.data) {
            const values = Object.values(this.data[label]);
            if (Array.isArray(values)) {
                dataArray[label] = values; 
            } else {
                dataArray[label] = new Array(values); 
            }
        }
        this._dataArray = dataArray;
    }

    createRadarChartDataArray() {
        
    }

    orderData() {
        const entries = Object.entries(this.dataArray);

        entries.sort((a, b) => {
            const averageA = a[1].at(-1); 
            const averageB = b[1].at(-1);
            return averageB - averageA; 
        });

        let sortedData = {};

        for (const [key, value] of entries) {
            sortedData[key] = value;
        }

        this._dataArray = sortedData;
    }

    getDataArrayKeys() {
        if (this._numDataArrays !== 0) {
            return Object.keys(this.dataArray).slice(0, this._numDataArrays);
        } 
        return Object.keys(this.dataArray);
    }

    getDataArrayValues() {
        let dataArrayValues = Object.values(this.dataArray).slice(0, this._numDataArrays);
        return dataArrayValues.map(values => values.map(num => Math.round(num * 10) / 10));
    }

    get dataArray() {
        return this._dataArray;
    }

    get metadata() {
        return this._metadata;
    }

    get xValues() {
        return this._xValues;
    }

    set numDataArrays(/** @type {number | undefined} */ numDataArrays) {
        this._numDataArrays = numDataArrays;
    }
}

export class ChoroplethConstructor extends ChartConstructor {
    constructor(fileName, sortOptions) {
        super(fileName, sortOptions);
        this._geoData = null;
        this.regionOrder = [
            "Lombardia", "Veneto", "Piemonte", "Emilia-Romagna", "Lazio", "Campania", "Puglia",
            "Sicilia", "Sardegna", "Toscana", "Calabria", "Abruzzo", "Marche", "Umbria",
            "Liguria", "Friuli-Venezia Giulia", "Trentino-Alto Adige/Südtirol", "Molise",
            "Basilicata", "Valle d'Aosta/Vallée d'Aoste"
        ];
    }

    async loadGeoData() {
        const response = await fetch("https://raw.githubusercontent.com/openpolis/geojson-italy/master/geojson/limits_IT_regions.geojson");
        this._geoData = await response.json();
    }

    async init() {
        await super.init(); // wait for the parent class to finish
        await this.loadGeoData(); // get the geodata instead...
        return this;
    }

    getRegionOrder() {
        const regionData = this.regionOrder.map(region => ({
            region,
            value: this.data[region]?.[0] ?? -15 // Use value if exists, else 0
        }));

        return regionData
    }

    get geoData() {
        return this._geoData;
    }
}
