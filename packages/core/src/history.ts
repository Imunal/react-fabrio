import { equalValues } from "./commands.js";
export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}
/**
 * Creates immutable undo/redo history with a clone of the initial value.
 *
 * @param present - Initial value; must support `structuredClone`.
 * @returns History with empty undo and redo stacks.
 */
export const createHistory = <T>(present: T): History<T> => {
  return { past: [], present: structuredClone(present), future: [] };
};
/**
 * Records a completed action, retaining at most 100 undo entries and clearing redo.
 *
 * @param history - Current history, which is not mutated.
 * @param present - Next value to clone into the current snapshot.
 * @param changed - Whether the value changed. Omit to compare values structurally; `false`
 * returns the existing history and `true` records the value without comparison.
 * @returns Updated history, or the original history for an unchanged value.
 */
export const commitHistory = <T>(
  history: History<T>,
  present: T,
  changed?: boolean,
): History<T> => {
  if (changed === false || (changed === undefined && equalValues(history.present, present)))
    return history;
  return {
    past: [...history.past.slice(-99), history.present],
    present: structuredClone(present),
    future: [],
  };
};
/**
 * Restores the most recent completed action.
 *
 * @param history - Current history, which is not mutated.
 * @returns Updated history, or the original history when the undo stack is empty.
 */
export const undoHistory = <T>(history: History<T>): History<T> => {
  if (!history.past.length) return history;
  return {
    past: history.past.slice(0, -1),
    present: history.past[history.past.length - 1]!,
    future: [history.present, ...history.future],
  };
};
/**
 * Restores the next previously undone action.
 *
 * @param history - Current history, which is not mutated.
 * @returns Updated history, or the original history when the redo stack is empty.
 */
export const redoHistory = <T>(history: History<T>): History<T> => {
  if (!history.future.length) return history;
  return {
    past: [...history.past.slice(-99), history.present],
    present: history.future[0]!,
    future: history.future.slice(1),
  };
};
