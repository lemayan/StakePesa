import { PrismaClient, DepositStatus, InvitationStatus, VerificationMethod, ChallengeStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function ensureUser({ email, name }) {
  const password = await bcrypt.hash("Password123!", 10);

  return db.user.upsert({
    where: { email },
    update: { name },
    create: {
      email,
      name,
      password,
      emailVerified: new Date(),
      wallet: {
        create: {
          balance: 500_000,
        },
      },
    },
  });
}

async function run() {
  const [alice, brian, chris, diana] = await Promise.all([
    ensureUser({ email: "mock.alice@wekapesa.dev", name: "Mock Alice" }),
    ensureUser({ email: "mock.brian@wekapesa.dev", name: "Mock Brian" }),
    ensureUser({ email: "mock.chris@wekapesa.dev", name: "Mock Chris" }),
    ensureUser({ email: "mock.diana@wekapesa.dev", name: "Mock Diana" }),
  ]);

  const existing = await db.challenge.findMany({
    where: {
      title: { startsWith: "[MOCK]" },
    },
    select: { id: true },
  });

  if (existing.length > 0) {
    await db.challenge.deleteMany({
      where: { id: { in: existing.map((c) => c.id) } },
    });
  }

  const pending = await db.challenge.create({
    data: {
      creatorId: alice.id,
      title: "[MOCK] 21-day gym consistency",
      description: "Attend gym at least 5x/week for three weeks.",
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
      status: ChallengeStatus.PENDING,
      verificationMethod: VerificationMethod.REFEREE,
      refereeId: diana.id,
      participants: {
        create: [
          {
            userId: alice.id,
            amount: 15_000,
            depositStatus: DepositStatus.CONFIRMED,
          },
        ],
      },
      invitations: {
        create: [
          {
            invitedById: alice.id,
            invitedUserId: brian.id,
            email: "mock.brian@wekapesa.dev",
            stakeAmount: 10_000,
            status: InvitationStatus.PENDING,
          },
          {
            invitedById: alice.id,
            invitedUserId: chris.id,
            email: "mock.chris@wekapesa.dev",
            stakeAmount: 8_000,
            status: InvitationStatus.PENDING,
          },
        ],
      },
    },
  });

  const active = await db.challenge.create({
    data: {
      creatorId: alice.id,
      title: "[MOCK] No sugar until month-end",
      description: "Track daily check-ins with photo proof.",
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 8),
      status: ChallengeStatus.ACTIVE,
      verificationMethod: VerificationMethod.MUTUAL,
      participants: {
        create: [
          {
            userId: alice.id,
            amount: 6_000,
            depositStatus: DepositStatus.CONFIRMED,
          },
          {
            userId: brian.id,
            amount: 9_500,
            depositStatus: DepositStatus.CONFIRMED,
          },
        ],
      },
      invitations: {
        create: [
          {
            invitedById: alice.id,
            invitedUserId: brian.id,
            email: "mock.brian@wekapesa.dev",
            stakeAmount: 9_500,
            status: InvitationStatus.ACCEPTED,
            acceptedAt: new Date(),
          },
        ],
      },
    },
  });

  await db.challenge.create({
    data: {
      creatorId: brian.id,
      title: "[MOCK] Weekend coding sprint",
      description: "Ship 2 features by Sunday night.",
      endDate: new Date(Date.now() - 1000 * 60 * 60 * 24),
      status: ChallengeStatus.RESOLVED,
      verificationMethod: VerificationMethod.ADMIN,
      participants: {
        create: [
          {
            userId: brian.id,
            amount: 12_000,
            depositStatus: DepositStatus.CONFIRMED,
          },
          {
            userId: chris.id,
            amount: 7_500,
            depositStatus: DepositStatus.CONFIRMED,
          },
        ],
      },
      invitations: {
        create: [
          {
            invitedById: brian.id,
            invitedUserId: chris.id,
            email: "mock.chris@wekapesa.dev",
            stakeAmount: 7_500,
            status: InvitationStatus.ACCEPTED,
            acceptedAt: new Date(),
          },
        ],
      },
    },
  });

  const disputed = await db.challenge.create({
    data: {
      creatorId: chris.id,
      title: "[MOCK] Daily 10k steps",
      description: "Fitness app screenshots required every day.",
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      status: ChallengeStatus.DISPUTED,
      verificationMethod: VerificationMethod.REFEREE,
      refereeId: diana.id,
      participants: {
        create: [
          {
            userId: chris.id,
            amount: 11_000,
            depositStatus: DepositStatus.CONFIRMED,
          },
          {
            userId: alice.id,
            amount: 13_000,
            depositStatus: DepositStatus.CONFIRMED,
          },
        ],
      },
      invitations: {
        create: [
          {
            invitedById: chris.id,
            invitedUserId: alice.id,
            email: "mock.alice@wekapesa.dev",
            stakeAmount: 13_000,
            status: InvitationStatus.ACCEPTED,
            acceptedAt: new Date(),
          },
        ],
      },
    },
  });

  await db.challengeDispute.create({
    data: {
      challengeId: disputed.id,
      raisedById: alice.id,
      reason: "Uploaded proof timestamp appears edited.",
    },
  });

  console.log("Mock users and P2P challenges seeded.");
  console.log(`Pending: ${pending.id}`);
  console.log(`Active: ${active.id}`);
  console.log(`Disputed: ${disputed.id}`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
