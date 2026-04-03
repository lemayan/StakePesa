import test from "node:test";
import assert from "node:assert/strict";
import {
  getFundingPayoutPolicy,
  getInvitationAcceptancePlan,
} from "@/lib/challenge-funding";

test("creator-funded policy is explicit and winner-takes-all", () => {
  const policy = getFundingPayoutPolicy("CREATOR_FUNDED");

  assert.equal(policy.code, "CREATOR_FUNDED_WINNER_TAKES_ALL");
  assert.match(policy.summary, /Creator funds the full pool up front/i);
  assert.equal(policy.ruleLines.length, 4);
});

test("split-participant policy is explicit and winner-takes-all", () => {
  const policy = getFundingPayoutPolicy("SPLIT_PARTICIPANT");

  assert.equal(policy.code, "SPLIT_WINNER_TAKES_ALL");
  assert.match(policy.summary, /Each participant deposits their own stake/i);
  assert.equal(policy.ruleLines.length, 4);
});

test("invitation acceptance plan for split mode requires invitee deposit", () => {
  const plan = getInvitationAcceptancePlan("SPLIT_PARTICIPANT", 27500);

  assert.equal(plan.inviteeMustDeposit, true);
  assert.equal(plan.lockAmountCents, 27500);
  assert.equal(plan.participantRecordedAmountCents, 27500);
  assert.match(plan.successMessage, /Waiting for remaining participants/i);
});

test("invitation acceptance plan for creator-funded mode does not require invitee deposit", () => {
  const plan = getInvitationAcceptancePlan("CREATOR_FUNDED", 27500);

  assert.equal(plan.inviteeMustDeposit, false);
  assert.equal(plan.lockAmountCents, 0);
  assert.equal(plan.participantRecordedAmountCents, 0);
  assert.match(plan.successMessage, /Creator already funded this challenge/i);
});
