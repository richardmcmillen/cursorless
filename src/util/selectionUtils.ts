import { Position, Range, Selection, TextEditor } from "vscode";
import { fitRangeToLineContent } from "../processTargets/modifiers/scopeTypeStages/LineStage";
import { SelectionWithEditor } from "../typings/Types";

export function isForward(selection: Selection) {
  return selection.active.isAfterOrEqual(selection.anchor);
}

export function isReversed(selection: Selection) {
  return selection.active.isBefore(selection.anchor);
}

export function selectionWithEditorFromRange(
  selection: SelectionWithEditor,
  range: Range
): SelectionWithEditor {
  return selectionWithEditorFromPositions(selection, range.start, range.end);
}

function selectionWithEditorFromPositions(
  selection: SelectionWithEditor,
  start: Position,
  end: Position
): SelectionWithEditor {
  return {
    editor: selection.editor,
    selection: selectionFromPositions(selection.selection, start, end),
  };
}

function selectionFromPositions(
  selection: Selection,
  start: Position,
  end: Position
): Selection {
  // The built in isReversed is bugged on empty selection. don't use
  return isForward(selection)
    ? new Selection(start, end)
    : new Selection(end, start);
}

export function selectionFromRange(isReversed: boolean, range: Range) {
  const { start, end } = range;
  return isReversed ? new Selection(end, start) : new Selection(start, end);
}

export function shrinkRangeToFitContent(editor: TextEditor, range: Range) {
  const { lineAt } = editor.document;

  const start = (() => {
    const firstLine = lineAt(range.start);
    const text = firstLine.text.substring(range.start.character);
    if (text.trim().length === 0) {
      for (let i = firstLine.lineNumber + 1; i <= range.end.line; ++i) {
        const line = lineAt(i);
        if (!line.isEmptyOrWhitespace) {
          return new Position(i, line.firstNonWhitespaceCharacterIndex);
        }
      }
      return range.start;
    }
    const characterDelta = text.length - text.trimStart().length;
    return new Position(
      firstLine.lineNumber,
      range.start.character + characterDelta
    );
  })();

  const end = (() => {
    const endLine = lineAt(range.end);
    const text = endLine.text.substring(0, range.end.character);
    if (text.trim().length === 0) {
      for (let i = endLine.lineNumber - 1; i >= range.start.line; --i) {
        const line = lineAt(i);
        if (!line.isEmptyOrWhitespace) {
          return new Position(
            i,
            lastNonWhitespaceCharacterIndex(line.range.end.character, line.text)
          );
        }
      }
      return range.end;
    }
    return new Position(
      endLine.lineNumber,
      lastNonWhitespaceCharacterIndex(range.end.character, text)
    );
  })();

  return new Range(start, end);
}

function lastNonWhitespaceCharacterIndex(characterIndex: number, text: string) {
  const characterDelta = text.length - text.trimEnd().length;
  return characterIndex - characterDelta;
}
