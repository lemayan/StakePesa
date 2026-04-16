import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
    const { pathname } = req.nextUrl
    const isLoggedIn = !!req.auth
    const role = (req.auth?.user as { role?: string } | undefined)?.role ?? "USER"
    const email = (req.auth?.user as { email?: string } | undefined)?.email?.toLowerCase() ?? ""
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
    const isAdminByEmail = email.length > 0 && adminEmails.includes(email)
    const isAdmin = role === "ADMIN" || isAdminByEmail

    // Protected routes — require authentication
    const protectedPaths = ["/dashboard", "/admin"]
    const isProtected = protectedPaths.some((p) => pathname.startsWith(p))

    if (isProtected && !isLoggedIn) {
        const loginUrl = new URL("/login", req.nextUrl.origin)
        loginUrl.searchParams.set("callbackUrl", pathname)
        return NextResponse.redirect(loginUrl)
    }

    if (pathname.startsWith("/admin") && !isAdmin) {
        return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin))
    }

    // If logged-in user visits login/signup, send them to dashboard
    const authPaths = ["/login", "/signup"]
    const isAuthPage = authPaths.some((p) => pathname.startsWith(p))

    if (isAuthPage && isLoggedIn) {
        return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin))
    }

    return NextResponse.next()
})

export const config = {
    matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/signup"],
}
