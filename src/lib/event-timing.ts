import { z } from "zod";
export const eventTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe o horário no formato HH:mm.");
export function durationFromTimes(start: string | null, end: string | null): number | null {
  if (
    !start ||
    !end ||
    !eventTimeSchema.safeParse(start.slice(0, 5)).success ||
    !eventTimeSchema.safeParse(end.slice(0, 5)).success
  )
    return null;
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  const difference = (minutes(end) - minutes(start) + 1440) % 1440;
  return difference || null;
}
export function hoursToMinutes(hours: string): number | null {
  if (!hours.trim()) return null;
  const minutes = Number(hours.replace(",", ".")) * 60;
  return Number.isFinite(minutes) &&
    Math.abs(minutes - Math.round(minutes)) < 0.000001 &&
    minutes >= 1 &&
    minutes < 1440
    ? Math.round(minutes)
    : null;
}
export function calculatedEnd(start: string, minutes: number | null) {
  if (
    !eventTimeSchema.safeParse(start).success ||
    minutes === null ||
    !Number.isInteger(minutes) ||
    minutes < 1 ||
    minutes >= 1440
  )
    return null;
  const total = Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5)) + minutes;
  return {
    time: `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`,
    nextDay: total >= 1440,
  };
}
