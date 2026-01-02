import { serverSupabaseUser } from "#supabase/server";
import { collectionService } from "~~/server/services/collection";
import { db } from "~~/server/db";
import { z } from "zod";
import { ghostService } from "~~/server/services/ghost";
import consola from "consola";

const SyncParams = z.object({
  collectionId: z.uuid(),
});

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody(event);

  const syncParams = SyncParams.safeParse(body);
  if (!syncParams.success) {
    consola.log(syncParams.error);
    throw createError({ statusCode: 400, statusMessage: "Bad Request" });
  }

  const posts = await ghostService.fetchPosts();
  const transformedPosts = posts;
  await collectionService.indexDocuments(
    syncParams.data.collectionId,
    transformedPosts,
  );
});
