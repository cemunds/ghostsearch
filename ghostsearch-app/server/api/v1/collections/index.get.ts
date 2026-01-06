import { serverSupabaseUser } from "#supabase/server";
import { collectionService } from "~~/server/services/collection";
import { db } from "~~/server/db";
import consola from "consola";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  try {
    const collections = await collectionService.getUserCollections(db, user.sub);

    // Get extended collection data with Ghost CMS info
    const extendedCollections = await Promise.all(collections.map(async (col) => {
      const collectionData = await db.query.collection.findFirst({
        where: (collection, { eq }) => eq(collection.id, col.id),
        columns: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          ghostUrl: true,
          lastSyncAt: true,
          syncStatus: true,
          postCount: true,
          pageCount: true,
        },
      });

      return collectionData;
    }));

    return extendedCollections.filter(Boolean); // Filter out any null values
  } catch (error) {
    consola.error("Failed to fetch collections:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch collections"
    });
  }
});
