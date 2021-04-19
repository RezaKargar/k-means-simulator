function deepCopy(item) {
	let stringified = JSON.stringify(item);
	let reParsed = JSON.parse(stringified);

	return reParsed;
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
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