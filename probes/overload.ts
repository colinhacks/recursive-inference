// No recursion anywhere. A getter whose type is perfectly resolvable.
declare function f(x: { [k: string]: number }): "num";
declare function f(x: object): "obj";

const picked = f({
  get s() {
    return "hello";
  },
});

// `s` is a string, so the first overload must NOT match: the result must be "obj".
const check: "obj" = picked;
