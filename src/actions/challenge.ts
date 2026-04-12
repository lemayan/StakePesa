"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { calculateFeeBps, creditWallet, debitWallet, getWalletBalance, lockEscrow, refundEscrow } from "@/lib/wallet";
import { getFundingPayoutPolicy, getInvitationAcceptancePlan } from "@/lib/challenge-funding";
import { DepositStatus, VerificationMethod } from "@prisma/client";
import markets from "@/data/markets.json";
import { z } from "zod";
import {
  sendChallengeCreatedEmail,
  sendChallengeInvitationEmail,
  sendInvitationAcceptedEmail,
  sendChallengeActiveEmail,
  sendChallengeResolvedEmail,
  sendDisputeRaisedEmail,
} from "@/lib/mail";

type CompatDelegate = {
  findUnique<T = unknown>(args: unknown): Promise<T>;
  findMany<T = unknown>(args: unknown): Promise<T[]>;
  create?<T = unknown>(args: unknown): Promise<T>;
  update?<T = unknown>(args: unknown): Promise<T>;
  updateMany?<T = unknown>(args: unknown): Promise<T>;
  upsert?<T = unknown>(args: unknown): Promise<T>;
  count?(args: unknown): Promise<number>;
};

type CompatClient = {
  challenge: Required<Pick<CompatDelegate, "findUnique" | "findMany" | "create" | "update">>;
  challengeInvitation: Required<Pick<CompatDelegate, "findUnique" | "findMany" | "create" | "update" | "count">>;
  challengeDispute: Required<Pick<CompatDelegate, "findUnique" | "create" | "update" | "updateMany">>;
  challengeVerificationVote: Required<Pick<CompatDelegate, "upsert" | "findMany">>;
};

const prismaDb = db as unknown as CompatClient;

type ChallengeStatusValue = "PENDING" | "ACTIVE" | "RESOLVED" | "DISPUTED";
type VerificationMethodValue = "MUTUAL" | "ADMIN" | "REFEREE";
type FundingModeValue = "SPLIT_PARTICIPANT" | "CREATOR_FUNDED";
type VerificationVerdictValue = "APPROVE" | "REJECT";
type InvitationStatusValue = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";

interface UserLite {
  id: string;
  name: string | null;
  email: string | null;
}

interface ChallengeParticipantWithUser {
  userId: string;
  amount: number;
  depositStatus: DepositStatus;
  joinedAt: Date;
  user: UserLite;
}

interface ChallengeInvitationRecord {
  id: string;
  challengeId: string;
  invitedUserId: string | null;
  email: string;
  stakeAmount: number;
  status: InvitationStatusValue;
  acceptedAt: Date | null;
  createdAt: Date;
  challenge?: {
    id: string;
    status: ChallengeStatusValue;
    title: string;
    fundingMode?: FundingModeValue;
  };
  invitedBy?: UserLite;
}

interface ChallengeDisputeWithRaisedBy {
  id: string;
  reason: string;
  createdAt: Date;
  resolvedAt: Date | null;
  resolution: string | null;
  raisedBy: UserLite;
  resolvedBy?: UserLite | null;
}

interface ChallengeVoteWithUser {
  id: string;
  userId: string;
  verdict: VerificationVerdictValue;
  note: string | null;
  createdAt: Date;
  user: UserLite;
}

interface ChallengeRow {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  status: ChallengeStatusValue;
  verificationMethod: VerificationMethodValue;
  fundingMode: FundingModeValue;
  marketId: string | null;
  endDate: Date;
  creator: UserLite;
  referee: UserLite | null;
  participants: ChallengeParticipantWithUser[];
  invitations: ChallengeInvitationRecord[];
  disputes: ChallengeDisputeWithRaisedBy[];
}

interface ChallengeDetailsRow extends ChallengeRow {
  createdAt: Date;
  resolvedAt: Date | null;
  resolutionNotes: string | null;
  refereeId: string | null;
  resolvedBy: UserLite | null;
  verificationVotes: ChallengeVoteWithUser[];
}

export interface ChallengeCard {
  id: string;
  title: string;
  description: string | null;
  status: ChallengeStatusValue;
  verificationMethod: VerificationMethodValue;
  fundingMode: FundingModeValue;
  totalPoolCents: number;
  participantCount: number;
  pendingInvites: number;
  creator: UserLite;
  referee: UserLite | null;
  isCreator: boolean;
  marketId: string | null;
  endDate: string;
  participants: Array<{
    id: string;
    name: string;
    email: string | null;
    amountCents: number;
    depositStatus: DepositStatus;
  }>;
  latestDispute: {
    id: string;
    reason: string;
    createdAt: string;
    raisedBy: string;
  } | null;
  payoutPolicy: ReturnType<typeof getFundingPayoutPolicy>;
}

export interface PendingInvitationCard {
  id: string;
  challengeId: string;
  challengeTitle: string;
  inviter: string;
  stakeAmountCents: number;
  status: ChallengeStatusValue;
  createdAt: string;
}

export interface MyChallengeDashboardData {
  running: ChallengeCard[];
  resolved: ChallengeCard[];
  disputed: ChallengeCard[];
  pendingInvitations: PendingInvitationCard[];
  exploreMarkets: typeof exploreMarkets;
}

const exploreMarkets = markets.markets.slice(0, 4).map((market) => ({
  id: market.id,
  title: market.title,
  category: market.category,
  options: market.options.length,
}));

const participantInputSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  stakeAmount: z.number().int().min(100, "Minimum stake is KES 1 (100 cents)."),
});

const createChallengeSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(600).optional(),
  endDate: z.string().datetime(),
  creatorStakeAmount: z.number().int().min(100),
  participants: z.array(participantInputSchema).min(1),
  fundingMode: z.enum(["SPLIT_PARTICIPANT", "CREATOR_FUNDED"]),
  verificationMethod: z.nativeEnum(VerificationMethod),
  refereeId: z.string().cuid().optional(),
  refereeEmail: z.string().trim().toLowerCase().email().optional(),
  marketId: z.string().trim().min(1).optional(),
});

const disputeSchema = z.object({
  challengeId: z.string().uuid(),
  reason: z.string().trim().min(8).max(500),
});

const resolveDisputeSchema = z.object({
  disputeId: z.string().uuid(),
  resolution: z.string().trim().min(8).max(500),
});

const voteVerificationSchema = z.object({
  challengeId: z.string().uuid(),
  verdict: z.enum(["APPROVE", "REJECT"]),
  note: z.string().trim().min(3).max(500).optional(),
});

const authorityResolveChallengeSchema = z.object({
  challengeId: z.string().uuid(),
  resolution: z.string().trim().min(8).max(500),
});

const DELETE_WINDOW_HOURS = 12;
const DISPUTE_FORFEIT_HOURS = 24 * 7;

function getDeleteWindowDeadline(createdAt: Date) {
  return new Date(createdAt.getTime() + DELETE_WINDOW_HOURS * 60 * 60 * 1000);
}

async function enforceDisputeForfeitPolicy(challengeId?: string) {
  const cutoff = new Date(Date.now() - DISPUTE_FORFEIT_HOURS * 60 * 60 * 1000);

  const staleDisputedChallenges = await prismaDb.challenge.findMany({
    where: {
      ...(challengeId ? { id: challengeId } : {}),
      status: "DISPUTED",
      disputes: {
        some: {
          resolvedAt: null,
          createdAt: { lte: cutoff },
        },
      },
    },
    select: {
      id: true,
      creatorId: true,
    },
  }) as Array<{ id: string; creatorId: string }>;

  if (staleDisputedChallenges.length === 0) {
    return;
  }

  for (const stale of staleDisputedChallenges) {
    await db.$transaction(async (tx) => {
      const txDb: typeof prismaDb = tx as unknown as typeof prismaDb;
      await txDb.challengeDispute.updateMany({
        where: {
          challengeId: stale.id,
          resolvedAt: null,
        },
        data: {
          resolvedAt: new Date(),
          resolution: "Dispute remained unresolved for 7 days. Stake forfeited to company policy.",
        },
      });

      await txDb.challenge.update({
        where: { id: stale.id },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          resolutionNotes: "Dispute unresolved for 7 days. Stake forfeited to company policy.",
        },
      });

      await tx.auditLog.create({
        data: {
          userId: stale.creatorId,
          action: "CHALLENGE_DISPUTE_FORFEITED_TO_COMPANY",
          metadata: {
            challengeId: stale.id,
            policyHours: DISPUTE_FORFEIT_HOURS,
          },
        },
      });
    });
  }
}

function challengeToCard(challenge: ChallengeRow, currentUserId: string): ChallengeCard {
  const totalPoolCents = challenge.participants.reduce((sum, p) => sum + p.amount, 0);
  const pendingInvites = challenge.invitations.filter((i) => i.status === "PENDING").length;

  return {
    id: challenge.id,
    title: challenge.title,
    description: challenge.description,
    status: challenge.status,
    verificationMethod: challenge.verificationMethod,
    fundingMode: challenge.fundingMode,
    totalPoolCents,
    participantCount: challenge.participants.length,
    pendingInvites,
    creator: challenge.creator,
    referee: challenge.referee,
    isCreator: challenge.creatorId === currentUserId,
    marketId: challenge.marketId,
    endDate: challenge.endDate.toISOString(),
    participants: challenge.participants.map((p) => ({
      id: p.user.id,
      name: p.user.name ?? p.user.email ?? "Unknown",
      email: p.user.email,
      amountCents: p.amount,
      depositStatus: p.depositStatus,
    })),
    latestDispute: challenge.disputes[0]
      ? {
          id: challenge.disputes[0].id,
          reason: challenge.disputes[0].reason,
          createdAt: challenge.disputes[0].createdAt.toISOString(),
          raisedBy: challenge.disputes[0].raisedBy.name ?? challenge.disputes[0].raisedBy.email ?? "Unknown",
        }
      : null,
    payoutPolicy: getFundingPayoutPolicy(challenge.fundingMode),
  };
}

export async function searchUsersForChallenge(query: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const q = query.trim();
  if (q.length < 2) {
    return [];
  }

  const users = await db.user.findMany({
    where: {
      id: { not: session.user.id },
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true },
    take: 8,
  });

  return users;
}

