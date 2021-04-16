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

let currentAnimationState;
let animationStepId;

let functionToContinue;

let sseChartPoints;

const ANIMATION_STATES = {
	playing: 0,
	paused: 1,
	idle: 2,
};

const ALGORITHMS = {
	kmeans: "kmeans",
	kmedoids: "kmedoids",
	xmeans: "xmeans",
};

const RUN_MODES = {
	just_result: "just-result",
	animational: "animational",
	step_by_step: "step-by-step",
};

const UNIT_TIME_OF_EACH_ITERATION = 1500;

window.onclick = (e) => {
	if (e.target != canvas) return;
	if (currentAnimationState != ANIMATION_STATES.idle) return;

	const point = new Point(e.clientX, e.clientY);
	drawPoint(point);

	points.push(point);
};

window.onkeydown = (e) => {
	if (e.code === "KeyP" || e.code === "Space") {
		handlePausePlayButtonClick();
	} else if (e.code === "ArrowRight" || e.code === "ArrowLeft") {
		const nextPreviousButtonsWrapper = document.getElementById(
			"next-previous-buttons-wrapper"
		);
		const isNextPreviousButtonsWrapperVisible =
			nextPreviousButtonsWrapper.style.display != "none";

		if (e.code === "ArrowRight") {
			const nextButton = document.getElementById("next-button");
			const isNextButtonsEnabled = !nextButton.disabled;

			isNextPreviousButtonsWrapperVisible &&
				isNextButtonsEnabled &&
				handleNextButtonClick();
		} else if (e.code === "ArrowLeft") {
			const previousButton = document.getElementById("previous-button");
			const isPreviousButtonsEnabled = !previousButton.disabled;

			isNextPreviousButtonsWrapperVisible &&
				isPreviousButtonsEnabled &&
				handlePreviousButtonClick();
		}
	}
};

init();

function init() {
	reset(true, false, true);
	loadCurrentStateFromLocalStorage();

	render();
}

function render() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	points.forEach(drawPoint);
	centroids.forEach(drawCentroid);
	requestAnimationFrame(render);
}

function reset(
	shouldResetPoints = false,
	shouldClearlocalStorage = false,
	changeAnimationStateToIdle = false
) {
	shouldResetPoints && (points = []);
	centroids = [];
	clusters = {};
	COLORS = ["red", "purple", "olive", "blue", "darkorange", "green"];
	sse = null;

	changeAnimationStateToIdle &&
		(currentAnimationState = ANIMATION_STATES.idle);
	animationStepId = null;
	functionToContinue = null;

	steps = {
		KMeans: [],
	};

	shouldClearlocalStorage && localStorage.clear();
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

	points.forEach(resetPointColor);
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

function resetPointColor(point) {
	point.color = POINTS_INITIAL_COLOR;
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
			sse = calculateSumOfSquaredError();
			saveStep(sse);
		}
	} while (!shouldStop);

	saveCurrentStateToLocalStorage();
}

async function runKMeansAnimationly(k, isContiue = false) {
	let speed = document.getElementById("speed").value || 1;

	currentAnimationState = ANIMATION_STATES.playing;

	!isContiue && KMeans(k);

	functionToContinue = () => runKMeansAnimationly(k, true);

	let sleepTime = UNIT_TIME_OF_EACH_ITERATION / speed;

	let hasStepLoaded = loadStep(animationStepId || 0);

	updateRunInfo();

	while (hasStepLoaded) {
		if (currentAnimationState != ANIMATION_STATES.playing) return;

		animationStepId++;

		speed = document.getElementById("speed").value || 1;
		sleepTime = UNIT_TIME_OF_EACH_ITERATION / speed;

		await sleep(sleepTime);

		if (currentAnimationState != ANIMATION_STATES.playing) return;
		hasStepLoaded = loadNextStep();
		updateRunInfo();
	}

	currentAnimationState = ANIMATION_STATES.idle;

	const runButton = document.getElementById("run");
	runButton.style.display = "inline-block";

	const pausePlayButtonWrapper = document.getElementById(
		"pause-play-button-wrapper"
	);
	pausePlayButtonWrapper.style.display = "none";
}

function calculateSumOfSquaredError() {
	let result = 0;
	for (const clusterName in clusters) {
		if (!Object.hasOwnProperty.call(clusters, clusterName)) return;

		const cluster = clusters[clusterName];
		let squaredError = 0;
		cluster.points.forEach((point) => {
			squaredError += Math.pow(distance(point, cluster.centroid), 2);
		});

		result += squaredError;
	}

	return result;
}

