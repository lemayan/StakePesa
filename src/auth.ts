import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "./lib/db"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
    debug: true,
    adapter: PrismaAdapter(db),
    session: { strategy: "jwt" },
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                const user = await db.user.findUnique({
                    where: { email: credentials.email as string },
                })

                // No user, or no password (OAuth-only account)
                if (!user || !user.password) return null

                // Email must be verified (safety net — loginAction also pre-checks)
                if (!user.emailVerified) return null

                const passwordsMatch = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                )

                return passwordsMatch ? user : null
            },
        }),
    ],
    pages: {
        signIn: "/login",
        error: "/login",
    },
    callbacks: {
        async signIn({ user, account }) {
            // Auto-verify email for Google OAuth users
            if (account?.provider === "google" && user.email) {
                const existing = await db.user.findUnique({
                    where: { email: user.email },
                })
                if (existing && !existing.emailVerified) {
                    await db.user.update({
                        where: { id: existing.id },
                        data: { emailVerified: new Date() },
                    })
                }
            }
            return true
        },
        async jwt({ token, user, account, trigger }) {
            if (user) {
                token.id = user.id
                token.name = user.name
                token.email = user.email
                token.image = user.image
                token.role = (user as { role?: string }).role ?? "USER"
                if (account?.provider === "google" && user.image) {
                    token.providerImage = user.image
                }
            }
            // Refresh user data on every update trigger
            if (trigger === "update" && token.id) {
                const fresh = await db.user.findUnique({
                    where: { id: token.id as string },
                })
                if (fresh) {
                    token.name = fresh.name
                    token.email = fresh.email
                    token.image = fresh.image
                    token.role = fresh.role
                }
            }
            return token
        },
        async session({ session, token }) {
            if (token?.id) {
                session.user.id = token.id as string
            }
            session.user.name = typeof token.name === "string" ? token.name : ""
            session.user.email = typeof token.email === "string" ? token.email : ""
            session.user.image = typeof token.image === "string" ? token.image : ""
            session.user.role = token.role === "ADMIN" || token.role === "USER" ? token.role : "USER"
            ;(session.user as typeof session.user & { providerImage?: string | null }).providerImage =
                (token.providerImage as string | null | undefined) ?? null
            return session
        },
    },
})
