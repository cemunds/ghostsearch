import { serverSupabaseUser } from "#supabase/server";
import { collectionService } from "~~/server/services/collection";
import { db } from "~~/server/db";
import { GhostService } from "~~/server/services/ghost";
import { collection as collectionTable } from "~~/server/db/schema";
import { eq } from "drizzle-orm";
import consola from "consola";
import { z } from "zod";

const CreateCollectionDTO = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable(),
  ghostUrl: z.url().nonempty(),
  ghostContentApiKey: z.string().min(1, "Content API key is required"),
});

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody(event);

  const collection = CreateCollectionDTO.safeParse(body);
  if (!collection.success) {
    consola.log(collection.error);
    throw createError({ statusCode: 400, statusMessage: "Bad Request" });
  }
  consola.log("Parsed collection request")

  // Validate Ghost CMS configuration if provided
  if (collection.data.ghostUrl && collection.data.ghostContentApiKey) {
    const ghostService = new GhostService({
      url: collection.data.ghostUrl,
      contentApiKey: collection.data.ghostContentApiKey,
      // adminApiKey: collection.data.ghostAdminApiKey,
    });

    consola.log("Validating Ghost Content API key")
    const isValid = await ghostService.validateContentApiKey();
    if (!isValid) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid Ghost Content API key",
      });
    }
    consola.log("Validated Ghost Content API key")
  }

  try {
    consola.log("Creating collection")
    const createdCollection = await collectionService.create(
      db,
      collection.data,
      user.sub,
    );
    consola.log("Created collection")

    return createdCollection;
  } catch (error) {
    consola.error("Failed to create collection:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create collection",
    });
  }
});
