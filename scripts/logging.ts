import { camelCase } from "change-case";
import { CamelCase, ComputeRange, FindKeyInStringLiteral, GetRange } from "./typeHelpers";

const Codes = {
  30: "\x1b[30m",
  31: "\x1b[31m",
  32: "\x1b[32m",
  33: "\x1b[33m",
  34: "\x1b[34m",
  35: "\x1b[35m",
  36: "\x1b[36m",
  37: "\x1b[37m",
  40: "\x1b[40m",
  41: "\x1b[41m",
  42: "\x1b[42m",
  43: "\x1b[43m",
  44: "\x1b[44m",
  45: "\x1b[45m",
  46: "\x1b[46m",
  47: "\x1b[47m",
  90: "\x1b[90m",
  91: "\x1b[91m",
  92: "\x1b[92m",
  93: "\x1b[93m",
  94: "\x1b[94m",
  95: "\x1b[95m",
  96: "\x1b[96m",
  97: "\x1b[97m",
  100: "\x1b[100m",
  101: "\x1b[101m",
  102: "\x1b[102m",
  103: "\x1b[103m",
  104: "\x1b[104m",
  105: "\x1b[105m",
  106: "\x1b[106m",
  107: "\x1b[107m",
} as const;

export const colors = (() => {
  const escape = "\x1b[";
  const reset = `${escape}0m`;
  const COLORS = {
    black: [30, 40],
    red: [31, 41],
    green: [32, 42],
    yellow: [33, 43],
    blue: [34, 44],
    magenta: [35, 45],
    cyan: [36, 46],
    white: [37, 47],
    brightBlack: [90, 100],
    brightRed: [91, 101],
    brightGreen: [92, 102],
    brightYellow: [93, 103],
    brightBlue: [94, 104],
    brightMagenta: [95, 105],
    brightCyan: [96, 106],
    brightWhite: [97, 107],
  } as const;

  type FGColorNumbers = GetRange<ComputeRange<30>, 38> | GetRange<ComputeRange<90>, 98>;
  type BGColorNumbers = GetRange<ComputeRange<40>, 48> | GetRange<ComputeRange<100>, 108>;
  type AllColorCodes = `${typeof escape}${FGColorNumbers | BGColorNumbers}m`;
  type FGColorNames = keyof typeof COLORS;
  type BGColorNames = `bg${CamelCase<FGColorNames>}`;
  type GrabColorCode<T extends string | number> = FindKeyInStringLiteral<AllColorCodes, T>;

  const getCodeCB = (codeNumber: FGColorNumbers | BGColorNumbers) => {
    const code = `${escape}${codeNumber}m`;
    const cb = (text: string, log = false) => {
      const msg = `${code}${text}${reset}`;

      log && console.log(msg);

      return msg;
    };

    // cb.code = code as GrabColorCode<`${typeof codeNumber}`>;
    cb.code = Codes[codeNumber];

    return cb;
  };

  const foreground = {} as Record<FGColorNames, ReturnType<typeof getCodeCB>>;
  const background = {} as Record<BGColorNames, ReturnType<typeof getCodeCB>>;

  Object.entries(COLORS).forEach(([key, [fg, bg]]) => {
    foreground[key] = getCodeCB(fg);
    background[camelCase(`bg-${key}`)] = getCodeCB(bg);
  });

  return { ...foreground, ...background };
})();
