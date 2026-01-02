import { eq } from "drizzle-orm";
import { Queryable } from "..";
import { collection } from "../schema";

export const collectionRepository = {
  getUserCollections: async (
    db: Queryable,
    userId: string,
  ): Promise<TypesenseCollection[]> => {
    const userCollections = await db
      .select({
        id: collection.id,
        name: collection.name,
      })
      .from(collection)
      .where(eq(collection.userId, userId));

    return userCollections;
  },
  create: async (
    db: Queryable,
    userId: string,
    payload: CreateTypesenseCollection,
  ): Promise<TypesenseCollection> => {
    const createdCollection = await db
      .insert(collection)
      .values({ ...payload, userId })
      .returning({
        id: collection.id,
        name: collection.name,
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
      });

    return updatedCollection[0];
  },
  delete: async (db: Queryable, collectionId: string) => {
    await db.delete(collection).where(eq(collection.id, collectionId));
  },
};
