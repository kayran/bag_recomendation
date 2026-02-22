export class BagService {
  async getBags() {
    const response = await fetch('./data/availability.json');
    const bags = await response.json();

    return bags.map((bag) => ({
      ...bag,
      partner_name: bag.name, // Using the name from enriched JSON
      segment: bag.segment_name,
      category: bag.bag_category,
      type: bag.bag_type,
    }));
  }

  async getBagByPartnerId(partnerId) {
    const bags = await this.getBags();
    return bags.find((bag) => bag.partner_id === partnerId);
  }
}
