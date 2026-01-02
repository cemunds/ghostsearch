import { serverSupabaseUser } from "#supabase/server";
import { ghostService } from "~~/server/services/ghost";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  return await ghostService.fetchPosts();
});
