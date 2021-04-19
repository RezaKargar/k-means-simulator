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