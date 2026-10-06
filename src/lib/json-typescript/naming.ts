import { JSON_TS_LIMITS } from "./types";

// Keep UI name validation independent of the JSON parser and inference engine.
const RESERVED = new Set((
  "abstract accessor any as assert asserts async await bigint boolean break case catch class const constructor "
  + "continue debugger declare default defer delete do else enum export extends false finally for from function "
  + "get global if implements import in infer instanceof interface intrinsic is keyof let module namespace "
  + "never new null number object of out override package private protected public readonly require return "
  + "satisfies set static string super switch symbol this throw true try type typeof undefined unique unknown "
  + "using var void while with yield eval arguments "
  + "Array ReadonlyArray Record Readonly Partial Required Pick Omit Exclude Extract NonNullable "
  + "ReturnType Parameters ConstructorParameters InstanceType ThisType ThisParameterType OmitThisParameter "
  + "Awaited NoInfer Uppercase Lowercase Capitalize Uncapitalize PropertyKey Object String Number Boolean "
  + "Function CallableFunction NewableFunction IArguments RegExp Date Error Promise PromiseLike "
  + "Map ReadonlyMap WeakMap Set ReadonlySet WeakSet WeakRef Symbol BigInt JSON Math Reflect Proxy "
  + "ArrayLike Iterable Iterator IterableIterator Generator AsyncIterable AsyncIterator AsyncGenerator "
  + "ArrayBuffer ArrayBufferLike ArrayBufferView DataView Int8Array Uint8Array Uint8ClampedArray "
  + "Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array BigInt64Array BigUint64Array"
).split(" "));
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const NESTED_NAME_CHARS = 96;

export function rootNameProblem(name: string): string | null {
  if (typeof name !== "string" || !name.length) return "Enter a root type name.";
  if (name.length > JSON_TS_LIMITS.rootNameChars) return "Use a root type name of at most 64 characters.";
  if (!IDENTIFIER.test(name)) return "Use an ASCII TypeScript identifier: letters, digits, _ or $, not starting with a digit.";
  if (RESERVED.has(name)) return "Choose a root name that is not a JavaScript/TypeScript keyword or a reserved built-in type.";
  return null;
}

// A name belongs to a structural location, never merely to a property spelling.
// Case-folded reservation also keeps Foo/foo, sanitized and truncated paths apart.
export class TypeScriptNames {
  private readonly used = new Set(Array.from(RESERVED, (name) => name.toLowerCase()));

  constructor(rootName: string) {
    this.used.add(rootName.toLowerCase());
  }

  child(parent: string, key: string): string {
    const part = key.replace(/[^A-Za-z0-9_$]+/g, " ").trim().split(/ +/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("") || "Field";
    return (parent + part).slice(0, NESTED_NAME_CHARS);
  }

  allocate(proposed: string): string {
    const base = proposed.slice(0, NESTED_NAME_CHARS);
    let name = base;
    let index = 2;
    while (this.used.has(name.toLowerCase())) {
      const suffix = String(index++);
      name = base.slice(0, NESTED_NAME_CHARS - suffix.length) + suffix;
    }
    this.used.add(name.toLowerCase());
    return name;
  }
}