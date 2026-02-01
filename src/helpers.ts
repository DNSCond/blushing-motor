import { EXMAScript } from "anthelpers";

export function sliceOut(string: string, start?: number, end?: number, strict: boolean = false) {
  if (string === undefined || string === null) throw new TypeError('sliceOut RequireObjectCoercible is false');
  string = `${string}`;
  const len = string.length;
  const intStart = EXMAScript.toIntegerOrInfinity(start);
  let from;
  if (strict) {
    from = intStart;
  } else {
    if (intStart === -Infinity) {
      from = 0;
    } else if (intStart < 0) {
      from = Math.max(len + intStart, 0);
    } else {
      from = Math.min(intStart, len);
    }
  }
  let intEnd;
  if (end === undefined) {
    intEnd = len;
  } else {
    intEnd = EXMAScript.toIntegerOrInfinity(end);
  }
  let to;
  if (strict) {
    to = intEnd;
  } else {
    if (intEnd === -Infinity) {
      to = 0;
    } else if (intEnd < 0) {
      to = Math.max(len + intEnd, 0);
    } else {
      to = Math.min(intEnd, len);
    }
  }
  if (from >= to) {
    if (strict) {
      throw new RangeError(`the normalized value of start (${from}) is greater than the normalized value of end (${to}) in sliceOut_String\'s strict mode`);
    } else {
      return "";
    }
  }
  if (strict) {
    if (from < 0) {
      throw new RangeError(`start is less than 0 in sliceOut_String\'s strict mode (got ${from})`);
    }
    if (to > len) {
      throw new RangeError(`end is greater than ${len} in sliceOut_String\'s strict mode (got ${to})`);
    }
  }
  return (string.slice(0, from) + string.slice(to));
}
