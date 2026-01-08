import { TSGhostContentAPI } from "@ts-ghost/content-api";
import consola from "consola";
import { createError } from "h3";
import { collectionService, Document } from "./collection";
import { db } from "../db";
import { collectionRepository } from "../db/repositories/collection";
import { syncHistory, collection } from "../db/schema";
import { eq } from "drizzle-orm";
import { Post } from "@ts-ghost/content-api";

interface GhostServiceConfig {
  url: string;
  contentApiKey: string;
  adminApiKey?: string;
}

export class GhostService {
  private config: GhostServiceConfig;
  private contentClient: TSGhostContentAPI;

  constructor(config: GhostServiceConfig) {
    this.config = config;
    this.contentClient = new TSGhostContentAPI(
      config.url,
      config.contentApiKey,
      "v5.0" as const,
    );
  }

  /**
   * Validate Ghost Content API key by making a test request
   */
  async validateContentApiKey(): Promise<boolean> {
    try {
      const response = await this.contentClient.posts
        .browse({ limit: 1 })
        .fetch();

      return response.success;
    } catch (error: any) {
      consola.error("Ghost API validation failed:", error.message);
      return false;
    }
  }

  /**
   * Fetch all posts with pagination
   */
  async fetchAllPosts(): Promise<any[]> {
    let allPosts: any[] = [];
    let page = 1;
    let hasMore = true;

    try {
      while (hasMore) {
        const response = await this.contentClient.posts
          .browse({
            limit: 15,
            page,
          })
          .include({ tags: true, authors: true })
          .fetch();

        if (!response.success) {
          const errors = response.errors || [];
          const errorMessage = errors
            .map((e: any) => e.message || e)
            .join(", ");
          throw new Error(
            `Ghost API error: ${errorMessage || "Unknown error"}`,
          );
        }

        allPosts = allPosts.concat(response.data);

        const total = response.meta.pagination.total;
        const limit = response.meta.pagination.limit as number;
        const totalPages = Math.ceil(total / limit);

        hasMore = page < totalPages;
        page++;
      }

      consola.success(`Fetched ${allPosts.length} posts from Ghost`);
      return allPosts;
    } catch (error: any) {
      consola.error("Failed to fetch posts:", error.message);
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }
  }

  /**
   * Fetch all pages with pagination
   */
  async fetchAllPages(): Promise<any[]> {
    let allPages: any[] = [];
    let page = 1;
    let hasMore = true;

    try {
      while (hasMore) {
        const response = await this.contentClient.pages
          .browse({
            limit: 15,
            page,
          })
          .include({ tags: true, authors: true })
          .fetch();

        if (!response.success) {
          const errors = response.errors || [];
          const errorMessage = errors
            .map((e: any) => e.message || e)
            .join(", ");
          throw new Error(
            `Ghost API error: ${errorMessage || "Unknown error"}`,
          );
        }

        allPages = allPages.concat(response.data);

        const total = response.meta.pagination.total;
        const limit = response.meta.pagination.limit as number;
        const totalPages = Math.ceil(total / limit);

        hasMore = page < totalPages;
        page++;
      }

      consola.success(`Fetched ${allPages.length} pages from Ghost`);
      return allPages;
    } catch (error: any) {
      consola.error("Failed to fetch pages:", error.message);
      throw new Error(`Failed to fetch pages: ${error.message}`);
    }
  }

  async fetchPost(postId: string) {
    const post = await this.contentClient.posts
      .read({
        id: postId,
      })
      .include({ tags: true, authors: true })
      .fetch();

    if (!post.success) {
      throw new Error(`Failed to fetch post ${postId} from Ghost`);
    }

    return post.data;
  }

  async fetchPage(pageId: string) {
    const page = await this.contentClient.pages
      .read({
        id: pageId,
      })
      .include({ tags: true, authors: true })
      .fetch();

    if (!page.success) {
      throw new Error(`Failed to fetch page ${pageId} from Ghost`);
    }

    return page.data;
  }

  /**
   * Sync all content from Ghost to Typesense
   */
  async syncContent(collectionId: string): Promise<void> {
    try {
      // Start sync record
      const syncRecord = await db
        .insert(syncHistory)
        .values({
          collectionId,
          status: "started",
        })
        .returning();

      const syncId = syncRecord[0].id;

      // Fetch all posts and pages
      const [posts, pages] = await Promise.all([
        this.fetchAllPosts(),
        this.fetchAllPages(),
      ]);

      // Transform and index posts
      const postDocuments = posts.map((post: any) => transformPost(post));

      // Transform and index pages
      const pageDocuments = pages.map((page: any) => {
        const pageWithType = { ...page, type: "page" };
        return transformPost(pageWithType);
      });

      // Index all documents
      const allDocuments = [...postDocuments, ...pageDocuments];
      await collectionService.indexDocuments(collectionId, allDocuments);

      await collectionService.setSyncStatus(
        db,
        collectionId,
        "completed",
        null,
      );

      // Complete sync record
      await db
        .update(syncHistory)
        .set({
          status: "completed",
          completedAt: new Date(),
          postsProcessed: posts.length,
          pagesProcessed: pages.length,
          postsSuccess: posts.length,
          pagesSuccess: pages.length,
        })
        .where(eq(syncHistory.id, syncId));

      consola.success("Content sync completed successfully");
    } catch (error: any) {
      consola.error("Content sync failed:", error.message);

      await collectionService.setSyncStatus(
        db,
        collectionId,
        "error",
        error.message,
      );

      throw new Error(`Content sync failed: ${error.message}`);
    }
  }

  /**
   * Handle webhook event from Ghost
   */
  async handleWebhookEvent(event: any, collectionId: string): Promise<void> {
    try {
      consola.log("Processing webhook event:", event.event);

      switch (event.event) {
        case "post.published":
        case "post.updated":
          await collectionService.indexPost(collectionId, event.data.post.id);
          break;

        case "post.unpublished":
        case "post.deleted":
          await collectionService.deletePost(collectionId, event.data.post.id);
          break;

        case "page.published":
        case "page.updated":
          // Pages use the same indexPost method since they have the same structure
          await collectionService.indexPost(collectionId, event.data.page.id);
          break;

        case "page.unpublished":
        case "page.deleted":
          // Pages use the same deletePost method
          await collectionService.deletePost(collectionId, event.data.page.id);
          break;

        default:
          consola.warn("Unknown webhook event:", event.event);
      }

      consola.success("Webhook event processed successfully");
    } catch (error: any) {
      consola.error("Failed to process webhook event:", error.message);
      throw new Error(`Failed to process webhook event: ${error.message}`);
    }
  }

  /**
   * Get Ghost site information
   */
  async getSiteInfo(): Promise<any> {
    try {
      // Use settings endpoint as an alternative to site endpoint
      const response = await this.contentClient.settings.fetch();

      if (!response.success) {
        const errors = response.errors || [];
        const errorMessage = errors.map((e: any) => e.message || e).join(", ");
        throw new Error(
          `Failed to get site info: ${errorMessage || "Unknown error"}`,
        );
      }

      return response.data;
    } catch (error: any) {
      consola.error("Failed to get site info:", error.message);
      throw new Error(`Failed to get site info: ${error.message}`);
    }
  }
}

type IndexedPostFields = Pick<
  Post,
  | "id"
  | "title"
  | "plaintext"
  | "html"
  | "slug"
  | "url"
  | "excerpt"
  | "published_at"
  | "updated_at"
  | "feature_image"
  | "tags"
  | "authors"
>;

export function transformPost(post: IndexedPostFields): Document {
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

  const transformed: Document = {
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
}
