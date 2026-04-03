import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getWalletBalance } from "@/lib/wallet"
import { db } from "@/lib/db"

export async function GET() {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
    }

    const [balanceCents, profile, recentTxns] = await Promise.all([
        getWalletBalance(session.user.id),
        db.paymentProfile.findUnique({
            where: { userId: session.user.id },
            select: { phoneNumber: true, isVerified: true },
        }),
        db.intaSendTransaction.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
                id: true,
                type: true,
                amountCents: true,
                status: true,
                createdAt: true,
            },
        }),
    ])

    return NextResponse.json({
        balanceCents,
        balanceKES: balanceCents / 100,
        phone: profile?.phoneNumber ?? null,
        isVerified: profile?.isVerified ?? false,
        transactions: recentTxns,
    })
}
