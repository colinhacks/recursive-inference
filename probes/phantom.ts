// Are $ZodType's O/I parameters observable, or purely a declaration-site constraint?
interface Internals<O, I> { output: O; input: I }
interface Base<O = unknown, I = unknown, T extends Internals<O, I> = Internals<O, I>> { _zod: T }

interface ArrInternals<E> extends Internals<E[], E[]> {}

interface ArrPhantom<E> extends Base<any, any, ArrInternals<E>> {}   // what zod ships
interface ArrHonest<E> extends Base<E[], E[], ArrInternals<E>> {}    // the "derived" form

declare function wantsStrings<T extends Base<string[]>>(x: T): T;
declare function wantsNumbers<T extends Base<number[]>>(x: T): T;

declare const p: ArrPhantom<string>;
declare const h: ArrHonest<string>;

wantsStrings(p);   // must be accepted
wantsStrings(h);   // must be accepted
wantsNumbers(p);   // must be REJECTED -- if it is not, the phantom form loses safety
wantsNumbers(h);   // must be REJECTED
