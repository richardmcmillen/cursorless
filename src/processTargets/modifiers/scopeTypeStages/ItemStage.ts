import { Range, TextEditor } from "vscode";
import {
  ContainingScopeModifier,
  EveryScopeModifier,
  Target,
} from "../../../typings/target.types";
import { ProcessedTargetsContext } from "../../../typings/Types";
import { ModifierStage } from "../../PipelineStages.types";
import WeakTarget from "../../targets/WeakTarget";
import { processSurroundingPair } from "../surroundingPair";
import { fitRangeToLineContent } from "./LineStage";

export default class ItemStage implements ModifierStage {
  constructor(private modifier: ContainingScopeModifier | EveryScopeModifier) {}

  run(context: ProcessedTargetsContext, target: Target): Target[] {
    if (this.modifier.type === "everyScope") {
      return this.getEveryTarget(context, target);
    }
    return [this.getSingleTarget(context, target)];
  }

  private getEveryTarget(context: ProcessedTargetsContext, target: Target) {
    const collectionRange = getCollectionRange(context, target);
    const itemRanges = getItemRanges(target.editor, collectionRange);

    if (itemRanges.length < 1) {
      throw Error(`Couldn't find containing ${this.modifier.scopeType.type}`);
    }

    return itemRanges.map(
      (range) =>
        new WeakTarget({
          editor: target.editor,
          isReversed: target.isReversed,
          contentRange: range,
        })
    );
  }

  private getSingleTarget(context: ProcessedTargetsContext, target: Target) {
    const collectionRange = getCollectionRange(context, target);
    const itemRanges = getItemRanges(target.editor, collectionRange);

    const itemRange = itemRanges.find((range) =>
      range.intersection(target.contentRange)
    );

    if (itemRange == null) {
      throw Error(`Couldn't find containing ${this.modifier.scopeType.type}`);
    }

    return new WeakTarget({
      editor: target.editor,
      isReversed: target.isReversed,
      contentRange: itemRange,
    });
  }
}

function getCollectionRange(context: ProcessedTargetsContext, target: Target) {
  let pairInfo = getSurroundingPair(
    context,
    target.editor,
    target.contentRange
  );

  while (pairInfo != null) {
    // The selection from the beginning was this pair and we should not go into the interior but instead look in the parent.
    const isPair =
      target.contentRange.isEqual(pairInfo.contentRange) ||
      target.contentRange.start.isBeforeOrEqual(pairInfo.boundary[0].start) ||
      target.contentRange.end.isAfterOrEqual(pairInfo.boundary[1].end);
    const text = target.editor.document.getText(pairInfo.interiorRange);
    if (!isPair && text.includes(",")) {
      return pairInfo.interiorRange;
    }
    // Step out of this pair and see if we have a parent
    const position = target.editor.document.positionAt(
      target.editor.document.offsetAt(pairInfo.contentRange.start) - 1
    );
    pairInfo = getSurroundingPair(
      context,
      target.editor,
      new Range(position, position)
    );
  }

  // We have not found a pair containing the delimiter. Look at the full line.
  return fitRangeToLineContent(target.editor, target.contentRange);
}

function getSurroundingPair(
  context: ProcessedTargetsContext,
  editor: TextEditor,
  contentRange: Range
) {
  return processSurroundingPair(context, editor, contentRange, {
    type: "surroundingPair",
    delimiter: "any",
  });
}

function getItemRanges(editor: TextEditor, collectionRange: Range) {
  const { document } = editor;
  const text = document.getText(collectionRange);
  const parts = text.split(/([,(){}<>[\]"])/g).filter(Boolean);
  const ranges: Range[] = [];
  let offset = document.offsetAt(collectionRange.start);
  let waitingForDelimiter: string | null = null;
  let offsetStart = 0;

  parts.forEach((text) => {
    // Delimiter or whitespace found
    if (text === "," || text.trim().length === 0) {
      offset += text.length;
      return;
    }

    // We are waiting for a closing delimiter
    if (waitingForDelimiter != null) {
      // Closing delimiter found
      if (waitingForDelimiter === text) {
        waitingForDelimiter = null;
        const range = new Range(
          document.positionAt(offsetStart),
          document.positionAt(offset + text.length)
        );
        ranges.push(range);
      }
    }
    // Starting delimiter found
    else if (delimiters[text] != null) {
      waitingForDelimiter = delimiters[text];
      offsetStart = offset;
    }
    // Text/item content found
    else {
      const offsetStart = offset + (text.length - text.trimStart().length);
      ranges.push(
        new Range(
          document.positionAt(offsetStart),
          document.positionAt(offsetStart + text.trim().length)
        )
      );
    }

    offset += text.length;
  });

  return ranges;
}

// Mapping between opening and closing delimiters
const delimiters: { [key: string]: string } = {
  "(": ")",
  "{": "}",
  "<": ">",
  "[": "]",
  '"': '"',
};
