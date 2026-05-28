import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { PlatformRole } from "@/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      platformRole: PlatformRole;
      organizationId?: string;
      orgRole?: PlatformRole;
    };
  }

  interface User {
    platformRole: PlatformRole;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          platformRole: user.platformRole,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.platformRole = user.platformRole;
      }

      if (token.id) {
        const membership = await db.organizationMember.findFirst({
          where: { userId: token.id as string, isActive: true },
          orderBy: { joinedAt: "asc" },
        });
        if (membership) {
          token.organizationId = membership.organizationId;
          token.orgRole = membership.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.platformRole = token.platformRole as PlatformRole;
        session.user.organizationId = token.organizationId as string | undefined;
        session.user.orgRole = token.orgRole as PlatformRole | undefined;
      }
      return session;
    },
  },
});

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}
