import {
  Uri,
  Range,
  debug,
  SourceBreakpoint,
  Breakpoint,
  Location,
} from "vscode";
import { Target } from "../typings/target.types";
import { ActionPreferences, Graph } from "../typings/Types";
import displayPendingEditDecorations from "../util/editDisplayUtils";
import { createThatMark, isLineScopeType } from "../util/targetUtils";
import { Action, ActionReturnValue } from "./actions.types";

function getBreakpoints(uri: Uri, range: Range) {
  return debug.breakpoints.filter(
    (breakpoint) =>
      breakpoint instanceof SourceBreakpoint &&
      breakpoint.location.uri.toString() === uri.toString() &&
      breakpoint.location.range.intersection(range) != null
  );
}

export default class ToggleBreakpoint implements Action {
  getTargetPreferences: () => ActionPreferences[] = () => [
    { modifiers: [{ type: "containingScope", scopeType: "line" }] },
  ];

  constructor(private graph: Graph) {
    this.run = this.run.bind(this);
  }

  async run([targets]: [Target[], Target[]]): Promise<ActionReturnValue> {
    await displayPendingEditDecorations(
      targets,
      this.graph.editStyles.referenced
    );

    const toAdd: Breakpoint[] = [];
    const toRemove: Breakpoint[] = [];

    targets.forEach((target) => {
      let range = target.contentRange;
      // The action preference give us line content but line breakpoints are registered on character 0
      if (isLineScopeType(target)) {
        range = range.with(range.start.with(undefined, 0), undefined);
      }
      const uri = target.editor.document.uri;
      const existing = getBreakpoints(uri, range);
      if (existing.length > 0) {
        toRemove.push(...existing);
      } else {
        if (isLineScopeType(target)) {
          range = range.with(undefined, range.end.with(undefined, 0));
        }
        toAdd.push(new SourceBreakpoint(new Location(uri, range)));
      }
    });

    debug.addBreakpoints(toAdd);
    debug.removeBreakpoints(toRemove);

    return {
      thatMark: createThatMark(targets),
    };
  }
}