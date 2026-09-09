// WORKS with the fix. The one supported shape: a getter in an object literal,
// passed directly to a single-signature generic function.
import { object, array, string } from "./lib.js";

const Category = object({
  name: string(),
  get subcategories() { return array(Category); },
});

declare const c: (typeof Category)["out"];
const reveal: never = c; // deliberate: the message prints the resolved type
