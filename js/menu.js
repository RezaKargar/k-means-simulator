
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

function drawSSEsChartUntilStepId(stepId) {
	initSSEChart();
	for (let index = 0; index < stepId; index++) {
		drawSSEOnChart(index);
	}
}

function handleResetButtonClick(){
	reset(true, true, true);
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
			document.getElementById("run-info").style.display = "none";
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
