import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
import { workerEvents } from '../events/constants.js';

let _globalCtx = {};
let _model = null;

/**
 * TODO: Implement normalization and encoding logic
 */
function normalize(value, min, max) {
    // Implement normalization [0, 1]
}

function makeContext(bags, customers) {
    // TODO: Create a context object with metadata, categories, and pre-computed bag vectors
    return {
        // ...
    };
}

function encodeBag(bag, context) {
    // TODO: Use tf.oneHot and tf.concat to create a bag vector
}

function encodeCustomer(customer, context) {
    // TODO: Average bag vectors from history or use customer metadata
}

function createTrainingData(context) {
    // TODO: Generate xs (inputs) and ys (labels) tensors
}

async function configureNeuralNetAndTrain(trainingData) {
    // TODO: Create a tf.sequential model, add layers, and call model.fit()
}

async function trainModel({ customers, bags }) {
    console.log('Worker: Starting Training process...');
    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 5 } });

    // Using the 'bags' (availability) data provided as parameter
    const bags_list = bags;

    // TODO: Implement the training pipeline below:
    // 1. const context = makeContext(bags_list, customers);
    // 2. const trainingData = createTrainingData(context);
    // 3. _model = await configureNeuralNetAndTrain(trainingData);

    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 100 } });
    postMessage({ type: workerEvents.trainingComplete });
}

function recommend({ customer }) {
    console.log('Worker: Recommendation requested');

    // TODO: Implement the recommendation logic using _model.predict()

    /* postMessage({
        type: workerEvents.recommend,
        customer,
        recommendations: [] // Placeholder
    }); */
}

const handlers = {
    [workerEvents.trainModel]: trainModel,
    [workerEvents.recommend]: recommend,
};

self.onmessage = e => {
    const { action, ...data } = e.data;
    if (handlers[action]) handlers[action](data);
};
