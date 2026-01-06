import { serverSupabaseUser } from "#supabase/server";
import { collectionService } from "~~/server/services/collection";
import { db } from "~~/server/db";
import { CreateTypesenseCollection } from "#shared/parsers/collection";
import { GhostService } from "~~/server/services/ghost";
import { collection as collectionTable } from "~~/server/db/schema";
import { eq } from "drizzle-orm";
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

  // Validate Ghost CMS configuration if provided
  if (body.ghostUrl && body.ghostContentApiKey) {
    const ghostService = new GhostService({
      url: body.ghostUrl,
      contentApiKey: body.ghostContentApiKey,
      adminApiKey: body.ghostAdminApiKey,
    });

    const isValid = await ghostService.validateContentApiKey();
    if (!isValid) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid Ghost Content API key"
      });
    }
  }

  try {
    // Create the collection with extended data
    const createdCollection = await collectionService.create(db, collection.data, user.sub);

    // If Ghost CMS data was provided, update the collection with it
    if (body.ghostUrl || body.ghostContentApiKey || body.ghostAdminApiKey) {
      await db.update(collectionTable)
        .set({
          ghostUrl: body.ghostUrl,
          ghostContentApiKey: body.ghostContentApiKey,
          ghostAdminApiKey: body.ghostAdminApiKey,
        })
        .where(eq(collectionTable.id, createdCollection.id));
    }

    return {
      ...createdCollection,
      ghostUrl: body.ghostUrl,
      ghostContentApiKey: body.ghostContentApiKey ? "***" : undefined,
      ghostAdminApiKey: body.ghostAdminApiKey ? "***" : undefined,
    };
  } catch (error) {
    consola.error("Failed to create collection:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create collection"
    });
  }
});
