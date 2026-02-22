import { View } from './View.js';

export class CustomerView extends View {
    #userSelect = document.querySelector('#userSelect');
    #userOrders = document.querySelector('#userOrders');
    #userTicket = document.querySelector('#userTicket');
    #pastPurchasesList = document.querySelector('#pastPurchasesList');

    #orderTemplate;
    #onCustomerSelect;
    #onOrderRemove;
    #pastOrderElements = [];

    constructor() {
        super();
        this.init();
    }

    async init() {
        this.#orderTemplate = await this.loadTemplate('./src/view/templates/past-order.html');
        this.attachCustomerSelectListener();
    }

    registerCustomerSelectCallback(callback) {
        this.#onCustomerSelect = callback;
    }

    registerOrderRemoveCallback(callback) {
        this.#onOrderRemove = callback;
    }

    renderCustomerOptions(customers) {
        const options = customers.map(customer => {
            return `<option value="${customer.id}">${customer.name}</option>`;
        }).join('');

        this.#userSelect.innerHTML += options;
    }

    renderCustomerDetails(customer) {
        this.#userOrders.value = customer.qtt_order;
        this.#userTicket.value = customer.avg_ticket.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    }

    renderPastOrders(pastOrders) {
        if (!this.#orderTemplate) return;

        if (!pastOrders || pastOrders.length === 0) {
            this.#pastPurchasesList.innerHTML = '<p>No past orders found.</p>';
            return;
        }

        const html = pastOrders.map(order => {
            return this.replaceTemplate(this.#orderTemplate, {
                ...order,
                bag: JSON.stringify(order)
            });
        }).join('');

        this.#pastPurchasesList.innerHTML = html;
        this.attachOrderClickHandlers();
    }

    addPastOrder(order) {
        if (this.#pastPurchasesList.innerHTML.includes('No past orders found')) {
            this.#pastPurchasesList.innerHTML = '';
        }

        const orderHtml = this.replaceTemplate(this.#orderTemplate, {
            ...order,
            bag: JSON.stringify(order)
        });

        this.#pastPurchasesList.insertAdjacentHTML('afterbegin', orderHtml);

        const newOrder = this.#pastPurchasesList.firstElementChild.querySelector('.past-purchase');
        newOrder.classList.add('past-purchase-highlight');

        setTimeout(() => {
            newOrder.classList.remove('past-purchase-highlight');
        }, 1000);

        this.attachOrderClickHandlers();
    }

    attachCustomerSelectListener() {
        this.#userSelect.addEventListener('change', (event) => {
            const customerId = event.target.value || null;

            if (customerId) {
                if (this.#onCustomerSelect) {
                    this.#onCustomerSelect(customerId);
                }
            } else {
                this.#userOrders.value = '';
                this.#userTicket.value = '';
                this.#pastPurchasesList.innerHTML = '';
            }
        });
    }

    attachOrderClickHandlers() {
        this.#pastOrderElements = [];

        const orderElements = document.querySelectorAll('.past-purchase');

        orderElements.forEach(orderElement => {
            this.#pastOrderElements.push(orderElement);

            orderElement.onclick = (event) => {
                const order = JSON.parse(orderElement.dataset.bag);
                const customerId = this.getSelectedCustomerId();
                const element = orderElement.closest('.col-md-6');

                this.#onOrderRemove({ element, customerId, order });

                element.style.transition = 'opacity 0.5s ease';
                element.style.opacity = '0';

                setTimeout(() => {
                    element.remove();
                    if (document.querySelectorAll('.past-purchase').length === 0) {
                        this.renderPastOrders([]);
                    }
                }, 500);
            }
        });
    }

    getSelectedCustomerId() {
        return this.#userSelect.value || null;
    }
}
