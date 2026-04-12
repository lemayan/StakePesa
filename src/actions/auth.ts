"use server"

import { signIn } from "@/auth"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { generateVerificationToken } from "@/lib/tokens"
import { sendVerificationEmail, sendWelcomeEmail } from "@/lib/mail"

/* ─────────────────────────────────────────────
   LOGIN
   Pre-validates everything and returns descriptive
   errors before touching the NextAuth signIn.
   ───────────────────────────────────────────── */
export async function loginAction(formData: FormData) {
    const email = (formData.get("email") as string)?.trim().toLowerCase()
    const password = formData.get("password") as string
    const agreeTerms = (formData.get("agreeTerms") as string | null)?.toLowerCase()

    if (!email || !password) {
        return { error: "Email and password are required." }
    }

    if (!["true", "on", "1"].includes(agreeTerms ?? "")) {
        return { error: "You must agree to the Terms and Privacy Policy to continue." }
    }

    // 1. Does user exist?
    const user = await db.user.findUnique({
        where: { email },
        include: { accounts: true },
    })

    if (!user) {
        return { error: "Invalid email or password." }
    }

    // 2. OAuth-only account (no password set)?
    if (!user.password) {
        const provider = user.accounts[0]?.provider ?? "Google"
        return {
            error: `This email is linked to ${provider}. Please sign in with ${provider} instead.`,
            type: "oauth_only" as const,
        }
    }

    // 3. Email not yet verified?
    if (!user.emailVerified) {
        return {
            error: "Please verify your email before signing in. Check your inbox for the verification link.",
            type: "not_verified" as const,
        }
    }

    // 4. Password check
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
        return { error: "Invalid email or password." }
    }

    // 5. All checks passed — sign in (throws NEXT_REDIRECT on success)
    try {
        await signIn("credentials", {
            email,
            password,
            redirectTo: "/dashboard",
        })
    } catch (error: unknown) {
        if (
            typeof error === "object" &&
            error !== null &&
            "digest" in error &&
            typeof (error as { digest?: unknown }).digest === "string" &&
            (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
        ) {
            throw error // Let Next.js handle the redirect
        }
        return { error: "Invalid email or password." }
    }
}

/* ─────────────────────────────────────────────
   SIGNUP
   Creates user, sends verification email.
   ───────────────────────────────────────────── */
export async function signupAction(formData: FormData) {
    const username = (formData.get("username") as string)?.trim()
    const email = (formData.get("email") as string)?.trim().toLowerCase()
    const password = formData.get("password") as string
    const agreeTerms = (formData.get("agreeTerms") as string | null)?.toLowerCase()

    if (!username || !email || !password) {
        return { error: "All fields are required." }
    }

    if (!["true", "on", "1"].includes(agreeTerms ?? "")) {
        return { error: "You must agree to the Terms and Privacy Policy to continue." }
    }

    if (password.length < 8) return { error: "Password must be at least 8 characters long." }
    if (!/[A-Z]/.test(password)) return { error: "Password must contain an uppercase letter." }
    if (!/[0-9]/.test(password)) return { error: "Password must contain a number." }
    if (!/[^a-zA-Z0-9]/.test(password)) return { error: "Password must contain a special character." }

    try {
        // Check existing email
        const existingByEmail = await db.user.findUnique({
            where: { email },
        })

        if (existingByEmail) {
            return {
                error: "This email is already registered.",
                type: "email_exists" as const,
            }
        }

        // Check existing username
        const existingByName = await db.user.findFirst({
            where: { name: username },
        })

        if (existingByName) {
            return { error: "Username is already taken. Please choose another one." }
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        await db.user.create({
            data: {
                name: username,
                email,
                password: hashedPassword,
            },
        })

        // Generate token & send verification email
        const verificationToken = await generateVerificationToken(email)
        await sendVerificationEmail(verificationToken.identifier, verificationToken.token)

        // Fire-and-forget animated welcome email
        void sendWelcomeEmail(email, username)

        return { success: "Confirmation email sent! Please check your inbox." }
    } catch {
        return { error: "Something went wrong. Please try again." }
    }
}

/* ─────────────────────────────────────────────
   VERIFY EMAIL
   Processes the token from the verification link.
   ───────────────────────────────────────────── */
export async function verifyEmailAction(token: string) {
    if (!token) {
        return { error: "Missing verification token." }
    }

    const record = await db.verificationToken.findFirst({
        where: { token },
    })

    if (!record) {
        return { error: "Invalid or already-used verification link." }
    }

    // Check expiry
    if (new Date() > record.expires) {
        await db.verificationToken.delete({
            where: {
                identifier_token: {
                    identifier: record.identifier,
                    token: record.token,
                },
            },
        })
        return { error: "This link has expired. Please request a new one." }
    }

    // Mark user as verified
    const user = await db.user.findUnique({
        where: { email: record.identifier },
    })

    if (!user) {
        return { error: "User not found." }
    }

    await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
    })

    // Clean up token
    await db.verificationToken.delete({
        where: {
            identifier_token: {
                identifier: record.identifier,
                token: record.token,
            },
        },
    })

    return { success: true }
}

