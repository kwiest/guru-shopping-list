export function cleanListName(name: string): string {
  return name.toLowerCase().trim().replace(/ /g, "-");
}
