import { window } from "vscode";
import { CursorMark, Target } from "../../typings/target.types";
import { isReversed } from "../../util/selectionUtils";
import { getTokenContext } from "../modifiers/scopeTypeStages/TokenStage";
import { MarkStage } from "../PipelineStages.types";

export default class implements MarkStage {
  constructor(private modifier: CursorMark) {}

  run(): Target[] {
    if (window.activeTextEditor == null) {
      return [];
    }
    return window.activeTextEditor.selections.map((selection) => {
      const target = {
        editor: window.activeTextEditor!,
        isReversed: isReversed(selection),
        contentRange: selection,
      };
      return {
        ...target,
        ...getTokenContext(target),
      };
    });
  }
}