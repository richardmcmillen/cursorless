import { Position, Range, Selection } from "vscode";
import {
  SyntaxNode,
  Query,
  Language,
  QueryCapture,
  Point,
} from "web-tree-sitter";
import {
  NodeMatcher,
  NodeMatcherValue,
  SelectionExtractor,
  SelectionWithEditor,
} from "../typings/Types";
import {
  makeRangeFromPositions,
  simpleSelectionExtractor,
} from "./nodeSelectors";

export function defaultMatcher(
  scopeType: string,
  isIterationScopePresent: boolean,
  scopeQuery: string,
  selector: SelectionExtractor = simpleSelectionExtractor
): NodeMatcher {
  let query: Query;

  return (
    selection: SelectionWithEditor,
    node: SyntaxNode,
    siblings: boolean | undefined
  ): NodeMatcherValue[] | null => {
    if (!query) {
      query = getQuery(node.tree.getLanguage(), scopeQuery);
    }

    const captures = getCapture(
      selection,
      node.tree.rootNode,
      query,
      scopeType
    );

    if (!captures || captures.length === 0) {
      return null;
    }
    let selectedCaptures = selectCaptureByRange(captures, selection);
    if (siblings) {
      // let captures: QueryCapture[];
      if (isIterationScopePresent) {
        throw new Error("searchScope based queries are not implemented.");
      } else {
        // captures = findBySiblingsByParent(
        //   capture.node,
        //   selection,
        //   query,
        //   scopeType
        // );
      }

      // return captures!.map((c) => {
      //   return {
      //     node: c.node,
      //     selection: selector(selection.editor, c.node),
      //   };
      // });
    }
    if (!selectedCaptures) {
      return null;
    } else {
      const leadingNode = selectedCaptures[0].node;
      const trailingNode = selectedCaptures[selectedCaptures.length - 1].node;
      return [
        {
          // TODO: What should we do here if we are matching and expanding ranges?
          node: selectedCaptures![0].node,
          selection: {
            selection: new Selection(
              new Position(
                leadingNode.startPosition.row,
                leadingNode.startPosition.column
              ),
              new Position(
                trailingNode.endPosition.row,
                trailingNode.endPosition.column
              )
            ),
            context: {},
          },
        },
      ];
    }
  };
}
/**
 *
 * @param selection Used to derive start and end points for a selection.
 * @param root Query is run against the root node.
 * @param query Compiled query to run against the parsed tree.
 * @param scopeType The scope type that the matcher is responsible for matching.
 * @returns Captures that match the scope type, possibly an empty list if there are no matches.
 */
function getCapture(
  selection: SelectionWithEditor,
  root: SyntaxNode,
  query: Query,
  scopeType: string
) {
  const startPoint = generatePointFromSelection(selection, "start");
  const endPoint = generatePointFromSelection(selection, "end");

  // Try to match on the selection.
  let captures = extractMatchingCaptures(
    startPoint,
    endPoint,
    root,
    query,
    scopeType
  );

  if (captures.length > 0) {
    return captures;
  }
  // Prioritize moving to the right.
  captures = extractMatchingCaptures(
    startPoint,
    { row: endPoint.row, column: endPoint.column + 1 },
    root,
    query,
    scopeType
  );

  if (captures.length > 0) {
    return captures;
  }
  // Fallback to the left.
  captures = extractMatchingCaptures(
    { row: startPoint.row, column: startPoint.column - 1 },
    endPoint,
    root,
    query,
    scopeType
  );
  return captures;
}

function extractMatchingCaptures(
  startPoint: Point,
  endPoint: Point,
  root: SyntaxNode,
  query: Query,
  scopeType: string
) {
  return query.captures(root, startPoint, endPoint).filter((capture) => {
    return capture.name === scopeType;
  });
}

function selectCaptureByRange(
  captures: QueryCapture[],
  selection: SelectionWithEditor
): QueryCapture[] | null {
  let leadingCapture = matchCapturesOnPosition(
    captures,
    selection.selection.start
  );
  let isSinglePoint = selection.selection.isEmpty;
  if (!leadingCapture) {
    return null;
  }

  if (isSinglePoint) {
    return [leadingCapture];
  } else {
    const trailingCapture = matchCapturesOnPosition(
      captures,
      selection.selection.end
    );
    if (!trailingCapture) {
      return null;
    }
    return [leadingCapture, trailingCapture];
  }
}

function matchCapturesOnPosition(captures: QueryCapture[], position: Position) {
  let capture;
  for (const c of captures) {
    const captureRange: Range = makeRangeFromPositions(
      c.node.startPosition,
      c.node.endPosition
    );
    if (captureRange.contains(position)) {
      if (!capture) {
        capture = c;
      } else {
        const leadingCaptureRange = makeRangeFromPositions(
          capture.node.startPosition,
          capture.node.endPosition
        );
        if (leadingCaptureRange.contains(captureRange)) {
          capture = c;
        }
      }
    }
  }
  return capture;
}

function getQuery(language: Language, scopeQuery: string): Query {
  return language.query(scopeQuery);
}

/**
 * Used to convert a selection to a Tree-Sitter Point.
 * @param selection
 * @param pointType
 * @returns A Tree-Sitter point
 */
function generatePointFromSelection(
  selection: SelectionWithEditor,
  pointType: "start" | "end"
): Point {
  return {
    row: selection.selection[pointType].line,
    column: selection.selection[pointType].character,
  };
}

/**
 * Ported from legacy parent matching. This code is responsible for finding parents of nodes which do not have
 * a searchScope defined in the Tree-Sitter scm query file.
 * @param node The matching node from the query and range matching. We will look at this node's parent to find siblings.
 * @param query The compiled query which will be run against the parent node.
 * @param scopeType The scope type that the matcher is responsible for matching.
 * @returns Sibling matches of the node or only the node itself.
 */
function findBySiblingsByParent(
  node: SyntaxNode,
  query: Query,
  scopeType: string
) {
  let parent: SyntaxNode | null = node.parent;
  const ids = parent?.namedChildren.map((c) => c.id);
  while (parent != null) {
    const matches = query
      .captures(parent)
      .filter(
        (capture) =>
          capture.name === scopeType && ids?.includes(capture.node.id)
      );
    if (matches.length > 0) {
      return matches;
    }
    parent = parent.parent;
  }
  return [node];
}
