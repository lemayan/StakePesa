"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/toast";

/* ── Types ── */
interface BetForm {
  question: string;
  category: string;
  description: string;
  stakeAmount: string;
  deadline: string;
  visibility: "public" | "private";
  invitees: Invitee[];
  referee: Invitee | null;
}

interface Invitee {
  name: string;
  email: string;
  avatar?: string;
}

const categories = [
  { id: "personal", label: "Personal", emoji: "🎯", desc: "Challenges & habits" },
  { id: "sports", label: "Sports", emoji: "⚽", desc: "Match predictions" },
  { id: "finance", label: "Finance", emoji: "📈", desc: "Market predictions" },
  { id: "politics", label: "Politics", emoji: "🏛️", desc: "Election & policy" },
  { id: "entertainment", label: "Entertainment", emoji: "🎬", desc: "Pop culture" },
  { id: "custom", label: "Custom", emoji: "✨", desc: "Anything goes" },
];

const suggestedFriends: Invitee[] = [
  { name: "John K.", email: "john@example.com" },
  { name: "Alice M.", email: "alice@example.com" },
  { name: "Brian O.", email: "brian@example.com" },
  { name: "Grace W.", email: "grace@example.com" },
  { name: "David L.", email: "david@example.com" },
  { name: "Sarah N.", email: "sarah@example.com" },
];

const steps = [
  { num: 1, label: "The Bet" },
  { num: 2, label: "Stakes" },
  { num: 3, label: "Players" },
  { num: 4, label: "Review" },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
};

