import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function createRequestBody(file: FileList): FormData {
  const formData = new FormData();
  formData.append("file", file[0]);
  return formData;
}