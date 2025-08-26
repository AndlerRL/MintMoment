'use client';

import { LoginComponent } from "@/components/pages/sign-in/login";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { AuthPageProps } from "@/types/auth";
import { useSession } from "@supabase/auth-helpers-react";

export default function Login({ searchParams }: AuthPageProps) {
  const query = searchParams;
  const session = useSession();

  return (
    <Dialog open={!session?.user?.id}>
      <DialogContent>
        <h1>Login from the dialog!</h1>
        <LoginComponent searchParams={query as any} />
      </DialogContent>
    </Dialog>
  );
}
