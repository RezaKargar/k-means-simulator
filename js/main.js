
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

function resetPointColor(point) {
	point.color = POINTS_INITIAL_COLOR;
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

function calculateMedian(array) {
	if (array.length === 0) return 0;

	array.sort((a, b) => a - b);

	var half = Math.floor(array.length / 2);

	return array.length % 2 ? array[half] : (array[half - 1] + array[half]) / 2;
}