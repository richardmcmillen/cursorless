import {
  DecorationRangeBehavior,
  Range,
  TextDocument,
  TextDocumentChangeEvent,
  TextDocumentContentChangeEvent,
} from "vscode";

export interface RangeInfo {
  document: TextDocument;
  range: Range;
  startOffset: number;
  endOffset: number;
}

export function updateRangeInfos(
  changeEvent: TextDocumentChangeEvent,
  rangeInfos: RangeInfo[],
  rangeBehavior: DecorationRangeBehavior = DecorationRangeBehavior.ClosedClosed
) {
  const { document, contentChanges } = changeEvent;

  contentChanges.forEach((change) => {
    const changeDisplacement = change.text.length - change.rangeLength;
    const changeStartOffset = change.rangeOffset;
    const changeEndOffset = changeStartOffset + change.rangeLength;

    rangeInfos.forEach((selectionInfo) => {
      if (selectionInfo.document !== document) {
        return;
      }

      let newSelectionInfoStartOffset = computeNewOffset(
        selectionInfo.startOffset,
        changeStartOffset,
        changeEndOffset,
        changeDisplacement,
        rangeBehavior === DecorationRangeBehavior.OpenClosed ||
          rangeBehavior === DecorationRangeBehavior.OpenOpen
      );

      const newSelectionInfoEndOffset = computeNewOffset(
        selectionInfo.endOffset,
        changeStartOffset,
        changeEndOffset,
        changeDisplacement,
        rangeBehavior === DecorationRangeBehavior.OpenClosed ||
          rangeBehavior === DecorationRangeBehavior.ClosedClosed
      );

      // Handle the case where we're ClosedClosed and change intersects both
      // start and end
      newSelectionInfoStartOffset = Math.min(
        newSelectionInfoStartOffset,
        newSelectionInfoEndOffset
      );

      selectionInfo.range = selectionInfo.range.with(
        document.positionAt(newSelectionInfoStartOffset),
        document.positionAt(newSelectionInfoEndOffset)
      );
      selectionInfo.startOffset = newSelectionInfoStartOffset;
      selectionInfo.endOffset = newSelectionInfoEndOffset;
    });
  });
}

function computeNewOffset(
  originalOffset: number,
  changeStartOffset: number,
  changeEndOffset: number,
  changeDisplacement: number,
  moveLeftOnConflict: boolean
) {
  if (changeEndOffset < originalOffset) {
    return originalOffset + changeDisplacement;
  }

  if (changeStartOffset > originalOffset) {
    return originalOffset;
  }

  // todo handle fancy case with regex
  return moveLeftOnConflict
    ? changeStartOffset
    : changeEndOffset + changeDisplacement;
}
