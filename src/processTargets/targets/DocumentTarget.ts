import { Target, TargetType } from "../../typings/target.types";
import { shrinkRangeToFitContent } from "../../util/selectionUtils";
import { createContinuousRange } from "../targetUtil/createContinuousRange";
import BaseTarget, {
  CloneWithParameters,
  CommonTargetParameters,
} from "./BaseTarget";
import WeakTarget, { createContinuousRangeWeakTarget } from "./WeakTarget";

export default class DocumentTarget extends BaseTarget {
  constructor(parameters: CommonTargetParameters) {
    super(parameters);
  }

  get type(): TargetType {
    return "document";
  }
  get delimiter() {
    return "\n";
  }
  get isLine() {
    return true;
  }

  getLeadingDelimiterRange() {
    return undefined;
  }
  getTrailingDelimiterRange() {
    return undefined;
  }

  getInteriorStrict() {
    return [
      new WeakTarget({
        editor: this.editor,
        isReversed: this.isReversed,
        contentRange: shrinkRangeToFitContent(this.editor, this.contentRange),
      }),
    ];
  }

  cloneWith(parameters: CloneWithParameters) {
    return new DocumentTarget({
      ...this.getCloneParameters(),
      ...parameters,
    });
  }

  createContinuousRangeTarget(
    isReversed: boolean,
    endTarget: Target,
    includeStart: boolean,
    includeEnd: boolean
  ): Target {
    if (this.isSameType(endTarget)) {
      return new DocumentTarget({
        ...this.getCloneParameters(),
        isReversed,
        contentRange: createContinuousRange(
          this,
          endTarget,
          includeStart,
          includeEnd
        ),
      });
    }

    return createContinuousRangeWeakTarget(
      isReversed,
      this,
      endTarget,
      includeStart,
      includeEnd
    );
  }

  protected getCloneParameters() {
    return this.state;
  }
}
