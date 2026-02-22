import { View } from './View.js';

export class ModelView extends View {
    #trainModelBtn = document.querySelector('#trainModelBtn');
    #purchasesArrow = document.querySelector('#purchasesArrow');
    #purchasesDiv = document.querySelector('#purchasesDiv');
    #allCustomersPurchasesList = document.querySelector('#allCustomersPurchasesList');
    #runRecommendationBtn = document.querySelector('#runRecommendationBtn');
    #onTrainModel;
    #onRunRecommendation;

    constructor() {
        super();
        this.attachEventListeners();
    }

    registerTrainModelCallback(callback) {
        this.#onTrainModel = callback;
    }
    registerRunRecommendationCallback(callback) {
        this.#onRunRecommendation = callback;
    }

    attachEventListeners() {
        this.#trainModelBtn.addEventListener('click', () => {
            if (this.#onTrainModel) this.#onTrainModel();
        });
        this.#runRecommendationBtn.addEventListener('click', () => {
            if (this.#onRunRecommendation) this.#onRunRecommendation();
        });

        this.#purchasesDiv.addEventListener('click', () => {
            const purchasesList = this.#allCustomersPurchasesList;

            const isHidden = window.getComputedStyle(purchasesList).display === 'none';

            if (isHidden) {
                purchasesList.style.display = 'block';
                this.#purchasesArrow.classList.remove('bi-chevron-down');
                this.#purchasesArrow.classList.add('bi-chevron-up');
            } else {
                purchasesList.style.display = 'none';
                this.#purchasesArrow.classList.remove('bi-chevron-up');
                this.#purchasesArrow.classList.add('bi-chevron-down');
            }
        });

    }
    enableRecommendButton() {
        this.#runRecommendationBtn.disabled = false;
    }
    updateTrainingProgress(progress) {
        this.#trainModelBtn.disabled = true;
        this.#trainModelBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Training...';

        if (progress.progress === 100) {
            this.#trainModelBtn.disabled = false;
            this.#trainModelBtn.innerHTML = '<i class="bi bi-cpu"></i> Train Model';
        }
    }

    renderAllCustomersOrders(customers) {
        const html = customers.map(customer => {
            const ordersHtml = customer.purchases.map(order => {
                return `<span class="badge bg-light text-dark me-1 mb-1">${order.name}</span>`;
            }).join('');

            return `
                <div class="customer-purchase-summary">
                    <h6>${customer.name} (Orders: ${customer.age})</h6>
                    <div class="purchases-badges">
                        ${ordersHtml || '<span class="text-muted">No orders</span>'}
                    </div>
                </div>
            `;
        }).join('');

        this.#allCustomersPurchasesList.innerHTML = html;
    }
}
