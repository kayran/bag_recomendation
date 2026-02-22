export class CustomerController {
    #customerService;
    #customerView;
    #events;

    constructor({
        userView,
        userService,
        events,
    }) {
        this.#customerView = userView;
        this.#customerService = userService;
        this.#events = events;
    }

    static init(deps) {
        return new CustomerController(deps);
    }

    async renderCustomers() {
        const customers = await this.#customerService.getDefaultCustomers();

        this.#customerView.renderCustomerOptions(customers);
        this.setupCallbacks();
        this.setupOrderObserver();

        this.#events.dispatchUsersUpdated({ users: customers });
    }

    setupCallbacks() {
        this.#customerView.registerCustomerSelectCallback(this.handleCustomerSelect.bind(this));
        this.#customerView.registerOrderRemoveCallback(this.handleOrderRemove.bind(this));
    }

    setupOrderObserver() {
        this.#events.onPurchaseAdded(
            async (...data) => {
                return this.handleOrderAdded(...data);
            }
        );
    }

    async handleCustomerSelect(customerId) {
        const customer = await this.#customerService.getCustomerById(customerId);
        this.#events.dispatchUserSelected(customer);
        return this.displayCustomerDetails(customer);
    }

    async handleOrderAdded({ user, product }) {
        const updatedCustomer = await this.#customerService.getCustomerById(user.id);
        updatedCustomer.purchases.push({
            ...product
        });

        await this.#customerService.updateCustomer(updatedCustomer);

        const lastOrder = updatedCustomer.purchases[updatedCustomer.purchases.length - 1];
        this.#customerView.addPastOrder(lastOrder);
        this.#events.dispatchUsersUpdated({ users: await this.#customerService.getCustomers() });
    }

    async handleOrderRemove({ customerId, order }) {
        const customer = await this.#customerService.getCustomerById(customerId);
        const index = customer.purchases.findIndex(item => item.id === order.id);

        if (index !== -1) {
            customer.purchases.splice(index, 1);
            await this.#customerService.updateCustomer(customer);
            const updatedCustomers = await this.#customerService.getCustomers();
            this.#events.dispatchUsersUpdated({ users: updatedCustomers });
        }
    }

    async displayCustomerDetails(customer) {
        this.#customerView.renderCustomerDetails(customer);
        this.#customerView.renderPastOrders(customer.purchases);
    }
}
