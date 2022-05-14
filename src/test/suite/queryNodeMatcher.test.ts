import * as assert from "assert";
import * as vscode from "vscode";
import { openNewEditor } from "../openNewEditor";
import { defaultMatcher } from "../../util/queryNodeMatchers";
import { getParseTreeApi } from "../../util/getExtensionApi";
import { selectionWithEditorFromPositions } from "../../util/selectionUtils";
import { NodeMatcher, SelectionWithEditor } from "../../typings/Types";
import { SyntaxNode } from "web-tree-sitter";

suite("queryNodeMatcher", async function () {
  test("match single", async () => {
    const nodeType = "comment";
    const matcher = defaultMatcher(nodeType, false, `(comment) @${nodeType}`);
    const code = "# hello world";

    const { selection, node } = await getNodeAndEditor(code);
    assertMatch(matcher, node, nodeType, selection, 1);
  });

  test("match multiple by parent", async () => {
    const nodeType = "comment";

    const matcher = defaultMatcher(nodeType, false, `(comment) @${nodeType}`);
    const code = `# hello world
  variable_def = "yep"
  # hello world
  # hello world`;
    const { selection, node } = await getNodeAndEditor(code);
    assertMatch(matcher, node, nodeType, selection, 3);
  });

  test.skip("match multiple by searchScope throws error", async () => {
    // TODO
  });
});

const getNodeAndEditor = async (
  code: string
): Promise<{ selection: SelectionWithEditor; node: SyntaxNode }> => {
  const editor = await openNewEditor(code, "ruby");
  const { getNodeAtLocation } = await getParseTreeApi();
  const cursorPosition = new vscode.Position(0, 1);
  const node = getNodeAtLocation(
    new vscode.Location(editor.document.uri, cursorPosition)
  );
  const selectionWithEditor = selectionWithEditorFromPositions(
    { selection: editor.selection, editor },
    cursorPosition,
    cursorPosition
  );

  return {
    selection: selectionWithEditor,
    node,
  };
};

const assertMatch = async (
  matcher: NodeMatcher,
  node: SyntaxNode,
  nodeType: string,
  selectionWithEditor: SelectionWithEditor,
  expectedMatches: number
) => {
  const matches = matcher(selectionWithEditor, node, true);

  assert.equal(expectedMatches, matches!.length);
  for (const match of matches!) {
    assert.equal(nodeType, match.node.type);
  }
};
