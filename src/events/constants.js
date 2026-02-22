export const events = {
  customerSelected: 'customer:selected',
  customersUpdated: 'customer:updated',
  purchaseAdded: 'purchase:added',
  purchaseRemoved: 'purchase:remove',
  modelTrain: 'training:train',
  trainingComplete: 'training:complete',

  modelProgressUpdate: 'model:progress-update',
  recommendationsReady: 'recommendations:ready',
  recommend: 'recommend',
};

export const workerEvents = {
  trainingComplete: 'training:complete',
  trainModel: 'train:model',
  recommend: 'recommend',
  trainingLog: 'training:log',
  progressUpdate: 'progress:update',
  tfVisData: 'tfvis:data',
  tfVisLogs: 'tfvis:logs',
};
