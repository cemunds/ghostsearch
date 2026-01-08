import { z } from "zod";

export const TypesenseCollection = z.object({
  id: z.uuid(),
  name: z.string().nonempty(),
  description: z.string().nullable(),
  ghostUrl: z.url().nonempty(),
  ghostContentApiKey: z.string().min(1, "Content API key is required"),
  typesenseSearchKey: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastSyncAt: z.date().nullable(),
  syncStatus: z.string().nullable(),
  syncError: z.string().nullable(),
  postCount: z.number(),
  pageCount: z.number(),
  webhookSecret: z.string(),
});

export const CreateTypesenseCollection = TypesenseCollection.pick({
  name: true,
  description: true,
  ghostUrl: true,
  ghostContentApiKey: true,
  webhookSecret: true,
});

export const UpdateTypesenseCollection = TypesenseCollection.pick({
  name: true,
  description: true,
  ghostContentApiKey: true,
  typesenseSearchKey: true,
}).partial();
