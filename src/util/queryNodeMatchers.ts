import { Position, Range, Selection } from "vscode";
import { SyntaxNode, Query, QueryCapture, Point } from "web-tree-sitter";
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

let query: Query;

export function defaultMatcher(
  scopeType: string,
  isIterationScopePresent: boolean,
  scopeQuery: string,
  selector: SelectionExtractor = simpleSelectionExtractor
): NodeMatcher {
  return (
    selection: SelectionWithEditor,
    node: SyntaxNode,
    siblings: boolean = false
  ): NodeMatcherValue[] | null => {
    const query = getQuery(node, scopeQuery);
    const rawCaptures = getCapture(
      selection,
      node.tree.rootNode,
      query,
      scopeType
    );

    if (!rawCaptures || rawCaptures.length === 0) {
      return null;
    }
    let selectedCaptures = selectCaptureByRange(rawCaptures, selection);
    if (siblings) {
      let siblingCaptures: QueryCapture[];
      if (selectedCaptures!.length > 1) {
        // TODO: Clarity.
        throw new Error("Cannot match siblings on multiple captures.");
      }
      if (isIterationScopePresent) {
        throw new Error("searchScope based queries are not implemented.");
      } else {
        siblingCaptures = findBySiblingsByParent(
          selectedCaptures![0].node,
          query,
          scopeType
        );
      }

      return siblingCaptures!.map((c) => {
        return {
          node: c.node,
          selection: selector(selection.editor, c.node),
        };
      });
    }

    if (!selectedCaptures) {
      return null;
    } else {
      const leadingNode = selectedCaptures[0].node;
      // TODO: Could we target ES2022 and use .at(-1)?
      const trailingNode = selectedCaptures[selectedCaptures.length - 1].node;
      return [
        {
          // TODO: What should we do here if we are matching multiple nodes for the selection? Which node do we reference?
          node: selectedCaptures[0].node,
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

function getQuery(node: SyntaxNode, scopeQuery: string): Query {
  if (!query) {
    query = node.tree.getLanguage().query(scopeQuery);
  }
  return query;
}

/**
 * Prioritize current position of the cursor, one space to the right and then finally one space to the left.
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

  const positions = [
    { startPoint, endPoint },
    {
      startPoint,
      endPoint: { row: endPoint.row, column: endPoint.column + 1 },
    },
    {
      startPoint: { row: startPoint.row, column: startPoint.column - 1 },
      endPoint,
    },
  ];

  for (const { startPoint, endPoint } of positions) {
    const captures = query
      .captures(root, startPoint, endPoint)
      .filter((capture) => {
        return capture.name === scopeType;
      });
    if (captures && captures.length > 0) {
      return captures;
    }
  }
}

function selectCaptureByRange(
  captures: QueryCapture[],
  selection: SelectionWithEditor
): QueryCapture[] | null {
  let isSinglePoint = selection.selection.isEmpty;

  let leadingCapture = matchCapturesOnPosition(
    captures,
    selection.selection.start
  );

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
  return [];
}
