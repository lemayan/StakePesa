import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
    const { pathname } = req.nextUrl
    const isLoggedIn = !!req.auth

    // Protected routes — require authentication
    const protectedPaths = ["/dashboard"]
    const isProtected = protectedPaths.some((p) => pathname.startsWith(p))

    if (isProtected && !isLoggedIn) {
        const loginUrl = new URL("/login", req.nextUrl.origin)
        loginUrl.searchParams.set("callbackUrl", pathname)
        return NextResponse.redirect(loginUrl)
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
    matcher: ["/dashboard/:path*", "/login", "/signup"],
}
