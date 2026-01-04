import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const user = process.env.DASH_USER;
        const pass = process.env.DASH_PASS;

        const u = credentials?.username?.trim();
        const p = credentials?.password;

        if (!u || !p) return null;

        if (u === user && p === pass) {
          // user object becomes the "session user"
          return { id: "1", name: u };
        }

        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.name = user.name;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.name = token.name as string;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
