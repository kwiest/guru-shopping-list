import { cleanListName } from "./clean-list-name";

// Naive test; not exhaustive.
test("Cleaning shopping list names", () => {
  const expected = "my-shopping-list";

  const aSimpleName = "My Shopping List";
  expect(cleanListName(aSimpleName)).toBe(expected);

  const trailingSpace = "My Shopping List ";
  expect(cleanListName(trailingSpace)).toBe(expected);

  const leadingSpace = " My Shopping List";
  expect(cleanListName(leadingSpace)).toBe(expected);
});
