import { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";
import { DB } from "../db";
import { collectionRepository } from "../db/repositories/collection";
import Typesense from "typesense";
import { z } from "zod";
import consola from "consola";

export interface Document {
  id: string;
  title: string;
  slug: string;
  url: string;
  html?: string;
  plaintext: string;
  excerpt: string;
  feature_image?: string;
  published_at: number;
  updated_at: number;
  "tags.name"?: string[];
  "tags.slug"?: string[];
  authors?: string[];
  tags?: string[];
  [key: string]: unknown;
}

/**
 * Clean a URL by removing protocol and any trailing slashes
 */
function cleanUrl(url: string): string {
  // Remove protocol (http:// or https://) if present
  const withoutProtocol = url.replace(/^https?:\/\//i, "");
  // Remove trailing slashes
  return withoutProtocol.replace(/\/+$/, "");
}

const TypesenseNodeSchema = z.object({
  host: z.string().transform(cleanUrl),
  port: z.number(),
  protocol: z.enum(["http", "https"]),
  path: z.string().optional(),
});

const TypesenseConfigSchema = z.object({
  // nodes: z.array(TypesenseNodeSchema).min(1),
  // apiKey: z.string().min(1),
  // connectionTimeoutSeconds: z.number().optional(),
  // retryIntervalSeconds: z.number().optional(),
  batchSize: z.number().optional(),
  maxConcurrentBatches: z.number().optional(),
});

const typesenseConfig = TypesenseConfigSchema.parse({
  batchSize: 200,
  maxConcurrentBatches: 12,
});

const typesenseClient = new Typesense.Client({
  nodes: [
    {
      protocol: process.env.TYPESENSE_PROTOCOL!,
      host: process.env.TYPESENSE_HOST!,
      port: parseInt(process.env.TYPESENSE_PORT!),
    },
  ],
  apiKey: process.env.TYPESENSE_ADMIN_KEY!,
  connectionTimeoutSeconds: 30,
});

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const collectionService = {
  getUserCollections: async (
    db: DB,
    userId: string,
  ): Promise<TypesenseCollection[]> => {
    return await collectionRepository.getUserCollections(db, userId);
  },
  getById: async (
    db: DB,
    userId: string,
    collectionId: string,
  ): Promise<TypesenseCollection | null> => {
    return await collectionRepository.getById(db, userId, collectionId);
  },
  getWithWebhookSecret: async (db: DB, webhookSecret: string, collectionId: string) => {
    return await collectionRepository.getWithWebhookSecret(db, webhookSecret, collectionId);
  },
  create: async (
    db: DB,
    payload: CreateTypesenseCollection,
    userId: string,
  ): Promise<TypesenseCollection> => {
    return db.transaction(async (tx) => {
      const uuid = crypto.randomUUID();

      const collectionSchema: CollectionCreateSchema = {
        name: uuid,
        fields: [
          { name: "id", type: "string", optional: false },
          {
            name: "title",
            type: "string",
            index: true,
            sort: true,
            optional: false,
          },
          { name: "url", type: "string", index: true, optional: false },
          { name: "slug", type: "string", index: true, optional: false },
          { name: "html", type: "string", index: true, optional: false },
          { name: "plaintext", type: "string", index: true, optional: false },
          { name: "excerpt", type: "string", index: true, optional: false },
          {
            name: "feature_image",
            type: "string",
            index: false,
            optional: true,
          },
          { name: "published_at", type: "int64", sort: true, optional: false },
          { name: "updated_at", type: "int64", sort: true, optional: false },
          { name: "tags", type: "string[]", facet: true, optional: true },
          {
            name: "tags.name",
            type: "string[]",
            index: true,
            facet: true,
            optional: true,
          },
          {
            name: "tags.slug",
            type: "string[]",
            index: true,
            facet: true,
            optional: true,
          },
          { name: "authors", type: "string[]", facet: true, optional: true },
        ],
        enable_nested_fields: true,
      };

      await typesenseClient.collections().create(collectionSchema);

      const searchKeySchema = await typesenseClient.keys().create({
        description: `Search-only key for ${uuid}`,
        actions: ["documents:search"],
        collections: [uuid],
      });
      const typesenseSearchKey = searchKeySchema.value!;

      const newCollection = await collectionRepository.create(tx, userId, {
        id: uuid,
        typesenseSearchKey,
        ...payload,
      });

      return newCollection;
    });
  },
  update: async (
    db: DB,
    collectionId: string,
    payload: UpdateTypesenseCollection,
  ) => {
    return await collectionRepository.update(db, collectionId, payload);
  },
  delete: async (db: DB, collectionId: string) => {
    const exists = await typesenseClient.collections(collectionId).exists();
    if (!exists) {
      throw createError({
        statusCode: 404,
        statusMessage: "Collection not found",
      });
    }

    await db.transaction(async (tx) => {
      await collectionRepository.delete(db, collectionId);
      await typesenseClient.collections(collectionId).delete();
    });

    return collectionId;
  },
  getSyncHistory: async (db: DB, collectionId: string, limit: number) => {
    return await collectionRepository.getSyncHistory(db, collectionId, limit);
  },
  setSyncStatus: async (
    db: DB,
    collectionId: string,
    syncStatus: string,
    syncError: string | null,
  ) => {
    await collectionRepository.setSyncStatus(
      db,
      collectionId,
      syncStatus,
      syncError,
    );
  },
  indexDocuments: async (collectionId: string, documents: Document[]) => {
    const batchSize = typesenseConfig.batchSize || 200;
    const maxConcurrentBatches = typesenseConfig.maxConcurrentBatches || 12;

    // Split documents into batches
    const batches: Document[][] = [];
    for (let i = 0; i < documents.length; i += batchSize) {
      batches.push(documents.slice(i, i + batchSize));
    }

    console.log(
      `Processing ${documents.length} documents in ${batches.length} batches (batch size: ${batchSize})`,
    );
    const collection = typesenseClient.collections(collectionId);
    let totalSucceeded = 0;
    let totalFailed = 0;
    const failedBatches: Array<{
      batchIndex: number;
      documents: Document[];
      error: string;
    }> = [];

    // Process batches with controlled concurrency
    for (let i = 0; i < batches.length; i += maxConcurrentBatches) {
      const batchGroup = batches.slice(i, i + maxConcurrentBatches);
      const batchPromises = batchGroup.map(async (batch, batchIndex) => {
        const actualBatchIndex = i + batchIndex;
        return processBatchWithRetry(
          collection,
          batch,
          actualBatchIndex,
          batches.length,
        );
      });

      const results = await Promise.allSettled(batchPromises);

      results.forEach((result, batchIndex) => {
        const actualBatchIndex = i + batchIndex;
        if (result.status === "fulfilled") {
          totalSucceeded += result.value.succeeded;
          totalFailed += result.value.failed;
          if (result.value.error) {
            failedBatches.push({
              batchIndex: actualBatchIndex,
              documents: batchGroup[batchIndex]!,
              error: result.value.error,
            });
          }
        } else {
          const batchSize = batchGroup[batchIndex]!.length;
          totalFailed += batchSize;
          failedBatches.push({
            batchIndex: actualBatchIndex,
            documents: batchGroup[batchIndex]!,
            error: result.reason?.message || "Unknown batch error",
          });
        }
      });

      console.log(
        `Progress: ${Math.min(i + maxConcurrentBatches, batches.length)}/${batches.length} batch groups processed`,
      );
    }

    console.log(
      `Indexing complete: ${totalSucceeded} succeeded, ${totalFailed} failed`,
    );

    // Retry failed batches once with smaller batch sizes
    if (failedBatches.length > 0) {
      console.log(
        `Retrying ${failedBatches.length} failed batches with smaller batch size...`,
      );
      const retryResults = await retryFailedBatches(collection, failedBatches);
      totalSucceeded += retryResults.succeeded;
      totalFailed =
        totalFailed - retryResults.retryAttempted + retryResults.failed;

      console.log(
        `Final result: ${totalSucceeded} succeeded, ${totalFailed} failed`,
      );
    }

    if (totalFailed > 0) {
      console.log(
        `⚠️  ${totalFailed} documents failed to index. Consider running sync again or checking server capacity.`,
      );
    }
  },
  indexPost: async (collectionId: string, post: Document): Promise<void> => {
    // const post = await ghostClient.posts
    //   .read({
    //     id: postId,
    //   })
    //   .include({ tags: true, authors: true })
    //   .fetch();

    // if (!post.success) {
    //   throw new Error(`Failed to fetch post ${post.id} from Ghost`);
    // }

    // const document = collectionService.transformPost(post.data);
    const collection = typesenseClient.collections(collectionId);
    await collection.documents().upsert(post);
  },
  deletePost: async (collectionId: string, postId: string) => {
    const collection = typesenseClient.collections(collectionId);
    await collection.documents().delete({ filter_by: `id:${postId}` });
  },
  // clearCollection: async (collectionId: string) => {
  //   const collection = typesenseClient.collections(collectionId);
  //   await collection.delete();

  //   const schema = {
  //     name: collectionId,
  //     fields: this.config.collection.fields.map((field) => ({
  //       name: field.name,
  //       type: field.type,
  //       facet: field.facet,
  //       index: field.index,
  //       optional: field.optional,
  //       sort: field.sort,
  //     })),
  //   };

  //   await typesenseClient.collections().create(schema);
  // },
};

async function processBatchWithRetry(
  collection: any,
  documents: Document[],
  batchIndex: number,
  totalBatches: number,
): Promise<{ succeeded: number; failed: number; error?: string }> {
  const maxRetries = 3;
  let lastError: string = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `Processing batch ${batchIndex + 1}/${totalBatches} (${documents.length} docs) - attempt ${attempt}`,
      );

      const result = await collection.documents().import(documents, {
        action: "upsert",
        batch_size: documents.length,
        return_doc: false,
        return_id: false,
      });

      // Parse bulk import result
      const succeeded = result.filter((r: any) => r.success === true).length;
      const failed = documents.length - succeeded;

      if (failed > 0) {
        console.log(
          `Batch ${batchIndex + 1}: ${succeeded} succeeded, ${failed} failed`,
        );
      }

      return { succeeded, failed };
    } catch (error: any) {
      lastError = error.message || error;

      // Handle HTTP 503 (server overload) with exponential backoff
      if (
        error.httpStatus === 503 ||
        lastError.includes("503") ||
        lastError.includes("Not Ready")
      ) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10s
        console.log(
          `Batch ${batchIndex + 1}: Server overload (503), retrying in ${backoffDelay}ms...`,
        );
        await sleep(backoffDelay);
        continue;
      }

      // Handle timeout errors
      if (lastError.includes("timeout") || lastError.includes("ECONNABORTED")) {
        const backoffDelay = Math.min(2000 * attempt, 8000); // Max 8s for timeouts
        console.log(
          `Batch ${batchIndex + 1}: Timeout error, retrying in ${backoffDelay}ms...`,
        );
        await sleep(backoffDelay);
        continue;
      }

      // For other errors, retry with shorter delay
      if (attempt < maxRetries) {
        const backoffDelay = 1000 * attempt;
        console.log(
          `Batch ${batchIndex + 1}: Error (${lastError}), retrying in ${backoffDelay}ms...`,
        );
        await sleep(backoffDelay);
        continue;
      }
    }
  }

  console.error(
    `Batch ${batchIndex + 1} failed after ${maxRetries} attempts: ${lastError}`,
  );
  return { succeeded: 0, failed: documents.length, error: lastError };
}

