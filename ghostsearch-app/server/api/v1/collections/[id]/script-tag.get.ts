import { serverSupabaseUser } from "#supabase/server";
import { db } from "~~/server/db";
import { collection as collectionTable } from "~~/server/db/schema";
import { eq } from "drizzle-orm";
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
    // Get collection details
    const collection = await db.query.collection.findFirst({
      where: (collection, { and, eq }) => and(
        eq(collection.id, collectionId),
        eq(collection.userId, user.sub)
      ),
      columns: {
        id: true,
        name: true,
        searchKey: true,
      },
    });

    if (!collection) {
      throw createError({ statusCode: 404, statusMessage: "Collection not found" });
    }

    // Get query parameters
    const query = getQuery(event);
    const theme = query.theme === 'light' || query.theme === 'dark' ? query.theme : 'system';
    const enableHighlighting = query.enableHighlighting !== 'false';
    const enableDidYouMean = query.enableDidYouMean !== 'false';

    // Generate script tag configuration
    const config = {
      typesenseNodes: [
        {
          host: process.env.TYPESENSE_HOST || 'localhost',
          port: 8108,
          protocol: 'http'
        }
      ],
      typesenseApiKey: collection.searchKey,
      collectionName: collection.id,
      theme: theme,
      enableHighlighting: enableHighlighting,
      enableDidYouMean: enableDidYouMean,
      searchFields: {
        title: { weight: 5, highlight: true },
        excerpt: { weight: 3, highlight: true },
        plaintext: { weight: 4, highlight: true },
        'tags.name': { weight: 4, highlight: true },
        'tags.slug': { weight: 3, highlight: true }
      }
    };

    // Generate script tag
    const configJson = JSON.stringify(config, null, 2);
    const scriptTag = `
<!-- GhostSearch Integration -->
<script>
  window.__MP_SEARCH_CONFIG__ = ${configJson};
</script>
<script src="https://cdn.jsdelivr.net/npm/@ghostsearch/ui@latest/dist/search.min.js" defer></script>
<magicpages-search></magicpages-search>
`;

    // Generate integration instructions
    const instructions = `
## GhostSearch Integration Instructions

1. **Copy the script tag below** and paste it into your Ghost theme's default.hbs file, just before the closing </body> tag.

2. **Save your theme** and upload it to your Ghost installation.

3. **Test the search** by visiting your blog and pressing Ctrl+K or clicking the search icon.

4. **Customize the search** (optional):
   - Change the theme by modifying the theme parameter
   - Adjust search behavior with enableHighlighting and enableDidYouMean parameters
   - Customize search fields and weights in the configuration

## Troubleshooting

- Make sure your Typesense server is running and accessible
- Verify that your Ghost blog URL is correctly configured in the collection settings
- Check that your collection has been synced successfully
- Ensure the search script is loaded after your main content
`;

    return {
      scriptTag: scriptTag.trim(),
      integrationInstructions: instructions.trim(),
      config: config
    };
  } catch (error) {
    consola.error("Failed to generate script tag:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to generate script tag"
    });
  }
});