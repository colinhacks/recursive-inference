// Mini-zod in the IDIOMATIC formulation the hacks exist to avoid:
// - output/input are ordinary type parameters threaded through `extends`
// - constraints name the real base interface, not a structural `SomeType`
// - `output<T>`/`input<T>` are plain indexed accesses, not deferring conditionals

export interface $ZodTypeInternals<out O = unknown, out I = unknown> {
  def: unknown;
  output: O;
  input: I;
  optin?: "optional" | undefined;
  optout?: "optional" | undefined;
}

export interface $ZodType<out O = unknown, out I = unknown> {
  _zod: $ZodTypeInternals<O, I>;
}

export type output<T extends $ZodType> = T["_zod"]["output"];
export type input<T extends $ZodType> = T["_zod"]["input"];

// ---- string ----
export interface $ZodString extends $ZodType<string, string> {}
declare function string(): $ZodString;

// ---- array ----
export interface $ZodArray<T extends $ZodType = $ZodType> extends $ZodType<output<T>[], input<T>[]> {
  element: T;
}
declare function array<T extends $ZodType>(element: T): $ZodArray<T>;

// ---- optional ----
export interface $ZodOptional<T extends $ZodType = $ZodType>
  extends $ZodType<output<T> | undefined, input<T> | undefined> {
  innerType: T;
}
declare function optional<T extends $ZodType>(inner: T): $ZodOptional<T>;

// ---- nullable ----
export interface $ZodNullable<T extends $ZodType = $ZodType> extends $ZodType<output<T> | null, input<T> | null> {
  innerType: T;
}
declare function nullable<T extends $ZodType>(inner: T): $ZodNullable<T>;

// ---- object ----
type OptionalOutSchema = { _zod: { optout: "optional" } };
type OptionalInSchema = { _zod: { optin: "optional" } };

export type $ZodShape = Readonly<{ [k: string]: $ZodType }>;

export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type $InferObjectOutput<T extends $ZodShape> = Prettify<
  {
    -readonly [k in keyof T as T[k] extends OptionalOutSchema ? never : k]: output<T[k]>;
  } & {
    -readonly [k in keyof T as T[k] extends OptionalOutSchema ? k : never]?: output<T[k]>;
  }
>;
export type $InferObjectInput<T extends $ZodShape> = Prettify<
  {
    -readonly [k in keyof T as T[k] extends OptionalInSchema ? never : k]: input<T[k]>;
  } & {
    -readonly [k in keyof T as T[k] extends OptionalInSchema ? k : never]?: input<T[k]>;
  }
>;

export interface $ZodObject<Shape extends $ZodShape = $ZodShape>
  extends $ZodType<$InferObjectOutput<Shape>, $InferObjectInput<Shape>> {
  shape: Shape;
}
declare function object<T extends $ZodShape>(shape: T): $ZodObject<T>;

export const z = { string, array, object, optional, nullable };

/* ======================= RECURSION TESTS ======================= */

// (1) plain self reference through array
const Category = z.object({
  name: z.string(),
  get subcategories() {
    return z.array(Category);
  },
});
type Category = output<typeof Category>;
export const _c: Category = { name: "a", subcategories: [{ name: "b", subcategories: [] }] };

// (2) mutual recursion
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
export type UserT = output<typeof User>;
export const _u: UserT = { email: "e", posts: [{ title: "t", author: { email: "e2", posts: [] } }] };

// (3) nested function calls
const Activity = z.object({
  name: z.string(),
  get subactivities() {
    return z.nullable(z.array(Activity));
  },
});
export type ActivityT = output<typeof Activity>;

// (4) reference through a separately-declared const
const Node1 = z.object({
  name: z.string(),
  get children() {
    return z.optional(NodeArray);
  },
});
const NodeArray = z.array(Node1);
export type Node1T = output<typeof Node1>;
