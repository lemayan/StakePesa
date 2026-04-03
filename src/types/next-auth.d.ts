export { }

// Add NextAuth types securely
declare module "next-auth" {
    interface Session {
        user: {
            id: string
            name?: string | null
            email?: string | null
            image?: string | null
            providerImage?: string | null
        }
    }
}
