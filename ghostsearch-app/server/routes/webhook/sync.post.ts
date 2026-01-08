import { z } from "zod";
import { collectionService } from "~~/server/services/collection";
import { db } from "~~/server/db";
import { GhostService, transformPost } from "~~/server/services/ghost";

// Ghost webhook payload schema
const WebhookSchema = z.object({
  post: z.object({
    current: z
      .object({
        id: z.string(),
        title: z.string(),
        slug: z.string(),
        url: z.url(),
        html: z.string(),
        status: z.string(),
        visibility: z.string(),
        updated_at: z.string(),
        published_at: z.string().nullable(),
        excerpt: z.string().nullable(),
        custom_excerpt: z.string().nullable().optional(),
        feature_image: z.string().nullable().optional(),
        tags: z
          .array(
            z.object({
              name: z.string(),
            }),
          )
          .optional(),
        authors: z
          .array(
            z.object({
              name: z.string(),
            }),
          )
          .optional(),
      })
      .optional(),
    previous: z
      .object({
        updated_at: z.string(),
        html: z.string().optional(),
        plaintext: z.string().optional(),
      })
      .optional(),
  }),
});

interface QueryParams {
  secret: string;
  collectionId: string;
}

export default defineEventHandler(async (event) => {
  try {
    // Log request info
    console.log("\n🔔 Incoming webhook request");
    console.log("📝 Method:", event.method);

    const { secret, collectionId } = getQuery<QueryParams>(event);

    // Validate webhook secret
    if (!secret) {
      console.log("❌ No secret provided in request");
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Missing webhook secret" }),
      };
    }

    const collection = await collectionService.getWithSecret(
      db,
      secret,
      collectionId,
    );

    if (!collection) {
      console.log("🚫 Invalid secret provided");
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid webhook secret" }),
      };
    }

    console.log("🔐 Webhook secret validated");

    // Create configuration
    // const config = createDefaultConfig(
    //   env.GHOST_URL,
    //   env.GHOST_CONTENT_API_KEY,
    //   env.TYPESENSE_HOST,
    //   env.TYPESENSE_API_KEY,
    //   env.COLLECTION_NAME
    // );
    console.log("⚙️  Configuration loaded");

    // Initialize manager
    // const manager = new GhostTypesenseManager(config);
    const ghostService = new GhostService({
      url: collection.ghostUrl,
      contentApiKey: collection.ghostContentApiKey,
    });
    console.log("🔄 Typesense manager initialized");

    // Only process POST requests
    if (event.method !== "POST") {
      console.log("⚠️  Invalid HTTP method:", event.method);
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    const body = await readBody(event);

    // Parse and validate webhook payload
    if (!body) {
      console.log("❌ No request body provided");
      throw new Error("No request body");
    }

    const webhook = WebhookSchema.parse(body);
    const { post } = webhook;
    console.log("📦 Webhook payload validated");

    // Handle different webhook events based on post status changes
    if (post.current) {
      const { id, status, visibility, title } = post.current;
      console.log(`📄 Processing post: "${title}" (${id})`);

      if (status === "published" && visibility === "public") {
        console.log("📝 Indexing published post");
        const ghostService = new GhostService({
          url: collection.ghostUrl,
          contentApiKey: collection.ghostContentApiKey,
        });

        const newPost = await ghostService.fetchPost(post.current.id);
        const transformed = transformPost(newPost);
        await collectionService.indexPost(collectionId, transformed);
        console.log("✨ Post indexed successfully");
        return {
          statusCode: 200,
          body: JSON.stringify({ message: "Post indexed in Typesense" }),
        };
      } else {
        console.log("🗑️  Removing unpublished/private post");
        await collectionService.deletePost(collectionId, post.current.id);
        console.log("✨ Post removed successfully");
        return {
          statusCode: 200,
          body: JSON.stringify({ message: "Post removed from Typesense" }),
        };
      }
    }

    console.log("ℹ️  No action required");
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "No action required" }),
    };
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
});
