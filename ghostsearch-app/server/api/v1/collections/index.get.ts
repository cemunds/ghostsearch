import { serverSupabaseUser } from "#supabase/server";
import { collectionService } from "~~/server/services/collection";
import { db } from "~~/server/db";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  return await collectionService.getUserCollections(db, user.sub);
});
