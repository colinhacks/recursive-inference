// The workaround users pay today, and what Drizzle documents:
// `references((): AnyPgColumn => employees.id)`. The explicit return type is the tax.
// Compiles clean on both compilers — included as the control for 03.
import { object, array, string, type Schema } from "./lib.js";

type CategoryOut = { name: string; subcategories: any[] };
const Category = object({
  name: string(),
  subcategories: (): Schema<CategoryOut[]> => array(Category),
});

declare const c: (typeof Category)["out"];
const reveal: never = c;
