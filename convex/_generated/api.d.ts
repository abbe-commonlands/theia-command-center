/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as agents from "../agents.js";
import type * as designGuidelines from "../designGuidelines.js";
import type * as documents from "../documents.js";
import type * as glassSelections from "../glassSelections.js";
import type * as lensDesigns from "../lensDesigns.js";
import type * as memories from "../memories.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as optimizationRuns from "../optimizationRuns.js";
import type * as patents from "../patents.js";
import type * as scheduledEvents from "../scheduledEvents.js";
import type * as sessionHistory from "../sessionHistory.js";
import type * as tasks from "../tasks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  agents: typeof agents;
  designGuidelines: typeof designGuidelines;
  documents: typeof documents;
  glassSelections: typeof glassSelections;
  lensDesigns: typeof lensDesigns;
  memories: typeof memories;
  messages: typeof messages;
  notifications: typeof notifications;
  optimizationRuns: typeof optimizationRuns;
  patents: typeof patents;
  scheduledEvents: typeof scheduledEvents;
  sessionHistory: typeof sessionHistory;
  tasks: typeof tasks;
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

export declare const components: {};
