import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
import { workerEvents } from '../events/constants.js';

let _globalCtx = {};
let _model = null;

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
        (avgTicketSum[bagKey] || 0) + Number(customer.avg_ticket);
      qttOrderSum[bagKey] =
        (qttOrderSum[bagKey] || 0) + Number(customer.qtt_order);
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

  // Calculate bag profile vectors (normalized)
  const bagProfiles = Object.fromEntries(
    Object.keys(avgTicketCount).map((bagKey) => {
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
        ],
      ];
    })
  );

  const allPurchases = customers.flatMap((c) => c.purchases || []);

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
  debugger; 

  return {
    bags,
    bagProfiles,
    customers,
    regionalStyle,
    categoryIndex,
    typeIndex,
    segmentIndex,
    metadata: {
      minAvgTicket,
      maxAvgTicket,
      minQttOrder,
      maxQttOrder,
    },
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
  const context = makeContext(bags, customers);

  debugger;

  // TODO: Implement the training pipeline below:
  // 1. const context = makeContext(bags_list, customers);
  // 2. const trainingData = createTrainingData(context);
  // 3. _model = await configureNeuralNetAndTrain(trainingData);

  postMessage({
    type: workerEvents.progressUpdate,
    progress: { progress: 100 },
  });
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

self.onmessage = (e) => {
  const { action, ...data } = e.data;
  if (handlers[action]) handlers[action](data);
};
