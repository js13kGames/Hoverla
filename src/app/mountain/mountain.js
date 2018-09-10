window.mountain = (() => {
	const gHoles = [
		[8,4,12,44,0,71,19,86,34,129,57,109,75,76,71,51,87,33,79,0],
		[8,4,3,59,22,71,14,102,38,109,58,136,77,111,74,69,102,60,79,2],
		[8,4,27,75,19,122,70,137,93,95,67,52,79,1]
	];

	const MIN_LENGTH = 100;
	const MAX_DISTORTION = .08;
	const trip = [];
	const CAMPS = [
		[-200, 0, 1200],
		[8000, 3000, 800],
		[24000, 6500, 800],
		[36000, 10500, 600],
	];
	const FINAL = [44000, 10000];
	const HIGH = 12500;
	const LENGTH = 40000;
	let gradient;
	let decoration;

	function patch() {
		const toBeAdded = [];

		trip.forEach((path) => {
			if (path.type === 'empty') {
				const length = path.start.distance(path.end);

				if (length > 2 * MIN_LENGTH) {
					const angle = path.start.angle(path.end);
					const center = path.start.center(path.end);
					const dist = -MAX_DISTORTION + (rFloat(0, 2 * MAX_DISTORTION));

					const point = new Vector(
						-Math.sin(angle) * (length * dist) + center.x,
						(Math.cos(angle) * (length * dist) + center.y)
					);

					toBeAdded.push({
						o: path,
						n: [{
							type: 'empty',
							start: path.start.get(),
							end: point.get(),
							angle: path.start.get().angle(point.get()),
							direction: point.get().sub(path.start.get()).normalize()
						}, {
							type: 'empty',
							start: point.get(),
							end: path.end.get(),
							angle: point.get().angle(path.end.get()),
							direction: path.end.get().sub(path.start.get()).normalize()
						}]
					});
				}
			}
		});

		toBeAdded.forEach((item) => {
			trip.splice(trip.indexOf(item.o), 1, item.n[0], item.n[1]);
		});

		return !!toBeAdded.length;
	}

	function defineCamps() {
		CAMPS.forEach((camp, index) => {
			const next = CAMPS[index + 1] || [LENGTH, HIGH];

			trip.push({
				type: 'camp',
				start: new Vector(camp[0], camp[1]),
				end: new Vector(camp[0] + camp[2], camp[1]),
				angle: 0,
				direction: new Vector(1, 0)
			});

			trip.push({
				type: 'empty',
				start: new Vector(camp[0] + camp[2], camp[1]),
				end: new Vector(next[0], next[1])
			});
		});
	}

	function defineFinal() {
		trip.push({
			type: 'empty',
			start: new Vector(LENGTH, HIGH),
			end: new Vector(FINAL[0], FINAL[1])
		});
	}

	function defineHoles() {
		let lastHolePassed = -1;
		trip.map((path) => {
			if (path.type === 'empty' && path.start.x > 3000 && path.start.x < CAMPS[3][0]) {
				if (lastHolePassed > 1 && rFloat(0, 1) <= .1 + (.9 * (lastHolePassed / 100))) {
					const holeType = rInt(0, 3),
						startX = gHoles[holeType][0],
						depth = rFloat(1, 3);

					path.type = 'hole';
					path.g = gHoles[holeType].map((item, index) => {
						if (!index) {
							return path.start.x;
						}
						if (index === 1) {
							return path.start.y;
						}
						if (index === gHoles[holeType].length - 2) {
							return path.end.x;
						}
						if (index === gHoles[holeType].length - 1) {
							return path.end.y;
						}
						if (!(index % 2)) {
							return path.start.x + item - startX;
						}
						if (index % 2) {
							return path.start.y - (item * 2);
						}
						return item;
					});
					lastHolePassed = -1;
				}
				lastHolePassed++;
			}
			return path;
		});
	}

	function generate() {
		defineCamps();

		defineFinal();

		let isPatching = true;

		while (isPatching) {
			isPatching = patch();
		}

		defineHoles();

		trip.map((item, index) => {
			item.id = index;
			return item;
		});

		decoration = new MountainDecoration(trip);

		console.log(trip);
	}

	function search(x) {
		return trip.filter((path) => path.start.x <= x && path.end.x > x);
	}

	return {
		i: () => {
			generate();
		},
		n: () => {
			// decoration.n();
			gradient = c.createLinearGradient(LENGTH / 2, 0, LENGTH / 2, -HIGH);
			gradient.addColorStop(0, color.get('g1'));
			gradient.addColorStop(2500 / HIGH, color.get('g2'));
			gradient.addColorStop(3300 / HIGH, color.get('g3'));
			gradient.addColorStop(5000 / HIGH, color.get('g3'));
			gradient.addColorStop(6500 / HIGH, color.get('g4'));
			gradient.addColorStop(10500 / HIGH, color.get('g4'));
			gradient.addColorStop(1, color.get('g5'));
		},
		r: () => {
			// const cameraPosition = camera.getPosition();
			c.save();
			c.translate(0, gc.res.y);
			// c.scale(0.027, 0.027);
			// c.scale(0.3, .3);
			c.lineWidth = 10;
			c.lineJoin = 'round';
			c.strokeStyle = gradient;
			c.fillStyle = 'brown';

			bp();
			for (let i = 0; i < trip.length; i++) {
				if (!i) {
					m(trip[i].start.x, -trip[i].start.y);
				}
				if (trip[i].type === 'hole') {
					for (let j = 0; j < trip[i].g.length; j = j+ 2) {
						l(trip[i].g[j], -trip[i].g[j + 1]);
					}
				} else if (i === trip.length - 1) {
					l(trip[i].end.x, 1400);
					l(trip[0].start.x, 1400);
				} else {
					l(trip[i].end.x, -trip[i].end.y);
				}
			}
			c.fill();
			c.stroke();
			cp();

			decoration.r();
			c.restore();
		},
		getBlock: (x) => {
			return search(x)[0];
		},
		isHole: (x) => {
			const filteredMap = search(x);
			return filteredMap[0] ? filteredMap[0].type === 'hole' : false;
		},
		getHeight: (x) => {
			const filteredMap = search(x);
			if (filteredMap[0]) {
				let diffX = (x - filteredMap[0].start.x) / (filteredMap[0].end.x - filteredMap[0].start.x);
				let diffY = filteredMap[0].start.y + ((filteredMap[0].end.y - filteredMap[0].start.y) * diffX);
				return diffY;
			} else {
				return -1;
			}
		},
		getAngle: (x) => {
			const filteredMap = search(x);
			return filteredMap[0] ? filteredMap[0].angle : 0;
		},
		getDirection: (x) => {
			const filteredMap = search(x);
			return filteredMap[0] ? filteredMap[0].direction.get() : new Vector();
		}
	};
})();