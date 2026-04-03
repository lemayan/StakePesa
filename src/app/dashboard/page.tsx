import Link from "next/link";
import { getMyChallengeDashboardData } from "@/actions/challenge";
import { AcceptInvitationButton, RaiseDisputeButton } from "@/components/dashboard/challenge-actions";

function formatKes(cents: number) {
  return `KES ${(cents / 100).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusTone(status: string) {
  if (status === "ACTIVE") return "bg-green/10 text-green border-green/20";
  if (status === "DISPUTED") return "bg-red/10 text-red border-red/20";
  if (status === "RESOLVED") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  return "bg-amber/10 text-amber border-amber/20";
}

export default async function DashboardPage() {
  const data = await getMyChallengeDashboardData();

  return (
    <div className="max-w-6xl space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Your P2P Challenges</h1>
        <p className="text-sm text-fg-secondary">
          Private accountability challenges are now your primary workspace. Markets are available below for discovery.
        </p>
      </section>

      {data.pendingInvitations.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[13px] font-mono uppercase tracking-wider text-fg-muted">Pending Invitations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.pendingInvitations.map((invite) => (
              <article key={invite.id} className="border border-line rounded-lg p-4 bg-bg-above/20">
                <p className="text-[15px] font-semibold">{invite.challengeTitle}</p>
                <p className="text-[12px] text-fg-muted mt-1">Invited by {invite.inviter}</p>
                <p className="text-[13px] font-mono mt-2">Your stake: {formatKes(invite.stakeAmountCents)}</p>
                <div className="mt-3">
                  <AcceptInvitationButton invitationId={invite.id} />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-mono uppercase tracking-wider text-fg-muted">Running</h2>
          <Link href="/dashboard/create" className="h-8 px-3 text-[12px] font-semibold rounded-md bg-green text-white flex items-center">
            New Challenge
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {data.running.length === 0 && <div className="border border-dashed border-line rounded-lg p-6 text-sm text-fg-muted">No running challenges yet.</div>}
          {data.running.map((challenge) => (
            <article key={challenge.id} className="border border-line rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[16px] font-semibold">{challenge.title}</h3>
                  <p className="text-[12px] text-fg-muted mt-1">Ends {new Date(challenge.endDate).toLocaleString()}</p>
                </div>
                <span className={`text-[11px] font-mono px-2 py-1 border rounded ${statusTone(challenge.status)}`}>{challenge.status}</span>
              </div>
              <p className="text-[13px] text-fg-secondary">{challenge.description || "No description"}</p>
              <div className="grid grid-cols-3 gap-2 text-[12px] font-mono">
                <div className="rounded border border-line p-2">
                  <p className="text-fg-muted">Pool</p>
                  <p className="font-semibold mt-1">{formatKes(challenge.totalPoolCents)}</p>
                </div>
                <div className="rounded border border-line p-2">
                  <p className="text-fg-muted">Participants</p>
                  <p className="font-semibold mt-1">{challenge.participantCount}</p>
                </div>
                <div className="rounded border border-line p-2">
                  <p className="text-fg-muted">Verification</p>
                  <p className="font-semibold mt-1">{challenge.verificationMethod}</p>
                </div>
              </div>
              <div className="text-[11px] font-mono inline-flex items-center px-2 py-1 rounded border border-line text-fg-muted bg-bg-above/40">
                Funding: {challenge.fundingMode === "CREATOR_FUNDED" ? "Creator Funded" : "Split Deposits"}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {challenge.status === "ACTIVE" && <RaiseDisputeButton challengeId={challenge.id} />}
                <Link href={`/dashboard/challenges/${challenge.id}`} className="h-8 px-3 text-[12px] rounded-md border border-line text-fg-secondary hover:text-fg hover:bg-bg-above flex items-center">
                  View Details
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[13px] font-mono uppercase tracking-wider text-fg-muted">Resolved</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {data.resolved.length === 0 && <div className="border border-dashed border-line rounded-lg p-6 text-sm text-fg-muted">No resolved challenges yet.</div>}
          {data.resolved.map((challenge) => (
            <article key={challenge.id} className="border border-line rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[15px] font-semibold">{challenge.title}</h3>
                <span className={`text-[11px] font-mono px-2 py-1 border rounded ${statusTone(challenge.status)}`}>{challenge.status}</span>
              </div>
              <p className="text-[12px] text-fg-muted mt-2">Final pool: {formatKes(challenge.totalPoolCents)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[13px] font-mono uppercase tracking-wider text-fg-muted">Disputed</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {data.disputed.length === 0 && <div className="border border-dashed border-line rounded-lg p-6 text-sm text-fg-muted">No disputed challenges right now.</div>}
          {data.disputed.map((challenge) => (
            <article key={challenge.id} className="border border-red/20 rounded-lg p-4 bg-red/5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[15px] font-semibold">{challenge.title}</h3>
                <span className={`text-[11px] font-mono px-2 py-1 border rounded ${statusTone(challenge.status)}`}>{challenge.status}</span>
              </div>
              <p className="text-[12px] mt-2 text-fg-secondary">{challenge.latestDispute?.reason ?? "A dispute has been raised."}</p>
              <p className="text-[11px] mt-1 text-fg-muted">Referee: {challenge.referee?.name ?? challenge.referee?.email ?? "Fallback reviewer"}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3 pt-2 border-t border-line">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-mono uppercase tracking-wider text-fg-muted">Explore Markets</h2>
          <Link href="/dashboard/markets" className="text-[12px] text-green font-mono hover:underline">Browse all</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.exploreMarkets.map((m) => (
            <Link key={m.id} href={`/dashboard/markets/${m.id}`} className="border border-line rounded-lg p-4 hover:bg-bg-above/40 transition-colors">
              <p className="text-[14px] font-medium">{m.title}</p>
              <div className="mt-2 text-[12px] text-fg-muted font-mono">Category: {m.category} · Options: {m.options}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