export default function CreateBetPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [publishing, setPublishing] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [refereeInput, setRefereeInput] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);

  const [form, setForm] = useState<BetForm>({
    question: "",
    category: "",
    description: "",
    stakeAmount: "",
    deadline: "",
    visibility: "public",
    invitees: [],
    referee: null,
  });

  const update = <K extends keyof BetForm>(key: K, val: BetForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const next = () => {
    setDir(1);
    setStep((s) => Math.min(s + 1, 4));
  };
  const back = () => {
    setDir(-1);
    setStep((s) => Math.max(s - 1, 1));
  };

  const canNext = () => {
    if (step === 1) return form.question.length >= 5 && form.category !== "";
    if (step === 2) return Number(form.stakeAmount) >= 50 && form.deadline !== "";
    if (step === 3) return true; // invites optional
    return true;
  };

  const addInvitee = (person: Invitee) => {
    if (!form.invitees.find((i) => i.email === person.email)) {
      update("invitees", [...form.invitees, person]);
    }
  };

  const removeInvitee = (email: string) => {
    update("invitees", form.invitees.filter((i) => i.email !== email));
  };

  const addCustomInvitee = () => {
    if (inviteInput.includes("@")) {
      const name = inviteInput.split("@")[0];
      addInvitee({ name, email: inviteInput });
      setInviteInput("");
    }
  };

  const setReferee = (person: Invitee) => {
    update("referee", person);
    setRefereeInput("");
  };

  const addCustomReferee = () => {
    if (refereeInput.includes("@")) {
      const name = refereeInput.split("@")[0];
      setReferee({ name, email: refereeInput });
    }
  };

  const publish = async () => {
    setPublishing(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 2000));
    setShowConfetti(true);
    toast("success", "Bet created!", `"${form.question}" is now live`);
    setTimeout(() => {
      router.push("/dashboard/markets");
    }, 2500);
  };

  // Confetti effect
  useEffect(() => {
    if (!showConfetti) return;
    const tryConfetti = async () => {
      try {
        const confetti = (await import("canvas-confetti")).default;
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#16a34a", "#22c55e", "#f59e0b", "#ffffff"],
        });
      } catch {
        // confetti not available
      }
    };
    tryConfetti();
  }, [showConfetti]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ── Back link ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          href="/dashboard/markets"
          className="text-[13px] font-mono text-fg-muted hover:text-fg transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Markets
        </Link>
      </motion.div>

      {/* ── Step indicator ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
        className="border border-line rounded-lg p-4"
      >
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{
                    scale: step === s.num ? 1.1 : 1,
                    backgroundColor:
                      step > s.num
                        ? "var(--c-green)"
                        : step === s.num
                        ? "var(--c-green)"
                        : "var(--c-bg-above)",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-mono font-bold shrink-0"
                >
                  {step > s.num ? (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <span className={step >= s.num ? "text-white" : "text-fg-muted"}>
                      {s.num}
                    </span>
                  )}
                </motion.div>
                <span
                  className={`text-[12px] font-mono hidden sm:inline ${
                    step >= s.num ? "text-fg font-medium" : "text-fg-muted"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-3 bg-bg-above rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-green rounded-full"
                    initial={false}
                    animate={{ width: step > s.num ? "100%" : "0%" }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Step content ── */}
      <div className="relative min-h-105">
        <AnimatePresence mode="wait" custom={dir}>
          {/* ══ STEP 1: THE BET ══ */}
          {step === 1 && (
            <motion.div
              key="step1"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-[20px] font-bold">What&apos;s the bet?</h2>
                <p className="text-[14px] text-fg-muted mt-1">
                  Write a clear, yes-or-no question everyone can understand.
                </p>
              </div>

              {/* Question input */}
              <div>
                <label className="text-[12px] font-mono text-fg-muted uppercase tracking-wider block mb-2">
                  Your question
                </label>
                <div className="relative">
                  <textarea
                    value={form.question}
                    onChange={(e) => update("question", e.target.value)}
                    placeholder="e.g. Will Arsenal win the Premier League 2025?"
                    rows={3}
                    maxLength={200}
                    className="w-full px-4 py-3 text-[15px] bg-transparent border border-line rounded-lg focus:border-green focus:ring-1 focus:ring-green/20 focus:outline-none transition-all resize-none"
                  />
                  <span className="absolute bottom-2 right-3 text-[11px] font-mono text-fg-muted">
                    {form.question.length}/200
                  </span>
                </div>
              </div>

              {/* Category grid */}
              <div>
                <label className="text-[12px] font-mono text-fg-muted uppercase tracking-wider block mb-2">
                  Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categories.map((cat) => (
                    <motion.button
                      key={cat.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => update("category", cat.id)}
                      className={`relative p-3 rounded-lg border text-left transition-all ${
                        form.category === cat.id
                          ? "border-green bg-green/5"
                          : "border-line hover:border-line-bright hover:bg-bg-above/40"
                      }`}
                    >
                      {form.category === cat.id && (
                        <motion.div
                          layoutId="cat-selected"
                          className="absolute inset-0 rounded-lg border-2 border-green pointer-events-none"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="text-[20px] block">{cat.emoji}</span>
                      <span className="text-[13px] font-semibold block mt-1">{cat.label}</span>
                      <span className="text-[11px] text-fg-muted">{cat.desc}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Optional description */}
              <div>
                <label className="text-[12px] font-mono text-fg-muted uppercase tracking-wider block mb-2">
                  Description <span className="text-fg-muted/60">(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Add rules, context, or conditions..."
                  rows={2}
                  className="w-full px-4 py-3 text-[14px] bg-transparent border border-line rounded-lg focus:border-green focus:ring-1 focus:ring-green/20 focus:outline-none transition-all resize-none"
                />
              </div>
            </motion.div>
          )}

          {/* ══ STEP 2: STAKES ══ */}
          {step === 2 && (
            <motion.div
              key="step2"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-[20px] font-bold">Set the stakes</h2>
                <p className="text-[14px] text-fg-muted mt-1">
                  How much skin in the game? Set your stake and deadline.
                </p>
              </div>

              {/* Stake amount */}
              <div>
                <label className="text-[12px] font-mono text-fg-muted uppercase tracking-wider block mb-2">
                  Stake amount (KES)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={form.stakeAmount}
                    onChange={(e) => update("stakeAmount", e.target.value)}
                    placeholder="1000"
                    min={50}
                    className="w-full h-12 px-4 text-[20px] font-mono font-bold bg-transparent border border-line rounded-lg focus:border-green focus:ring-1 focus:ring-green/20 focus:outline-none transition-all tabular-nums"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-mono text-fg-muted">
                    KES
                  </span>
                </div>

                {/* Quick amounts */}
                <div className="flex gap-2 mt-2 flex-wrap">
                  {["100", "500", "1000", "2500", "5000", "10000"].map((v) => (
                    <button
                      key={v}
                      onClick={() => update("stakeAmount", v)}
                      className={`h-8 px-3 text-[12px] font-mono rounded-md border transition-all ${
                        form.stakeAmount === v
                          ? "border-green text-green bg-green/8 font-bold"
                          : "border-line text-fg-muted hover:text-fg-secondary hover:border-line-bright"
                      }`}
                    >
                      {Number(v).toLocaleString()}
                    </button>
                  ))}
                </div>

                {Number(form.stakeAmount) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 p-3 bg-bg-above/40 rounded-lg space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[12px] font-mono">
                      <span className="text-fg-muted">Your stake</span>
                      <span className="text-fg font-medium">{Number(form.stakeAmount).toLocaleString()} KES</span>
                    </div>
                    <div className="flex items-center justify-between text-[12px] font-mono">
                      <span className="text-fg-muted">Platform fee (2%)</span>
                      <span className="text-fg-muted">{Math.round(Number(form.stakeAmount) * 0.02).toLocaleString()} KES</span>
                    </div>
                    <div className="flex items-center justify-between text-[12px] font-mono pt-1.5 border-t border-line">
                      <span className="text-fg-muted">Potential payout</span>
                      <span className="text-green font-bold text-[14px]">
                        {Math.round(Number(form.stakeAmount) * 1.96).toLocaleString()} KES
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Deadline */}
              <div>
                <label className="text-[12px] font-mono text-fg-muted uppercase tracking-wider block mb-2">
                  Deadline
                </label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => update("deadline", e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full h-10 px-4 text-[14px] font-mono bg-transparent border border-line rounded-lg focus:border-green focus:ring-1 focus:ring-green/20 focus:outline-none transition-all"
                />
                {form.deadline && (
                  <p className="text-[12px] font-mono text-fg-muted mt-1.5">
                    {Math.ceil((new Date(form.deadline).getTime() - Date.now()) / 86400000)} days from now
                  </p>
                )}
              </div>

              {/* Visibility */}
              <div>
                <label className="text-[12px] font-mono text-fg-muted uppercase tracking-wider block mb-2">
                  Visibility
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { val: "public", icon: "🌍", label: "Public", desc: "Anyone can join" },
                    { val: "private", icon: "🔒", label: "Private", desc: "Invite only" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => update("visibility", opt.val)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        form.visibility === opt.val
                          ? "border-green bg-green/5"
                          : "border-line hover:border-line-bright"
                      }`}
                    >
                      <span className="text-[16px]">{opt.icon}</span>
                      <span className="text-[13px] font-semibold block">{opt.label}</span>
                      <span className="text-[11px] text-fg-muted">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ STEP 3: PLAYERS & REFEREE ══ */}
          {step === 3 && (
            <motion.div
              key="step3"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-[20px] font-bold">Invite players & referee</h2>
                <p className="text-[14px] text-fg-muted mt-1">
                  Add friends to challenge and pick a trusted referee to settle the bet.
                </p>
              </div>

              {/* Invite players */}
              <div>
                <label className="text-[12px] font-mono text-fg-muted uppercase tracking-wider block mb-2">
                  Invite players
                  <span className="text-fg-muted/60 ml-1">({form.invitees.length} added)</span>
                </label>

                {/* Email input */}
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="email"
                    value={inviteInput}
                    onChange={(e) => setInviteInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCustomInvitee()}
                    placeholder="friend@email.com"
                    className="flex-1 h-9 px-3 text-[13px] bg-transparent border border-line rounded-md focus:border-green focus:ring-1 focus:ring-green/20 focus:outline-none transition-all"
                  />
                  <button
                    onClick={addCustomInvitee}
                    disabled={!inviteInput.includes("@")}
                    className="h-9 px-3 text-[13px] font-semibold bg-green text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-30"
                  >
                    Add
                  </button>
                </div>

                {/* Selected invitees */}
                {form.invitees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {form.invitees.map((person) => (
                      <motion.span
                        key={person.email}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 bg-green/8 border border-green/20 rounded-full text-[12px] font-mono text-green"
                      >
                        {person.name}
                        <button
                          onClick={() => removeInvitee(person.email)}
                          className="w-4 h-4 rounded-full bg-green/10 flex items-center justify-center hover:bg-green/20 transition-colors"
                        >
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </motion.span>
                    ))}
                  </div>
                )}

                {/* Suggested friends */}
                <div className="border border-line rounded-lg overflow-hidden">
                  <div className="h-8 flex items-center px-3 bg-bg-above/40 text-[11px] font-mono text-fg-muted uppercase tracking-wider">
                    Suggested friends
                  </div>
                  <div className="divide-y divide-line">
                    {suggestedFriends.map((friend) => {
                      const added = form.invitees.some((i) => i.email === friend.email);
                      const isRef = form.referee?.email === friend.email;
                      return (
                        <div
                          key={friend.email}
                          className="flex items-center justify-between px-3 py-2 hover:bg-bg-above/40 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-bg-above border border-line flex items-center justify-center text-[11px] font-mono font-bold text-fg-muted">
                              {friend.name.split(" ").map(w => w[0]).join("")}
                            </div>
                            <div>
                              <span className="text-[13px] font-medium block">{friend.name}</span>
                              <span className="text-[11px] text-fg-muted font-mono">{friend.email}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => addInvitee(friend)}
                            disabled={added || isRef}
                            className={`h-7 px-2.5 text-[11px] font-mono font-medium rounded-md transition-all ${
                              added
                                ? "text-green bg-green/8 border border-green/20"
                                : isRef
                                ? "text-amber bg-amber/8 border border-amber/20"
                                : "text-fg-muted border border-line hover:border-green hover:text-green"
                            }`}
                          >
                            {added ? "✓ Added" : isRef ? "Referee" : "+ Invite"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Referee */}
              <div>
                <label className="text-[12px] font-mono text-fg-muted uppercase tracking-wider block mb-2">
                  Referee
                  <span className="text-fg-muted/60 ml-1">(settles disputes)</span>
                </label>

                {form.referee ? (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center justify-between p-3 border border-amber/20 bg-amber/5 rounded-lg"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber/10 border border-amber/20 flex items-center justify-center text-[12px] font-bold text-amber">
                        ⚖️
                      </div>
                      <div>
                        <span className="text-[13px] font-semibold block">{form.referee.name}</span>
                        <span className="text-[11px] text-fg-muted font-mono">{form.referee.email}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => update("referee", null)}
                      className="text-[12px] font-mono text-red hover:underline"
                    >
                      Remove
                    </button>
                  </motion.div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        value={refereeInput}
                        onChange={(e) => setRefereeInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addCustomReferee()}
                        placeholder="referee@email.com"
                        className="flex-1 h-9 px-3 text-[13px] bg-transparent border border-line rounded-md focus:border-green focus:ring-1 focus:ring-green/20 focus:outline-none transition-all"
                      />
                      <button
                        onClick={addCustomReferee}
                        disabled={!refereeInput.includes("@")}
                        className="h-9 px-3 text-[13px] font-semibold bg-amber text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-30"
                      >
                        Set
                      </button>
                    </div>
                    {/* Quick pick from friends */}
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedFriends
                        .filter((f) => !form.invitees.some((i) => i.email === f.email))
                        .slice(0, 4)
                        .map((f) => (
                          <button
                            key={f.email}
                            onClick={() => setReferee(f)}
                            className="h-7 px-2.5 text-[11px] font-mono text-fg-muted border border-line rounded-md hover:border-amber hover:text-amber hover:bg-amber/5 transition-all"
                          >
                            {f.name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ══ STEP 4: REVIEW ══ */}
          {step === 4 && (
            <motion.div
              key="step4"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-[20px] font-bold">Review your bet</h2>
                <p className="text-[14px] text-fg-muted mt-1">
                  Everything look good? Hit publish to go live.
                </p>
              </div>

              {/* Summary card */}
              <div className="border border-line rounded-lg overflow-hidden">
                {/* Question */}
                <div className="p-4 border-b border-line">
                  <span className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">The Bet</span>
                  <p className="text-[17px] font-bold mt-1">{form.question}</p>
                  {form.description && (
                    <p className="text-[13px] text-fg-muted mt-1">{form.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] font-mono bg-bg-above px-1.5 py-0.5 rounded text-fg-muted capitalize">
                      {categories.find((c) => c.id === form.category)?.emoji}{" "}
                      {form.category}
                    </span>
                    <span className="text-[11px] font-mono bg-bg-above px-1.5 py-0.5 rounded text-fg-muted">
                      {form.visibility === "public" ? "🌍 Public" : "🔒 Private"}
                    </span>
                  </div>
                </div>

                {/* Stake + Deadline */}
                <div className="grid grid-cols-2 gap-px bg-line">
                  <div className="bg-bg p-4">
                    <span className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">Stake</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-[24px] font-mono font-bold text-green tabular-nums">
                        {Number(form.stakeAmount).toLocaleString()}
                      </span>
                      <span className="text-[13px] font-mono text-fg-muted">KES</span>
                    </div>
                  </div>
                  <div className="bg-bg p-4">
                    <span className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">Deadline</span>
                    <div className="mt-1">
                      <span className="text-[16px] font-mono font-bold">
                        {form.deadline ? new Date(form.deadline).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </span>
                      {form.deadline && (
                        <span className="text-[11px] font-mono text-fg-muted block mt-0.5">
                          {Math.ceil((new Date(form.deadline).getTime() - Date.now()) / 86400000)} days left
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Players */}
                <div className="p-4 border-t border-line">
                  <span className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">
                    Players ({form.invitees.length})
                  </span>
                  {form.invitees.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.invitees.map((p) => (
                        <span
                          key={p.email}
                          className="inline-flex items-center gap-1 h-6 px-2 bg-green/8 border border-green/15 rounded-full text-[11px] font-mono text-green"
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13px] text-fg-muted mt-1">Open to anyone (public market)</p>
                  )}
                </div>

                {/* Referee */}
                <div className="p-4 border-t border-line">
                  <span className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">Referee</span>
                  {form.referee ? (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-6 h-6 rounded-full bg-amber/10 flex items-center justify-center text-[10px]">
                        ⚖️
                      </div>
                      <span className="text-[13px] font-semibold">{form.referee.name}</span>
                      <span className="text-[11px] font-mono text-fg-muted">{form.referee.email}</span>
                    </div>
                  ) : (
                    <p className="text-[13px] text-fg-muted mt-1">Community voting (no referee assigned)</p>
                  )}
                </div>

                {/* Cost breakdown */}
                <div className="p-4 border-t border-line bg-bg-above/40">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12px] font-mono">
                      <span className="text-fg-muted">Stake amount</span>
                      <span className="text-fg">{Number(form.stakeAmount).toLocaleString()} KES</span>
                    </div>
                    <div className="flex items-center justify-between text-[12px] font-mono">
                      <span className="text-fg-muted">Platform fee (2%)</span>
                      <span className="text-fg-muted">{Math.round(Number(form.stakeAmount) * 0.02).toLocaleString()} KES</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px] font-mono pt-1.5 border-t border-line font-bold">
                      <span className="text-fg">Total deducted</span>
                      <span className="text-fg">{Math.round(Number(form.stakeAmount) * 1.02).toLocaleString()} KES</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px] font-mono">
                      <span className="text-green font-medium">Max payout (if you win)</span>
                      <span className="text-green font-bold">{Math.round(Number(form.stakeAmount) * 1.96).toLocaleString()} KES</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Navigation buttons ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="flex items-center justify-between pt-2 border-t border-line"
      >
        <button
          onClick={back}
          disabled={step === 1}
          className="h-10 px-4 text-[13px] font-medium text-fg-muted border border-line rounded-md hover:bg-bg-above transition-all disabled:opacity-0 disabled:pointer-events-none flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back
        </button>

        {step < 4 ? (
          <button
            onClick={next}
            disabled={!canNext()}
            className="h-10 px-5 text-[14px] font-semibold bg-green text-white rounded-md hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            Continue
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        ) : (
          <motion.button
            onClick={publish}
            disabled={publishing}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="h-10 px-6 text-[14px] font-bold bg-green text-white rounded-md transition-all disabled:opacity-70 flex items-center gap-2 relative overflow-hidden"
          >
            {publishing ? (
              <>
                <motion.div
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                />
                Publishing...
              </>
            ) : (
              <>
                🚀 Publish Bet
              </>
            )}
            {/* Shimmer effect */}
            {!publishing && (
              <motion.div
                className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
              />
            )}
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
