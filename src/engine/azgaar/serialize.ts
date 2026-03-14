function isTypedArray(value: unknown) {
  return ArrayBuffer.isView(value) && !(value instanceof DataView);
}

export function toSerializableAzgaarWorld<T>(input: T): T {
  const seen = new WeakMap<object, any>();

  const visit = (value: any): any => {
    if (value === null || value === undefined) return value;
    if (typeof value === "function") return undefined;
    if (typeof value !== "object") return value;
    if (isTypedArray(value)) return Array.from(value as ArrayLike<number>);
    if (value instanceof Date) return value.toISOString();
    if (value instanceof Map) return Object.fromEntries([...value.entries()].map(([k, v]) => [k, visit(v)]));
    if (value instanceof Set) return [...value].map(visit);
    if (value.constructor?.name === "Quadtree") return undefined;
    if (seen.has(value)) return seen.get(value);

    if (Array.isArray(value)) {
      const arr: any[] = [];
      seen.set(value, arr);
      for (const item of value) arr.push(visit(item));
      return arr;
    }

    const obj: Record<string, any> = {};
    seen.set(value, obj);
    for (const [key, nested] of Object.entries(value)) {
      if (key === "q") continue;
      const serialized = visit(nested);
      if (serialized !== undefined) obj[key] = serialized;
    }
    return obj;
  };

  return visit(input);
}
