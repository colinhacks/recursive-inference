// WORKS with the fix. Mutual recursion, same shape.
import { object, array, string } from "./lib.js";

const User = object({ name: string(), get posts() { return array(Post); } });
const Post = object({ title: string(), get author() { return User; } });

declare const u: (typeof User)["out"];
const reveal: never = u;
