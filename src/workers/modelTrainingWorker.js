import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
/* global tf */
import { workerEvents } from '../events/constants.js';

let _globalCtx = {};
let _model = null;

const WEIGHTS = {
  price: 0.3,
  score: 0.1,
  scoreVariety: 0.0,
  scoreQuantity: 0.0,
  scoreQuality: 0.1,
  category: 0.2,
  type: 0.3,
  segment: 0.0,
};

/**
 * TODO: Implement normalization and encoding logic
 */
function normalize(value, min, max) {
  // Implement normalization [0, 1]
  return (value - min) / (max - min);
}

function getBagKey(bag) {
  return `${bag.segment}-${bag.category}-${bag.type}-${bag.price}`;
}

function getRegionKey(lat, long) {
  return `${Number(lat).toFixed(2)}-${Number(long).toFixed(2)}`;
}

function makeContext(bags, customers) {
  // TODO: Create a context object with metadata, categories, and pre-computed bag vectors

  // Customer Data

  const minAvgTicket = Math.min(...customers.map((c) => c.avg_ticket));
  const maxAvgTicket = Math.max(...customers.map((c) => c.avg_ticket));

  const minQttOrder = Math.min(...customers.map((c) => c.qtt_order));
  const maxQttOrder = Math.max(...customers.map((c) => c.qtt_order));

  //Purchase Data

  const avgTicketCount = {};
  const qttOrderCount = {};
  const avgTicketSum = {};
  const qttOrderSum = {};
  const scoreSum = {};
  const scoreCount = {};
  const scoreVarietySum = {};
  const scoreVarietyCount = {};
  const scoreQuantitySum = {};
  const scoreQuantityCount = {};
  const scoreQualitySum = {};
  const scoreQualityCount = {};

  const regionalAvgTicketSum = customers.reduce((acc, customer) => {
    const regionKey = getRegionKey(customer.lat, customer.long);
    if (!acc[regionKey]) acc[regionKey] = { sum: 0, count: 0 };
    acc[regionKey].sum += Number(customer.avg_ticket);
    acc[regionKey].count += 1;
    return acc;
  }, {});

  const regionalQttOrderSum = customers.reduce((acc, customer) => {
    const regionKey = getRegionKey(customer.lat, customer.long);
    if (!acc[regionKey]) acc[regionKey] = { sum: 0, count: 0 };
    acc[regionKey].sum += Number(customer.qtt_order);
    acc[regionKey].count += 1;
    return acc;
  }, {});

  const regionalAvgTicket = Object.fromEntries(
    Object.entries(regionalAvgTicketSum).map(([regionKey, value]) => {
      return [regionKey, value.sum / value.count];
    })
  );

  const regionalQttOrder = Object.fromEntries(
    Object.entries(regionalQttOrderSum).map(([regionKey, value]) => {
      return [regionKey, value.sum / value.count];
    })
  );

  const regionalCounts = customers.reduce((acc, customer) => {
    const regionKey = getRegionKey(customer.lat, customer.long);
    if (!acc[regionKey]) {
      acc[regionKey] = { category: {}, type: {}, segment: {} };
    }
    customer.purchases.forEach((p) => {
      acc[regionKey].category[p.category] =
        (acc[regionKey].category[p.category] || 0) + 1;
      acc[regionKey].type[p.type] = (acc[regionKey].type[p.type] || 0) + 1;
      acc[regionKey].segment[p.segment] =
        (acc[regionKey].segment[p.segment] || 0) + 1;
    });
    return acc;
  }, {});

  const getTop = (counts) =>
    Object.entries(counts).reduce(
      (a, b) => (a[1] > b[1] ? a : b),
      [null, 0]
    )[0];

  const regionalStyle = Object.fromEntries(
    Object.entries(regionalCounts).map(([regionKey, counts]) => {
      return [
        regionKey,
        {
          category: getTop(counts.category),
          type: getTop(counts.type),
          segment: getTop(counts.segment),
        },
      ];
    })
  );

  customers.forEach((customer) => {
    const regionKey = getRegionKey(customer.lat, customer.long);

    // Contextualize customer by their region
    customer.regional_avg_ticket = regionalAvgTicket[regionKey];
    customer.regional_qtt_order = regionalQttOrder[regionKey];
    customer.regional_style = regionalStyle[regionKey];

    customer.purchases.forEach((purchase) => {
      const bagKey = getBagKey(purchase);
      avgTicketCount[bagKey] = (avgTicketCount[bagKey] || 0) + 1;
      qttOrderCount[bagKey] = (qttOrderCount[bagKey] || 0) + 1;

      // Use the actual buyers' profile for the bag
      avgTicketSum[bagKey] =
        (avgTicketSum[bagKey] || 0) + Number(customer.regional_avg_ticket);
      qttOrderSum[bagKey] =
        (qttOrderSum[bagKey] || 0) + Number(customer.regional_qtt_order);

      if (purchase.score !== undefined && purchase.score !== null) {
        scoreSum[bagKey] = (scoreSum[bagKey] || 0) + Number(purchase.score);
        scoreCount[bagKey] = (scoreCount[bagKey] || 0) + 1;
      }
      if (
        purchase.score_variety !== undefined &&
        purchase.score_variety !== null
      ) {
        scoreVarietySum[bagKey] =
          (scoreVarietySum[bagKey] || 0) + Number(purchase.score_variety);
        scoreVarietyCount[bagKey] = (scoreVarietyCount[bagKey] || 0) + 1;
      }
      if (
        purchase.score_quantity !== undefined &&
        purchase.score_quantity !== null
      ) {
        scoreQuantitySum[bagKey] =
          (scoreQuantitySum[bagKey] || 0) + Number(purchase.score_quantity);
        scoreQuantityCount[bagKey] = (scoreQuantityCount[bagKey] || 0) + 1;
      }
      if (
        purchase.score_quality !== undefined &&
        purchase.score_quality !== null
      ) {
        scoreQualitySum[bagKey] =
          (scoreQualitySum[bagKey] || 0) + Number(purchase.score_quality);
        scoreQualityCount[bagKey] = (scoreQualityCount[bagKey] || 0) + 1;
      }
    });

    // Normalize customer's own metrics
    customer.avg_ticket_norm = normalize(
      Number(customer.avg_ticket),
      minAvgTicket,
      maxAvgTicket
    );
    customer.qtt_order_norm = normalize(
      Number(customer.qtt_order),
      minQttOrder,
      maxQttOrder
    );
  });

  const allPurchases = customers.flatMap((c) => c.purchases || []);

  const getMinMaxScore = (field) => {
    const valid = allPurchases
      .map((p) => Number(p[field]))
      .filter((s) => !isNaN(s));
    return {
      min: valid.length ? Math.min(...valid) : 1,
      max: valid.length ? Math.max(...valid) : 5,
    };
  };

  const { min: minScore, max: maxScore } = getMinMaxScore('score');
  const { min: minScoreVariety, max: maxScoreVariety } =
    getMinMaxScore('score_variety');
  const { min: minScoreQuantity, max: maxScoreQuantity } =
    getMinMaxScore('score_quantity');
  const { min: minScoreQuality, max: maxScoreQuality } =
    getMinMaxScore('score_quality');

  // Calculate bag profile vectors (normalized)
  const bagProfiles = Object.fromEntries(
    Object.keys(avgTicketCount).map((bagKey) => {
      const getAvg = (sumMap, countMap, minVal, maxVal) => {
        return countMap[bagKey]
          ? sumMap[bagKey] / countMap[bagKey]
          : (minVal + maxVal) / 2;
      };

      const avgScoreRaw = getAvg(scoreSum, scoreCount, minScore, maxScore);
      const avgVarietyRaw = getAvg(
        scoreVarietySum,
        scoreVarietyCount,
        minScoreVariety,
        maxScoreVariety
      );
      const avgQuantityRaw = getAvg(
        scoreQuantitySum,
        scoreQuantityCount,
        minScoreQuantity,
        maxScoreQuantity
      );
      const avgQualityRaw = getAvg(
        scoreQualitySum,
        scoreQualityCount,
        minScoreQuality,
        maxScoreQuality
      );

      return [
        bagKey,
        [
          normalize(
            avgTicketSum[bagKey] / avgTicketCount[bagKey],
            minAvgTicket,
            maxAvgTicket
          ),
          normalize(
            qttOrderSum[bagKey] / qttOrderCount[bagKey],
            minQttOrder,
            maxQttOrder
          ),
          normalize(avgScoreRaw, minScore, maxScore),
          normalize(avgVarietyRaw, minScoreVariety, maxScoreVariety),
          normalize(avgQuantityRaw, minScoreQuantity, maxScoreQuantity),
          normalize(avgQualityRaw, minScoreQuality, maxScoreQuality),
        ],
      ];
    })
  );

  const categorySet = [
    ...new Set([
      ...bags.map((bag) => bag.bag_category),
      ...allPurchases.map((p) => p.category),
    ]),
  ].filter(Boolean);

  const typeSet = [
    ...new Set([
      ...bags.map((bag) => bag.bag_type),
      ...allPurchases.map((p) => p.type),
    ]),
  ].filter(Boolean);

  const segmentSet = [
    ...new Set([
      ...bags.map((bag) => bag.segment_name),
      ...allPurchases.map((p) => p.segment),
    ]),
  ].filter(Boolean);

  const categoryIndex = Object.fromEntries(
    categorySet.map((category, index) => [category, index])
  );
  const typeIndex = Object.fromEntries(
    typeSet.map((type, index) => [type, index])
  );
  const segmentIndex = Object.fromEntries(
    segmentSet.map((segment, index) => [segment, index])
  );

  const validPrices = [
    ...bags.map((bag) => Number(bag.bag_price)),
    ...allPurchases.map((p) => Number(p.price)),
  ].filter((p) => !isNaN(p));

  const minPrice = validPrices.length ? Math.min(...validPrices) : 0;
  const maxPrice = validPrices.length ? Math.max(...validPrices) : 100;

  return {
    bags,
    bagProfiles,
    customers,
    regionalStyle,
    categoryIndex,
    typeIndex,
    segmentIndex,
    metadata: {
      minPrice,
      maxPrice,
      minAvgTicket,
      maxAvgTicket,
      minQttOrder,
      maxQttOrder,
      minScore,
      maxScore,
      minScoreVariety,
      maxScoreVariety,
      minScoreQuantity,
      maxScoreQuantity,
      minScoreQuality,
      maxScoreQuality,
      numCategories: categorySet.length,
      numTypes: typeSet.length,
      numSegments: segmentSet.length,
      dimensions: categorySet.length + typeSet.length + segmentSet.length + 5,
    },
  };
}

