// Mini-zod faithful to zod v4's CURRENT formulation: the "sketchy" one.
// - `SomeType` structural constraint instead of the real base interface
// - `interface X extends $ZodType { _zod: XInternals<T> }` property override
// - `input`/`output` as deferring conditional types

export interface _$ZodTypeInternals {
  def: unknown;
  optin?: "optional" | undefined;
  optout?: "optional" | undefined;
}

export interface $ZodTypeInternals<out O = unknown, out I = unknown> extends _$ZodTypeInternals {
  output: O;
  input: I;
}

export type SomeType = { _zod: _$ZodTypeInternals };

export type output<T> = T extends { _zod: { output: any } } ? T["_zod"]["output"] : unknown;
export type input<T> = T extends { _zod: { input: any } } ? T["_zod"]["input"] : unknown;

export interface $ZodType<O = unknown, I = unknown, Internals extends $ZodTypeInternals<O, I> = $ZodTypeInternals<O, I>> {
  _zod: Internals;
}

// ---- string ----
export interface $ZodStringInternals extends $ZodTypeInternals<string, string> {
  def: { type: "string" };
}
export interface $ZodString extends $ZodType {
  _zod: $ZodStringInternals;
}
declare function string(): $ZodString;

// ---- array ----
export interface $ZodArrayInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<output<T>[], input<T>[]> {
  def: { type: "array"; element: T };
}
export interface $ZodArray<T extends SomeType = $ZodType> extends $ZodType {
  _zod: $ZodArrayInternals<T>;
}
declare function array<T extends SomeType>(element: T): $ZodArray<T>;

// ---- optional ----
export interface $ZodOptionalInternals<T extends SomeType = $ZodType>
  extends $ZodTypeInternals<output<T> | undefined, input<T> | undefined> {
  def: { type: "optional"; innerType: T };
  optin: "optional";
  optout: "optional";
}
export interface $ZodOptional<T extends SomeType = $ZodType> extends $ZodType {
  _zod: $ZodOptionalInternals<T>;
}
declare function optional<T extends SomeType>(inner: T): $ZodOptional<T>;

// ---- nullable ----
export interface $ZodNullableInternals<T extends SomeType = $ZodType>
  extends $ZodTypeInternals<output<T> | null, input<T> | null> {
  def: { type: "nullable"; innerType: T };
}
export interface $ZodNullable<T extends SomeType = $ZodType> extends $ZodType {
  _zod: $ZodNullableInternals<T>;
}
declare function nullable<T extends SomeType>(inner: T): $ZodNullable<T>;

// ---- object ----
type OptionalOutSchema = { _zod: { optout: "optional" } };
type OptionalInSchema = { _zod: { optin: "optional" } };

export type $ZodShape = Readonly<{ [k: string]: $ZodType }>;
export type $ZodLooseShape = Readonly<{ [k: string]: any }>;

export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type $InferObjectOutput<T extends $ZodLooseShape> = Prettify<
  {
    -readonly [k in keyof T as T[k] extends OptionalOutSchema ? never : k]: T[k]["_zod"]["output"];
  } & {
    -readonly [k in keyof T as T[k] extends OptionalOutSchema ? k : never]?: T[k]["_zod"]["output"];
  }
>;
export type $InferObjectInput<T extends $ZodLooseShape> = Prettify<
  {
    -readonly [k in keyof T as T[k] extends OptionalInSchema ? never : k]: T[k]["_zod"]["input"];
  } & {
    -readonly [k in keyof T as T[k] extends OptionalInSchema ? k : never]?: T[k]["_zod"]["input"];
  }
>;

export interface $ZodObjectInternals<Shape extends $ZodShape = $ZodShape> extends _$ZodTypeInternals {
  def: { type: "object"; shape: Shape };
  output: $InferObjectOutput<Shape>;
  input: $InferObjectInput<Shape>;
}
export interface $ZodObject<Shape extends $ZodShape = $ZodShape> extends $ZodType {
  _zod: $ZodObjectInternals<Shape>;
}
declare function object<T extends $ZodShape>(shape: T): $ZodObject<T>;

export const z = { string, array, object, optional, nullable };

/* ======================= RECURSION TESTS ======================= */

// (1) plain self reference through array — documented to work
const Category = z.object({
  name: z.string(),
  get subcategories() {
    return z.array(Category);
  },
});
type Category = output<typeof Category>;
export const _c: Category = { name: "a", subcategories: [{ name: "b", subcategories: [] }] };

// (2) mutual recursion — documented to work
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

// (3) nested function calls — documented to FAIL with TS7023
const Activity = z.object({
  name: z.string(),
  get subactivities() {
    return z.nullable(z.array(Activity));
  },
});
export type ActivityT = output<typeof Activity>;

// (4) reference through a separately-declared const — documented to FAIL
const Node1 = z.object({
  name: z.string(),
  get children() {
    return z.optional(NodeArray);
  },
});
const NodeArray = z.array(Node1);
export type Node1T = output<typeof Node1>;
