import { createAuth } from "../auth";

//* Better Auth CLI の schema 生成専用。ランタイムでは import しない。
export const auth = createAuth({} as never);
