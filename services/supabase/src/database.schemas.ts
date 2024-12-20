// Generated by ts-to-zod
import { z } from "zod";

export const eventsRowSchema = z.object({
  created_at: z.string(),
  description: z.string(),
  ends_at: z.string(),
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  start_at: z.string(),
  thumbnail: z.string().nullable(),
  videos: z.array(z.number()).nullable(),
});

export const eventsInsertSchema = z.object({
  created_at: z.string().optional(),
  description: z.string(),
  ends_at: z.string(),
  id: z.number().optional(),
  name: z.string(),
  slug: z.string(),
  start_at: z.string(),
  thumbnail: z.string().optional().nullable(),
  videos: z.array(z.number()).optional().nullable(),
});

export const eventsUpdateSchema = z.object({
  created_at: z.string().optional(),
  description: z.string().optional(),
  ends_at: z.string().optional(),
  id: z.number().optional(),
  name: z.string().optional(),
  slug: z.string().optional(),
  start_at: z.string().optional(),
  thumbnail: z.string().optional().nullable(),
  videos: z.array(z.number()).optional().nullable(),
});

export const eventsRelationshipsSchema = z.tuple([]);

export const streamsRowSchema = z.object({
  created_at: z.string(),
  event_id: z.number(),
  id: z.string(),
  status: z.string().nullable(),
  user_id: z.string(),
});

export const streamsInsertSchema = z.object({
  created_at: z.string().optional(),
  event_id: z.number(),
  id: z.string().optional(),
  status: z.string().optional().nullable(),
  user_id: z.string(),
});

export const streamsUpdateSchema = z.object({
  created_at: z.string().optional(),
  event_id: z.number().optional(),
  id: z.string().optional(),
  status: z.string().optional().nullable(),
  user_id: z.string().optional(),
});

export const streamsRelationshipsSchema = z.tuple([
  z.object({
    foreignKeyName: z.literal("streams_event_id_fkey"),
    columns: z.tuple([z.literal("event_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("events"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);

export const tagsRowSchema = z.object({
  label: z.string(),
  value: z.number(),
});

export const tagsInsertSchema = z.object({
  label: z.string(),
  value: z.number().optional(),
});

export const tagsUpdateSchema = z.object({
  label: z.string().optional(),
  value: z.number().optional(),
});

export const tagsRelationshipsSchema = z.tuple([]);

export const usersEventsRowSchema = z.object({
  event_id: z.number(),
  user_id: z.string(),
});

export const usersEventsInsertSchema = z.object({
  event_id: z.number(),
  user_id: z.string(),
});

export const usersEventsUpdateSchema = z.object({
  event_id: z.number().optional(),
  user_id: z.string().optional(),
});

export const usersEventsRelationshipsSchema = z.tuple([
  z.object({
    foreignKeyName: z.literal("users_events_event_id_fkey"),
    columns: z.tuple([z.literal("event_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("events"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);

export const videosRowSchema = z.object({
  created_at: z.string(),
  description: z.string().nullable(),
  event_id: z.number(),
  id: z.number(),
  loves: z.array(z.string()).nullable(),
  source: z.string(),
  tags_id: z.array(z.number()),
  user_id: z.string(),
  username: z.string().nullable(),
  views: z.array(z.string()).nullable(),
});

export const videosInsertSchema = z.object({
  created_at: z.string().optional(),
  description: z.string().optional().nullable(),
  event_id: z.number(),
  id: z.number().optional(),
  loves: z.array(z.string()).optional().nullable(),
  source: z.string(),
  tags_id: z.array(z.number()),
  user_id: z.string(),
  username: z.string().optional().nullable(),
  views: z.array(z.string()).optional().nullable(),
});

export const videosUpdateSchema = z.object({
  created_at: z.string().optional(),
  description: z.string().optional().nullable(),
  event_id: z.number().optional(),
  id: z.number().optional(),
  loves: z.array(z.string()).optional().nullable(),
  source: z.string().optional(),
  tags_id: z.array(z.number()).optional(),
  user_id: z.string().optional(),
  username: z.string().optional().nullable(),
  views: z.array(z.string()).optional().nullable(),
});

export const videosRelationshipsSchema = z.tuple([
  z.object({
    foreignKeyName: z.literal("videos_event_id_fkey"),
    columns: z.tuple([z.literal("event_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("events"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
