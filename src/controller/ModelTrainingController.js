export class ModelController {
    #modelView;
    #customerService;
    #events;
    #currentCustomer = null;
    #alreadyTrained = false;

    constructor({
        modelView,
        userService,
        events,
    }) {
        this.#modelView = modelView;
        this.#customerService = userService;
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
        this.#modelView.registerTrainModelCallback(this.handleTrainModel.bind(this));
        this.#modelView.registerRunRecommendationCallback(this.handleRunRecommendation.bind(this));

        this.#events.onUserSelected((customer) => {
            this.#currentCustomer = customer;
            if (!this.#alreadyTrained) return;
            this.#modelView.enableRecommendButton();
        });

        this.#events.onTrainingComplete(() => {
            this.#alreadyTrained = true;
            if (!this.#currentCustomer) return;
            this.#modelView.enableRecommendButton();
        });

        this.#events.onUsersUpdated(
            async (...data) => {
                return this.refreshCustomersOrderData(...data);
            }
        );
        this.#events.onProgressUpdate(
            (progress) => {
                this.handleTrainingProgressUpdate(progress);
            }
        );
    }

    async handleTrainModel() {
        const customers = await this.#customerService.getCustomers();
        this.#events.dispatchTrainModel(customers);
    }

    handleTrainingProgressUpdate(progress) {
        this.#modelView.updateTrainingProgress(progress);
    }

    async handleRunRecommendation() {
        const currentCustomer = this.#currentCustomer;
        const updatedCustomer = await this.#customerService.getCustomerById(currentCustomer.id);
        this.#events.dispatchRecommend(updatedCustomer);
    }

    async refreshCustomersOrderData({ users }) {
        this.#modelView.renderAllCustomersOrders(users);
    }
}
