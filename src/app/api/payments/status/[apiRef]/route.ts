import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

// GET /api/payments/status/[apiRef]
// Returns the current status of a specific transaction by its apiRef
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ apiRef: string }> }
) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
    }

    const { apiRef } = await params

    const txn = await db.intaSendTransaction.findUnique({
        where: { apiRef },
        select: {
            status: true,
            type: true,
            amountCents: true,
            userId: true,
        },
    })

    if (!txn) {
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    // Security: user can only check their own transactions
    if (txn.userId !== session.user.id) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 403 })
    }

    // Also return current wallet balance so UI can update immediately
    const wallet = await db.wallet.findUnique({
        where: { userId: session.user.id },
        select: { balance: true },
    })

    return NextResponse.json({
        status: txn.status,       // "PENDING" | "SUCCESS" | "FAILED"
        type: txn.type,
        amountCents: txn.amountCents,
        balanceCents: wallet?.balance ?? 0,
    })
}
