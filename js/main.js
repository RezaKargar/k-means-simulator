const body = document.getElementsByTagName("body")[0];
const canvas = document.createElement("canvas");
ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
body.appendChild(canvas);

window.onresize = () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
};

let points;
let centroids;
let clusters;
let sse;

let COLORS;

let steps;
let currentStepOfKMean;

window.onclick = (e) => {
	const point = new Point(e.clientX, e.clientY);
	drawPoint(point);

	points.push(point);
};

init();

function init() {
	reset(true);
	loadCurrentStateFromLocalStorage();

	render();
}

function render() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	points.forEach(drawPoint);
	centroids.forEach(drawCentroid);
	requestAnimationFrame(render);
}

function reset(shouldResetPoints = false){
	shouldResetPoints && (points = []);
	centroids = [];
	clusters = {};
	COLORS = ["red", "purple", "olive", "blue", "darkorange", "green"];
	sse = null;

	steps = {
		KMeans: [],
	};
}

function drawPoint(point) {
	ctx.beginPath();
	ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
	ctx.fillStyle = point.color;
	ctx.fill();
}

function drawCentroid(point) {
	const x = point.x;
	const y = point.y;

	ctx.strokeStyle = point.color;

	ctx.lineWidth = 5;

	ctx.beginPath();

	ctx.moveTo(x - 5, y - 5);
	ctx.lineTo(x + 5, y + 5);

	ctx.moveTo(x + 5, y - 5);
	ctx.lineTo(x - 5, y + 5);

	ctx.stroke();

	ctx.lineWidth = 1;
}

function initCentroids(k) {
	if (k > points.length) throw new Error("K is more than number of points");

	centroids.forEach(resetCentroid);
	centroids = [];

	for (let i = 0; i < k; ) {
		const randomPoint = points[Math.floor(Math.random() * points.length)];

		const isPointAlreadyChosenAsACentroid = centroids.includes(randomPoint);
		if (!isPointAlreadyChosenAsACentroid) {
			const clusterName = (i + 1).toString();

			const centroid = new Point(
				randomPoint.x,
				randomPoint.y,
				randomPoint.color
			);

			if (COLORS.length > 0) {
				const color = COLORS[Math.floor(Math.random() * COLORS.length)];
				centroid.color = color;

				COLORS = COLORS.filter((c) => c != color);
			} else {
				centroid.color =
					"#" + Math.floor(Math.random() * 16777215).toString(16);
			}

			centroid.cluster = clusterName;
			centroids.push(centroid);

			let cluster = {
				centroid: centroid,
				points: [],
			};

			clusters[clusterName] = cluster;
			i++;
		}
	}
}

function resetCentroid(centroid) {
	centroid.color = POINTS_INITIAL_COLOR;
	centroid.cluster = null;
}

function KMeans(k) {
	reset();
	initCentroids(k);
	saveStep();

	let shouldStop;
	do {
		isClusterChangedForAPoint = clusterPoints();
		let anyCentroidRepositioned = repositionCentroids();

		shouldStop = !anyCentroidRepositioned || !isClusterChangedForAPoint;

		if (!shouldStop) {
			let sse = calculateSumOfSquaredError();
			saveStep(sse);
		}
	} while (!shouldStop);

	saveCurrentStateToLocalStorage();
}

function calculateSumOfSquaredError() {
	let result = 0;
	for (const clusterName in clusters) {
		if (!Object.hasOwnProperty.call(clusters, clusterName)) return;

		const cluster = clusters[clusterName];
		let squaredError = 0;
		cluster.points.forEach((point) => {
			squaredError += distance(point, cluster.centroid);
		});

		result += squaredError;
	}

	return result;
}

function saveCurrentStateToLocalStorage(){
	const stepsToSave = JSON.stringify(steps);
	localStorage.setItem('steps', stepsToSave);
}

function loadCurrentStateFromLocalStorage(){
	steps = JSON.parse(localStorage.getItem('steps'));
	steps && loadStep(steps.KMeans.length - 1);
}


function saveStep() {
	currentStepOfKMean = deepCopy({
		stepId: steps["KMeans"].length,
		clusters,
		points,
		centroids,
		sse,
	});

	steps.KMeans.push(currentStepOfKMean);
}

function loadNextStep() {
	const currentStepId = currentStepOfKMean.stepId;

	const nextStepId = currentStepId + 1;

	const isThereAnyNextStep = nextStepId < steps.KMeans.length;
	if (!isThereAnyNextStep) {
		console.info("There is no next step!");
		return;
	}

	loadStep(nextStepId);
}

function loadPreviousStep() {
	const currentStepId = currentStepOfKMean.stepId;

	const previousStepId = currentStepId - 1;

	const isThereAnyPerviousStep = previousStepId >= 0;
	if (!isThereAnyPerviousStep) {
		console.info("There is no previous step!");
		return;
	}

	loadStep(previousStepId);
}

function loadStep(stepId) {
	currentStepOfKMean = steps.KMeans[stepId];

	points = currentStepOfKMean.points;
	centroids = currentStepOfKMean.centroids;
	clusters = currentStepOfKMean.clusters;
}

function deepCopy(item) {
	let stringified = JSON.stringify(item);
	let reParsed = JSON.parse(stringified);

	return reParsed;
}

function clusterPoints() {
	let onePointChangedItsCluster = false;
	resetClusters();

	const noneCentroidPoints = points.filter((p) => !centroids.includes(p));

	noneCentroidPoints.forEach((point) => {
		let minDistance = Infinity;
		centroids.forEach((centroid) => {
			const distanceToCentroid = distance(point, centroid);
			if (distanceToCentroid < minDistance) {
				minDistance = distanceToCentroid;
				if (point.cluster != centroid.cluster) {
					onePointChangedItsCluster = true;
				}
				point.cluster = centroid.cluster;
				point.color = centroid.color;
			}
		});

		clusters[point.cluster].points.push(point);
	});

	return onePointChangedItsCluster;
}

function distance(pointA, pointB) {
	let xsSubstractionPowered = Math.pow(pointA.x - pointB.x, 2);
	let ysSubstractionPowered = Math.pow(pointA.y - pointB.y, 2);

	return Math.sqrt(xsSubstractionPowered + ysSubstractionPowered);
}

function repositionCentroids() {
	let oneCentroidRepositioned = false;
	for (const clusterName in clusters) {
		if (!clusters.hasOwnProperty(clusterName)) return;

		const cluster = clusters[clusterName];

		if (cluster.points.length == 0) return;

		const centroid = cluster.centroid;
		const points = cluster.points;

		const xs = points.map((p) => p.x);
		const meanOfXs = xs.reduce((a, b) => a + b) / xs.length;

		const ys = points.map((p) => p.y);
		const meanOfYs = ys.reduce((a, b) => a + b) / ys.length;

		if (centroid.x != meanOfXs || centroid.y != meanOfYs) {
			oneCentroidRepositioned = true;
		}

		centroid.x = meanOfXs;
		centroid.y = meanOfYs;
	}

	return oneCentroidRepositioned;
}

function resetClusters() {
	clusters = {};

	centroids.forEach((centroid) => {
		let cluster = {
			centroid: centroid,
			points: [],
		};

		clusters[centroid.cluster] = cluster;
	});
}
