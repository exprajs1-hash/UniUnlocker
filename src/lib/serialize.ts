/** Turns a lean Mongoose doc into a plain JSON object with `id` instead of `_id`. */
export function serialize<T>(doc: unknown): T {
  const { _id, __v, key, ...rest } = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
  void __v;
  void key;
  return (_id ? { id: String(_id), ...rest } : rest) as T;
}

export function serializeMany<T>(docs: unknown[]): T[] {
  return docs.map((doc) => serialize<T>(doc));
}
