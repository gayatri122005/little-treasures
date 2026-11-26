export function categoryMatches(
  productCategory: string | null,
  selectedCategory: string,
) {
  if (!productCategory) return false;
  const normalize = (value: string) => value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
  return normalize(productCategory) === normalize(selectedCategory);
}
