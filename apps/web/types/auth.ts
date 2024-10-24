import type { Maybe } from "@/types/helpers";

export interface AuthPageProps {
  searchParams?: Promise<
    {
      email?: string;
      token?: string;
      redirect_to?: string;
    } & Maybe<Message>
  >;
}

export type Message =
  | { success: string }
  | { error: string }
  | { message: string };