/* ─────────────────────────────────────────────
   RESEND VERIFICATION (from login page if needed)
   ───────────────────────────────────────────── */
export async function resendVerificationAction(email: string) {
    const trimmed = email?.trim().toLowerCase()
    if (!trimmed) return { error: "Email is required." }

    const user = await db.user.findUnique({ where: { email: trimmed } })
    if (!user) return { error: "No account found with that email." }
    if (user.emailVerified) return { error: "Email is already verified." }

    const verificationToken = await generateVerificationToken(trimmed)
    await sendVerificationEmail(verificationToken.identifier, verificationToken.token)

    return { success: "Verification email sent! Check your inbox." }
}

/* ─────────────────────────────────────────────
   GOOGLE LOGIN
   ───────────────────────────────────────────── */
export async function googleLoginAction() {
    await signIn("google", { redirectTo: "/dashboard" })
}

/* ─────────────────────────────────────────────
   UPDATE PROFILE NAME
   ───────────────────────────────────────────── */
export async function updateProfileName(userId: string, name: string) {
    const trimmed = name?.trim()
    if (!trimmed || trimmed.length < 1) {
        return { error: "Name cannot be empty." }
    }
    if (trimmed.length > 50) {
        return { error: "Name must be 50 characters or less." }
    }

    try {
        await db.user.update({
            where: { id: userId },
            data: { name: trimmed },
        })
        return { success: true, name: trimmed }
    } catch {
        return { error: "Failed to update name. Please try again." }
    }
}

/* ─────────────────────────────────────────────
   UPDATE PROFILE AVATAR
   Allows generated DiceBear avatars or reset.
   ───────────────────────────────────────────── */
export async function updateProfileAvatar(userId: string, avatarUrl: string | null) {
    if (!userId?.trim()) {
        return { error: "Invalid user." }
    }

    if (avatarUrl === null) {
        try {
            const resetResult = await db.user.updateMany({
                where: { id: userId },
                data: { image: null },
            })
            if (resetResult.count === 0) {
                return { error: "Account not found. Please sign out and sign in again." }
            }
            return { success: true, image: null as string | null }
        } catch (error) {
            console.error("[updateProfileAvatar] reset failed:", error)
            return { error: "Failed to reset avatar. Please try again." }
        }
    }

    const trimmed = avatarUrl.trim()
    if (!trimmed) {
        return { error: "Avatar URL is required." }
    }
    if (trimmed.length > 500) {
        return { error: "Avatar URL is too long." }
    }

    let parsed: URL
    try {
        parsed = new URL(trimmed)
    } catch {
        return { error: "Invalid avatar URL format." }
    }

    const isDiceBear =
        parsed.protocol === "https:" &&
        parsed.hostname === "api.dicebear.com" &&
        parsed.pathname.startsWith("/9.x/") &&
        (parsed.pathname.endsWith("/svg") || parsed.pathname.endsWith(".svg"))

    const isProviderPhoto =
        parsed.protocol === "https:" &&
        (parsed.hostname === "lh3.googleusercontent.com" ||
            parsed.hostname.endsWith(".googleusercontent.com"))

    if (!isDiceBear && !isProviderPhoto) {
        return { error: "Only generated avatars or your provider photo are allowed." }
    }

    try {
        const updateResult = await db.user.updateMany({
            where: { id: userId },
            data: { image: parsed.toString() },
        })

        if (updateResult.count === 0) {
            return { error: "Account not found. Please sign out and sign in again." }
        }

        return { success: true, image: parsed.toString() }
    } catch (error) {
        console.error("[updateProfileAvatar] update failed:", error)
        return { error: "Failed to update avatar. Please try again." }
    }
}

function isAllowedProviderPhotoUrl(url: string) {
    try {
        const parsed = new URL(url)
        return (
            parsed.protocol === "https:" &&
            (parsed.hostname === "lh3.googleusercontent.com" ||
                parsed.hostname.endsWith(".googleusercontent.com"))
        )
    } catch {
        return false
    }
}

function extractGooglePictureFromIdToken(idToken: string) {
    try {
        const parts = idToken.split(".")
        if (parts.length < 2) return null

        const payload = parts[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/")
            .padEnd(Math.ceil(parts[1].length / 4) * 4, "=")

        const json = Buffer.from(payload, "base64").toString("utf8")
        const data = JSON.parse(json) as { picture?: unknown }

        if (typeof data.picture !== "string") return null
        return isAllowedProviderPhotoUrl(data.picture) ? data.picture : null
    } catch {
        return null
    }
}

export async function getGoogleProviderPhoto(userId: string) {
    if (!userId?.trim()) {
        return { error: "Invalid user." }
    }

    try {
        const account = await db.account.findFirst({
            where: { userId, provider: "google" },
            select: { id_token: true },
        })

        if (!account?.id_token) {
            return { error: "Google photo could not be recovered. Please sign in with Google again." }
        }

        const photo = extractGooglePictureFromIdToken(account.id_token)
        if (!photo) {
            return { error: "Google photo could not be recovered. Please sign in with Google again." }
        }

        return { success: true, image: photo }
    } catch {
        return { error: "Failed to recover Google photo. Please try again." }
    }
}
