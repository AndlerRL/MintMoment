import { useSession } from "@supabase/auth-helpers-react";
import { useSession as useSocialSession } from "next-auth/react";

export function useClientSession() {
  const session = useSession();
  const socialSession = useSocialSession() as { data: { social?: { [key in 'twitter' | 'facebook' | 'instagram']?: any } } };

  if (socialSession.data?.social && session?.user) {
    const socialMediaKeys = ['twitter', 'facebook', 'instagram'] as const;

    socialMediaKeys.forEach((key) => {
      if (!session.user.user_metadata[key] && socialSession.data.social?.[key]) {
        session.user.user_metadata[key] = {
          ...socialSession.data.social[key],
        };
      }
    });
  }

  return {
    session: session?.user,
    socialSession,
  }
}
