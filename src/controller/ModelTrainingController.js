export class ModelController {
  #modelView;
  #customerService;
  #bagService;
  #events;
  #currentCustomer = null;
  #alreadyTrained = false;

  constructor({ modelView, userService, bagService, events }) {
    this.#modelView = modelView;
    this.#customerService = userService;
    this.#bagService = bagService;
    this.#events = events;

    this.init();
  }

  static init(deps) {
    return new ModelController(deps);
  }

  async init() {
    this.setupCallbacks();
  }

  setupCallbacks() {
    this.#modelView.registerTrainModelCallback(
      this.handleTrainModel.bind(this)
    );
    this.#modelView.registerRunRecommendationCallback(
      this.handleRunRecommendation.bind(this)
    );

    this.#events.onCustomerSelected((customer) => {
      this.#currentCustomer = customer;
      if (!this.#alreadyTrained) return;
      this.#modelView.enableRecommendButton();
    });

    this.#events.onTrainingComplete(() => {
      this.#alreadyTrained = true;
      if (!this.#currentCustomer) return;
      this.#modelView.enableRecommendButton();
    });

    this.#events.onCustomersUpdated(async (...data) => {
      return this.refreshCustomersOrderData(...data);
    });
    this.#events.onProgressUpdate((progress) => {
      this.handleTrainingProgressUpdate(progress);
    });
  }

  async handleTrainModel() {
    const [customers, bags] = await Promise.all([
      this.#customerService.getCustomers(),
      this.#bagService.getBags(),
    ]);
    this.#events.dispatchTrainModel({ customers, bags });
  }

  handleTrainingProgressUpdate(progress) {
    this.#modelView.updateTrainingProgress(progress);
  }

  async handleRunRecommendation() {
    const currentCustomer = this.#currentCustomer;
    const updatedCustomer = await this.#customerService.getCustomerById(
      currentCustomer.id
    );
    this.#events.dispatchRecommend(updatedCustomer);
  }

  async refreshCustomersOrderData({ customers }) {
    this.#modelView.renderAllCustomersOrders(customers);
  }
}
