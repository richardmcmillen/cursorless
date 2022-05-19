import { PartialTargetDesc } from "../../typings/target.types";
import { ActionType } from "../../actions/actions.types";
import {
  CommandV0,
  CommandV1,
} from "../commandVersionUpgrades/upgradeV1ToV2/commandV1.types";

export type CommandComplete = Required<Omit<CommandLatest, "spokenForm">> &
  Pick<CommandLatest, "spokenForm">;

export const LATEST_VERSION = 2 as const;

export type CommandLatest = Command & {
  version: typeof LATEST_VERSION;
};

export type Command = CommandV0 | CommandV1 | CommandV2;

export interface CommandV2 {
  /**
   * The version number of the command API
   */
  version: 2;

  /**
   * The spoken form of the command if issued from a voice command system
   */
  spokenForm?: string;

  /**
   * If the command is issued from a voice command system, this boolean indicates
   * whether we should use the pre phrase snapshot. Only set this to true if the
   * voice command system issues a pre phrase signal at the start of every
   * phrase.
   */
  usePrePhraseSnapshot: boolean;

  /**
   * The action to run
   */
  action: ActionType;

  /**
   * A list of targets expected by the action. Inference will be run on the
   * targets
   */
  targets: PartialTargetDesc[];

  /**
   * A list of extra arguments expected by the given action.
   */
  extraArgs?: unknown[];
}