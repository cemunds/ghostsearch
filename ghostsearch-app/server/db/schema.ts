import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";

// User Profile Table
export const profile = pgTable("profile", {
  userId: uuid("user_id").primaryKey(),
  // Profile extension fields (not provided by Supabase Auth)
  fullName: text("full_name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Additional profile fields
  bio: text("bio"),
  jobTitle: text("job_title"),
});

// Collection Table
export const collection = pgTable("collection", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  typesenseSearchKey: text("search_key").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profile.userId, { onDelete: "cascade" }),
  ghostUrl: text("ghost_url").notNull(),
  ghostContentApiKey: text("ghost_content_api_key").notNull(),
  webhookSecret: text("webhook_secret").notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  syncStatus: text("sync_status").default("idle"),
  syncError: text("sync_error"),
  postCount: integer("post_count").notNull().default(0),
  pageCount: integer("page_count").notNull().default(0),
});

// Sync History Table
export const syncHistory = pgTable("sync_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionId: uuid("collection_id")
    .notNull()
    .references(() => collection.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  postsProcessed: integer("posts_processed").default(0),
  pagesProcessed: integer("pages_processed").default(0),
  postsSuccess: integer("posts_success").default(0),
  postsFailed: integer("posts_failed").default(0),
  pagesSuccess: integer("pages_success").default(0),
  pagesFailed: integer("pages_failed").default(0),
});

// Webhook Events Table
export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionId: uuid("collection_id")
    .notNull()
    .references(() => collection.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  eventData: text("event_data").notNull(),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
});
