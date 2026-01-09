import { serverSupabaseUser } from "#supabase/server";
import { db } from "~~/server/db";
import { GhostService } from "~~/server/services/ghost";
import { collection as collectionTable } from "~~/server/db/schema";
import { eq } from "drizzle-orm";
import consola from "consola";
import { z } from "zod";
import { collectionService } from "~~/server/services/collection";

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

  const { collectionId } = syncParams.data;

  try {
    // Verify collection exists and belongs to user
    const collection = await collectionService.getById(
      db,
      user.sub,
      collectionId,
    );

    if (!collection) {
      throw createError({
        statusCode: 404,
        statusMessage: "Collection not found",
      });
    }

    // Update sync status
    await collectionService.setSyncStatus(db, collectionId, "syncing", null);

    // Create Ghost service and start sync
    const ghostService = await GhostService.create({
      siteUrl: collection.ghostSiteUrl,
      adminUrl: collection.ghostAdminUrl,
      adminApiKey: collection.ghostAdminApiKey,
    });

    // Start sync in background (don't await)
    ghostService
      .syncContent(collectionId)
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
      await db
        .update(collectionTable)
        .set({
          syncStatus: "error",
          syncError: error instanceof Error ? error.message : "Unknown error",
        })
        .where(eq(collectionTable.id, collectionId))
        .catch(consola.error);
    }

    throw createError({
      statusCode:
        error instanceof Error && error.message.includes("Collection not found")
          ? 404
          : 500,
      statusMessage:
        error instanceof Error ? error.message : "Failed to start sync",
    });
  }
});
