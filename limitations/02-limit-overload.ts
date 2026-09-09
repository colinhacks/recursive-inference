// LIMITATION 1. Identical to 00, except object() has a second overload.
// Deferral is gated on a single candidate signature, so the extra overload closes the gate.
// Affects any builder with an optional-name or optional-config overload, e.g. Drizzle's pgTable.
import { array, string, type Shape, type Schema, type Infer } from "./lib.js";

declare function object<S extends Shape>(shape: S): Schema<Infer<S>>;
declare function object<S extends Shape>(name: string, shape: S): Schema<Infer<S>>;

const Category = object({
  name: string(),
  get subcategories() { return array(Category); },
});

declare const c: (typeof Category)["out"];
const reveal: never = c;
