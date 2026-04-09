"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { createChallengeAction, searchUsersForChallenge } from "@/actions/challenge";
import { useToast } from "@/components/ui/toast";
import type { ChallengeFundingMode, VerificationMethod } from "@prisma/client";

type Invitee = {
  email: string;
  name: string;
  userId?: string;
  stakeAmount: string;
};

type UserOption = {
  id: string;
  name: string | null;
  email: string | null;
};

const steps = ["Challenge Details", "Participants & Stakes", "Verification"];

function formatKes(cents: number) {
  return `KES ${(cents / 100).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CreateChallengePage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [renderBaseTime] = useState(() => Date.now());

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [endDate, setEndDate] = useState("");
  const [marketId, setMarketId] = useState("");

  const [creatorStakeAmount, setCreatorStakeAmount] = useState("1000");
  const [fundingMode, setFundingMode] = useState<ChallengeFundingMode>("SPLIT_PARTICIPANT");
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");

  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResults, setLookupResults] = useState<UserOption[]>([]);
  const [lookupBusy, setLookupBusy] = useState(false);

  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>("MUTUAL");
  const [refereeSelection, setRefereeSelection] = useState<UserOption | null>(null);
  const [refereeEmail, setRefereeEmail] = useState("");

  const creatorStakeCents = Number(creatorStakeAmount) * 100;
  const inviteStakeCents = invitees.reduce((sum, invitee) => sum + Number(invitee.stakeAmount || "0") * 100, 0);
  const totalPoolCents = creatorStakeCents + inviteStakeCents;

  const canContinue = useMemo(() => {
    if (step === 1) {
      return title.trim().length >= 3 && !!endDate && new Date(endDate).getTime() > renderBaseTime;
    }

    if (step === 2) {
      const validStake = Number.isFinite(Number(creatorStakeAmount)) && Number(creatorStakeAmount) >= 1;
      const validInvitees = invitees.length > 0 && invitees.every((invitee) => {
        const stake = Number(invitee.stakeAmount);
        return invitee.email.includes("@") && Number.isFinite(stake) && stake >= 1;
      });
      return validStake && validInvitees;
    }

    if (step === 3) {
      if (verificationMethod !== "REFEREE") {
        return true;
      }
      return !!refereeSelection || refereeEmail.includes("@");
    }

    return false;
  }, [step, title, endDate, creatorStakeAmount, invitees, verificationMethod, refereeSelection, refereeEmail, renderBaseTime]);

  const addInvitee = (newInvitee: Invitee) => {
    const normalizedEmail = newInvitee.email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      toast("error", "Invalid invitee", "Provide a valid email address.");
      return;
    }

    if (invitees.some((invitee) => invitee.email.toLowerCase() === normalizedEmail)) {
      toast("info", "Already added", "This participant is already on the challenge.");
      return;
    }

    setInvitees((prev) => [
      ...prev,
      {
        ...newInvitee,
        email: normalizedEmail,
        stakeAmount: newInvitee.stakeAmount || "1000",
      },
    ]);
    setInviteEmail("");
    setInviteName("");
  };

  const removeInvitee = (email: string) => {
    setInvitees((prev) => prev.filter((invitee) => invitee.email !== email));
  };

  const updateInviteStake = (email: string, stakeAmount: string) => {
    setInvitees((prev) => prev.map((invitee) => (
      invitee.email === email ? { ...invitee, stakeAmount } : invitee
    )));
  };

  const runLookup = async () => {
    const query = lookupQuery.trim();
    if (query.length < 2) {
      setLookupResults([]);
      return;
    }

    setLookupBusy(true);
    const users = await searchUsersForChallenge(query);
    setLookupBusy(false);
    setLookupResults(users);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canContinue) {
      toast("error", "Incomplete form", "Fill in all required fields before creating the challenge.");
      return;
    }

    startTransition(async () => {
      const payload = {
        title,
        description: description || undefined,
        endDate: new Date(endDate).toISOString(),
        marketId: marketId.trim() || undefined,
        creatorStakeAmount: Math.round(Number(creatorStakeAmount) * 100),
        participants: invitees.map((invitee) => ({
          email: invitee.email,
          stakeAmount: Math.round(Number(invitee.stakeAmount) * 100),
        })),
        fundingMode,
        verificationMethod,
        refereeId: refereeSelection?.id,
        refereeEmail: refereeSelection ? undefined : refereeEmail.trim().toLowerCase() || undefined,
      };

      const result = await createChallengeAction(payload);
      if (result.error) {
        toast("error", "Challenge not created", result.error);
        return;
      }

      toast("success", "Challenge created", result.success ?? "Invitations sent.");
      window.location.href = "/dashboard";
    });
  };

  return (
    <form onSubmit={submit} className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Create Private P2P Challenge</h1>
          <p className="text-sm text-fg-secondary mt-1">Define challenge terms, set individual stakes, and choose how outcomes are verified.</p>
        </div> <Link href="/dashboard" className="text-[13px] font-mono text-fg-muted hover:text-fg">Back to Dashboard</Link
       >
      </div>

      <div className="grid grid-cols-3 gap-2">
        {steps.map((label, idx) => {
          const i = idx + 1;
          return (
            <div key={label} className="h-10 border border-line rounded-md px-3 flex items-center justify-between text-[12px] font-mono">
              <span className={step >= i ? "text-fg" : "text-fg-muted"}>{label}</span>
              <span className={`w-5 h-5 rounded-full text-[11px] grid place-items-center ${step >= i ? "bg-green text-white" : "bg-bg-above text-fg-muted"}`}>{i}</span>
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <section className="border border-line rounded-xl p-5 space-y-4">
          <div>
            <label className="text-[12px] font-mono text-fg-muted uppercase">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 30-day morning run challenge"
              className="mt-1 w-full h-11 px-3 border border-line rounded-md bg-transparent"
            />
          </div>
          <div>
            <label className="text-[12px] font-mono text-fg-muted uppercase">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rules, proof required, and completion criteria"
              rows={4}
              className="mt-1 w-full px-3 py-2 border border-line rounded-md bg-transparent"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-mono text-fg-muted uppercase">End Date</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full h-11 px-3 border border-line rounded-md bg-transparent"
              />
            </div>
            <div>
              <label className="text-[12px] font-mono text-fg-muted uppercase">Optional Linked Market ID</label>
              <input
                value={marketId}
                onChange={(e) => setMarketId(e.target.value)}
                placeholder="e.g. epl_winner"
                className="mt-1 w-full h-11 px-3 border border-line rounded-md bg-transparent"
              />
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="border border-line rounded-xl p-5 space-y-5">
          <div className="space-y-2">
            <label className="text-[12px] font-mono text-fg-muted uppercase">Funding Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFundingMode("SPLIT_PARTICIPANT")}
                className={`p-3 rounded-md border text-left ${fundingMode === "SPLIT_PARTICIPANT" ? "border-green bg-green/5" : "border-line"}`}
              >
                <p className="text-[13px] font-semibold">Each Participant Deposits</p>
                <p className="text-[12px] text-fg-muted mt-1">Everyone funds their own stake when joining.</p>
              </button>
              <button
                type="button"
                onClick={() => setFundingMode("CREATOR_FUNDED")}
                className={`p-3 rounded-md border text-left ${fundingMode === "CREATOR_FUNDED" ? "border-green bg-green/5" : "border-line"}`}
              >
                <p className="text-[13px] font-semibold">Initiator Funds Entire Pool</p>
                <p className="text-[12px] text-fg-muted mt-1">You lock the full challenge amount upfront.</p>
              </button>
            </div>
          </div>

          <div>
            <label className="text-[12px] font-mono text-fg-muted uppercase">Your Stake (KES)</label>
            <input
              type="number"
              min={1}
              step={1}
              value={creatorStakeAmount}
              onChange={(e) => setCreatorStakeAmount(e.target.value)}
              className="mt-1 w-full h-11 px-3 border border-line rounded-md bg-transparent"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold">Add Participants</h2>
              <span className="text-[12px] font-mono text-fg-muted">{invitees.length} added</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_120px] gap-2">
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                className="h-10 px-3 border border-line rounded-md bg-transparent"
              />
              <input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Display name"
                className="h-10 px-3 border border-line rounded-md bg-transparent"
              />
              <button type="button" onClick={() => addInvitee({ email: inviteEmail, name: inviteName || inviteEmail.split("@")[0], stakeAmount: "1000" })} className="h-10 bg-fg text-bg rounded-md font-semibold">
                Add
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
              <input
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                placeholder="Lookup user by email or name"
                className="h-10 px-3 border border-line rounded-md bg-transparent"
              />
              <button type="button" onClick={runLookup} className="h-10 border border-line rounded-md text-fg-secondary hover:text-fg">
                {lookupBusy ? "Searching..." : "Search"}
              </button>
            </div>

            {lookupResults.length > 0 && (
              <div className="border border-line rounded-md divide-y divide-line">
                {lookupResults.map((user) => (
                  <div key={user.id} className="p-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-semibold">{user.name || user.email}</p>
                      <p className="text-[11px] font-mono text-fg-muted">{user.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addInvitee({
                        email: (user.email || "").toLowerCase(),
                        name: user.name || user.email || "User",
                        userId: user.id,
                        stakeAmount: "1000",
                      })}
                      className="h-8 px-3 text-[12px] rounded-md border border-green/30 text-green"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}

            {invitees.length > 0 && (
              <div className="space-y-2">
                {invitees.map((invitee) => (
                  <div key={invitee.email} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_90px] gap-2 p-2 border border-line rounded-md">
                    <div>
                      <p className="text-[13px] font-semibold">{invitee.name}</p>
                      <p className="text-[11px] font-mono text-fg-muted">{invitee.email}</p>
                    </div>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={invitee.stakeAmount}
                      onChange={(e) => updateInviteStake(invitee.email, e.target.value)}
                      className="h-9 px-2 border border-line rounded-md bg-transparent"
                    />
                    <button type="button" onClick={() => removeInvitee(invitee.email)} className="h-9 px-2 border border-red/20 text-red rounded-md">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 bg-bg-above rounded-md border border-line text-[13px] font-mono">
            Total pooled value: <span className="font-bold text-green">{formatKes(totalPoolCents)}</span>
            {fundingMode === "CREATOR_FUNDED" && (
              <span className="block mt-1 text-fg-muted">You will lock the full amount above when creating this challenge.</span>
            )}
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="border border-line rounded-xl p-5 space-y-4">
          <h2 className="text-[15px] font-semibold">Verification Method</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { value: "MUTUAL", label: "Mutual Verification", desc: "Participants confirm result together." },
              { value: "ADMIN", label: "System Admin", desc: "Escalates to platform admin review." },
              { value: "REFEREE", label: "Specific Referee", desc: "A selected user resolves disputes." },
            ].map((method) => (
              <button
                key={method.value}
                type="button"
                onClick={() => setVerificationMethod(method.value as VerificationMethod)}
                className={`p-3 rounded-md border text-left ${verificationMethod === method.value ? "border-green bg-green/5" : "border-line"}`}
              >
                <p className="text-[13px] font-semibold">{method.label}</p>
                <p className="text-[12px] text-fg-muted mt-1">{method.desc}</p>
              </button>
            ))}
          </div>

          {verificationMethod === "REFEREE" && (
            <div className="space-y-2 border border-line rounded-md p-3">
              <p className="text-[12px] font-mono text-fg-muted">Choose referee from lookup results or enter referee email.</p>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px] gap-2">
                <input
                  value={refereeEmail}
                  onChange={(e) => {
                    setRefereeEmail(e.target.value);
                    setRefereeSelection(null);
                  }}
                  placeholder="referee@email.com"
                  className="h-10 px-3 border border-line rounded-md bg-transparent"
                />
                <button type="button" onClick={runLookup} className="h-10 border border-line rounded-md">Find User</button>
              </div>
              {lookupResults.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {lookupResults.map((user) => (
                    <button
                      key={`ref-${user.id}`}
                      type="button"
                      onClick={() => {
                        setRefereeSelection(user);
                        setRefereeEmail(user.email || "");
                      }}
                      className={`h-8 px-3 text-[12px] rounded-md border ${refereeSelection?.id === user.id ? "border-green text-green" : "border-line text-fg-secondary"}`}
                    >
                      {user.name || user.email}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="rounded-md border border-line p-3 bg-bg-above/30 text-[13px] space-y-1">
            <p className="font-semibold">Review</p>
            <p>{title}</p>
            <p className="text-fg-muted">{invitees.length + 1} participants � Pool {formatKes(totalPoolCents)} � Ends {new Date(endDate).toLocaleString()}</p>
          </div>
        </section>
      )}

      <div className="flex items-center justify-between pt-1">
        <button type="button" disabled={step === 1 || isPending} onClick={() => setStep((s) => s - 1)} className="h-10 px-4 border border-line rounded-md disabled:opacity-40">
          Back
        </button>

        {step < 3 ? (
          <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canContinue || isPending} className="h-10 px-5 bg-fg text-bg rounded-md font-semibold disabled:opacity-40">
            Continue
          </button>
        ) : (
          <button type="submit" disabled={!canContinue || isPending} className="h-10 px-6 bg-green text-white rounded-md font-semibold disabled:opacity-40">
            {isPending ? "Creating..." : "Create Challenge"}
          </button>
        )}
      </div>
    </form>
  );
}
