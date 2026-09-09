// LIMITATION 5. An un-annotated callback elsewhere in the same call partially defeats it.
// Annotating the parameter restores it. `defineComponent({ props, setup(p) {} })` is this shape.
import { array, string, type Shape, type Schema, type Infer } from "./lib.js";

declare function object<S extends Shape>(shape: S, onError: (code: any) => void): Schema<Infer<S>>;

const Category = object({
  name: string(),
  get subcategories() { return array(Category); },
}, (code) => {});   // annotate as `(code: number) => {}` and this resolves

declare const c: (typeof Category)["out"];
const reveal: never = c;