export async function createChallengeAction(input: z.infer<typeof createChallengeSchema>) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return { error: "You must be logged in to create a challenge." };
  }

  const parsed = createChallengeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid challenge payload." };
  }

  const data = parsed.data;
  const endDate = new Date(data.endDate);
  if (Number.isNaN(endDate.getTime()) || endDate.getTime() <= Date.now()) {
    return { error: "End date must be in the future." };
  }

  if (data.verificationMethod === "REFEREE" && !data.refereeId && !data.refereeEmail) {
    return { error: "Select a referee user or provide a referee email." };
  }

  const dedupedParticipants = Array.from(
    new Map(
      data.participants
        .filter((p) => p.email !== session.user.email!.toLowerCase())
        .map((p) => [p.email, p])
    ).values()
  );

  const totalParticipants = dedupedParticipants.length + 1;
  if (totalParticipants < 2) {
    return { error: "Add at least one participant besides yourself." };
  }

  const inviteesStakeTotal = dedupedParticipants.reduce((sum, participant) => sum + participant.stakeAmount, 0);
  const totalPoolCents = data.creatorStakeAmount + inviteesStakeTotal;
  const creatorLockAmount = data.fundingMode === "CREATOR_FUNDED" ? totalPoolCents : data.creatorStakeAmount;

  const creatorBalance = await getWalletBalance(session.user.id);
  if (creatorBalance < creatorLockAmount) {
    return {
      error: `Insufficient wallet balance. Required ${(creatorLockAmount / 100).toFixed(2)} KES to fund this challenge.`,
    };
  }

  const users = await db.user.findMany({
    where: {
      email: {
        in: dedupedParticipants.map((p) => p.email),
      },
    },
    select: { id: true, email: true },
  });

  const userByEmail = new Map(users.map((u) => [u.email?.toLowerCase() ?? "", u]));

  const referee = data.refereeId
    ? await db.user.findUnique({ where: { id: data.refereeId }, select: { id: true } })
    : data.refereeEmail
      ? await db.user.findUnique({
          where: { email: data.refereeEmail },
          select: { id: true },
        })
      : null;

  const created = await db.$transaction(async (tx): Promise<{ id: string }> => {
    const txDb: typeof prismaDb = tx as unknown as typeof prismaDb;
    const challenge = await txDb.challenge.create<{ id: string }>({
      data: {
        creatorId: session.user!.id,
        title: data.title,
        description: data.description,
        endDate,
        marketId: data.marketId,
        status: "PENDING",
        verificationMethod: data.verificationMethod,
        fundingMode: data.fundingMode,
        refereeId: data.verificationMethod === "REFEREE" ? referee?.id ?? null : null,
        maxParticipants: totalParticipants,
      },
    });

    await tx.challengeParticipant.create({
      data: {
        challengeId: challenge.id,
        userId: session.user!.id,
        amount: creatorLockAmount,
        depositStatus: DepositStatus.CONFIRMED,
      },
    });

    await Promise.all(
      dedupedParticipants.map(async (participant) => {
        const matchedUser = userByEmail.get(participant.email);
        await txDb.challengeInvitation.create({
          data: {
            challengeId: challenge.id,
            invitedById: session.user!.id,
            invitedUserId: matchedUser?.id,
            email: participant.email,
            stakeAmount: participant.stakeAmount,
          },
        });
      })
    );

    await tx.auditLog.create({
      data: {
        userId: session.user!.id,
        action: "CHALLENGE_CREATED",
        metadata: {
          challengeId: challenge.id,
          participants: totalParticipants,
          verificationMethod: data.verificationMethod,
          fundingMode: data.fundingMode,
          payoutPolicy: getFundingPayoutPolicy(data.fundingMode).code,
          creatorLockedAmount: creatorLockAmount,
        },
      },
    });

    return challenge;
  });

  try {
    await lockEscrow(session.user.id, created.id, creatorLockAmount);
  } catch {
    await db.challenge.delete({ where: { id: created.id } });
    return { error: "Unable to lock challenge funds. Challenge was cancelled. Please try again." };
  }

  // ── Fire-and-forget email notifications ──
  // Note: totalPoolCents already computed above (line ~383)

  void sendChallengeCreatedEmail(
    session.user.email,
    session.user.name ?? session.user.email,
    {
      id: created.id,
      title: data.title,
      description: data.description,
      endDate: endDate.toISOString(),
      stakeAmountCents: creatorLockAmount,
      totalPoolCents,
      participantCount: totalParticipants,
      fundingMode: data.fundingMode,
    }
  );

  // Fetch the created invitations to get their IDs
  const createdInvitations = await db.challengeInvitation.findMany({
    where: { challengeId: created.id },
    select: { id: true, email: true, stakeAmount: true },
  });

  for (const invite of createdInvitations) {
    void sendChallengeInvitationEmail(
      invite.email,
      session.user.name ?? session.user.email,
      {
        id: created.id,
        title: data.title,
        description: data.description,
        endDate: endDate.toISOString(),
        stakeAmountCents: data.creatorStakeAmount,
        totalPoolCents,
        participantCount: totalParticipants,
        fundingMode: data.fundingMode,
      },
      invite.id,
      invite.stakeAmount
    );
  }

  return { success: "Challenge created and invitations sent.", challengeId: created.id };
}

