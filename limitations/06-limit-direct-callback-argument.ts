// LIMITATION 6. The look-ahead walks the properties of object literals, so a callback
// passed as the whole argument is never examined. This is why z.lazy gets no benefit
// and cannot be deprecated.
import { object, array, string, lazy } from "./lib.js";

const Category = object({
  name: string(),
  subcategories: lazy(() => array(Category)),
});

declare const c: (typeof Category)["out"];
const reveal: never = c;
