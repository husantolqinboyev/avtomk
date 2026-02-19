import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDisplayLogin(email: string | null | undefined) {
  if (!email) return "—";
  return email.replace("@avto.uz", "");
}
