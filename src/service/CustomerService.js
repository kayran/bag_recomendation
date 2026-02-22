export class CustomerService {
    #storageKey = 'bag-academy-customers';

    async getDefaultCustomers() {
        const [customersResponse, ordersResponse, availabilityResponse] = await Promise.all([
            fetch('./data/customer.json'),
            fetch('./data/orders.json'),
            fetch('./data/availability.json')
        ]);

        const customers = await customersResponse.json();
        const orders = await ordersResponse.json();
        const availability = await availabilityResponse.json();

        // Join orders into customers
        const customersWithOrders = customers.map(customer => {
            return {
                id: customer.customer_id,
                name: customer.name, // Using the enriched name from JSON
                qtt_order: parseInt(customer.qtt_order),
                avg_ticket: parseFloat(customer.avg_ticket),
                purchases: orders
                    .filter(order => order.customer_id === customer.customer_id)
                    .map(order => ({
                        id: order.order_uuid,
                        partner_name: order.partner_name, // Now synchronized in data
                        segment: order.partner_segment,
                        category: order.category,
                        price: parseFloat(order.price),
                        type: order.type
                    }))
            };
        });

        this.#setStorage(customersWithOrders);
        return customersWithOrders;
    }

    async getCustomers() {
        const customers = this.#getStorage();
        if (customers.length === 0) {
            return await this.getDefaultCustomers();
        }
        return customers;
    }

    async getCustomerById(customerId) {
        const customers = await this.getCustomers();
        return customers.find(c => c.id === customerId);
    }

    async updateCustomer(customer) {
        const customers = this.#getStorage();
        const customerIndex = customers.findIndex(c => c.id === customer.id);

        if (customerIndex !== -1) {
            customers[customerIndex] = { ...customers[customerIndex], ...customer };
            this.#setStorage(customers);
        }

        return customers[customerIndex];
    }

    #getStorage() {
        const data = sessionStorage.getItem(this.#storageKey);
        return data ? JSON.parse(data) : [];
    }

    #setStorage(data) {
        sessionStorage.setItem(this.#storageKey, JSON.stringify(data));
    }
}
