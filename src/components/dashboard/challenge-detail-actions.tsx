"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteChallengeAction,
  raiseDisputeAction,
  resolveChallengeByAuthorityAction,
  resolveDisputeAction,
  submitVerificationVoteAction,
} from "@/actions/challenge";
import { useToast } from "@/components/ui/toast";

export function VerificationVoteForm({ challengeId }: { challengeId: string }) {
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  const submitVote = (verdict: "APPROVE" | "REJECT") => {
    startTransition(async () => {
      const result = await submitVerificationVoteAction({
        challengeId,
        verdict,
        note: note.trim() ? note.trim() : undefined,
      });
      if (result.error) {
        toast("error", "Verification failed", result.error);
        return;
      }
      toast("success", "Verification submitted", result.success ?? "Your vote was recorded.");
      setNote("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-2 rounded-lg border border-line p-4 bg-bg-above/20">
      <p className="text-sm font-semibold">Submit Verification</p>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={3}
        placeholder="Optional note about your verification decision"
        className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-green"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => submitVote("APPROVE")}
          className="h-9 px-3 rounded-md bg-green text-white text-sm font-semibold disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Approve Outcome"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => submitVote("REJECT")}
          className="h-9 px-3 rounded-md border border-line text-sm text-fg-secondary hover:text-fg disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Reject / Dispute"}
        </button>
      </div>
    </div>
  );
}

export function DisputeForm({ challengeId }: { challengeId: string }) {
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await raiseDisputeAction({ challengeId, reason });
      if (result.error) {
        toast("error", "Dispute failed", result.error);
        return;
      }
      toast("success", "Dispute raised", result.success ?? "Challenge moved to disputed state.");
      setReason("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-lg border border-red/30 p-4 bg-red/5">
      <p className="text-sm font-semibold">Raise Dispute</p>
      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={3}
        minLength={8}
        required
        placeholder="Describe why this challenge result is disputed"
        className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-red"
      />
      <button
        type="submit"
        disabled={isPending}
        className="h-9 px-3 rounded-md border border-red/40 text-sm font-semibold text-red hover:bg-red/10 disabled:opacity-60"
      >
        {isPending ? "Submitting..." : "Submit Dispute"}
      </button>
    </form>
  );
}

export function AuthorityResolveForm({ challengeId }: { challengeId: string }) {
  const [isPending, startTransition] = useTransition();
  const [resolution, setResolution] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await resolveChallengeByAuthorityAction({ challengeId, resolution });
      if (result.error) {
        toast("error", "Resolution failed", result.error);
        return;
      }
      toast("success", "Challenge resolved", result.success ?? "Challenge was resolved.");
      setResolution("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-lg border border-line p-4 bg-bg-above/20">
      <p className="text-sm font-semibold">Authority Resolution</p>
      <textarea
        value={resolution}
        onChange={(event) => setResolution(event.target.value)}
        rows={3}
        minLength={8}
        required
        placeholder="Write the final resolution note"
        className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-green"
      />
      <button
        type="submit"
        disabled={isPending}
        className="h-9 px-3 rounded-md bg-green text-white text-sm font-semibold disabled:opacity-60"
      >
        {isPending ? "Resolving..." : "Resolve Challenge"}
      </button>
    </form>
  );
}

export function ResolveDisputeForm({ disputeId }: { disputeId: string }) {
  const [isPending, startTransition] = useTransition();
  const [resolution, setResolution] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await resolveDisputeAction({ disputeId, resolution });
      if (result.error) {
        toast("error", "Dispute resolution failed", result.error);
        return;
      }
      toast("success", "Dispute resolved", result.success ?? "Dispute was resolved.");
      setResolution("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-lg border border-line p-4 bg-bg-above/20">
      <p className="text-sm font-semibold">Resolve Latest Dispute</p>
      <textarea
        value={resolution}
        onChange={(event) => setResolution(event.target.value)}
        rows={3}
        minLength={8}
        required
        placeholder="Explain the dispute outcome"
        className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-green"
      />
      <button
        type="submit"
        disabled={isPending}
        className="h-9 px-3 rounded-md bg-green text-white text-sm font-semibold disabled:opacity-60"
      >
        {isPending ? "Resolving..." : "Resolve Dispute"}
      </button>
    </form>
  );
}

export function DeleteChallengeForm({
  challengeId,
  deleteDeadline,
  hoursRemaining,
}: {
  challengeId: string;
  deleteDeadline: string;
  hoursRemaining: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmChecked, setConfirmChecked] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const formatUtcDeadline = (value: string) => {
    const date = new Date(value);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const seconds = String(date.getUTCSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
  };

  const onDelete = () => {
    if (!confirmChecked) {
      toast("error", "Confirmation required", "Please confirm you understand the creator liability fee.");
      return;
    }

    startTransition(async () => {
      const result = await deleteChallengeAction(challengeId);
      if (result.error) {
        toast("error", "Delete failed", result.error);
        return;
      }
      toast("success", "Challenge deleted", result.success ?? "Challenge deleted and refunds processed.");
      router.push("/dashboard");
      router.refresh();
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-red/30 p-4 bg-red/5">
      <p className="text-sm font-semibold text-red">Delete Challenge (Creator Only)</p>
      <p className="text-[12px] text-fg-secondary">
        Delete deadline: {formatUtcDeadline(deleteDeadline)} ({hoursRemaining}h remaining).
      </p>
      <p className="text-[12px] text-fg-secondary">
        Warning: deleting refunds players by stake, but the platform fee is charged to the creator only.
      </p>
      <label className="flex items-start gap-2 text-[12px] text-fg-secondary">
        <input
          type="checkbox"
          checked={confirmChecked}
          onChange={(event) => setConfirmChecked(event.target.checked)}
          className="mt-0.5"
        />
        <span>I understand invitees are fully refunded and I am solely liable for the company fee.</span>
      </label>
      <button
        type="button"
        disabled={isPending || !confirmChecked}
        onClick={onDelete}
        className="h-9 px-3 rounded-md border border-red/40 text-sm font-semibold text-red hover:bg-red/10 disabled:opacity-60"
      >
        {isPending ? "Deleting..." : "Delete Challenge"}
      </button>
    </div>
  );
}
