import { Position, Range, TextEditor } from "vscode";
import {
  ContainingScopeModifier,
  EveryScopeModifier,
  ScopeTypeTarget,
  Target,
} from "../../../typings/target.types";
import { ProcessedTargetsContext } from "../../../typings/Types";
import { ModifierStage } from "../../PipelineStages.types";

export default class implements ModifierStage {
  constructor(private modifier: ContainingScopeModifier | EveryScopeModifier) {}

  run(
    context: ProcessedTargetsContext,
    target: Target
  ): ScopeTypeTarget | ScopeTypeTarget[] {
    if (this.modifier.type === "everyScope") {
      return this.getEveryTarget(target);
    }
    return this.getSingleTarget(target);
  }

  getEveryTarget(target: Target): ScopeTypeTarget[] {
    const { contentRange, editor } = target;
    const { isEmpty } = contentRange;
    const startLine = isEmpty ? 0 : contentRange.start.line;
    const endLine = isEmpty
      ? editor.document.lineCount - 1
      : contentRange.end.line;
    const targets: ScopeTypeTarget[] = [];

    for (let i = startLine; i <= endLine; ++i) {
      targets.push(this.getTargetFromRange(target, new Range(i, 0, i, 0)));
    }

    return targets;
  }

  getSingleTarget(target: Target): ScopeTypeTarget {
    return this.getTargetFromRange(target, target.contentRange);
  }

  getTargetFromRange(target: Target, range: Range): ScopeTypeTarget {
    const contentRange = fitRangeToLineContent(target.editor, range);
    return {
      scopeType: this.modifier.scopeType,
      editor: target.editor,
      isReversed: target.isReversed,
      contentRange,
      ...getLineContext(target.editor, contentRange),
    };
  }
}

export function getLineContext(editor: TextEditor, range: Range) {
  const { document } = editor;
  const { start, end } = range;

  const removalRange = new Range(
    new Position(start.line, 0),
    editor.document.lineAt(end).range.end
  );

  const leadingDelimiterRange =
    start.line > 0
      ? new Range(document.lineAt(start.line - 1).range.end, removalRange.start)
      : undefined;
  const trailingDelimiterRange =
    end.line + 1 < document.lineCount
      ? new Range(removalRange.end, new Position(end.line + 1, 0))
      : undefined;

  return {
    delimiter: "\n",
    removal: {
      range: removalRange,
      leadingDelimiterRange,
      trailingDelimiterRange,
    },
  };
}

export function fitRangeToLineContent(editor: TextEditor, range: Range) {
  const startLine = editor.document.lineAt(range.start);
  const endLine = editor.document.lineAt(range.end);
  const endCharacterIndex =
    endLine.range.end.character -
    (endLine.text.length - endLine.text.trimEnd().length);
  return new Range(
    startLine.lineNumber,
    startLine.firstNonWhitespaceCharacterIndex,
    endLine.lineNumber,
    endCharacterIndex
  );
}