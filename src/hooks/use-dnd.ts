import { use } from "react";

const dndModulePromise = import("@hello-pangea/dnd");

export function useDnd() {
  return use(dndModulePromise);
}
