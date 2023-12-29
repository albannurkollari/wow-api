import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as prettier from "prettier";
import { getRelativeFromCWD } from "./path";
import * as changeCase from "change-case";

type TOptions = { isRelative?: boolean };
// type TRead = {
//   (path: string, options?: TOptions): string;
//   (path: string[][], options?: TOptions): string[][];
//   (path: Record<string, string>, options?: TOptions): Record<string, string>;
// };

/* SYNC */
function readSync(path: string, options?: TOptions): string;
function readSync(path: string[][], options?: TOptions): string[][];
function readSync(path: Record<string, string>, options?: TOptions): Record<string, string>;
function readSync(
  _path: string | string[][] | Record<string, string>,
  _options?: TOptions,
): string | string[][] | Record<string, string> {
  const { isRelative = true } = _options ?? {};

  if (typeof _path === "string") {
    const newPath = isRelative ? getRelativeFromCWD(_path) : _path;

    return readFileSync(newPath, { encoding: "utf-8" }) as string;
  } else if (Array.isArray(_path) && _path.every((x) => typeof x === "string")) {
    return _path.map(([key, value]) => [key, File.sync.read(value, _options) as string]);
  } else if (typeof _path === "object") {
    return Object.entries(_path as Record<string, string>).reduce((acc, [key, value]) => {
      acc[key] = File.sync.read(value, _options) as string;

      return acc;
    }, {});
  }

  throw new Error("Unsupported type of file read!");
}

/* ASYNC */
const writeToFile = (() => {
  async function handleWriteFile(filePath: string, content: string) {
    try {
      const directoryPath = path.dirname(filePath);

      await mkdir(directoryPath, { recursive: true });
      await writeFile(filePath, content, { encoding: "utf-8" });

      console.log(`✅ File created successfully!\n ${filePath}`);
    } catch (err) {
      console.error("❌ Error writing to file:", err);
    }
  }

  return (jsonData = {}, fileName: string) =>
    prettier
      .resolveConfig("./.prettierrc.json")
      .then((options) => prettier.format(JSON.stringify(jsonData), { ...options, parser: "json" }))
      .then((data) => handleWriteFile(fileName, data));
})();

const getFileName = (() => {
  /** Sub folder under `/data/` folder. Defaults to `auctions`.   */
  type SubFolder = "auctions" | "items";
  type FileNameOptions = {
    /** _(Optional)_ Casing format to be applied. Defaults to `kebab`. */
    case: "kebab" | "snake" | "camel" | "pascal";
    /** _(Optional)_ Extension of the file. Defaults to `json`. */
    ext: "json" | "txt";
  };

  return (
    rawFileName: string,
    subFolder: SubFolder = "auctions",
    options?: Partial<FileNameOptions>,
  ) => {
    const { case: casing, ext: extension } = options ?? { case: "kebab", ext: "json" };
    const toCase = changeCase[`${casing}Case`];

    return `./data/${subFolder}/${toCase(rawFileName)}.${extension}`;
  };
})();

export const File = {
  utils: { getName: getFileName },
  sync: { read: readSync },
  async: { write: writeToFile },
};