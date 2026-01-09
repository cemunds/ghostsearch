import { and, desc, eq } from "drizzle-orm";
import { Queryable } from "..";
import { collection, syncHistory } from "../schema";

export const collectionRepository = {
  getUserCollections: async (
    db: Queryable,
    userId: string,
  ): Promise<TypesenseCollection[]> => {
    const userCollections = await db
      .select({
        id: collection.id,
        name: collection.name,
        description: collection.description,
        ghostSiteUrl: collection.ghostSiteUrl,
        ghostAdminUrl: collection.ghostAdminUrl,
        ghostAdminApiKey: collection.ghostAdminApiKey,
        typesenseSearchKey: collection.typesenseSearchKey,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
        lastSyncAt: collection.lastSyncAt,
        syncStatus: collection.syncStatus,
        syncError: collection.syncError,
        postCount: collection.postCount,
        pageCount: collection.pageCount,
        webhookSecret: collection.webhookSecret,
      })
      .from(collection)
      .where(eq(collection.userId, userId));

    return userCollections;
  },
  getById: async (
    db: Queryable,
    userId: string,
    collectionId: string,
  ): Promise<TypesenseCollection | null> => {
    const userCollection = await db
      .select({
        id: collection.id,
        name: collection.name,
        description: collection.description,
        ghostSiteUrl: collection.ghostSiteUrl,
        ghostAdminUrl: collection.ghostAdminUrl,
        ghostAdminApiKey: collection.ghostAdminApiKey,
        typesenseSearchKey: collection.typesenseSearchKey,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
        lastSyncAt: collection.lastSyncAt,
        syncStatus: collection.syncStatus,
        syncError: collection.syncError,
        postCount: collection.postCount,
        pageCount: collection.pageCount,
        webhookSecret: collection.webhookSecret,
      })
      .from(collection)
      .where(
        and(eq(collection.userId, userId), eq(collection.id, collectionId)),
      )
      .limit(1);

    return userCollection.at(0) ?? null;
  },
  getWithWebhookSecret: async (
    db: Queryable,
    webhookSecret: string,
    collectionId: string,
  ): Promise<TypesenseCollection | null> => {
    const userCollection = await db
      .select({
        id: collection.id,
        name: collection.name,
        description: collection.description,
        ghostSiteUrl: collection.ghostSiteUrl,
        ghostAdminUrl: collection.ghostAdminUrl,
        ghostAdminApiKey: collection.ghostAdminApiKey,
        typesenseSearchKey: collection.typesenseSearchKey,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
        lastSyncAt: collection.lastSyncAt,
        syncStatus: collection.syncStatus,
        syncError: collection.syncError,
        postCount: collection.postCount,
        pageCount: collection.pageCount,
        webhookSecret: collection.webhookSecret,
      })
      .from(collection)
      .where(
        and(
          eq(collection.webhookSecret, webhookSecret),
          eq(collection.id, collectionId),
        ),
      )
      .limit(1);

    return userCollection.at(0) ?? null;
  },
  create: async (
    db: Queryable,
    userId: string,
    payload: CreateTypesenseCollection & {
      id: string;
      typesenseSearchKey: string;
    },
  ): Promise<TypesenseCollection> => {
    const createdCollection = await db
      .insert(collection)
      .values({ ...payload, userId })
      .returning({
        id: collection.id,
        name: collection.name,
        description: collection.description,
        ghostSiteUrl: collection.ghostSiteUrl,
        ghostAdminUrl: collection.ghostAdminUrl,
        ghostAdminApiKey: collection.ghostAdminApiKey,
        typesenseSearchKey: collection.typesenseSearchKey,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
        lastSyncAt: collection.lastSyncAt,
        syncStatus: collection.syncStatus,
        syncError: collection.syncError,
        postCount: collection.postCount,
        pageCount: collection.pageCount,
        webhookSecret: collection.webhookSecret,
      });

    return createdCollection[0];
  },
  update: async (
    db: Queryable,
    collectionId: string,
    payload: UpdateTypesenseCollection,
  ): Promise<TypesenseCollection> => {
    const updatedCollection = await db
      .update(collection)
      .set(payload)
      .where(eq(collection.id, collectionId))
      .returning({
        id: collection.id,
        name: collection.name,
        description: collection.description,
        ghostSiteUrl: collection.ghostSiteUrl,
        ghostAdminUrl: collection.ghostAdminUrl,
        ghostAdminApiKey: collection.ghostAdminApiKey,
        typesenseSearchKey: collection.typesenseSearchKey,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
        lastSyncAt: collection.lastSyncAt,
        syncStatus: collection.syncStatus,
        syncError: collection.syncError,
        postCount: collection.postCount,
        pageCount: collection.pageCount,
        webhookSecret: collection.webhookSecret,
      });

    return updatedCollection[0];
  },
  delete: async (db: Queryable, collectionId: string) => {
    await db.delete(collection).where(eq(collection.id, collectionId));
  },
  getSyncHistory: async (
    db: Queryable,
    collectionId: string,
    limit: number,
  ) => {
    return await db
      .select()
      .from(syncHistory)
      .where(eq(syncHistory.collectionId, collectionId))
      .orderBy(desc(syncHistory.startedAt))
      .limit(limit);
  },
  setSyncStatus: async (
    db: Queryable,
    collectionId: string,
    syncStatus: string,
    syncError: string | null,
  ) => {
    // TODO: Set lastSyncAt
    await db
      .update(collection)
      .set({ syncStatus, syncError })
      .where(eq(collection.id, collectionId));
  },
};
