// LIMITATION 3. A spread in the recursive literal.
// Not a regression: this fails on shipped Zod too, with its workarounds in place.
// It matters because spreading is the documented way to extend a schema.
import { object, array, string } from "./lib.js";

const base = { name: string() };
const Category = object({
  ...base,
  get subcategories() { return array(Category); },
});

declare const c: (typeof Category)["out"];
const reveal: never = c;