function enhanceContext(context) {
  const bagsVector = context.bags.map((bag) => {
    return {
      bagKey: getBagKey(bag),
      meta: { ...bag },
      vector: encodeBag(bag, context),
    };
  });

  return {
    ...context,
    bagsVector,
  };
}

const oneHotWeighted = (index, length, weight) => {
  return tf.oneHot(index, length).cast('float32').mul(weight);
};

function encodeBag(bag, context) {
  // TODO: Use tf.oneHot and tf.concat to create a bag vector

  const rawPrice = Number(
    bag.price || bag.bag_price || context.metadata.minPrice
  );
  const rawScore = Number(bag.score || 3);
  const rawVariety = Number(bag.score_variety || 3);
  const rawQuantity = Number(bag.score_quantity || 3);
  const rawQuality = Number(bag.score_quality || 3);

  const price = tf.tensor1d([
    normalize(rawPrice, context.metadata.minPrice, context.metadata.maxPrice) *
      WEIGHTS.price,
  ]);
  const score = tf.tensor1d([
    normalize(rawScore, context.metadata.minScore, context.metadata.maxScore) *
      WEIGHTS.score,
  ]);
  const scoreVariety = tf.tensor1d([
    normalize(
      rawVariety,
      context.metadata.minScoreVariety,
      context.metadata.maxScoreVariety
    ) * WEIGHTS.scoreVariety,
  ]);
  const scoreQuantity = tf.tensor1d([
    normalize(
      rawQuantity,
      context.metadata.minScoreQuantity,
      context.metadata.maxScoreQuantity
    ) * WEIGHTS.scoreQuantity,
  ]);
  const scoreQuality = tf.tensor1d([
    normalize(
      rawQuality,
      context.metadata.minScoreQuality,
      context.metadata.maxScoreQuality
    ) * WEIGHTS.scoreQuality,
  ]);

  const category = oneHotWeighted(
    context.categoryIndex[bag.category || bag.bag_category],
    context.metadata.numCategories,
    WEIGHTS.category
  );
  const type = oneHotWeighted(
    context.typeIndex[bag.type || bag.bag_type],
    context.metadata.numTypes,
    WEIGHTS.type
  );
  const segment = oneHotWeighted(
    context.segmentIndex[bag.segment || bag.segment_name],
    context.metadata.numSegments,
    WEIGHTS.segment
  );
  return tf.concat1d([
    price,
    score,
    scoreVariety,
    scoreQuantity,
    scoreQuality,
    category,
    type,
    segment,
  ]);
}

