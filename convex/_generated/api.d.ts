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
import type * as http from "../http.js";
import type * as lib_catalog from "../lib/catalog.js";
import type * as lib_catalogLoader from "../lib/catalogLoader.js";
import type * as lib_categories from "../lib/categories.js";
import type * as lib_categoryFields from "../lib/categoryFields.js";
import type * as lib_concreteAction from "../lib/concreteAction.js";
import type * as lib_concreteActionCore from "../lib/concreteActionCore.js";
import type * as lib_conditions from "../lib/conditions.js";
import type * as lib_dateArgs from "../lib/dateArgs.js";
import type * as lib_domain from "../lib/domain.js";
import type * as lib_env from "../lib/env.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_historyBreakdown from "../lib/historyBreakdown.js";
import type * as lib_itemOrder from "../lib/itemOrder.js";
import type * as lib_itemSort from "../lib/itemSort.js";
import type * as lib_jst from "../lib/jst.js";
import type * as lib_movingAverage from "../lib/movingAverage.js";
import type * as lib_owner from "../lib/owner.js";
import type * as lib_ownerFunctions from "../lib/ownerFunctions.js";
import type * as lib_preset from "../lib/preset.js";
import type * as lib_share from "../lib/share.js";
import type * as lib_trash from "../lib/trash.js";
import type * as lib_validators from "../lib/validators.js";
import type * as lib_volume from "../lib/volume.js";
import type * as mutations_catalog_ensure from "../mutations/catalog/ensure.js";
import type * as mutations_categories_create from "../mutations/categories/create.js";
import type * as mutations_categories_remove from "../mutations/categories/remove.js";
import type * as mutations_categories_rename from "../mutations/categories/rename.js";
import type * as mutations_days_open from "../mutations/days/open.js";
import type * as mutations_days_setCondition from "../mutations/days/setCondition.js";
import type * as mutations_days_setMemo from "../mutations/days/setMemo.js";
import type * as mutations_goals_create from "../mutations/goals/create.js";
import type * as mutations_goals_createObstacle from "../mutations/goals/createObstacle.js";
import type * as mutations_goals_recomputeMasteryProgress from "../mutations/goals/recomputeMasteryProgress.js";
import type * as mutations_goals_remove from "../mutations/goals/remove.js";
import type * as mutations_goals_removeObstacle from "../mutations/goals/removeObstacle.js";
import type * as mutations_goals_setAchieved from "../mutations/goals/setAchieved.js";
import type * as mutations_goals_update from "../mutations/goals/update.js";
import type * as mutations_goals_updateObstacle from "../mutations/goals/updateObstacle.js";
import type * as mutations_items_applyOrder from "../mutations/items/applyOrder.js";
import type * as mutations_items_create from "../mutations/items/create.js";
import type * as mutations_items_remove from "../mutations/items/remove.js";
import type * as mutations_items_rename from "../mutations/items/rename.js";
import type * as mutations_presets_create from "../mutations/presets/create.js";
import type * as mutations_presets_remove from "../mutations/presets/remove.js";
import type * as mutations_presets_update from "../mutations/presets/update.js";
import type * as mutations_rows_add from "../mutations/rows/add.js";
import type * as mutations_rows_confirm from "../mutations/rows/confirm.js";
import type * as mutations_rows_remove from "../mutations/rows/remove.js";
import type * as mutations_rows_restore from "../mutations/rows/restore.js";
import type * as mutations_rows_skip from "../mutations/rows/skip.js";
import type * as mutations_rows_switchPreset from "../mutations/rows/switchPreset.js";
import type * as mutations_targets_remove from "../mutations/targets/remove.js";
import type * as mutations_targets_save from "../mutations/targets/save.js";
import type * as mutations_trash_purgeDay from "../mutations/trash/purgeDay.js";
import type * as mutations_trash_purgeExpired from "../mutations/trash/purgeExpired.js";
import type * as mutations_trash_purgeRow from "../mutations/trash/purgeRow.js";
import type * as mutations_trash_removeDay from "../mutations/trash/removeDay.js";
import type * as mutations_trash_restoreDay from "../mutations/trash/restoreDay.js";
import type * as queries_categories_list from "../queries/categories/list.js";
import type * as queries_days_get from "../queries/days/get.js";
import type * as queries_goals_list from "../queries/goals/list.js";
import type * as queries_goals_listObstacles from "../queries/goals/listObstacles.js";
import type * as queries_history_dayBreakdown from "../queries/history/dayBreakdown.js";
import type * as queries_history_month from "../queries/history/month.js";
import type * as queries_history_monthBreakdown from "../queries/history/monthBreakdown.js";
import type * as queries_history_week from "../queries/history/week.js";
import type * as queries_history_weekBreakdown from "../queries/history/weekBreakdown.js";
import type * as queries_history_yearHeatmap from "../queries/history/yearHeatmap.js";
import type * as queries_items_list from "../queries/items/list.js";
import type * as queries_items_recentConcreteActions from "../queries/items/recentConcreteActions.js";
import type * as queries_presets_list from "../queries/presets/list.js";
import type * as queries_session_get from "../queries/session/get.js";
import type * as queries_targets_listWithProgress from "../queries/targets/listWithProgress.js";
import type * as queries_trash_list from "../queries/trash/list.js";
import type * as services_catalog_backfillItemSortOrders from "../services/catalog/backfillItemSortOrders.js";
import type * as services_catalog_ensure from "../services/catalog/ensure.js";
import type * as services_catalog_ensureCatalog from "../services/catalog/ensureCatalog.js";
import type * as services_categories_create from "../services/categories/create.js";
import type * as services_categories_list from "../services/categories/list.js";
import type * as services_categories_remove from "../services/categories/remove.js";
import type * as services_categories_rename from "../services/categories/rename.js";
import type * as services_days_collapseExtraLiveDays from "../services/days/collapseExtraLiveDays.js";
import type * as services_days_getDayByDate from "../services/days/getDayByDate.js";
import type * as services_days_getDayPage from "../services/days/getDayPage.js";
import type * as services_days_getLiveDay from "../services/days/getLiveDay.js";
import type * as services_days_liveRowsForDay from "../services/days/liveRowsForDay.js";
import type * as services_days_openDay from "../services/days/openDay.js";
import type * as services_days_requireEditableDay from "../services/days/requireEditableDay.js";
import type * as services_days_requireLiveDay from "../services/days/requireLiveDay.js";
import type * as services_days_setCondition from "../services/days/setCondition.js";
import type * as services_days_setMemo from "../services/days/setMemo.js";
import type * as services_days_toRowDtos from "../services/days/toRowDtos.js";
import type * as services_goals_applyMasteryProgressDelta from "../services/goals/applyMasteryProgressDelta.js";
import type * as services_goals_assertGoalInput from "../services/goals/assertGoalInput.js";
import type * as services_goals_create from "../services/goals/create.js";
import type * as services_goals_createObstacle from "../services/goals/createObstacle.js";
import type * as services_goals_list from "../services/goals/list.js";
import type * as services_goals_listObstacles from "../services/goals/listObstacles.js";
import type * as services_goals_loadDayTotals from "../services/goals/loadDayTotals.js";
import type * as services_goals_masteryDayTotals from "../services/goals/masteryDayTotals.js";
import type * as services_goals_masteryProgress from "../services/goals/masteryProgress.js";
import type * as services_goals_masteryProgressOf from "../services/goals/masteryProgressOf.js";
import type * as services_goals_recomputeMasteryProgress from "../services/goals/recomputeMasteryProgress.js";
import type * as services_goals_recomputeMasteryProgressForOwner from "../services/goals/recomputeMasteryProgressForOwner.js";
import type * as services_goals_remove from "../services/goals/remove.js";
import type * as services_goals_removeObstacle from "../services/goals/removeObstacle.js";
import type * as services_goals_requireOwnedGoal from "../services/goals/requireOwnedGoal.js";
import type * as services_goals_setAchieved from "../services/goals/setAchieved.js";
import type * as services_goals_toGoalDocument from "../services/goals/toGoalDocument.js";
import type * as services_goals_toGoalDto from "../services/goals/toGoalDto.js";
import type * as services_goals_update from "../services/goals/update.js";
import type * as services_goals_updateObstacle from "../services/goals/updateObstacle.js";
import type * as services_goals_validateGoalInput from "../services/goals/validateGoalInput.js";
import type * as services_goals_withMasteryProgressDelta from "../services/goals/withMasteryProgressDelta.js";
import type * as services_history_dayBreakdown from "../services/history/dayBreakdown.js";
import type * as services_history_month from "../services/history/month.js";
import type * as services_history_monthBreakdown from "../services/history/monthBreakdown.js";
import type * as services_history_shared from "../services/history/shared.js";
import type * as services_history_week from "../services/history/week.js";
import type * as services_history_weekBreakdown from "../services/history/weekBreakdown.js";
import type * as services_history_yearHeatmap from "../services/history/yearHeatmap.js";
import type * as services_items_applyOrder from "../services/items/applyOrder.js";
import type * as services_items_create from "../services/items/create.js";
import type * as services_items_helpers from "../services/items/helpers.js";
import type * as services_items_list from "../services/items/list.js";
import type * as services_items_recentConcreteActions from "../services/items/recentConcreteActions.js";
import type * as services_items_remove from "../services/items/remove.js";
import type * as services_items_rename from "../services/items/rename.js";
import type * as services_presets_create from "../services/presets/create.js";
import type * as services_presets_helpers from "../services/presets/helpers.js";
import type * as services_presets_list from "../services/presets/list.js";
import type * as services_presets_remove from "../services/presets/remove.js";
import type * as services_presets_update from "../services/presets/update.js";
import type * as services_rows_add from "../services/rows/add.js";
import type * as services_rows_confirm from "../services/rows/confirm.js";
import type * as services_rows_loadLiveRows from "../services/rows/loadLiveRows.js";
import type * as services_rows_remove from "../services/rows/remove.js";
import type * as services_rows_requireOwnedRow from "../services/rows/requireOwnedRow.js";
import type * as services_rows_restore from "../services/rows/restore.js";
import type * as services_rows_rowDayLiveness from "../services/rows/rowDayLiveness.js";
import type * as services_rows_skip from "../services/rows/skip.js";
import type * as services_rows_switchPreset from "../services/rows/switchPreset.js";
import type * as services_session_get from "../services/session/get.js";
import type * as services_targets_aggregateByCategory from "../services/targets/aggregateByCategory.js";
import type * as services_targets_listWithProgress from "../services/targets/listWithProgress.js";
import type * as services_targets_remove from "../services/targets/remove.js";
import type * as services_targets_save from "../services/targets/save.js";
import type * as services_trash_list from "../services/trash/list.js";
import type * as services_trash_purgeDay from "../services/trash/purgeDay.js";
import type * as services_trash_purgeExpired from "../services/trash/purgeExpired.js";
import type * as services_trash_purgeRow from "../services/trash/purgeRow.js";
import type * as services_trash_removeDay from "../services/trash/removeDay.js";
import type * as services_trash_restoreDay from "../services/trash/restoreDay.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  crons: typeof crons;
  http: typeof http;
  "lib/catalog": typeof lib_catalog;
  "lib/catalogLoader": typeof lib_catalogLoader;
  "lib/categories": typeof lib_categories;
  "lib/categoryFields": typeof lib_categoryFields;
  "lib/concreteAction": typeof lib_concreteAction;
  "lib/concreteActionCore": typeof lib_concreteActionCore;
  "lib/conditions": typeof lib_conditions;
  "lib/dateArgs": typeof lib_dateArgs;
  "lib/domain": typeof lib_domain;
  "lib/env": typeof lib_env;
  "lib/errors": typeof lib_errors;
  "lib/historyBreakdown": typeof lib_historyBreakdown;
  "lib/itemOrder": typeof lib_itemOrder;
  "lib/itemSort": typeof lib_itemSort;
  "lib/jst": typeof lib_jst;
  "lib/movingAverage": typeof lib_movingAverage;
  "lib/owner": typeof lib_owner;
  "lib/ownerFunctions": typeof lib_ownerFunctions;
  "lib/preset": typeof lib_preset;
  "lib/share": typeof lib_share;
  "lib/trash": typeof lib_trash;
  "lib/validators": typeof lib_validators;
  "lib/volume": typeof lib_volume;
  "mutations/catalog/ensure": typeof mutations_catalog_ensure;
  "mutations/categories/create": typeof mutations_categories_create;
  "mutations/categories/remove": typeof mutations_categories_remove;
  "mutations/categories/rename": typeof mutations_categories_rename;
  "mutations/days/open": typeof mutations_days_open;
  "mutations/days/setCondition": typeof mutations_days_setCondition;
  "mutations/days/setMemo": typeof mutations_days_setMemo;
  "mutations/goals/create": typeof mutations_goals_create;
  "mutations/goals/createObstacle": typeof mutations_goals_createObstacle;
  "mutations/goals/recomputeMasteryProgress": typeof mutations_goals_recomputeMasteryProgress;
  "mutations/goals/remove": typeof mutations_goals_remove;
  "mutations/goals/removeObstacle": typeof mutations_goals_removeObstacle;
  "mutations/goals/setAchieved": typeof mutations_goals_setAchieved;
  "mutations/goals/update": typeof mutations_goals_update;
  "mutations/goals/updateObstacle": typeof mutations_goals_updateObstacle;
  "mutations/items/applyOrder": typeof mutations_items_applyOrder;
  "mutations/items/create": typeof mutations_items_create;
  "mutations/items/remove": typeof mutations_items_remove;
  "mutations/items/rename": typeof mutations_items_rename;
  "mutations/presets/create": typeof mutations_presets_create;
  "mutations/presets/remove": typeof mutations_presets_remove;
  "mutations/presets/update": typeof mutations_presets_update;
  "mutations/rows/add": typeof mutations_rows_add;
  "mutations/rows/confirm": typeof mutations_rows_confirm;
  "mutations/rows/remove": typeof mutations_rows_remove;
  "mutations/rows/restore": typeof mutations_rows_restore;
  "mutations/rows/skip": typeof mutations_rows_skip;
  "mutations/rows/switchPreset": typeof mutations_rows_switchPreset;
  "mutations/targets/remove": typeof mutations_targets_remove;
  "mutations/targets/save": typeof mutations_targets_save;
  "mutations/trash/purgeDay": typeof mutations_trash_purgeDay;
  "mutations/trash/purgeExpired": typeof mutations_trash_purgeExpired;
  "mutations/trash/purgeRow": typeof mutations_trash_purgeRow;
  "mutations/trash/removeDay": typeof mutations_trash_removeDay;
  "mutations/trash/restoreDay": typeof mutations_trash_restoreDay;
  "queries/categories/list": typeof queries_categories_list;
  "queries/days/get": typeof queries_days_get;
  "queries/goals/list": typeof queries_goals_list;
  "queries/goals/listObstacles": typeof queries_goals_listObstacles;
  "queries/history/dayBreakdown": typeof queries_history_dayBreakdown;
  "queries/history/month": typeof queries_history_month;
  "queries/history/monthBreakdown": typeof queries_history_monthBreakdown;
  "queries/history/week": typeof queries_history_week;
  "queries/history/weekBreakdown": typeof queries_history_weekBreakdown;
  "queries/history/yearHeatmap": typeof queries_history_yearHeatmap;
  "queries/items/list": typeof queries_items_list;
  "queries/items/recentConcreteActions": typeof queries_items_recentConcreteActions;
  "queries/presets/list": typeof queries_presets_list;
  "queries/session/get": typeof queries_session_get;
  "queries/targets/listWithProgress": typeof queries_targets_listWithProgress;
  "queries/trash/list": typeof queries_trash_list;
  "services/catalog/backfillItemSortOrders": typeof services_catalog_backfillItemSortOrders;
  "services/catalog/ensure": typeof services_catalog_ensure;
  "services/catalog/ensureCatalog": typeof services_catalog_ensureCatalog;
  "services/categories/create": typeof services_categories_create;
  "services/categories/list": typeof services_categories_list;
  "services/categories/remove": typeof services_categories_remove;
  "services/categories/rename": typeof services_categories_rename;
  "services/days/collapseExtraLiveDays": typeof services_days_collapseExtraLiveDays;
  "services/days/getDayByDate": typeof services_days_getDayByDate;
  "services/days/getDayPage": typeof services_days_getDayPage;
  "services/days/getLiveDay": typeof services_days_getLiveDay;
  "services/days/liveRowsForDay": typeof services_days_liveRowsForDay;
  "services/days/openDay": typeof services_days_openDay;
  "services/days/requireEditableDay": typeof services_days_requireEditableDay;
  "services/days/requireLiveDay": typeof services_days_requireLiveDay;
  "services/days/setCondition": typeof services_days_setCondition;
  "services/days/setMemo": typeof services_days_setMemo;
  "services/days/toRowDtos": typeof services_days_toRowDtos;
  "services/goals/applyMasteryProgressDelta": typeof services_goals_applyMasteryProgressDelta;
  "services/goals/assertGoalInput": typeof services_goals_assertGoalInput;
  "services/goals/create": typeof services_goals_create;
  "services/goals/createObstacle": typeof services_goals_createObstacle;
  "services/goals/list": typeof services_goals_list;
  "services/goals/listObstacles": typeof services_goals_listObstacles;
  "services/goals/loadDayTotals": typeof services_goals_loadDayTotals;
  "services/goals/masteryDayTotals": typeof services_goals_masteryDayTotals;
  "services/goals/masteryProgress": typeof services_goals_masteryProgress;
  "services/goals/masteryProgressOf": typeof services_goals_masteryProgressOf;
  "services/goals/recomputeMasteryProgress": typeof services_goals_recomputeMasteryProgress;
  "services/goals/recomputeMasteryProgressForOwner": typeof services_goals_recomputeMasteryProgressForOwner;
  "services/goals/remove": typeof services_goals_remove;
  "services/goals/removeObstacle": typeof services_goals_removeObstacle;
  "services/goals/requireOwnedGoal": typeof services_goals_requireOwnedGoal;
  "services/goals/setAchieved": typeof services_goals_setAchieved;
  "services/goals/toGoalDocument": typeof services_goals_toGoalDocument;
  "services/goals/toGoalDto": typeof services_goals_toGoalDto;
  "services/goals/update": typeof services_goals_update;
  "services/goals/updateObstacle": typeof services_goals_updateObstacle;
  "services/goals/validateGoalInput": typeof services_goals_validateGoalInput;
  "services/goals/withMasteryProgressDelta": typeof services_goals_withMasteryProgressDelta;
  "services/history/dayBreakdown": typeof services_history_dayBreakdown;
  "services/history/month": typeof services_history_month;
  "services/history/monthBreakdown": typeof services_history_monthBreakdown;
  "services/history/shared": typeof services_history_shared;
  "services/history/week": typeof services_history_week;
  "services/history/weekBreakdown": typeof services_history_weekBreakdown;
  "services/history/yearHeatmap": typeof services_history_yearHeatmap;
  "services/items/applyOrder": typeof services_items_applyOrder;
  "services/items/create": typeof services_items_create;
  "services/items/helpers": typeof services_items_helpers;
  "services/items/list": typeof services_items_list;
  "services/items/recentConcreteActions": typeof services_items_recentConcreteActions;
  "services/items/remove": typeof services_items_remove;
  "services/items/rename": typeof services_items_rename;
  "services/presets/create": typeof services_presets_create;
  "services/presets/helpers": typeof services_presets_helpers;
  "services/presets/list": typeof services_presets_list;
  "services/presets/remove": typeof services_presets_remove;
  "services/presets/update": typeof services_presets_update;
  "services/rows/add": typeof services_rows_add;
  "services/rows/confirm": typeof services_rows_confirm;
  "services/rows/loadLiveRows": typeof services_rows_loadLiveRows;
  "services/rows/remove": typeof services_rows_remove;
  "services/rows/requireOwnedRow": typeof services_rows_requireOwnedRow;
  "services/rows/restore": typeof services_rows_restore;
  "services/rows/rowDayLiveness": typeof services_rows_rowDayLiveness;
  "services/rows/skip": typeof services_rows_skip;
  "services/rows/switchPreset": typeof services_rows_switchPreset;
  "services/session/get": typeof services_session_get;
  "services/targets/aggregateByCategory": typeof services_targets_aggregateByCategory;
  "services/targets/listWithProgress": typeof services_targets_listWithProgress;
  "services/targets/remove": typeof services_targets_remove;
  "services/targets/save": typeof services_targets_save;
  "services/trash/list": typeof services_trash_list;
  "services/trash/purgeDay": typeof services_trash_purgeDay;
  "services/trash/purgeExpired": typeof services_trash_purgeExpired;
  "services/trash/purgeRow": typeof services_trash_purgeRow;
  "services/trash/removeDay": typeof services_trash_removeDay;
  "services/trash/restoreDay": typeof services_trash_restoreDay;
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