export async function acceptChallengeInvitationAction(invitationId: string) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return { error: "You must be logged in to accept this invitation." };
  }

  const invitation = await prismaDb.challengeInvitation.findUnique({
    where: { id: invitationId },
    include: {
      challenge: {
        select: {
          id: true,
          status: true,
          title: true,
          fundingMode: true,
        },
      },
    },
  }) as ChallengeInvitationRecord | null;

  if (!invitation) {
    return { error: "Invitation not found." };
  }

  const canAccept = invitation.email.toLowerCase() === session.user.email.toLowerCase()
    || invitation.invitedUserId === session.user.id;

  if (!canAccept) {
    return { error: "This invitation does not belong to your account." };
  }

  if (invitation.status !== "PENDING") {
    return { error: "This invitation is no longer pending." };
  }

  const fundingMode = invitation.challenge?.fundingMode ?? "SPLIT_PARTICIPANT";
  const acceptancePlan = getInvitationAcceptancePlan(fundingMode, invitation.stakeAmount);
  if (acceptancePlan.inviteeMustDeposit) {
    const balance = await getWalletBalance(session.user.id);
    if (balance < acceptancePlan.lockAmountCents) {
      return {
        error: `Insufficient wallet balance. Required ${(acceptancePlan.lockAmountCents / 100).toFixed(2)} KES.`,
      };
    }

    await lockEscrow(session.user.id, invitation.challengeId, acceptancePlan.lockAmountCents);
  }

  const result = await db.$transaction(async (tx) => {
    const txDb: typeof prismaDb = tx as unknown as typeof prismaDb;
    await txDb.challengeInvitation.update({
      where: { id: invitation.id },
      data: {
        invitedUserId: session.user!.id,
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    await tx.challengeParticipant.upsert({
      where: {
        challengeId_userId: {
          challengeId: invitation.challengeId,
          userId: session.user!.id,
        },
      },
      create: {
        challengeId: invitation.challengeId,
        userId: session.user!.id,
        amount: acceptancePlan.participantRecordedAmountCents,
        depositStatus: "CONFIRMED",
      },
      update: {
        amount: acceptancePlan.participantRecordedAmountCents,
        depositStatus: "CONFIRMED",
      },
    });

    const pendingInvites = await txDb.challengeInvitation.count({
      where: { challengeId: invitation.challengeId, status: "PENDING" },
    });

    const confirmedParticipants = await tx.challengeParticipant.count({
      where: { challengeId: invitation.challengeId, depositStatus: "CONFIRMED" },
    });

    if (pendingInvites === 0 && confirmedParticipants >= 2) {
      await tx.challenge.update({
        where: { id: invitation.challengeId },
        data: { status: "ACTIVE" },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: session.user!.id,
        action: "CHALLENGE_INVITE_ACCEPTED",
        metadata: {
          challengeId: invitation.challengeId,
          invitationId: invitation.id,
          stakeAmount: invitation.stakeAmount,
          fundingMode,
          payoutPolicy: getFundingPayoutPolicy(fundingMode).code,
        },
      },
    });

    return { pendingInvites, confirmedParticipants };
  });

  // ── Fire-and-forget email notifications ──
  // Fetch the full challenge for email data
  const fullChallenge = await db.challenge.findUnique({
    where: { id: invitation.challengeId },
    select: {
      id: true,
      title: true,
      endDate: true,
      fundingMode: true,
      creator: { select: { email: true, name: true } },
      participants: {
        where: { depositStatus: "CONFIRMED" },
        select: { amount: true, user: { select: { email: true, name: true } } },
      },
    },
  });

  if (fullChallenge) {
    const emailPoolCents = fullChallenge.participants.reduce((sum, p) => sum + p.amount, 0);
    const challengeData = {
      id: fullChallenge.id,
      title: fullChallenge.title,
      endDate: fullChallenge.endDate.toISOString(),
      totalPoolCents: emailPoolCents,
      stakeAmountCents: invitation.stakeAmount,
      participantCount: fullChallenge.participants.length,
      fundingMode: fullChallenge.fundingMode,
    };

    // Notify creator that someone accepted
    if (fullChallenge.creator.email) {
      void sendInvitationAcceptedEmail(
        fullChallenge.creator.email,
        fullChallenge.creator.name ?? fullChallenge.creator.email,
        session.user.name ?? session.user.email ?? "A participant",
        challengeData
      );
    }

    // If challenge just became active, notify all participants
    if (result.pendingInvites === 0) {
      for (const participant of fullChallenge.participants) {
        if (participant.user.email) {
          void sendChallengeActiveEmail(
            participant.user.email,
            participant.user.name ?? participant.user.email,
            challengeData
          );
        }
      }
    }
  }

  return {
    success:
      result.pendingInvites === 0
        ? "Invitation accepted. Challenge is now active."
        : acceptancePlan.successMessage,
  };
}

export async function raiseDisputeAction(input: z.infer<typeof disputeSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be logged in to raise a dispute." };
  }

  const parsed = disputeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid dispute payload." };
  }

  const challenge = await prismaDb.challenge.findUnique({
    where: { id: parsed.data.challengeId },
    include: {
      participants: { select: { userId: true } },
    },
  }) as (Pick<ChallengeDetailsRow, "id" | "creatorId" | "refereeId"> & { participants: Array<Pick<ChallengeParticipantWithUser, "userId">> }) | null;

  if (!challenge) {
    return { error: "Challenge not found." };
  }

  const isParticipant = challenge.participants.some((p) => p.userId === session.user!.id);
  const isCreator = challenge.creatorId === session.user!.id;
  if (!isParticipant && !isCreator) {
    return { error: "Only challenge participants can raise disputes." };
  }

  const notifyUserId = challenge.refereeId ?? challenge.creatorId;

  await db.$transaction(async (tx) => {
    const txDb: typeof prismaDb = tx as unknown as typeof prismaDb;
    await txDb.challengeDispute.create({
      data: {
        challengeId: challenge.id,
        raisedById: session.user!.id,
        reason: parsed.data.reason,
      },
    });

    await tx.challenge.update({
      where: { id: challenge.id },
      data: { status: "DISPUTED" },
    });

    await tx.auditLog.create({
      data: {
        userId: session.user!.id,
        action: "CHALLENGE_DISPUTED",
        metadata: {
          challengeId: challenge.id,
          reason: parsed.data.reason,
          notifyUserId,
          fallback: challenge.refereeId ? "referee" : "creator",
        },
      },
    });
  });

  // ── Fire-and-forget dispute email ──
  const disputeChallenge = await db.challenge.findUnique({
    where: { id: parsed.data.challengeId },
    select: {
      id: true,
      title: true,
      referee: { select: { email: true, name: true } },
      creator: { select: { email: true, name: true } },
    },
  });

  if (disputeChallenge) {
    const raisedByName = session.user.name ?? session.user.email ?? "A participant";
    const notifyTarget = disputeChallenge.referee ?? disputeChallenge.creator;
    if (notifyTarget?.email) {
      void sendDisputeRaisedEmail(
        notifyTarget.email,
        notifyTarget.name ?? notifyTarget.email,
        raisedByName,
        { id: disputeChallenge.id, title: disputeChallenge.title },
        parsed.data.reason
      );
    }
  }

  return {
    success: challenge.refereeId
      ? "Dispute raised and referee has been notified."
      : "Dispute raised and sent to fallback reviewer.",
  };
}

