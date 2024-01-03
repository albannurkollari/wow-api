import { camelCase } from "change-case";
import { CamelCase, ComputeRange, GetRange } from "./typeHelpers";

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

  const getCodeCB = (codeNumber: FGColorNumbers | BGColorNumbers) => {
    const code = `${escape}${codeNumber}m`;
    const cb = (text: string, log = false) => {
      const msg = `${code}${text}${reset}`;

      log && console.log(msg);

      return msg;
    };

    cb.code = code as AllColorCodes;

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
