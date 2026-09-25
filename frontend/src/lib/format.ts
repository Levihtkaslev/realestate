// Small text helpers used on many pages.

// price -> short text: 4500000 -> "₹45 L", 12500000 -> "₹1.25 Cr", rent -> "₹25,000/month"
export const formatPrice = (price: number, listingType: string) => {

  if (listingType === "RENT") {
    return "₹" + price.toLocaleString("en-IN") + "/month";
  }

  // 1 crore = 1,00,00,000
  if (price >= 10000000) {
    const crore = price / 10000000;
    return "₹" + Number(crore.toFixed(2)) + " Cr";
  }

  // 1 lakh = 1,00,000
  if (price >= 100000) {
    const lakh = price / 100000;
    return "₹" + Number(lakh.toFixed(2)) + " L";
  }

  return "₹" + price.toLocaleString("en-IN");
};
