import { ScopeType } from "../typings/Types";

export type ScopeTypeToKeyword = { [scope in ScopeType]: string };

const scopeToKeyword: ScopeTypeToKeyword = {
  argumentOrParameter: "argumentOrParameter",
  anonymousFunction: "anonymousFunction",
  attribute: "attribute",
  class: "class",
  className: "className",
  collectionItem: "collectionItem",
  collectionKey: "collectionKey",
  comment: "comment",
  functionCall: "call",
  functionName: "functionName",
  ifStatement: "if",
  list: "list",
  map: "map",
  name: "name",
  namedFunction: "namedFunction",
  regularExpression: "regex",
  statement: "statement",
  string: "string",
  type: "type",
  value: "value",
  condition: "condition",
  section: "section",
  sectionLevelOne: "section.1",
  sectionLevelTwo: "section.2",
  sectionLevelThree: "section.3",
  sectionLevelFour: "section.4",
  sectionLevelFive: "section.5",
  sectionLevelSix: "section.6",
  selector: "selector",
  xmlBothTags: "tags",
  xmlElement: "element",
  xmlEndTag: "tags.end",
  xmlStartTag: "tags.start",
};

export default scopeToKeyword;
