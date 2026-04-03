export type ChallengeFundingModeValue = "SPLIT_PARTICIPANT" | "CREATOR_FUNDED";

export interface FundingPayoutPolicy {
  code: "SPLIT_WINNER_TAKES_ALL" | "CREATOR_FUNDED_WINNER_TAKES_ALL";
  summary: string;
  ruleLines: string[];
}

export interface InvitationAcceptancePlan {
  lockAmountCents: number;
  participantRecordedAmountCents: number;
  inviteeMustDeposit: boolean;
  successMessage: string;
}

export function getFundingPayoutPolicy(mode: ChallengeFundingModeValue): FundingPayoutPolicy {
  if (mode === "CREATOR_FUNDED") {
    return {
      code: "CREATOR_FUNDED_WINNER_TAKES_ALL",
      summary: "Creator funds the full pool up front; final winner takes the entire funded pool.",
      ruleLines: [
        "Initiator locks the entire challenge pool at creation.",
        "Invitees confirm participation without making additional deposits.",
        "At settlement, declared winner takes the full pool.",
        "If a dispute remains unresolved for 7 days, stake is forfeited to company policy.",
      ],
    };
  }

  return {
    code: "SPLIT_WINNER_TAKES_ALL",
    summary: "Each participant deposits their own stake; final winner takes the entire pooled deposits.",
    ruleLines: [
      "Each participant locks their own stake when joining.",
      "Challenge activates once required participants confirm.",
      "At settlement, declared winner takes the full pool.",
      "If a dispute remains unresolved for 7 days, stake is forfeited to company policy.",
    ],
  };
}

export function getInvitationAcceptancePlan(
  mode: ChallengeFundingModeValue,
  invitationStakeAmountCents: number
): InvitationAcceptancePlan {
  if (mode === "CREATOR_FUNDED") {
    return {
      lockAmountCents: 0,
      participantRecordedAmountCents: 0,
      inviteeMustDeposit: false,
      successMessage: "Invitation accepted. Creator already funded this challenge.",
    };
  }

  return {
    lockAmountCents: invitationStakeAmountCents,
    participantRecordedAmountCents: invitationStakeAmountCents,
    inviteeMustDeposit: true,
    successMessage: "Invitation accepted. Waiting for remaining participants.",
  };
}