export async function submitVerificationVoteAction(input: z.infer<typeof voteVerificationSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be logged in to submit verification." };
  }

  const parsed = voteVerificationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid verification payload." };
  }

  const challenge = await prismaDb.challenge.findUnique({
    where: { id: parsed.data.challengeId },
    include: {
      participants: {
        where: { depositStatus: DepositStatus.CONFIRMED },
        select: { userId: true },
      },
      verificationVotes: {
        select: { userId: true, verdict: true },
      },
    },
  }) as (Pick<ChallengeDetailsRow, "id" | "status" | "verificationMethod"> & {
    participants: Array<Pick<ChallengeParticipantWithUser, "userId">>;
    verificationVotes: Array<Pick<ChallengeVoteWithUser, "userId" | "verdict">>;
  }) | null;

  if (!challenge) {
    return { error: "Challenge not found." };
  }

  const isConfirmedParticipant = challenge.participants.some((p) => p.userId === session.user.id);
  if (!isConfirmedParticipant) {
    return { error: "Only confirmed participants can submit verification." };
  }

  if (challenge.status !== "ACTIVE") {
    return { error: "Verification can only be submitted for active challenges." };
  }

  const vote = parsed.data;

  const outcome = await db.$transaction(async (tx) => {
    const txDb: typeof prismaDb = tx as unknown as typeof prismaDb;
    await txDb.challengeVerificationVote.upsert({
      where: {
        challengeId_userId: {
          challengeId: challenge.id,
          userId: session.user!.id,
        },
      },
      create: {
        challengeId: challenge.id,
        userId: session.user!.id,
        verdict: vote.verdict,
        note: vote.note,
      },
      update: {
        verdict: vote.verdict,
        note: vote.note,
      },
    });

    const freshVotes = await txDb.challengeVerificationVote.findMany({
      where: { challengeId: challenge.id },
      select: { verdict: true },
    }) as Array<{ verdict: VerificationVerdictValue }>;

    const participantCount = challenge.participants.length;
    const hasReject = freshVotes.some((v) => v.verdict === "REJECT");
    const allApproved = freshVotes.length >= participantCount
      && freshVotes.every((v) => v.verdict === "APPROVE");

    let nextStatus: "DISPUTED" | "RESOLVED" | null = null;
    if (challenge.verificationMethod === VerificationMethod.MUTUAL) {
      if (hasReject) {
        nextStatus = "DISPUTED";
      } else if (allApproved) {
        nextStatus = "RESOLVED";
      }
    }

    if (nextStatus) {
      await txDb.challenge.update({
        where: { id: challenge.id },
        data: {
          status: nextStatus,
          ...(nextStatus === "RESOLVED"
            ? {
                resolvedById: session.user!.id,
                resolvedAt: new Date(),
                resolutionNotes: "Resolved by unanimous mutual verification.",
              }
            : {}),
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: session.user!.id,
        action: "CHALLENGE_VERIFICATION_SUBMITTED",
        metadata: {
          challengeId: challenge.id,
          verdict: vote.verdict,
          transitionedTo: nextStatus,
        },
      },
    });

    return nextStatus;
  });

  if (outcome === "DISPUTED") {
    return { success: "Verification submitted. A rejection moved this challenge to disputed." };
  }

  if (outcome === "RESOLVED") {
    // ── Fire-and-forget resolution emails ──
    const resolvedChallenge = await db.challenge.findUnique({
      where: { id: parsed.data.challengeId },
      select: {
        id: true,
        title: true,
        resolutionNotes: true,
        participants: {
          include: { user: { select: { email: true, name: true } } },
        },
      },
    });

    if (resolvedChallenge) {
      const totalPoolCents = resolvedChallenge.participants.reduce((sum, p) => sum + p.amount, 0);
      // In mutual verification: current voter (APPROVE) is considered the winner
      // For now, the creator is the winner — a more advanced payout policy can refine this
      for (const participant of resolvedChallenge.participants) {
        if (participant.user.email) {
          const isWinner = participant.userId === session.user.id;
          void sendChallengeResolvedEmail(
            participant.user.email,
            participant.user.name ?? participant.user.email,
            { id: resolvedChallenge.id, title: resolvedChallenge.title, totalPoolCents },
            isWinner,
            isWinner ? totalPoolCents : 0,
            resolvedChallenge.resolutionNotes
          );
        }
      }
    }

    return { success: "Verification submitted. Challenge is now resolved." };
  }

  return { success: "Verification submitted." };
}