async function retryFailedBatches(
  collection: any,
  failedBatches: Array<{
    batchIndex: number;
    documents: Document[];
    error: string;
  }>,
): Promise<{ succeeded: number; failed: number; retryAttempted: number }> {
  let succeeded = 0;
  let failed = 0;
  let retryAttempted = 0;

  for (const failedBatch of failedBatches) {
    retryAttempted += failedBatch.documents.length;

    // Retry with smaller batches (50 docs each)
    const smallBatches: Document[][] = [];
    for (let i = 0; i < failedBatch.documents.length; i += 50) {
      smallBatches.push(failedBatch.documents.slice(i, i + 50));
    }

    for (const smallBatch of smallBatches) {
      try {
        const result = await collection.documents().import(smallBatch, {
          action: "upsert",
          batch_size: smallBatch.length,
          return_doc: false,
          return_id: false,
        });

        const batchSucceeded = result.filter(
          (r: any) => r.success === true,
        ).length;
        succeeded += batchSucceeded;
        failed += smallBatch.length - batchSucceeded;
      } catch (error: any) {
        console.error(`Small batch retry failed: ${error.message || error}`);
        failed += smallBatch.length;
      }

      // Small delay between retry batches
      await sleep(500);
    }
  }

  return { succeeded, failed, retryAttempted };
}
