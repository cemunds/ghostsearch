import { Post as GhostPost } from "@ts-ghost/content-api";
import { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";
import { DB } from "../db";
import { collectionRepository } from "../db/repositories/collection";
import Typesense from "typesense";
import { z } from "zod";

export interface Post {
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
      host: process.env.TYPESENSE_HOST!,
      port: 8108,
      protocol: process.env.VERCEL_ENV === "production" ? "https" : "http",
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
          // { name: "id", type: "string", index: true },
          { name: "title", type: "string", index: true, sort: true },
          { name: "slug", type: "string", index: true },
          { name: "html", type: "string", index: true },
          { name: "plaintext", type: "string", index: true },
          { name: "excerpt", type: "string", index: true },
          {
            name: "feature_image",
            type: "string",
            index: false,
            optional: true,
          },
          { name: "published_at", type: "int64", sort: true },
          { name: "updated_at", type: "int64", sort: true },
          { name: "tags", type: "string[]", facet: true, optional: true },
          { name: "authors", type: "string[]", facet: true, optional: true },
        ],
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
    await collectionRepository.delete(db, collectionId);
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
  indexDocuments: async (collectionId: string, documents: Post[]) => { },
  transformPost: (post: GhostPost): Post => {
    console.log("Transforming post:", post.id, post.title);

    // Ensure we have plaintext content
    let plaintext = post.plaintext || "";

    // Always try to enhance/improve plaintext extraction from HTML
    // even if plaintext already exists
    if (post.html) {
      // Use a more comprehensive approach to extract text including from links and special formatting
      // First remove script and style tags
      let cleanHtml = post.html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

      // Extract text from anchor tags to preserve linked text
      cleanHtml = cleanHtml.replace(/<a[^>]*>([^<]*)<\/a>/gi, " $1 ");

      // Extract text from other formatting tags (strong, em, b, i, etc.)
      cleanHtml = cleanHtml.replace(
        /<(strong|b|em|i|mark|span)[^>]*>([^<]*)<\/(strong|b|em|i|mark|span)>/gi,
        " $2 ",
      );

      // Remove all remaining HTML tags
      cleanHtml = cleanHtml.replace(/<[^>]*>/g, " ");

      // Handle common HTML entities
      cleanHtml = cleanHtml
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&[a-z]+;/gi, " "); // Replace any remaining entities

      // Normalize whitespace and trim
      cleanHtml = cleanHtml.replace(/\s+/g, " ").trim();

      // If we didn't have plaintext or if our extracted text is more comprehensive, use it
      if (!plaintext || cleanHtml.length > plaintext.length) {
        plaintext = cleanHtml;
      }
    }

    const transformed: Post = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      url: post.url, //|| `${this.config.ghost.url}/${post.slug}/`,
      html: post.html || "",
      plaintext: plaintext,
      excerpt: post.excerpt || "",
      published_at: new Date(post.published_at || Date.now()).getTime(),
      updated_at: new Date(post.updated_at || Date.now()).getTime(),
    };

    if (post.feature_image) {
      transformed.feature_image = post.feature_image;
    }

    const tags = post.tags;
    if (tags && Array.isArray(tags) && tags.length > 0) {
      // Use dot notation for nested tag fields
      transformed["tags.name"] = tags.map((tag: { name: string }) => tag.name);
      transformed["tags.slug"] = tags.map((tag: { slug: string }) => tag.slug);

      // Add the standard tags field that Typesense expects as string[]
      transformed.tags = tags.map((tag: { name: string }) => tag.name);
    }

    const authors = post.authors;
    if (authors && Array.isArray(authors) && authors.length > 0) {
      transformed.authors = authors.map(
        (author: { name: string }) => author.name,
      );
    }

    // Add any additional fields specified in the config
    // Only add fields that haven't already been transformed to avoid overriding custom transformations
    // this.config.collection.fields.forEach((field) => {
    //   const value = post[field.name as keyof GhostPost];
    //   if (!(field.name in transformed) && value !== undefined && value !== null) {
    //     transformed[field.name] = value;
    //   }
    // });

    console.log("Transformed document:", transformed);
    return transformed;
  },
  indexDocumentsBatched: async (collectionId: string, documents: Post[]) => {
    const batchSize = typesenseConfig.batchSize || 200;
    const maxConcurrentBatches = typesenseConfig.maxConcurrentBatches || 12;

    // Split documents into batches
    const batches: Post[][] = [];
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
      documents: Post[];
      error: string;
    }> = [];

    // Process batches with controlled concurrency
    for (let i = 0; i < batches.length; i += maxConcurrentBatches) {
      const batchGroup = batches.slice(i, i + maxConcurrentBatches);
      const batchPromises = batchGroup.map(async (batch, batchIndex) => {
        const actualBatchIndex = i + batchIndex;
        return collectionService.processBatchWithRetry(
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
      const retryResults = await collectionService.retryFailedBatches(
        collection,
        failedBatches,
      );
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
  processBatchWithRetry: async (
    collection: any,
    documents: Post[],
    batchIndex: number,
    totalBatches: number,
  ): Promise<{ succeeded: number; failed: number; error?: string }> => {
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
        if (
          lastError.includes("timeout") ||
          lastError.includes("ECONNABORTED")
        ) {
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
  },
  retryFailedBatches: async (
    collection: any,
    failedBatches: Array<{
      batchIndex: number;
      documents: Post[];
      error: string;
    }>,
  ): Promise<{ succeeded: number; failed: number; retryAttempted: number }> => {
    let succeeded = 0;
    let failed = 0;
    let retryAttempted = 0;

    for (const failedBatch of failedBatches) {
      retryAttempted += failedBatch.documents.length;

      // Retry with smaller batches (50 docs each)
      const smallBatches: Post[][] = [];
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
  },
  indexPost: async (collectionId: string, postId: string): Promise<void> => {
    const post = await ghostClient.posts
      .read({
        id: postId,
      })
      .include({ tags: true, authors: true })
      .fetch();

    if (!post.success) {
      throw new Error(`Failed to fetch post ${postId} from Ghost`);
    }

    const document = collectionService.transformPost(post.data);
    const collection = typesenseClient.collections(collectionId);
    await collection.documents().upsert(document);
  },
  deletePost: async (collectionId: string, postId: string) => {
    const collection = typesenseClient.collections(collectionId);
    await collection.documents().delete({ filter_by: `id:${postId}` });
  },
  clearCollection: async (collectionId: string) => {
    const collection = typesenseClient.collections(collectionId);
    await collection.delete();

    const schema = {
      name: collectionId,
      fields: this.config.collection.fields.map((field) => ({
        name: field.name,
        type: field.type,
        facet: field.facet,
        index: field.index,
        optional: field.optional,
        sort: field.sort,
      })),
    };

    await typesenseClient.collections().create(schema);
  },
};