function saveCurrentStateToLocalStorage() {
	const stepsToSave = JSON.stringify(steps);
	localStorage.setItem("steps", stepsToSave);

	currentStepId = currentStepOfKMean ? currentStepOfKMean.stepId : null;
	localStorage.setItem("currentStepId", currentStepId);
}

function loadCurrentStateFromLocalStorage() {
	const currentStepId = JSON.parse(localStorage.getItem("currentStepId"));
	steps = JSON.parse(localStorage.getItem("steps"));
	steps && steps.KMeans && loadStep(currentStepId);
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
		return false;
	}

	return loadStep(nextStepId);
}

function loadPreviousStep() {
	const currentStepId = currentStepOfKMean.stepId;

	const previousStepId = currentStepId - 1;

	const isThereAnyPerviousStep = previousStepId >= 0;
	if (!isThereAnyPerviousStep) {
		console.info("There is no previous step!");
		return false;
	}

	return loadStep(previousStepId);
}

function loadStep(stepId) {
	if (stepId < 0 || steps.KMeans.length <= stepId) {
		console.error("The requested step does not exists");
		return false;
	}

	currentStepOfKMean = steps.KMeans[stepId];

	points = currentStepOfKMean.points;
	centroids = currentStepOfKMean.centroids;
	clusters = currentStepOfKMean.clusters;

	saveCurrentStateToLocalStorage();

	return true;
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

function calculateMedian(array) {
	if (array.length === 0) return 0;

	array.sort((a, b) => a - b);

	var half = Math.floor(array.length / 2);

	return array.length % 2 ? array[half] : (array[half - 1] + array[half]) / 2;
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

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function handleRunButtonClick() {
	const algorithm = document.getElementById("algorithm").value;
	const mode = document.getElementById("run-mode").value;
	const clusterCount = document.getElementById("clusters-count").value;
	const runButton = document.getElementById("run");
	runButton.style.display = "inline-block";

	const pausePlayButtonWrapper = document.getElementById(
		"pause-play-button-wrapper"
	);
	pausePlayButtonWrapper.style.display = "none";

	const nextPreviousButtonWrapper = document.getElementById(
		"next-previous-buttons-wrapper"
	);
	nextPreviousButtonWrapper.style.display = "none";

	if (algorithm == ALGORITHMS.kmeans) {
		if (mode == RUN_MODES.just_result) {
			updateRunInfo(true, true);
			KMeans(clusterCount);
			drawSSEChart();
		} else if (mode == RUN_MODES.animational) {
			runButton.style.display = "none";
			pausePlayButtonWrapper.style.display = "block";
			updateRunInfo(true);
			runKMeansAnimationly(clusterCount);
		} else {
			runButton.style.display = "none";
			nextPreviousButtonWrapper.style.display = "block";
			updateRunInfo(true);
			loadStep(0);
			updateRunInfo();
		}
	}
}

function handleChangeOfRunModes() {
	const extraOptions = document.getElementById(
		"run-modes-extra-options-section"
	);
	const mode = document.getElementById("run-mode").value;

	if (mode == RUN_MODES.animational) {
		extraOptions.hidden = false;
	} else {
		extraOptions.hidden = true;
	}
}

function handlePausePlayButtonClick() {
	if (currentAnimationState == ANIMATION_STATES.paused) {
		currentAnimationState = ANIMATION_STATES.playing;
		functionToContinue();
	} else if (currentAnimationState == ANIMATION_STATES.playing) {
		currentAnimationState = ANIMATION_STATES.paused;
	}
	const pausePlayButton = document.getElementById("pause-play-button");

	pausePlayButton.classList.toggle("playing");
}

function handleFirstButtonClick() {
	const lastButton = document.getElementById("last-button");
	lastButton.disabled = false;

	const nextButton = document.getElementById("next-button");
	nextButton.disabled = false;

	const stepLoaded = loadStep(0);
	if (!stepLoaded) {
		return;
	}

	updateRunInfo();
	drawSSEsChartUntilStepId(currentStepOfKMean.stepId);

	const firstButton = document.getElementById("first-button");
	firstButton.disabled = true;

	const previousButton = document.getElementById("previous-button");
	previousButton.disabled = true;
}

function handlePreviousButtonClick() {
	const lastButton = document.getElementById("last-button");
	lastButton.disabled = false;

	const nextButton = document.getElementById("next-button");
	nextButton.disabled = false;

	const isStepLoaded = loadPreviousStep();
	if (!isStepLoaded) return;

	updateRunInfo();
	drawSSEsChartUntilStepId(currentStepOfKMean.stepId);

	if (currentStepOfKMean.stepId == 0) {
		const firstButton = document.getElementById("first-button");
		firstButton.disabled = true;

		const previousButton = document.getElementById("previous-button");
		previousButton.disabled = true;
	}
}

function handleNextButtonClick() {
	const firstButton = document.getElementById("first-button");
	firstButton.disabled = false;

	const previousButton = document.getElementById("previous-button");
	previousButton.disabled = false;

	const stepLoaded = loadNextStep();
	if (!stepLoaded) {
		return;
	}

	updateRunInfo();
	drawSSEsChartUntilStepId(currentStepOfKMean.stepId);

	if (currentStepOfKMean.stepId == steps.KMeans.length - 1) {
		const lastButton = document.getElementById("last-button");
		lastButton.disabled = true;

		const nextButton = document.getElementById("next-button");
		nextButton.disabled = true;
	}
}

function handleLastButtonClick() {
	const firstButton = document.getElementById("first-button");
	firstButton.disabled = false;

	const previousButton = document.getElementById("previous-button");
	previousButton.disabled = false;

	const lastStepId = steps.KMeans.length - 1;
	const stepLoaded = loadStep(lastStepId);
	if (!stepLoaded) {
		return;
	}

	updateRunInfo();
	drawSSEsChartUntilStepId(currentStepOfKMean.stepId);

	const lastButton = document.getElementById("last-button");
	lastButton.disabled = true;

	const nextButton = document.getElementById("next-button");
	nextButton.disabled = true;
}

function handleStopButtonClick() {
	const nextPreviousButtonWrapper = document.getElementById(
		"next-previous-buttons-wrapper"
	);
	nextPreviousButtonWrapper.style.display = "none";

	const firstButton = document.getElementById("first-button");
	firstButton.disabled = true;

	const previousButton = document.getElementById("previous-button");
	previousButton.disabled = true;

	const lastButton = document.getElementById("last-button");
	lastButton.disabled = false;

	const nextButton = document.getElementById("next-button");
	nextButton.disabled = false;

	const runButton = document.getElementById("run");
	runButton.style.display = "inline-block";
}

function updateRunInfo(isInitial = false, hideRunInfo = false) {
	const runInfo = document.getElementById("run-info");
	const iterationNumber = document.getElementById("iteration-number");
	const sseSpan = document.getElementById("sse");

	iterationNumber.innerHTML = isInitial ? "" : currentStepOfKMean.stepId;

	sseSpan.innerHTML =
		isInitial || !currentStepOfKMean.sse
			? ""
			: currentStepOfKMean.sse.toFixed(2);

	if (hideRunInfo) {
		runInfo.style.display = "none";
	} else {
		runInfo.style.display = "block";
	}

	if (isInitial) {
		initSSEChart();
	} else {
		currentStepOfKMean.stepId != 0 &&
			drawSSEOnChart(currentStepOfKMean.stepId - 1);
	}
}

function drawSSEChart() {
	const sses = steps.KMeans.map((s) => s.sse).filter((sse) => sse);

	const normalizedSSEs = normalizeSSEs();

	const xIncrementer = Math.ceil(150 / (steps.KMeans.length - 1));

	const points = Array.from(Array(steps.KMeans.length - 1).keys(), (i) => {
		return {
			x: i * xIncrementer + 20,
			y: normalizedSSEs[i],
		};
	});

	const chart = document.getElementById("chart");
	const chartCanvas = document.createElement("canvas");
	const chartCtx = chartCanvas.getContext("2d");
	chartCanvas.width = chart.offsetWidth;
	chartCanvas.height = chart.offsetHeight;
	chart.innerHTML = "";
	chart.appendChild(chartCanvas);

	chartCtx.beginPath();
	chartCtx.moveTo(0, chartCanvas.height - 25);
	chartCtx.lineTo(chartCanvas.width, chartCanvas.height - 25);
	chartCtx.stroke();

	chartCtx.fillText("Iterations", 90, chartCanvas.height - 5);

	chartCtx.font = "20px serif";
	chartCtx.fillText("SSE", 90, 25);

	for (let index = 0; index < points.length; index++) {
		chartCtx.font = "10px serif";

		const point = points[index];
		const nextPoint = points[index + 1];

		chartCtx.beginPath();
		chartCtx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
		chartCtx.fill();

		chartCtx.fillText(sses[index].toFixed(2), point.x + 10, point.y);

		chartCtx.fillText(index + 1, point.x - 3, chartCanvas.height - 15);

		chartCtx.beginPath();
		chartCtx.moveTo(point.x, chartCanvas.height - 30);
		chartCtx.lineTo(point.x, chartCanvas.height - 23);
		chartCtx.stroke();

		if (!nextPoint) continue;

		chartCtx.beginPath();
		chartCtx.moveTo(point.x, point.y);
		chartCtx.lineTo(nextPoint.x, nextPoint.y);
		chartCtx.stroke();
	}
}

function normalizeSSEs() {
	const sses = steps.KMeans.map((s) => s.sse).filter((sse) => sse);

	if (sses.length === 1) return [100];

	const min = Math.max(...sses);
	const max = Math.min(...sses);

	const targetMin = 50;
	const targetMax = 200;

	return sses.map(
		(sse) =>
			((sse - min) / (max - min)) * (targetMax - targetMin) + targetMin
	);
}

function normalizeSSE(sse) {
	const sses = steps.KMeans.map((s) => s.sse).filter((sse) => sse);

	if (sses.length === 1) return [100];

	const min = Math.max(...sses);
	const max = Math.min(...sses);

	const targetMin = 50;
	const targetMax = 200;

	return ((sse - min) / (max - min)) * (targetMax - targetMin) + targetMin;
}

function initSSEChart() {
	const chart = document.getElementById("chart");
	const chartCanvas = document.createElement("canvas");
	const chartCtx = chartCanvas.getContext("2d");
	chartCanvas.width = chart.offsetWidth;
	chartCanvas.height = chart.offsetHeight;
	chart.innerHTML = "";
	chart.appendChild(chartCanvas);

	chartCtx.beginPath();
	chartCtx.moveTo(0, chartCanvas.height - 25);
	chartCtx.lineTo(chartCanvas.width, chartCanvas.height - 25);
	chartCtx.stroke();

	chartCtx.fillText("Iterations", 90, chartCanvas.height - 5);

	chartCtx.font = "20px serif";
	chartCtx.fillText("SSE", 90, 25);

	let normalizedSSEs = normalizeSSEs();

	const xIncrementer = Math.ceil(150 / (steps.KMeans.length - 1));

	sseChartPoints = Array.from(Array(steps.KMeans.length - 1).keys(), (i) => {
		return {
			x: i * xIncrementer + 20,
			y: normalizedSSEs[i],
		};
	});
}

function drawSSEOnChart(stepId) {
	const sses = steps.KMeans.map((s) => s.sse).filter((sse) => sse);

	const chart = document.getElementById("chart");
	const chartCanvas = chart.getElementsByTagName("canvas")[0];
	const chartCtx = chartCanvas.getContext("2d");

	chartCtx.font = "10px serif";

	const xIncrementer = Math.ceil(150 / (steps.KMeans.length - 1));

	let x = stepId * xIncrementer + 20;
	let y = normalizeSSE(sses[stepId]);

	let x_pre = (stepId - 1) * xIncrementer + 20;
	let y_pre = sses[stepId - 1] ? normalizeSSE(sses[stepId - 1]) : null;

	chartCtx.beginPath();
	chartCtx.arc(x, y, 3, 0, 2 * Math.PI);
	chartCtx.fill();

	chartCtx.fillText(sses[stepId].toFixed(2), x + 10, y);

	chartCtx.fillText(stepId + 1, x - 3, chartCanvas.height - 15);

	chartCtx.beginPath();
	chartCtx.moveTo(x, chartCanvas.height - 30);
	chartCtx.lineTo(x, chartCanvas.height - 23);
	chartCtx.stroke();

	if (!y_pre) return;

	chartCtx.beginPath();
	chartCtx.moveTo(x, y);
	chartCtx.lineTo(x_pre, y_pre);
	chartCtx.stroke();
}

function drawSSEsChartUntilStepId(stepId){
	initSSEChart();
	for (let index = 0; index < stepId; index++) {
		drawSSEOnChart(index);
	}
}