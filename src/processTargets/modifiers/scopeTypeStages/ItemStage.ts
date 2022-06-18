import { Range, TextEditor } from "vscode";
import {
  NoContainingScopeError,
  UnsupportedLanguageError,
} from "../../../errors";
import { Target } from "../../../typings/target.types";
import {
  ContainingScopeModifier,
  EveryScopeModifier,
  SimpleScopeTypeType,
} from "../../../typings/targetDescriptor.types";
import { ProcessedTargetsContext } from "../../../typings/Types";
import { ModifierStage } from "../../PipelineStages.types";
import ScopeTypeTarget from "../../targets/ScopeTypeTarget";
import { processSurroundingPair } from "../surroundingPair";
import { SurroundingPairInfo } from "../surroundingPair/extractSelectionFromSurroundingPairOffsets";
import ContainingSyntaxScopeStage, {
  SimpleContainingScopeModifier,
} from "./ContainingSyntaxScopeStage";
import { fitRangeToLineContent } from "./LineStage";

export default class ItemStage implements ModifierStage {
  constructor(private modifier: ContainingScopeModifier | EveryScopeModifier) {}

  run(context: ProcessedTargetsContext, target: Target): Target[] {
    try {
      return new ContainingSyntaxScopeStage(
        <SimpleContainingScopeModifier>this.modifier
      ).run(context, target);
    } catch (error) {
      if (
        !(error instanceof NoContainingScopeError) &&
        !(error instanceof UnsupportedLanguageError)
      ) {
        throw error;
      }
    }

    if (this.modifier.type === "everyScope") {
      return this.getEveryTarget(context, target);
    }
    return [this.getSingleTarget(context, target)];
  }

  private getEveryTarget(context: ProcessedTargetsContext, target: Target) {
    const itemInfos = getItemInfos(context, target);

    if (itemInfos.length < 1) {
      throw new NoContainingScopeError(this.modifier.scopeType.type);
    }

    return itemInfos.map((itemInfo) => this.itemInfoToTarget(target, itemInfo));
  }

  private getSingleTarget(context: ProcessedTargetsContext, target: Target) {
    const itemInfos = getItemInfos(context, target);

    const itemInfo =
      itemInfos.find((itemInfo) =>
        itemInfo.range.intersection(target.contentRange)
      ) ??
      itemInfos.find((itemInfo) =>
        itemInfo.delimiterRange?.intersection(target.contentRange)
      );

    if (itemInfo == null) {
      throw new NoContainingScopeError(this.modifier.scopeType.type);
    }

    return this.itemInfoToTarget(target, itemInfo);
  }

  private itemInfoToTarget(target: Target, itemInfo: ItemInfo) {
    return new ScopeTypeTarget({
      scopeTypeType: <SimpleScopeTypeType>this.modifier.scopeType.type,
      editor: target.editor,
      isReversed: target.isReversed,
      contentRange: itemInfo.range,
      delimiter: delimiterInsertion,
      leadingDelimiterRange: itemInfo.leadingDelimiterRange,
      trailingDelimiterRange: itemInfo.trailingDelimiterRange,
    });
  }
}

function getItemInfos(context: ProcessedTargetsContext, target: Target) {
  const collectionRange = getCollectionRange(context, target);
  return tokensToItemInfos(target.editor, collectionRange);
}

function getCollectionRange(context: ProcessedTargetsContext, target: Target) {
  // First check if we are in a string
  let pairInfo = getStringSurroundingPair(
    context,
    target.editor,
    target.contentRange
  );

  // We don't look for items inside strings. If we are in a string go to parent
  pairInfo =
    pairInfo != null
      ? getParentSurroundingPair(context, target.editor, pairInfo)
      : getSurroundingPair(context, target.editor, target.contentRange);

  while (pairInfo != null) {
    // The selection from the beginning was this pair and we should not go into the interior but instead look in the parent.
    const isNotInterior =
      target.contentRange.isEqual(pairInfo.contentRange) ||
      target.contentRange.start.isBeforeOrEqual(pairInfo.boundary[0].start) ||
      target.contentRange.end.isAfterOrEqual(pairInfo.boundary[1].end);
    if (!isNotInterior) {
      return pairInfo.interiorRange;
    }
    pairInfo = getParentSurroundingPair(context, target.editor, pairInfo);
  }

  // We have not found a pair containing the delimiter. Look at the full line.
  return fitRangeToLineContent(target.editor, target.contentRange);
}

