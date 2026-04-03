import Link from "next/link";
import { notFound } from "next/navigation";
import { getChallengeDetailsAction } from "@/actions/challenge";
import {
  AuthorityResolveForm,
  DeleteChallengeForm,
  DisputeForm,
  ResolveDisputeForm,
  VerificationVoteForm,
} from "@/components/dashboard/challenge-detail-actions";

function formatKes(cents: number) {
  return `KES ${(cents / 100).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusTone(status: string) {
  if (status === "ACTIVE") return "bg-green/10 text-green border-green/20";
  if (status === "DISPUTED") return "bg-red/10 text-red border-red/20";
  if (status === "RESOLVED") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  return "bg-amber/10 text-amber border-amber/20";
}

export default async function ChallengeDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ intent?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const data = await getChallengeDetailsAction(id);

  if (!data.challenge) {
    if (data.error === "Challenge not found.") {
      notFound();
    }

    return (
      <div className="max-w-3xl space-y-3">
        <h1 className="text-2xl font-bold">Challenge Details</h1>
        <p className="text-sm text-red">{data.error ?? "Unable to load challenge."}</p>
      </div>
    );
  }

  const challenge = data.challenge;
  const latestDispute = challenge.disputes[0] ?? null;
  const showDisputeHint = resolvedSearchParams?.intent === "dispute";

  return (
    <div className="max-w-5xl space-y-6">
      <section className="space-y-3">
        {showDisputeHint && (
          <p className="text-sm text-amber bg-amber/10 border border-amber/20 rounded-md px-3 py-2">
            You are here to raise a dispute. Use the "Raise Dispute" form in the verification section below.
          </p>
        )}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{challenge.title}</h1>
            <p className="mt-1 text-sm text-fg-secondary">{challenge.description || "No description provided."}</p>
          </div>
          <span className={`text-[11px] font-mono px-2 py-1 border rounded ${statusTone(challenge.status)}`}>{challenge.status}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px] font-mono">
          <div className="rounded border border-line p-2">
            <p className="text-fg-muted">Pool</p>
            <p className="font-semibold mt-1">{formatKes(challenge.totalPoolCents)}</p>
          </div>
          <div className="rounded border border-line p-2">
            <p className="text-fg-muted">Participants</p>
            <p className="font-semibold mt-1">{challenge.participants.length}</p>
          </div>
          <div className="rounded border border-line p-2">
            <p className="text-fg-muted">Verification</p>
            <p className="font-semibold mt-1">{challenge.verificationMethod}</p>
          </div>
          <div className="rounded border border-line p-2">
            <p className="text-fg-muted">Funding</p>
            <p className="font-semibold mt-1">{challenge.fundingMode === "CREATOR_FUNDED" ? "Creator Funded" : "Split Deposits"}</p>
          </div>
          <div className="rounded border border-line p-2">
            <p className="text-fg-muted">Ends</p>
            <p className="font-semibold mt-1">{new Date(challenge.endDate).toLocaleString()}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <article className="rounded-lg border border-line p-4">
          <h2 className="text-sm font-semibold">Participants and Stakes</h2>
          <div className="mt-3 space-y-2">
            {challenge.participants.map((participant: any) => (
              <div key={participant.id} className="flex items-center justify-between text-sm border border-line rounded-md px-3 py-2">
                <div>
                  <p className="font-medium">{participant.name}</p>
                  <p className="text-[12px] text-fg-muted">{participant.email}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono">{formatKes(participant.amountCents)}</p>
                  <p className="text-[11px] text-fg-muted">{participant.depositStatus}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-line p-4">
          <h2 className="text-sm font-semibold">Invitations</h2>
          <div className="mt-3 space-y-2">
            {challenge.invitations.length === 0 && (
              <p className="text-sm text-fg-muted">No outstanding invitations.</p>
            )}
            {challenge.invitations.map((invite: any) => (
              <div key={invite.id} className="flex items-center justify-between text-sm border border-line rounded-md px-3 py-2">
                <div>
                  <p className="font-medium">{invite.email}</p>
                  <p className="text-[12px] text-fg-muted">Sent {new Date(invite.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono">{formatKes(invite.stakeAmountCents)}</p>
                  <p className="text-[11px] text-fg-muted">{invite.status}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-lg border border-line p-4 space-y-3">
        <h2 className="text-sm font-semibold">Verification and Outcome</h2>
        <div className="rounded-md border border-line p-3 bg-bg-above/20">
          <p className="text-[12px] font-mono uppercase tracking-wide text-fg-muted">Payout Rule</p>
          <p className="text-sm mt-1">{challenge.payoutPolicy.summary}</p>
          <ul className="mt-2 space-y-1 text-[12px] text-fg-secondary">
            {challenge.payoutPolicy.ruleLines.map((line: string) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <article className="rounded-md border border-line p-3">
            <p className="text-[12px] font-mono uppercase tracking-wide text-fg-muted">Current Votes</p>
            <div className="mt-2 space-y-2">
              {challenge.verificationVotes.length === 0 && (
                <p className="text-sm text-fg-muted">No votes submitted yet.</p>
              )}
              {challenge.verificationVotes.map((vote: any) => (
                <div key={vote.id} className="rounded border border-line px-3 py-2">
                  <p className="text-sm font-medium">{vote.userName}</p>
                  <p className="text-[12px] text-fg-secondary mt-1">{vote.verdict}{vote.note ? ` - ${vote.note}` : ""}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="space-y-3">
            {challenge.permissions.canVoteVerification && <VerificationVoteForm challengeId={challenge.id} />}
            {challenge.permissions.canRaiseDispute && <DisputeForm challengeId={challenge.id} />}
            {challenge.permissions.canAuthorityResolve && <AuthorityResolveForm challengeId={challenge.id} />}
          </article>
        </div>
      </section>

      <section className="rounded-lg border border-line p-4 space-y-3">
        <h2 className="text-sm font-semibold">Disputes</h2>
        {latestDispute ? (
          <div className="rounded-md border border-red/30 bg-red/5 p-3 space-y-2">
            <p className="text-sm"><span className="font-semibold">Raised by:</span> {latestDispute.raisedBy}</p>
            <p className="text-sm"><span className="font-semibold">Reason:</span> {latestDispute.reason}</p>
            {latestDispute.resolution && (
              <p className="text-sm"><span className="font-semibold">Resolution:</span> {latestDispute.resolution}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-fg-muted">No disputes have been raised for this challenge.</p>
        )}

        {latestDispute && challenge.permissions.canResolveDispute && !latestDispute.resolvedAt && (
          <ResolveDisputeForm disputeId={latestDispute.id} />
        )}
      </section>

      <section className="text-sm text-fg-muted flex flex-wrap gap-3 items-center">
        <span>Creator: {challenge.creator.name ?? challenge.creator.email ?? "Unknown"}</span>
        <span>Referee: {challenge.referee?.name ?? challenge.referee?.email ?? "Fallback reviewer"}</span>
        {challenge.resolvedBy && <span>Resolved by: {challenge.resolvedBy.name ?? challenge.resolvedBy.email ?? "Unknown"}</span>}
      </section>

      {challenge.permissions.canDeleteByCreator && (
        <DeleteChallengeForm
          challengeId={challenge.id}
          deleteDeadline={challenge.deletePolicy.deadline}
          hoursRemaining={challenge.deletePolicy.hoursRemaining}
        />
      )}

      <div>
        <Link href="/dashboard" className="text-sm text-green hover:underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
