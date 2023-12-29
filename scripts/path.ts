import path from "node:path";

export const CWD = process.cwd();

export const getRelativeFromCWD = (...paths: string[]) =>
  path.relative(CWD, path.resolve(CWD, ...paths));
