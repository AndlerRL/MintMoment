import { useServerSession } from "@/lib/hooks/use-session.server";
import { createClient } from "@/lib/supabase/server";
import NextAuth, { NextAuthOptions } from "next-auth";
import FacebookProvider from "next-auth/providers/facebook";
import InstagramProvider from "next-auth/providers/instagram";
import TwitterProvider from "next-auth/providers/twitter";

declare module "next-auth" {
  interface Session {
    user: {
      facebook?: {
        name?: string;
        email?: string;
        picture?: string;
        access_token?: string;
        expires_at?: number;
      };
      twitter?: {
        name?: string;
        email?: string;
        picture?: string;
        access_token?: string;
        expires_at?: number;
      };
      instagram?: {
        name?: string;
        email?: string;
        picture?: string;
        access_token?: string;
        expires_at?: number;
      };
    };
  }
}

const options: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "",
  providers: [
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID || "",
      clientSecret: process.env.TWITTER_CLIENT_SECRET || "",
      version: "2.0",
    }),
    InstagramProvider({
      clientId: process.env.INSTAGRAM_CLIENT_ID || "",
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || "",
      authorization:
        "https://api.instagram.com/oauth/authorize?scope=user_profile,user_media",
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      const supabase = await createClient();
      const { session } = await useServerSession();
      const userMetadata = session?.user_metadata;

      if (account) {
        const providers = (token as any).providers || {};
        providers[account.provider] = {
          name: token.name,
          picture: token.picture,
          access_token: account.access_token,
          refresh_token: (account as any).refresh_token,
          expires_at: account.expires_at,
          scope: (account as any).scope,
          providerAccountId: (account as any).providerAccountId,
          profile,
        };
        (token as any).providers = providers;

        if (userMetadata) {
          const meta = { ...userMetadata };
          meta[account.provider] = {
            name: token.name,
            picture: token.picture,
            providerAccountId: (account as any).providerAccountId,
          };
          await supabase.auth.updateUser({ data: meta });
        }
      }

      return token;
    },
    async session({ session, token }) {
      const providers = (token as any).providers || {};
      (session as any).social = {};
      for (const key of Object.keys(providers)) {
        (session as any).social[key] = {
          name: providers[key]?.name,
          picture: providers[key]?.picture,
          access_token: providers[key]?.access_token,
          expires_at: providers[key]?.expires_at,
        };
      }
      return session;
    },
  },
};

const handler = await NextAuth(options);

export { handler as GET, handler as POST };

// ? Shouldn't this be POST instead? 🤔
// export async function GET(req: NextRequest, res: NextResponse): Promise<NextResponse> {
//   const url = new URL(req.url);

//   if (url.pathname === "/api/auth/callback/instagram") {
//     const { session } = await useServerSession();
//     if (!session) {
//       /* Prevent user creation for instagram access token */
//       const signInUrl = new URL("/?modal=sign-in", req.url);
//       return NextResponse.redirect(signInUrl);
//     }

//      /* Intercept the fetch request to patch access_token request to be oauth compliant */
//     global.fetch = instagramFetchInterceptor(originalFetch);
//     const response = await GET(req, res);
//     global.fetch = originalFetch;
//     return response;
//   }

//   return await handler(req, res) as NextResponse;
// }