function encodeCustomer(customer, context) {
  // Average bag vectors from history or use customer metadata
  if (!customer.purchases.length) {
    const defaultPrice =
      normalize(
        customer.regional_avg_ticket || 0,
        context.metadata.minPrice,
        context.metadata.maxPrice
      ) * WEIGHTS.price;

    return tf
      .concat1d([
        tf.tensor1d([defaultPrice, 0, 0, 0, 0]),
        tf.zeros([context.metadata.numCategories]),
        tf.zeros([context.metadata.numTypes]),
        tf.zeros([context.metadata.numSegments]),
      ])
      .reshape([1, context.metadata.dimensions]);
  }

  return tf
    .stack(customer.purchases.map((purchase) => encodeBag(purchase, context)))
    .mean(0)
    .reshape([1, context.metadata.dimensions]);
}

function createTrainingData(context) {
  // Generate xs (inputs) and ys (labels) tensors
  const { customers } = context;
  const inputs = [];
  const labels = [];

  customers.forEach((customer) => {
    const customerVector = encodeCustomer(customer, context).dataSync();
    const purchasedKeys = new Set(customer.purchases.map((p) => getBagKey(p)));

    // Positive examples: bags the customer actually bought
    customer.purchases.forEach((purchase) => {
      inputs.push([
        ...customerVector,
        ...encodeBag(purchase, context).dataSync(),
      ]);
      labels.push(1);
    });

    // Negative examples: some available bags the customer did NOT buy
    const unpurchasedBags = context.bags.filter(
      (b) => !purchasedKeys.has(getBagKey(b))
    );

    // Pick a number of negative examples proportional to purchases (e.g. 2x)
    // or at least 5 if they have very few purchases, to teach the model what NOT to recommend.
    const numNegatives = Math.min(
      Math.max(customer.purchases.length * 2, 5),
      unpurchasedBags.length
    );

    // Shuffle and pick top N negatives to avoid bias towards first bags in list
    const randomNegatives = unpurchasedBags
      .sort(() => 0.5 - Math.random())
      .slice(0, numNegatives);

    randomNegatives.forEach((bag) => {
      inputs.push([...customerVector, ...encodeBag(bag, context).dataSync()]);
      labels.push(0);
    });
  });

  return {
    xs: tf.tensor2d(inputs),
    ys: tf.tensor2d(labels, [labels.length, 1]),
    inputDimensions: context.metadata.dimensions * 2,
  };
}

