import { readFile } from 'fs/promises';

class ChartConstructor {
	constructor(fileName) {
		this.fileLocation = "data/" + fileName;
		this._metadata = null;
		this.data = null;
		this._generations = ['Baby Boomers', 'Generation X', 'Generation Y', 'Generation Z'];
		this.ready = this.loadData();
        this._numDataArrays = 0;
        this._dataArray = null;
        // this.sortAttribute = null; // null
	}

    async init() {
		await this.ready;
		return this;
	}

	async loadData() {
        const jsonString = await readFile(this.fileLocation, 'utf-8');
		const jsonData = JSON.parse(jsonString);
		this._metadata = jsonData.metadata;
		this.data = jsonData.data;

        this.transformDataFormat();

        if (this._metadata.sort === "Average") {
            this.addAverages();
        } else if (this._metadata.sort === "Average delta") {
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
			this.data[key]['average'] = average;
		}
        this.generations.push("Average");
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

        this.generations.push("Average delta"); 
    }


    createDataArray() {
        let dataArray = {};

        for (const label in this.data) {
            const values = Object.values(this.data[label]);
            dataArray[label] = new Array(values); 
        }
        
        this._dataArray = dataArray;
    }

    orderData() {
        const entries = Object.entries(this.dataArray);

        entries.sort((a, b) => {
            const averageA = a[1][0].at(-1); 
            const averageB = b[1][0].at(-1);
            return averageB - averageA; 
        });

        let sortedData = {};

        for (const [key, value] of entries) {
            sortedData[key] = value;
        }

        this._dataArray = sortedData;
        this.numDataArrays = this.dataArray.length
    }

    getDataArrayKeys() {
        return Object.keys(this.dataArray).slice(0, this._numDataArrays);
    }

    getDataArrayValues() {
        let dataArrayValues = Object.values(this.dataArray).slice(0, this._numDataArrays);
        return dataArrayValues.map(values => values[0].map(num => Math.round(num * 10) / 10));
    }

    get dataArray() {
        return this._dataArray;
    }

    get metadata() {
        return this._metadata;
    }

    get generations() {
        return this._generations;
    }

    set numDataArrays(/** @type {number | undefined} */ numDataArrays) {
        this._numDataArrays = numDataArrays;
    }
}

let sentimentBarChart = await new ChartConstructor("sentiment_percentages.json").init();
sentimentBarChart.numDataArrays = sentimentBarChart.dataArray.length; // sentimentBarChart.dataArray.length
// const keys = lemmaHeatmap.getDataArrayKeys();
// const frequencies = lemmaHeatmap.getDataArrayValues();

console.log(sentimentBarChart.dataArray)