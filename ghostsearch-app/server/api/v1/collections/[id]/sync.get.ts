import { serverSupabaseUser } from "#supabase/server";
import { db } from "~~/server/db";
import { collection as collectionTable, syncHistory } from "~~/server/db/schema";
import { eq, desc } from "drizzle-orm";
import consola from "consola";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const collectionId = event.context.params?.id;

  if (!collectionId) {
    throw createError({ statusCode: 400, statusMessage: "Collection ID is required" });
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
        syncStatus: true,
        syncError: true,
        lastSyncAt: true,
        postCount: true,
        pageCount: true,
      },
    });

    if (!collection) {
      throw createError({ statusCode: 404, statusMessage: "Collection not found" });
    }

    // Get latest sync history
    const latestSync = await db.select()
      .from(syncHistory)
      .where(eq(syncHistory.collectionId, collectionId))
      .orderBy(desc(syncHistory.startedAt))
      .limit(1)
      .then(rows => rows[0] || null);

    // Calculate progress if sync is in progress
    let progress = null;
    if (collection.syncStatus === 'syncing' && latestSync?.status === 'started') {
      // In a real implementation, you would track progress in real-time
      // For now, we'll return a placeholder progress
      progress = {
        posts: {
          total: collection.postCount || 0,
          processed: latestSync.postsProcessed || 0,
          success: latestSync.postsSuccess || 0,
          failed: latestSync.postsFailed || 0
        },
        pages: {
          total: collection.pageCount || 0,
          processed: latestSync.pagesProcessed || 0,
          success: latestSync.pagesSuccess || 0,
          failed: latestSync.pagesFailed || 0
        }
      };
    }

    return {
      status: collection.syncStatus,
      progress: progress,
      startedAt: latestSync?.startedAt || null,
      completedAt: latestSync?.completedAt || null,
      error: collection.syncError || null,
      lastSyncAt: collection.lastSyncAt || null,
      postCount: collection.postCount || 0,
      pageCount: collection.pageCount || 0
    };
  } catch (error) {
    consola.error("Failed to get sync status:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to get sync status"
    });
  }
});