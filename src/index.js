import { CustomerController } from './controller/CustomerController.js';
import { BagController } from './controller/BagController.js';
import { ModelController } from './controller/ModelTrainingController.js';
import { TFVisorController } from './controller/TFVisorController.js';
import { TFVisorView } from './view/TFVisorView.js';
import { CustomerService } from './service/CustomerService.js';
import { BagService } from './service/BagService.js';
import { CustomerView } from './view/CustomerView.js';
import { BagView } from './view/BagView.js';
import { ModelView } from './view/ModelTrainingView.js';
import Events from './events/events.js';
import { WorkerController } from './controller/WorkerController.js';

// Create shared services
const customerService = new CustomerService();
const bagService = new BagService();

// Create views
const customerView = new CustomerView();
const bagView = new BagView();
const modelView = new ModelView();
const tfVisorView = new TFVisorView();
const mlWorker = new Worker('/src/workers/modelTrainingWorker.js', { type: 'module' });

// Set up worker message handler
const w = WorkerController.init({
    worker: mlWorker,
    events: Events
});

const users = await customerService.getDefaultCustomers();
w.triggerTrain(users);


ModelController.init({
    modelView,
    userService: customerService,
    events: Events,
});

TFVisorController.init({
    tfVisorView,
    events: Events,
});

BagController.init({
    bagView,
    userService: customerService,
    bagService,
    events: Events,
});


const userController = CustomerController.init({
    userView: customerView,
    userService: customerService,
    events: Events,
});


userController.renderCustomers();
