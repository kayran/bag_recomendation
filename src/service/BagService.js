export class BagService {
    async getBags() {
        const response = await fetch('./data/availability.json');
        const bags = await response.json();

        return bags.map(bag => ({
            ...bag,
            partner_name: bag.name // Using the name from enriched JSON
        }));
    }

    async getBagByPartnerId(partnerId) {
        const bags = await this.getBags();
        return bags.find(bag => bag.partner_id === partnerId);
    }
}
