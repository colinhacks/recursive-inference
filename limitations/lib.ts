// A miniature schema library, cut down from Zod. The shape permits either a schema
// or a callback returning one, the way Drizzle and TypeORM declare theirs.
export interface Schema<O> { readonly out: O }
export type Shape = Record<string, Schema<any> | (() => Schema<any>)>;
type Resolve<T> = T extends () => infer R ? R : T;
export type Infer<S extends Shape> = { [K in keyof S]: Resolve<S[K]> extends Schema<infer O> ? O : never };

export declare function object<S extends Shape>(shape: S): Schema<Infer<S>>;
export declare function array<T extends Schema<any>>(el: T): Schema<T["out"][]>;
export declare function string(): Schema<string>;
export declare function lazy<T extends Schema<any>>(fn: () => T): T;
