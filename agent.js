const createAgent = function (options, train) {
    let lastTransported = 0;
    let lastMoveCount = 0;

    function calculateReward(world) {
        const {
            elapsedTime,
            transportedPerSec,
            maxWaitTime,
            avgWaitTime,
            moveCount,
            transportedCounter,
        } = world;
        const movesPerSec = moveCount / elapsedTime;

        const transported = transportedCounter - lastTransported;
        const moved = moveCount - lastMoveCount;

        lastTransported = transportedCounter;
        lastMoveCount = moveCount;

        let reward = 0;
        reward += transported * 2;
        reward += moved * -1;

        return reward;
    }

    const calculateState = function (world) {
        const envState = {};
        const elevators = world.elevatorInterfaces;
        const floors = world.floors;
        for (let i = 0; i < elevators.length; i++) {
            const elevator = elevators[i];
            envState[`eMaxPassengerCount${i}`] = elevator.maxPassengerCount();
            envState[`eCurrentFloor${i}`] = elevator.currentFloor();
            envState[`eLoadFactor${i}`] = elevator.loadFactor();
            switch (elevator.destinationDirection()) {
                case 'up':
                    envState[`eDestinationDirection${i}`] = 1;
                    break;
                case 'down':
                    envState[`eDestinationDirection${i}`] = -1;
                    break;
                default:
                    envState[`eDestinationDirection${i}`] = 0;
                    break;
            }
            const pressedFloors = new Array(floors.length);
            for (let j of elevator.getPressedFloors()) {
                pressedFloors[j] = true
            }
            for (let j = 0; j < floors.length; j++) {
                envState[`ePressedFloor${i}${j}`] = Number(pressedFloors[j] === true);
            }
        }
        for (let i = 0; i < floors.length; i++) {
            const floor = floors[i];
            envState[`fUpPressed${i}`] = Number(floor.buttonStates.up === 'activated');
            envState[`fDownPressed${i}`] = Number(floor.buttonStates.down === 'activated');
        }

        return Object.values(envState);
    };

    function buildModel(floorsCount, elevatorsCount) {
        const inputShape = (floorsCount * 2) + (elevatorsCount * 4) + (floorsCount * elevatorsCount);
        const model = tf.sequential({
            layers: [
                tf.layers.dense({
                    inputShape: [inputShape],
                    units: floorsCount * elevatorsCount * 2,
                    activation: 'relu'
                }),
                tf.layers.dense({units: floorsCount * elevatorsCount, activation: 'relu'}),
                tf.layers.dense({units: floorsCount * elevatorsCount, activation: 'relu'}),
                tf.layers.dense({units: elevatorsCount, activation: 'linear'}),
            ]
        });
        model.compile({
            loss: tf.losses.meanSquaredError,
            optimizer: tf.train.adam(0.1),
            metrics: ['accuracy'],
        });
        return model;
    }

    const {floorCount, elevatorCount} = options;
    const model = buildModel(floorCount, elevatorCount);


    let totalEpisodes = 1000;
    let episode = 500;

    let epsilon = 1 - episode / totalEpisodes;
    let memories = [[], []];
    let sumReward = 0;

    return {
        playing: function () {
            epsilon = 1 - episode / totalEpisodes;
            return episode < totalEpisodes
        },

        play: function (world) {
            const floorsCount = world.floors.length;
            const elevators = world.elevatorInterfaces;
            const elevatorsCount = world.elevatorInterfaces.length;

            memories = [[], []];
            const rewards = [];
            sumReward = 0;

            world.on("stats_changed", function () {
                if (world.challengeEnded) {
                    episode++;
                    console.log(epsilon);
                    return;
                }

                const newState = calculateState(world);
                const oldState = memories[0][memories[0].length - 1];
                if (String(newState) === String(oldState)) return;

                const reward = calculateReward(world);
                sumReward += reward;

                if (!train) {
                    actions = model.predict(tf.tensor([newState])).dataSync().map(Math.floor);
                    elevators.forEach((elevator, i) => elevator.goToFloor(actions[i], true));
                    return;
                }

                let actions = [];
                if (Math.random() < epsilon) {
                    for (let i = 0; i < elevatorsCount; i++) {
                        actions[i] = Math.floor(Math.random() * floorsCount)
                    }
                } else {
                    actions = model.predict(tf.tensor([newState])).dataSync();
                    console.log(actions);
                    actions = actions.map(Math.floor)
                }

                elevators.forEach((elevator, i) => elevator.goToFloor(actions[i], true));

                const oldReward = rewards[rewards.length - 1];
                const oldActions = memories[1][memories[1].length - 1];
                let bestAction = oldActions && oldReward >= reward ? oldActions : actions;

                memories[0].push(newState);
                memories[1].push(bestAction);
                rewards.push(reward);
            });
        },

        train: function (done) {
            console.log(sumReward);
            console.log(memories[1]);
            model.fit(tf.tensor(memories[0]), tf.tensor(memories[1])).then(done);
        }
    }
};
