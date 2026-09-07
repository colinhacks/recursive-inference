// Correctness assertions for the idiomatic formulation. These must FAIL to compile if the
// recursive types silently collapsed to `any`/`unknown` instead of resolving properly.
import { z, type output, type input, type $ZodObject, type $ZodArray, type $ZodString } from "../idiomatic.js";

// `IsAny` is true only for `any`; NotAny<T> is `never` (an error when used) if T is any.
type IsAny<T> = 0 extends 1 & T ? true : false;
type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

const Category = z.object({
  name: z.string(),
  get subcategories() {
    return z.array(Category);
  },
});
type Category = output<typeof Category>;

// 1. The schema itself must not be `any`.
export type _A1 = Expect<Equal<IsAny<typeof Category>, false>>;
// 2. The inferred output must not be `any`.
export type _A2 = Expect<Equal<IsAny<Category>, false>>;
// 3. The recursive structure must be exactly right, to arbitrary depth.
export type _A3 = Expect<Equal<Category["name"], string>>;
export type _A4 = Expect<Equal<Category["subcategories"], Category[]>>;
export type _A5 = Expect<Equal<Category["subcategories"][number]["subcategories"][number]["name"], string>>;
// 4. The schema type itself must be the precise generic instantiation, not a widened base.
export type _A6 = Expect<
  Equal<typeof Category, $ZodObject<{ name: $ZodString; readonly subcategories: $ZodArray<typeof Category> }>>
>;
// 5. input<> must resolve too, independently of output<>.
export type _A7 = Expect<Equal<IsAny<input<typeof Category>>, false>>;
export type _A8 = Expect<Equal<input<typeof Category>["subcategories"][number]["name"], string>>;

// 6. Real values must typecheck, and wrong ones must not.
export const good: Category = { name: "a", subcategories: [{ name: "b", subcategories: [] }] };
// @ts-expect-error `name` must be a string, so a number is rejected — proves the type is not `any`.
export const bad1: Category = { name: 123, subcategories: [] };
// @ts-expect-error nested `subcategories` is checked to arbitrary depth.
export const bad2: Category = { name: "a", subcategories: [{ name: "b", subcategories: [{ name: 1 }] }] };
// @ts-expect-error missing required property is still an error.
export const bad3: Category = { name: "a" };

// 7. Mutual recursion resolves in both directions.
const User = z.object({
  email: z.string(),
  get posts() {
    return z.array(Post);
  },
});
const Post = z.object({
  title: z.string(),
  get author() {
    return User;
  },
});
type UserT = output<typeof User>;
export type _B1 = Expect<Equal<IsAny<UserT>, false>>;
export type _B2 = Expect<Equal<UserT["posts"][number]["author"]["posts"][number]["title"], string>>;
// @ts-expect-error mutual recursion is checked, not `any`.
export const badUser: UserT = { email: "e", posts: [{ title: 1, author: { email: "x", posts: [] } }] };

// 8. Nested calls (z.nullable(z.array(...))) — fails even WITH today's hacks in real zod.
const Activity = z.object({
  name: z.string(),
  get subactivities() {
    return z.nullable(z.array(Activity));
  },
});
type ActivityT = output<typeof Activity>;
export type _C1 = Expect<Equal<IsAny<ActivityT>, false>>;
export type _C2 = Expect<Equal<ActivityT["subactivities"], ActivityT[] | null>>;
// @ts-expect-error null is allowed but a number is not.
export const badActivity: ActivityT = { name: "a", subactivities: 5 };
export const goodActivity: ActivityT = { name: "a", subactivities: [{ name: "b", subactivities: null }] };
