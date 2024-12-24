import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  DEFAULT_EFFECTS_ROOT_FOLDER_ID,
  ORGANIZED_EFFECTS_ROOT_FOLDER_ID,
  DEFAULT_GENERATORS_ROOT_FOLDER_ID,
  ORGANIZED_GENERATORS_ROOT_FOLDER_ID,
} from "./utils/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createRequestBody(file: FileList): FormData {
  const formData = new FormData();
  formData.append("file", file[0]);
  return formData;
}

export function getTypeFromContainerId(
  containerId: string
): "effects" | "generators" {
  if (
    containerId === DEFAULT_EFFECTS_ROOT_FOLDER_ID ||
    containerId === ORGANIZED_EFFECTS_ROOT_FOLDER_ID
  ) {
    return "effects";
  } else if (
    containerId === DEFAULT_GENERATORS_ROOT_FOLDER_ID ||
    containerId === ORGANIZED_GENERATORS_ROOT_FOLDER_ID
  ) {
    return "generators";
  }
  return "effects";
}
