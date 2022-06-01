import { Range } from "vscode";
import { Target, TargetType } from "../../typings/target.types";
import { shrinkRangeToFitContent } from "../../util/selectionUtils";
import BaseTarget, {
  CloneWithParameters,
  CommonTargetParameters,
} from "./BaseTarget";
import { createContinuousRangeWeakTarget } from "./WeakTarget";

export default class InteriorTarget extends BaseTarget {
  constructor(parameters: CommonTargetParameters) {
    super(parameters);
  }

  get type(): TargetType {
    return "weak";
  }
  get delimiter() {
    return "";
  }

  get contentRange() {
    return shrinkRangeToFitContent(this.editor, this.state.contentRange);
  }

  getRemovalRange(): Range {
    return this.state.contentRange;
  }

  cloneWith(parameters: CloneWithParameters) {
    return new InteriorTarget({
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