export async function resolveDisputeAction(input: z.infer<typeof resolveDisputeSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be logged in to resolve a dispute." };
  }

  const parsed = resolveDisputeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid resolution payload." };
  }

  const dispute = await prismaDb.challengeDispute.findUnique({
    where: { id: parsed.data.disputeId },
    include: { challenge: true },
  }) as {
    id: string;
    challengeId: string;
    challenge: {
      refereeId: string | null;
      creatorId: string;
      verificationMethod: VerificationMethodValue;
    };
  } | null;

  if (!dispute) {
    return { error: "Dispute not found." };
  }

  const canResolve = dispute.challenge.refereeId === session.user.id
    || (dispute.challenge.verificationMethod === "ADMIN" && dispute.challenge.creatorId === session.user.id);

  if (!canResolve) {
    return { error: "You are not authorized to resolve this dispute." };
  }

  await db.$transaction(async (tx) => {
    const txDb: typeof prismaDb = tx as unknown as typeof prismaDb;
    await txDb.challengeDispute.update({
      where: { id: dispute.id },
      data: {
        resolvedById: session.user!.id,
        resolution: parsed.data.resolution,
        resolvedAt: new Date(),
      },
    });

    await txDb.challenge.update({
      where: { id: dispute.challengeId },
      data: {
        status: "RESOLVED",
        resolvedById: session.user!.id,
        resolvedAt: new Date(),
        resolutionNotes: parsed.data.resolution,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session.user!.id,
        action: "CHALLENGE_DISPUTE_RESOLVED",
        metadata: {
          challengeId: dispute.challengeId,
          disputeId: dispute.id,
        },
      },
    });
  });

  return { success: "Dispute resolved and challenge marked as resolved." };
}

export async function resolveChallengeByAuthorityAction(input: z.infer<typeof authorityResolveChallengeSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be logged in to resolve this challenge." };
  }

  const parsed = authorityResolveChallengeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid resolution payload." };
  }

  const challenge = await prismaDb.challenge.findUnique({
    where: { id: parsed.data.challengeId },
  }) as {
    id: string;
    creatorId: string;
    refereeId: string | null;
    status: ChallengeStatusValue;
    verificationMethod: VerificationMethodValue;
  } | null;

  if (!challenge) {
    return { error: "Challenge not found." };
  }

  if (challenge.status !== "ACTIVE" && challenge.status !== "DISPUTED") {
    return { error: "Only active or disputed challenges can be resolved." };
  }

  const canResolve = challenge.refereeId === session.user.id
    || (challenge.verificationMethod === "ADMIN" && challenge.creatorId === session.user.id);

  if (!canResolve) {
    return { error: "You are not authorized to resolve this challenge." };
  }

  await prismaDb.challenge.update({
    where: { id: challenge.id },
    data: {
      status: "RESOLVED",
      resolvedById: session.user.id,
      resolvedAt: new Date(),
      resolutionNotes: parsed.data.resolution,
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CHALLENGE_RESOLVED_BY_AUTHORITY",
      metadata: {
        challengeId: challenge.id,
        verificationMethod: challenge.verificationMethod,
      },
    },
  });

  return { success: "Challenge resolved." };
}

