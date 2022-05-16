import { flatten } from "lodash";
import { DecorationRangeBehavior, Selection } from "vscode";
import {
  getSelectionInfo,
  performEditsAndUpdateFullSelectionInfos,
} from "../core/updateSelections/updateSelections";
import { Target } from "../typings/target.types";
import { Edit, Graph, SelectionWithEditor } from "../typings/Types";
import { FullSelectionInfo } from "../typings/updateSelections";
import { decorationSleep } from "../util/editDisplayUtils";
import {
  getContentSelection,
  runOnTargetsForEachEditor,
} from "../util/targetUtils";
import { Action, ActionReturnValue } from "./actions.types";

export default class Wrap implements Action {
  constructor(private graph: Graph) {
    this.run = this.run.bind(this);
  }

  async run(
    [targets]: [Target[]],
    left: string,
    right: string
  ): Promise<ActionReturnValue> {
    const thatMark = flatten(
      await runOnTargetsForEachEditor<SelectionWithEditor[]>(
        targets,
        async (editor, targets) => {
          const { document } = editor;
          const boundaries = targets.map((target) => ({
            start: new Selection(
              target.contentRange.start,
              target.contentRange.start
            ),
            end: new Selection(
              target.contentRange.end,
              target.contentRange.end
            ),
          }));

          const edits: Edit[] = boundaries.flatMap(({ start, end }) => [
            {
              text: left,
              range: start,
            },
            {
              text: right,
              range: end,
              isReplace: true,
            },
          ]);

          const delimiterSelectionInfos: FullSelectionInfo[] =
            boundaries.flatMap(({ start, end }) => {
              return [
                getSelectionInfo(
                  document,
                  start,
                  DecorationRangeBehavior.OpenClosed
                ),
                getSelectionInfo(
                  document,
                  end,
                  DecorationRangeBehavior.ClosedOpen
                ),
              ];
            });

          const cursorSelectionInfos = editor.selections.map((selection) =>
            getSelectionInfo(
              document,
              selection,
              DecorationRangeBehavior.ClosedClosed
            )
          );

          const thatMarkSelectionInfos = targets.map((target) =>
            getSelectionInfo(
              document,
              getContentSelection(target),
              DecorationRangeBehavior.OpenOpen
            )
          );

          const [delimiterSelections, cursorSelections, thatMarkSelections] =
            await performEditsAndUpdateFullSelectionInfos(
              this.graph.rangeUpdater,
              editor,
              edits,
              [
                delimiterSelectionInfos,
                cursorSelectionInfos,
                thatMarkSelectionInfos,
              ]
            );

          editor.selections = cursorSelections;

          editor.setDecorations(
            this.graph.editStyles.justAdded.token,
            delimiterSelections
          );
          await decorationSleep();
          editor.setDecorations(this.graph.editStyles.justAdded.token, []);

          return thatMarkSelections.map((selection) => ({
            editor,
            selection,
          }));
        }
      )
    );

    return { thatMark };
  }
}
