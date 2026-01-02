import { serverSupabaseUser } from "#supabase/server";
import { collectionService } from "~~/server/services/collection";
import { db } from "~~/server/db";
import { CreateTypesenseCollection } from "#shared/parsers/collection";
import consola from "consola";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody(event);

  const collection = CreateTypesenseCollection.safeParse(body);
  if (!collection.success) {
    consola.log(collection.error);
    throw createError({ statusCode: 400, statusMessage: "Bad Request" });
  }

  return await collectionService.create(db, collection.data, user.sub);
});
