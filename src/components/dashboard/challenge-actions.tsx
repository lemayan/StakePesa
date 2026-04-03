"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptChallengeInvitationAction } from "@/actions/challenge";
import { useToast } from "@/components/ui/toast";

export function AcceptInvitationButton({ invitationId }: { invitationId: string }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(async () => {
          const result = await acceptChallengeInvitationAction(invitationId);
          if (result.error) {
            toast("error", "Invitation not accepted", result.error);
            return;
          }
          toast("success", "Invitation accepted", result.success ?? "You joined the challenge.");
        });
      }}
      disabled={isPending}
      className="h-8 px-3 text-[12px] font-semibold rounded-md bg-green text-white hover:opacity-90 disabled:opacity-60"
    >
      {isPending ? "Accepting..." : "Accept"}
    </button>
  );
}

export function RaiseDisputeButton({ challengeId }: { challengeId: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        router.push(`/dashboard/challenges/${challengeId}?intent=dispute`);
      }}
      className="h-8 px-3 text-[12px] font-medium rounded-md border border-line text-fg-secondary hover:text-fg hover:bg-bg-above disabled:opacity-60"
    >
      Raise Dispute
    </button>
  );
}