async function configureNeuralNetAndTrain(trainingData) {
  // TODO: Create a tf.sequential model, add layers, and call model.fit()

  const model = tf.sequential();

  model.add(
    tf.layers.dense({
      inputShape: [trainingData.inputDimensions],
      units: 128,
      activation: 'relu',
    })
  );

  model.add(
    tf.layers.dense({
      units: 64,
      activation: 'relu',
    })
  );

  model.add(
    tf.layers.dense({
      units: 32,
      activation: 'relu',
    })
  );

  model.add(
    tf.layers.dense({
      units: 1,
      activation: 'sigmoid',
    })
  );

  model.compile({
    optimizer: tf.train.adam(0.01),
    loss: 'binaryCrossentropy',
    metrics: ['accuracy'],
  });

  await model.fit(trainingData.xs, trainingData.ys, {
    epochs: 20,
    batchSize: 32,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(
          'Epoch',
          epoch,
          'loss',
          logs.loss,
          'accuracy',
          logs.acc,
          logs
        );
        postMessage({
          type: workerEvents.progressUpdate,
          progress: { progress: (epoch / 100) * 100 },
        });
        postMessage({
          type: workerEvents.trainingLog,
          epoch,
          loss: logs.loss,
          accuracy: logs.acc,
        });
      },
    },
  });

  return model;
}

async function trainModel({ customers, bags }) {
  console.log('Worker: Starting Training process...');
  postMessage({ type: workerEvents.progressUpdate, progress: { progress: 5 } });

  // Using the 'bags' (availability) data provided as parameter
  let context = makeContext(bags, customers);
  context = enhanceContext(context);

  _globalCtx = context;

  const trainingData = createTrainingData(context);

  const model = await configureNeuralNetAndTrain(trainingData);

  _model = model;

  postMessage({
    type: workerEvents.progressUpdate,
    progress: { progress: 100 },
  });
  postMessage({ type: workerEvents.trainingComplete });
}

function recommend({ customer }) {
  if (!_model) {
    console.error('Worker: Model not trained');
    return;
  }

  const customerVector = encodeCustomer(customer, _globalCtx).dataSync();

  const inputs = _globalCtx.bagsVector.map((bagObj) => {
    return [...customerVector, ...bagObj.vector.dataSync()];
  });

  const scoresTensor = _model.predict(tf.tensor2d(inputs));
  const scores = scoresTensor.dataSync();

  console.log(customer, 'Scores:', scores);

  const sortedBags = _globalCtx.bagsVector
    .map((bagObj, index) => {
      return {
        ...bagObj.meta,
        bagKey: bagObj.bagKey,
        score: scores[index],
      };
    })
    .sort((a, b) => b.score - a.score);

  console.log(customer, 'Sorted Bags:', sortedBags);

  postMessage({
    type: workerEvents.recommend,
    customer,
    recommendations: sortedBags,
  });
}

const handlers = {
  [workerEvents.trainModel]: trainModel,
  [workerEvents.recommend]: recommend,
};

self.onmessage = (e) => {
  const { action, ...data } = e.data;
  if (handlers[action]) handlers[action](data);
};
