/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as days from "../days.js";
import type * as ensureCatalog from "../ensureCatalog.js";
import type * as goals from "../goals.js";
import type * as history from "../history.js";
import type * as http from "../http.js";
import type * as items from "../items.js";
import type * as lib_catalog from "../lib/catalog.js";
import type * as lib_categories from "../lib/categories.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_jst from "../lib/jst.js";
import type * as lib_movingAverage from "../lib/movingAverage.js";
import type * as lib_owner from "../lib/owner.js";
import type * as lib_preset from "../lib/preset.js";
import type * as lib_share from "../lib/share.js";
import type * as lib_sleep from "../lib/sleep.js";
import type * as lib_trash from "../lib/trash.js";
import type * as lib_validators from "../lib/validators.js";
import type * as lib_volume from "../lib/volume.js";
import type * as ownerFunctions from "../ownerFunctions.js";
import type * as presets from "../presets.js";
import type * as rows from "../rows.js";
import type * as session from "../session.js";
import type * as tonight from "../tonight.js";
import type * as trash from "../trash.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  crons: typeof crons;
  days: typeof days;
  ensureCatalog: typeof ensureCatalog;
  goals: typeof goals;
  history: typeof history;
  http: typeof http;
  items: typeof items;
  "lib/catalog": typeof lib_catalog;
  "lib/categories": typeof lib_categories;
  "lib/errors": typeof lib_errors;
  "lib/jst": typeof lib_jst;
  "lib/movingAverage": typeof lib_movingAverage;
  "lib/owner": typeof lib_owner;
  "lib/preset": typeof lib_preset;
  "lib/share": typeof lib_share;
  "lib/sleep": typeof lib_sleep;
  "lib/trash": typeof lib_trash;
  "lib/validators": typeof lib_validators;
  "lib/volume": typeof lib_volume;
  ownerFunctions: typeof ownerFunctions;
  presets: typeof presets;
  rows: typeof rows;
  session: typeof session;
  tonight: typeof tonight;
  trash: typeof trash;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
};
