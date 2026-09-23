// "Navi Mumbai" -> "navi-mumbai", "Anna Nagar (West)" -> "anna-nagar-west"
export function makeSlug(text: string) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
