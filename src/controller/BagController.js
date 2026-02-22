export class BagController {
    #bagView;
    #currentCustomer = null;
    #events;
    #bagService;

    constructor({
        bagView,
        events,
        bagService
    }) {
        this.#bagView = bagView;
        this.#bagService = bagService;
        this.#events = events;
        this.init();
    }

    static init(deps) {
        return new BagController(deps);
    }

    async init() {
        this.setupCallbacks();
        this.setupEventListeners();
        const bags = await this.#bagService.getBags();
        this.#bagView.render(bags, true);
    }

    setupEventListeners() {
        this.#events.onCustomerSelected((customer) => {
            this.#currentCustomer = customer;
            this.#bagView.onCustomerSelected(customer);
            this.#events.dispatchRecommend(customer);
        });

        this.#events.onRecommendationsReady(({ recommendations }) => {
            this.#bagView.render(recommendations, false);
        });
    }

    setupCallbacks() {
        this.#bagView.registerBuyBagCallback(this.handleBuyBag.bind(this));
    }

    async handleBuyBag(bag) {
        const customer = this.#currentCustomer;
        this.#events.dispatchPurchaseAdded({ customer: customer, bag: bag });
    }
}
