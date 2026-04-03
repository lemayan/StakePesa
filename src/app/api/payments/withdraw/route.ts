import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { initiateWithdrawal } from "@/lib/intasend-payment"
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

    const result = await initiateWithdrawal(
        session.user.id,
        amountKES,
        userName,
        phone
    )

    if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
        success: true,
        apiRef: result.apiRef,
        message: `KES ${amountKES} will be sent to your M-Pesa shortly.`,
    })
}