function tokensToItemInfos(
  editor: TextEditor,
  collectionRange: Range
): ItemInfo[] {
  const tokens = tokenizeRange(editor, collectionRange);
  const itemInfos: ItemInfo[] = [];

  tokens.forEach((token, i) => {
    if (token.type === "delimiter") {
      return;
    }
    const leadingDelimiterRange = (() => {
      if (tokens[i - 2]?.type === "item") {
        return new Range(tokens[i - 2].range.end, token.range.start);
      }
      if (tokens[i - 1]?.type === "delimiter") {
        return new Range(tokens[i - 1].range.start, token.range.start);
      }
      return undefined;
    })();
    const trailingDelimiterRange = (() => {
      if (tokens[i + 2]?.type === "item") {
        return new Range(token.range.end, tokens[i + 2].range.start);
      }
      if (tokens[i + 1]?.type === "delimiter") {
        return new Range(token.range.end, tokens[i + 1].range.end);
      }
      return undefined;
    })();
    const delimiterRange =
      tokens[i + 1]?.type === "delimiter" ? tokens[i + 1].range : undefined;
    itemInfos.push({
      range: token.range,
      leadingDelimiterRange,
      trailingDelimiterRange,
      delimiterRange,
    });
  });

  return itemInfos;
}

function tokenizeRange(editor: TextEditor, collectionRange: Range) {
  const { document } = editor;
  const text = document.getText(collectionRange);
  const parts = text.split(/([,(){}<>[\]"'])/g).filter(Boolean);
  const tokens: Token[] = [];
  let offset = document.offsetAt(collectionRange.start);
  let waitingForDelimiter: string | null = null;
  let offsetStart = 0;

  parts.forEach((text) => {
    // Whitespace found. Just skip
    if (text.trim().length === 0) {
      offset += text.length;
      return;
    }

    // We are waiting for a closing delimiter
    if (waitingForDelimiter != null) {
      // Closing delimiter found
      if (waitingForDelimiter === text) {
        waitingForDelimiter = null;
        tokens.push({
          type: "item",
          range: new Range(
            document.positionAt(offsetStart),
            document.positionAt(offset + text.length)
          ),
        });
      }
    }
    // Separator delimiter found.
    else if (text === delimiter) {
      tokens.push({
        type: "delimiter",
        range: new Range(
          document.positionAt(offset),
          document.positionAt(offset + text.length)
        ),
      });
    }
    // Starting delimiter found
    else if (delimiters[text] != null) {
      waitingForDelimiter = delimiters[text];
      offsetStart = offset;
    }
    // Text/item content found
    else {
      const offsetStart = offset + (text.length - text.trimStart().length);
      tokens.push({
        type: "item",
        range: new Range(
          document.positionAt(offsetStart),
          document.positionAt(offsetStart + text.trim().length)
        ),
      });
    }

    offset += text.length;
  });

  return tokens;
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

function getParentSurroundingPair(
  context: ProcessedTargetsContext,
  editor: TextEditor,
  pairInfo: SurroundingPairInfo
) {
  // Step out of this pair and see if we have a parent
  const position = editor.document.positionAt(
    editor.document.offsetAt(pairInfo.contentRange.start) - 1
  );
  return getSurroundingPair(context, editor, new Range(position, position));
}

function getStringSurroundingPair(
  context: ProcessedTargetsContext,
  editor: TextEditor,
  contentRange: Range
) {
  return processSurroundingPair(context, editor, contentRange, {
    type: "surroundingPair",
    delimiter: "string",
  });
}

interface ItemInfo {
  range: Range;
  leadingDelimiterRange?: Range;
  trailingDelimiterRange?: Range;
  delimiterRange?: Range;
}

interface Token {
  range: Range;
  type: string;
}

const delimiter = ",";
const delimiterInsertion = ", ";

// Mapping between opening and closing delimiters
/* eslint-disable @typescript-eslint/naming-convention */
const delimiters: { [key: string]: string } = {
  "(": ")",
  "{": "}",
  "<": ">",
  "[": "]",
  '"': '"',
  "'": "'",
};
/* eslint-enable @typescript-eslint/naming-convention */