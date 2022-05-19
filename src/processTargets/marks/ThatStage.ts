import { Target, ThatMark } from "../../typings/target.types";
import BaseTarget from "../targets/BaseTarget";
import { ProcessedTargetsContext } from "../../typings/Types";
import { isReversed } from "../../util/selectionUtils";
import { getTokenDelimiters } from "../modifiers/scopeTypeStages/TokenStage";
import { MarkStage } from "../PipelineStages.types";

export default class implements MarkStage {
  constructor(private modifier: ThatMark) {}

  run(context: ProcessedTargetsContext): Target[] {
    return context.thatMark.map((selection) => {
      return new BaseTarget({
        ...getTokenDelimiters(selection.editor, selection.selection),
        editor: selection.editor,
        isReversed: isReversed(selection.selection),
        contentRange: selection.selection,
      });
    });
  }
}