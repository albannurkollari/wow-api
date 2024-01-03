export type OmitKeys<T, K extends keyof T> = Omit<T, K>;
export type ComputeRange<
  N extends Omit<number, 0>,
  Result extends Array<unknown> = [],
> = Result["length"] extends N ? Result[number] : ComputeRange<N, [...Result, Result["length"]]>;
export type GetRange<N1 extends number, N2 extends number> = Exclude<ComputeRange<N2>, N1>;
export type GetPositiveRange<N extends number> = GetRange<0, N>;
export type UppercaseFirstLetter<S extends string> = S extends `${infer First}${infer Rest}`
  ? `${Uppercase<First>}${Rest}`
  : S;

export type CamelCase<S extends string> = S extends `${infer Prefix}_${infer Suffix}`
  ? `${UppercaseFirstLetter<Prefix>}${CamelCase<Suffix>}`
  : UppercaseFirstLetter<S>;
