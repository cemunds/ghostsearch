import { serverSupabaseUser } from "#supabase/server";
import { db } from "~~/server/db";
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
  const { collectionId, fullSync = true } = body;

  if (!collectionId) {
    throw createError({ statusCode: 400, statusMessage: "collectionId is required" });
  }

  try {
    // Verify collection exists and belongs to user
    const collection = await db.query.collection.findFirst({
      where: (collection, { and, eq }) => and(
        eq(collection.id, collectionId),
        eq(collection.userId, user.sub)
      ),
      columns: {
        id: true,
        ghostUrl: true,
        ghostContentApiKey: true,
        ghostAdminApiKey: true,
      },
    });

    if (!collection) {
      throw createError({ statusCode: 404, statusMessage: "Collection not found" });
    }

    if (!collection.ghostUrl || !collection.ghostContentApiKey) {
      throw createError({
        statusCode: 400,
        statusMessage: "Collection is not configured with Ghost CMS"
      });
    }

    // Update sync status
    await db.update(collectionTable)
      .set({
        syncStatus: "syncing",
        syncError: null,
      })
      .where(eq(collectionTable.id, collectionId));

    // Create Ghost service and start sync
    const ghostService = new GhostService({
      url: collection.ghostUrl,
      contentApiKey: collection.ghostContentApiKey,
      adminApiKey: collection.ghostAdminApiKey || undefined,
    });

    // Start sync in background (don't await)
    ghostService.syncContent(collectionId)
      .then(() => {
        consola.success(`Sync completed for collection ${collectionId}`);
      })
      .catch((error) => {
        consola.error(`Sync failed for collection ${collectionId}:`, error);
      });

    return {
      syncId: collectionId,
      status: "queued",
      collectionId,
      startedAt: new Date().toISOString(),
    };
  } catch (error) {
    consola.error("Failed to start sync:", error);

    // Update sync status to error
    if (collectionId) {
      await db.update(collectionTable)
        .set({
          syncStatus: "error",
          syncError: error instanceof Error ? error.message : "Unknown error",
        })
        .where(eq(collectionTable.id, collectionId))
        .catch(consola.error);
    }

    throw createError({
      statusCode: error instanceof Error && error.message.includes("Collection not found") ? 404 : 500,
      statusMessage: error instanceof Error ? error.message : "Failed to start sync"
    });
  }
});
