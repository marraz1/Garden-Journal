import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { fakeVerifyPassword, verifyPassword } from "@/lib/passwords";

/**
 * Google is optional: it only appears when credentials are configured, so the
 * sign-in page shows exactly the methods that actually work.
 */
export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "")
        .trim()
        .toLowerCase();
      const password = String(credentials?.password ?? "");
      if (!email || !password) return null;

      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          passwordHash: users.passwordHash,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      // Spend the same time whether or not the address exists, so the response
      // does not disclose which emails are registered.
      if (!user?.passwordHash) {
        await fakeVerifyPassword();
        return null;
      }

      if (!(await verifyPassword(password, user.passwordHash))) return null;

      return { id: user.id, name: user.name, email: user.email, image: user.image };
    },
  }),
];

if (googleEnabled) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Lets someone who signed up with a password later use Google with the
      // same address instead of ending up with two accounts.
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers,
  // The Credentials provider cannot use database sessions — Auth.js only
  // persists sessions for providers that go through the adapter.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
