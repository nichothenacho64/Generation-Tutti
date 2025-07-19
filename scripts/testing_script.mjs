import { readFile } from 'fs/promises';


class ChartConstructor {
	constructor(fileName) {
		this.fileLocation = "data/" + fileName;
		this._metadata = null;
		this.data = null;
		this._generations = ['Baby Boomers', 'Generation X', 'Generation Y', 'Generation Z'];
		this.ready = this.loadData();
        this._numDataArrays = 0;
        this.dataArray = null;
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
        this.addAverages();
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

		const modifiedValues = {};

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
		// return this.data;
	}

	addAverages() {
		for (const key in this.data) {
			const scores = Object.values(this.data[key]);
			const total = scores.reduce((sum, val) => sum + val, 0);
			const average = total / scores.length;
			this.data[key]['average'] = average;
		}
	}

    createDataArray() {
        let dataArray = {};

        for (const label in this.data) {
            const values = Object.values(this.data[label]);
            dataArray[label] = new Array(values); 
        }
        
        this.dataArray = dataArray;
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

        this.dataArray = sortedData;
        this.numDataArrays = this.dataArray.length
    }

    getDataArrayKeys() {
        return Object.keys(this.dataArray).slice(0, this._numDataArrays);
    }

    getDataArrayValues() {
        let dataArrayValues = Object.values(this.dataArray).slice(0, this._numDataArrays);
        return dataArrayValues.map(values => values[0]);
    }

    get metadata() {
        return this._metadata;
    }

    get generations() {
        return this._generations;
    }

    // get data() {
    //     return this.data;
    // }

    // get dataArray() { // not in use
    //     return this.dataArray;
    // }

    set numDataArrays(/** @type {number | undefined} */ numDataArrays) {
        this._numDataArrays = numDataArrays;
    }
}


// Usage:
const lemmaHeatmap = await new ChartConstructor("top_lemmas.json").init();
lemmaHeatmap.orderData();

lemmaHeatmap.numDataArrays = 10 // change later...

const frequencies_new = lemmaHeatmap.getDataArrayValues();
console.log(frequencies_new);
// let data = newChart.transformData();
// newChart.addAverage()
// console.log(data)
// newChart.initialiseChart().then(chart => {
// 	chart.getData(); // runs only after data is loaded
// });


// change to await fetch("data/data.json");
// change to await response.json()
// const data = jsonData.data;



// const data = {
//   Negative: [45.5, 50.3, 10.3, 10.3],
//   Positive: [10.2, 12.6, 28.2, 28.0],
//   Neutral: [29.2, 26.6, 47.6, 47.6],
//   Compound: [15.0, 10.4, 14.0, 14.2]
// };

