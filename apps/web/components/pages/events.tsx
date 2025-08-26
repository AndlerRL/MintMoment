"use client";

import { EnlistNewEvent } from "@/components/enlist-new-event";
import { XitterIcon } from "@/components/icons/xitter-icon";
import { RootLayoutComponent } from "@/components/shared/root-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useClientSession } from "@/lib/hooks/use-session.client";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { getAllEvents, getUserEventsData } from "@/services/supabase-client.service";
import type { SupaTypes } from "@services/supabase";
import omit from "lodash.omit";
import { AtSignIcon, FacebookIcon, InstagramIcon, UserCircleIcon } from "lucide-react";
import { signIn } from 'next-auth/react';
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAsync } from "react-use";
import { toast } from "sonner";

export function EventsPageComponent({
  events,
}: { events: SupaTypes.Tables<"events">[] }) {
  return (
    <RootLayoutComponent className="top-4 h-full">
      <EventsComponent events={events} />
    </RootLayoutComponent>
  );
}

function EventsComponent({
  events,
}: {
  events: SupaTypes.Tables<"events">[]
}) {
  const supabase = createClient();
  const { session, socialSession } = useClientSession()

  const {
    value: allEvents,
    error: allEventsError,
    loading: allEventsLoading,
  } = useAsync(async () => await getAllEvents(), []);
  const [userEvents, setUserEvents] = useState<SupaTypes.Tables<"events">[]>(events);

  const usersEventsSubscription = supabase
    .channel("custom-filter-channel")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "users_events",
        filter: `user_id=eq.${session?.id}`,
      },
      async (payload) => {
        // console.log("Change received!", payload);
        if (payload.eventType === 'INSERT' && userEvents) {
          const newEvent = await getUserEventsData([payload.new.event_id]);

          setUserEvents([...newEvent, ...userEvents]);
        }
      },
    )
    .subscribe();


  const userData =
    Object.keys(
      omit(session?.user_metadata, [
        "avatar",
        "sub",
        "avatar",
        "phone_verified",
        "email_verified",
      ]),
    );

  if (!userData.includes('instagram')) {
    userData.push("instagram");
  }
  if (!userData.includes('facebook')) {
    userData.push("facebook");
  }
  if (!userData.includes('twitter')) {
    userData.push("twitter");
  }

  useEffect(() => {
    return () => {
      usersEventsSubscription.unsubscribe();
    };
  }, [])

  const connectSocialMedia = async (provider: 'twitter' | 'facebook' | 'instagram') => {
    signIn(provider);

    switch (provider) {
      case 'twitter':
        toast.info('Connecting Twitter Coming Soon! 🏗️');
        break;
      case 'facebook':
        toast.info('Connecting Facebook Coming Soon! 🏗️');
        break;
      case 'instagram':
        toast.info('Connecting Instagram Coming Soon! 🏗️');
        break;
      default:
        console.error('Invalid Social Media.');
        break;
    }
  };

  const socialIcons = {
    twitter: <XitterIcon className="size-5" />,
    instagram: <InstagramIcon className="size-6" />,
    facebook: <FacebookIcon className="size-6" />,
  };
  const userInfoIcons = {
    twitter: <XitterIcon className="size-4 p-[0.1rem]" />,
    instagram: <InstagramIcon className="size-4" />,
    facebook: <FacebookIcon className="size-4" />,
    email: <AtSignIcon className="size-4" />,
    username: <UserCircleIcon className="size-4" />,
  };

  const availableUserData = userData.filter((key) => session && key in session.user_metadata);
  const unavailableUserData = userData.filter((key) => !(session && key in session.user_metadata));
  const expiredSocialSessionData = userData.filter(key => !key.match(/(username|email)/g)).filter((key) => !(socialSession.data?.social && key in (socialSession.data as any).social));

  return (
    <ScrollArea className="flex-1 w-full flex flex-col gap-12 px-4">
      <div className="flex flex-col gap-2 items-start pt-10">
        <Card className="flex flex-col items-start justify-center relative w-full pr-44">
          <CardHeader>
            <CardTitle className="font-bold text-2xl mb-4">
              Your Presence
            </CardTitle>
            <Avatar className="size-40 absolute top-3 bg-muted bottom-0 right-4 border-2">
              <AvatarImage
                src={session?.user_metadata.avatar}
                alt={session?.email || "User Avatar"}
              />
              <AvatarFallback>
                {session?.user_metadata.username?.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          </CardHeader>
          <CardContent>
            <ul>
              {availableUserData
                .map((key) => {
                  return !key.match(/(facebook|instagram|twitter)/g) ? (
                    <li key={key} className="flex items-center gap-2">
                      <span className="font-bold">{userInfoIcons[key as keyof typeof userInfoIcons]}</span>
                      <span>{session?.user_metadata[key]}</span>
                    </li>
                  ) : (
                    <li key={key} className={cn("transition-all flex items-center gap-2", { 'opacity-30': expiredSocialSessionData.includes(key) })}>
                      <span className="font-bold">{userInfoIcons[key as keyof typeof userInfoIcons]}</span>
                      <span>{session?.user_metadata[key].name}{expiredSocialSessionData.includes(key) ? " (session exp.)" : ""}</span>
                    </li>
                  );
                })}
              <div className="flex gap-4 my-2.5">
                {unavailableUserData
                  .map((key) => {
                    return (
                      <li key={key} className="flex gap-2">
                        <span
                          className={cn(
                            buttonVariants({ variant: "ghost" }),
                            "opacity-50 p-0 size-6",
                          )}
                        >
                          <span className="sr-only">{key}</span>
                          {userInfoIcons[key as keyof typeof userInfoIcons]}
                        </span>
                      </li>
                    );
                  })}
              </div>
            </ul>
            {expiredSocialSessionData.length && (
              <div className="w-full flex flex-col gap-2 mt-12 mb-4">
                <h3 className="font-semibold w-full text-lg">
                  {/* Connect your media for instant sharing! */}
                  Connect your social media for instant share!
                </h3>
                <div className="flex items-center gap-4 justify-start w-full">
                  {expiredSocialSessionData.map((key) => (
                    <Button
                      key={key}
                      variant="ghost"
                      size="icon"
                      className="flex items-center gap-2"
                      onClick={() => connectSocialMedia(key as 'twitter' | 'facebook' | 'instagram')}
                    >
                      <span className="sr-only">{key}</span>
                      {socialIcons[key as keyof typeof socialIcons]}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <h2 className="font-bold text-3xl mt-16 mb-8">Enlisted Events</h2>
      <ul className="w-full flex flex-col gap-10 items-center h-max">
        {userEvents?.map((event) => {
          const isEventReady = new Date(event.start_at).getDate() < Date.now();
          const isEventOver =
            !isEventReady && new Date(event.ends_at).getDate() < Date.now();
          const isEventComing = new Date(event.start_at).getDate() > Date.now();

          return (
            <li key={event.id} className="w-full">
              <Card>
                <CardHeader className="relative p-0 min-h-[320px]">
                  <Image
                    src={event.thumbnail as string}
                    alt={event.name}
                    style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
                    className="relative z-0 w-full max-h-[320px] object-cover rounded-lg"
                    fill
                  />
                </CardHeader>
                <CardContent className="flex flex-col gap-5 mt-6">
                  <CardTitle>
                    {event.name}
                  </CardTitle>
                  <CardDescription>
                    {event.description}
                  </CardDescription>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-auto mt-4">
                    <Link href={`/events/${event.slug}`}>
                      {isEventReady && "Go to Event"}
                      {isEventOver && "Watch Replay"}
                      {isEventComing && "Coming Soon"}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </li>
          );
        })}
        <li className="w-full flex flex-col items-center gap-4 mt-auto px-4 py-16 border-t border-foreground/30">
          <EnlistNewEvent events={allEvents as SupaTypes.Tables<"events">[]} />
        </li>
      </ul>
    </ScrollArea>
  );
}