export async function deleteChallengeAction(challengeId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be logged in to delete this challenge." };
  }

  const parsed = z.string().uuid().safeParse(challengeId);
  if (!parsed.success) {
    return { error: "Invalid challenge ID." };
  }

  const challenge = await prismaDb.challenge.findUnique({
    where: { id: parsed.data },
    include: {
      participants: {
        where: { depositStatus: "CONFIRMED" },
        select: { userId: true, amount: true },
      },
      invitations: {
        where: { status: "ACCEPTED" },
        select: { invitedUserId: true, stakeAmount: true },
      },
      escrowLocks: {
        where: { status: "LOCKED" },
        select: { id: true, userId: true, amount: true },
      },
    },
  }) as {
    id: string;
    creatorId: string;
    createdAt: Date;
    status: ChallengeStatusValue;
    fundingMode: FundingModeValue;
    participants: Array<{ userId: string; amount: number }>;
    invitations: Array<{ invitedUserId: string | null; stakeAmount: number }>;
    escrowLocks: Array<{ id: string; userId: string; amount: number }>;
  } | null;

  if (!challenge) {
    return { error: "Challenge not found." };
  }

  if (challenge.creatorId !== session.user.id) {
    return { error: "Only the creator can delete this challenge." };
  }

  const deleteDeadline = getDeleteWindowDeadline(challenge.createdAt);
  if (Date.now() > deleteDeadline.getTime()) {
    return { error: "Delete window expired. Challenges become permanent after 12 hours." };
  }

  if (challenge.status === "RESOLVED") {
    return { error: "Resolved challenges cannot be deleted." };
  }

  const totalPoolCents = challenge.participants.reduce((sum, participant) => sum + participant.amount, 0);
  const creatorParticipant = challenge.participants.find((participant) => participant.userId === challenge.creatorId);
  if (!creatorParticipant) {
    return { error: "Creator stake record is missing. Deletion aborted." };
  }

  const acceptedInviteeTransfers = challenge.fundingMode === "CREATOR_FUNDED"
    ? challenge.invitations
      .filter((invite) => !!invite.invitedUserId)
      .map((invite) => ({ userId: invite.invitedUserId as string, amountCents: invite.stakeAmount }))
      .filter((transfer) => transfer.amountCents > 0)
    : [];

  const inviteesTotalCents = acceptedInviteeTransfers.reduce((sum, transfer) => sum + transfer.amountCents, 0);
  const creatorRecoveredCents = challenge.fundingMode === "CREATOR_FUNDED"
    ? Math.max(creatorParticipant.amount - inviteesTotalCents, 0)
    : creatorParticipant.amount;

  const feeBps = await calculateFeeBps(challenge.creatorId);
  const companyFeeCents = Math.round((totalPoolCents * feeBps) / 10000);

  const creatorBalanceBefore = await getWalletBalance(challenge.creatorId);
  if (creatorBalanceBefore + creatorRecoveredCents < companyFeeCents) {
    return {
      error: `Deletion requires a creator liability fee of ${(companyFeeCents / 100).toFixed(2)} KES. Top up wallet and try again.`,
    };
  }

  try {
    for (const lock of challenge.escrowLocks) {
      await refundEscrow(lock.id);
    }

    if (challenge.fundingMode === "CREATOR_FUNDED") {
      for (const transfer of acceptedInviteeTransfers) {
        await debitWallet(
          challenge.creatorId,
          transfer.amountCents,
          undefined,
          "DEBIT",
          `Creator-funded challenge cancellation payout (${challenge.id})`
        );
        await creditWallet(
          transfer.userId,
          transfer.amountCents,
          undefined,
          "CREDIT",
          `Challenge cancellation refund (${challenge.id})`
        );
      }
    }

    if (companyFeeCents > 0) {
      await debitWallet(
        challenge.creatorId,
        companyFeeCents,
        undefined,
        "FEE",
        `Challenge deletion creator liability fee (${feeBps} bps)`
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Wallet operation failed during challenge deletion."
    return { error: message };
  }

  await db.$transaction(async (tx) => {
    const txDb: typeof prismaDb = tx as unknown as typeof prismaDb;
    await txDb.challengeDispute.updateMany({
      where: { challengeId: challenge.id, resolvedAt: null },
      data: {
        resolvedAt: new Date(),
        resolution: "Challenge deleted by creator within the allowed 12-hour window.",
      },
    });

    await txDb.challenge.update({
      where: { id: challenge.id },
      data: {
        status: "RESOLVED",
        resolvedById: challenge.creatorId,
        resolvedAt: new Date(),
        resolutionNotes: `Deleted by creator within 12-hour window. Creator liability fee charged: ${companyFeeCents} cents.`,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: challenge.creatorId,
        action: "CHALLENGE_DELETED_BY_CREATOR",
        metadata: {
          challengeId: challenge.id,
          fundingMode: challenge.fundingMode,
          totalPoolCents,
          companyFeeCents,
          feeBps,
          inviteesRefundedCents: inviteesTotalCents,
          creatorRecoveredCents,
        },
      },
    });
  });

  return {
    success: `Challenge deleted. Refunds completed and creator liability fee of ${(companyFeeCents / 100).toFixed(2)} KES charged.`,
  };
}

function serializeChallengeDetails(challenge: ChallengeDetailsRow, currentUserId: string) {
  const totalPoolCents = challenge.participants.reduce((sum, p) => sum + p.amount, 0);
  const confirmedParticipantIds = challenge.participants
    .filter((p) => p.depositStatus === DepositStatus.CONFIRMED)
    .map((p) => p.userId);
  const currentUserIsConfirmedParticipant = confirmedParticipantIds.includes(currentUserId);
  const deleteDeadline = getDeleteWindowDeadline(challenge.createdAt);
  const millisUntilDeleteDeadline = deleteDeadline.getTime() - Date.now();
  const canDeleteByCreator = challenge.creatorId === currentUserId
    && millisUntilDeleteDeadline > 0
    && challenge.status !== "RESOLVED";

  return {
    id: challenge.id,
    title: challenge.title,
    description: challenge.description,
    status: challenge.status,
    verificationMethod: challenge.verificationMethod,
    fundingMode: challenge.fundingMode,
    totalPoolCents,
    marketId: challenge.marketId,
    endDate: challenge.endDate.toISOString(),
    createdAt: challenge.createdAt.toISOString(),
    resolvedAt: challenge.resolvedAt?.toISOString() ?? null,
    resolutionNotes: challenge.resolutionNotes,
    payoutPolicy: getFundingPayoutPolicy(challenge.fundingMode),
    creator: challenge.creator,
    referee: challenge.referee,
    resolvedBy: challenge.resolvedBy,
    participants: challenge.participants.map((p) => ({
      id: p.user.id,
      name: p.user.name ?? p.user.email ?? "Unknown",
      email: p.user.email,
      amountCents: p.amount,
      depositStatus: p.depositStatus,
      joinedAt: p.joinedAt.toISOString(),
    })),
    invitations: challenge.invitations.map((i) => ({
      id: i.id,
      email: i.email,
      stakeAmountCents: i.stakeAmount,
      status: i.status,
      createdAt: i.createdAt.toISOString(),
      acceptedAt: i.acceptedAt?.toISOString() ?? null,
    })),
    disputes: challenge.disputes.map((d) => ({
      id: d.id,
      reason: d.reason,
      resolution: d.resolution,
      createdAt: d.createdAt.toISOString(),
      resolvedAt: d.resolvedAt?.toISOString() ?? null,
      raisedBy: d.raisedBy.name ?? d.raisedBy.email ?? "Unknown",
      resolvedBy: d.resolvedBy ? (d.resolvedBy.name ?? d.resolvedBy.email ?? "Unknown") : null,
    })),
    verificationVotes: challenge.verificationVotes.map((vote) => ({
      id: vote.id,
      userId: vote.userId,
      userName: vote.user.name ?? vote.user.email ?? "Unknown",
      verdict: vote.verdict,
      note: vote.note,
      createdAt: vote.createdAt.toISOString(),
    })),
    deletePolicy: {
      deadline: deleteDeadline.toISOString(),
      hoursRemaining: Math.max(0, Math.ceil(millisUntilDeleteDeadline / (1000 * 60 * 60))),
      canDeleteByCreator,
      warning: "Deleting within 12 hours triggers automatic refunds by stake. Company fee is charged only to the creator.",
    },
    permissions: {
      canRaiseDispute:
        (challenge.status === "ACTIVE" || challenge.status === "PENDING")
        && currentUserIsConfirmedParticipant,
      canVoteVerification:
        challenge.status === "ACTIVE"
        && challenge.verificationMethod === VerificationMethod.MUTUAL
        && currentUserIsConfirmedParticipant,
      canAuthorityResolve:
        (challenge.status === "ACTIVE" || challenge.status === "DISPUTED")
        && (
          challenge.refereeId === currentUserId
          || (challenge.verificationMethod === "ADMIN" && challenge.creatorId === currentUserId)
        ),
      canResolveDispute:
        challenge.status === "DISPUTED"
        && (
          challenge.refereeId === currentUserId
          || (challenge.verificationMethod === "ADMIN" && challenge.creatorId === currentUserId)
        ),
      canDeleteByCreator,
    },
  };
}

export async function getChallengeDetailsAction(challengeId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be logged in.", challenge: null };
  }

  const parsedChallengeId = z.string().uuid().safeParse(challengeId);
  if (!parsedChallengeId.success) {
    return { error: "Challenge not found.", challenge: null };
  }

  await enforceDisputeForfeitPolicy(parsedChallengeId.data);

  const challenge = await prismaDb.challenge.findUnique({
    where: { id: parsedChallengeId.data },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      referee: { select: { id: true, name: true, email: true } },
      resolvedBy: { select: { id: true, name: true, email: true } },
      participants: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
      invitations: {
        orderBy: { createdAt: "asc" },
      },
      disputes: {
        include: {
          raisedBy: { select: { id: true, name: true, email: true } },
          resolvedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      verificationVotes: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  }) as ChallengeDetailsRow | null;

  if (!challenge) {
    return { error: "Challenge not found.", challenge: null };
  }

  const hasAccess =
    challenge.creatorId === session.user.id
    || challenge.refereeId === session.user.id
    || challenge.participants.some((p) => p.userId === session.user.id)
    || challenge.invitations.some((i) => i.invitedUserId === session.user.id || i.email === session.user?.email);

  if (!hasAccess) {
    return { error: "You are not allowed to view this challenge.", challenge: null };
  }

  return { challenge: serializeChallengeDetails(challenge, session.user.id) };
}

export async function getMyChallengeDashboardData(): Promise<MyChallengeDashboardData> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      running: [],
      resolved: [],
      disputed: [],
      pendingInvitations: [],
      exploreMarkets,
    };
  }

  await enforceDisputeForfeitPolicy();

  const challengeRows = await prismaDb.challenge.findMany({
    where: {
      OR: [
        { creatorId: session.user.id },
        { participants: { some: { userId: session.user.id } } },
        {
          invitations: {
            some: {
              OR: [
                { invitedUserId: session.user.id },
                ...(session.user.email ? [{ email: session.user.email }] : []),
              ],
            },
          },
        },
      ],
    },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      referee: { select: { id: true, name: true, email: true } },
      participants: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
      invitations: {
        orderBy: { createdAt: "asc" },
      },
      disputes: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { raisedBy: { select: { id: true, name: true, email: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  }) as ChallengeRow[];

  const cards = challengeRows.map((row) => challengeToCard(row, session.user.id));

  const pendingInvitations = await prismaDb.challengeInvitation.findMany({
    where: {
      status: "PENDING",
      OR: [
        { invitedUserId: session.user.id },
        ...(session.user.email ? [{ email: session.user.email }] : []),
      ],
    },
    include: {
      challenge: { select: { id: true, title: true, status: true } },
      invitedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  }) as Array<ChallengeInvitationRecord & { challenge: { id: string; title: string; status: ChallengeStatusValue }; invitedBy: UserLite }>;

  return {
    running: cards.filter((c) => c.status === "PENDING" || c.status === "ACTIVE"),
    resolved: cards.filter((c) => c.status === "RESOLVED"),
    disputed: cards.filter((c) => c.status === "DISPUTED"),
    pendingInvitations: pendingInvitations.map((invite) => ({
      id: invite.id,
      challengeId: invite.challengeId,
      challengeTitle: invite.challenge.title,
      inviter: invite.invitedBy.name ?? invite.invitedBy.email ?? "Unknown",
      stakeAmountCents: invite.stakeAmount,
      status: invite.challenge.status,
      createdAt: invite.createdAt.toISOString(),
    })),
    exploreMarkets,
  };
}
