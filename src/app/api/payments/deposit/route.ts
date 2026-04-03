import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { initiateDeposit } from "@/lib/intasend-payment"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
    }

    const body = await req.json()
    const { amountKES, phone } = body

    if (!amountKES || typeof amountKES !== "number") {
        return NextResponse.json({ error: "amountKES is required" }, { status: 400 })
    }
    if (!phone || typeof phone !== "string") {
        return NextResponse.json({ error: "phone is required" }, { status: 400 })
    }

    const userName = session.user.name ?? "Customer"

    const result = await initiateDeposit(
        session.user.id,
        amountKES,
        userName,
        phone
    )

    if (!result.success) {
        return NextResponse.json({ error: result.error, debug: "deposit failed" }, { status: 400 })
    }

    return NextResponse.json({
        success: true,
        invoiceId: result.invoiceId,
        apiRef: result.apiRef,
        message: "M-Pesa prompt sent to your phone. Enter your PIN to confirm.",
    })
}
