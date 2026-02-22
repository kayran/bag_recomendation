import { View } from './View.js';

export class BagView extends View {
  // DOM elements
  #productList = document.querySelector('#productList');

  #buttons;
  // Templates and callbacks
  #bagTemplate;
  #onBuyBag;

  constructor() {
    super();
    this.init();
  }

  async init() {
    this.#bagTemplate = await this.loadTemplate(
      './src/view/templates/bag-card.html'
    );
  }

  onCustomerSelected(customer) {
    // Enable buttons if a customer is selected, otherwise disable them
    this.setButtonsState(customer.id ? false : true);
  }

  registerBuyBagCallback(callback) {
    this.#onBuyBag = callback;
  }

  render(bags, disableButtons = true) {
    if (!this.#bagTemplate) return;
    const html = bags
      .map((bag) => {
        return this.replaceTemplate(this.#bagTemplate, {
          id: bag.partner_id,
          partner_name: bag.partner_name,
          type: `${this.translateBagType(bag.bag_type)}`,
          segment: bag.segment_name,
          category: bag.bag_category,
          price: bag.bag_price,
          bag: JSON.stringify(bag),
        });
      })
      .join('');

    this.#productList.innerHTML = html;
    this.attachBuyButtonListeners();

    // Disable all buttons by default
    this.setButtonsState(disableButtons);
  }
  translateBagType(bagType) {
    switch (bagType) {
      case 'SWEET':
        return 'Doce';
      case 'MIXED':
        return 'Misto';
      case 'SAVORY':
        return 'Salgado';
      default:
        return bagType;
    }
  }

  setButtonsState(disabled) {
    if (!this.#buttons) {
      this.#buttons = document.querySelectorAll('.buy-now-btn');
    }
    this.#buttons.forEach((button) => {
      button.disabled = disabled;
    });
  }

  attachBuyButtonListeners() {
    this.#buttons = document.querySelectorAll('.buy-now-btn');
    this.#buttons.forEach((button) => {
      button.addEventListener('click', (event) => {
        const bag = JSON.parse(button.dataset.bag);
        const originalText = button.innerHTML;

        button.innerHTML = '<i class="bi bi-check-circle-fill"></i> Added';
        button.classList.remove('btn-primary');
        button.classList.add('btn-success');
        setTimeout(() => {
          button.innerHTML = originalText;
          button.classList.remove('btn-success');
          button.classList.add('btn-primary');
        }, 500);
        this.#onBuyBag(bag, button);
      });
    });
  }
}
