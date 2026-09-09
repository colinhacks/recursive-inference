// LIMITATION 2. Identical to 00, except the getter is written as a callback property.
// The look-ahead recognises get-accessors only, so this is invisible to it, even though
// `get x() {...}` and `x: () => ...` express the same deferred body.
// This is the shape Drizzle and TypeORM use for forward references.
import { object, array, string } from "./lib.js";

const Category = object({
  name: string(),
  subcategories: () => array(Category),
});

declare const c: (typeof Category)["out"];
const reveal: never = c;
