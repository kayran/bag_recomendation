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

function makeContext(products, users) {
    // TODO: Create a context object with metadata, categories, and pre-computed product vectors
    return {
        // ...
    };
}

function encodeProduct(product, context) {
    // TODO: Use tf.oneHot and tf.concat to create a product vector
}

function encodeUser(user, context) {
    // TODO: Average product vectors from history or use user metadata
}

function createTrainingData(context) {
    // TODO: Generate xs (inputs) and ys (labels) tensors
}

async function configureNeuralNetAndTrain(trainingData) {
    // TODO: Create a tf.sequential model, add layers, and call model.fit()
}

async function trainModel({ users }) {
    console.log('Worker: Starting Training process...');
    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 5 } });

    // Boilerplate: Fetching the bag data
    const productsResponse = await fetch('/data/availability.json');
    const products = await productsResponse.json();

    // TODO: Implement the training pipeline below:
    // 1. const context = makeContext(products, users);
    // 2. const trainingData = createTrainingData(context);
    // 3. _model = await configureNeuralNetAndTrain(trainingData);

    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 100 } });
    postMessage({ type: workerEvents.trainingComplete });
}

function recommend({ user }) {
    console.log('Worker: Recommendation requested');

    // TODO: Implement the recommendation logic using _model.predict()

    /* postMessage({
        type: workerEvents.recommend,
        user,
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
