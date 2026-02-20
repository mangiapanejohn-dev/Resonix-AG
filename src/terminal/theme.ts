import chalk, { Chalk } from "chalk";
import { RESONIX_PALETTE } from "./palette.js";

const hasForceColor =
  typeof process.env.FORCE_COLOR === "string" &&
  process.env.FORCE_COLOR.trim().length > 0 &&
  process.env.FORCE_COLOR.trim() !== "0";

const baseChalk = process.env.NO_COLOR && !hasForceColor ? new Chalk({ level: 0 }) : chalk;

const hex = (value: string) => baseChalk.hex(value);

export const theme = {
  accent: hex(RESONIX_PALETTE.accent),
  accentBright: hex(RESONIX_PALETTE.accentBright),
  accentDim: hex(RESONIX_PALETTE.accentDim),
  info: hex(RESONIX_PALETTE.info),
  success: hex(RESONIX_PALETTE.success),
  warn: hex(RESONIX_PALETTE.warn),
  error: hex(RESONIX_PALETTE.error),
  muted: hex(RESONIX_PALETTE.muted),
  heading: baseChalk.bold.hex(RESONIX_PALETTE.accent),
  command: hex(RESONIX_PALETTE.accentBright),
  option: hex(RESONIX_PALETTE.warn),
} as const;

export const isRich = () => Boolean(baseChalk.level > 0);

export const colorize = (rich: boolean, color: (value: string) => string, value: string) =>
  rich ? color(value) : value;
