import { relations } from "drizzle-orm";
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

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
  adminKey: text("admin_key").notNull(),
  searchKey: text("search_key").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profile.userId, { onDelete: "cascade" }),
});

// Relationships
// export const userProfileRelations = relations(profile, ({ many }) => ({
//   collections: many(collection),
// }));
