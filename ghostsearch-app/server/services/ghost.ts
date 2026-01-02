import { TSGhostContentAPI } from "@ts-ghost/content-api";
import consola from "consola";

const GhostAPIConfig = {
  url: "https://admin.bimflow.app",
  key: "270d63026ccd4bf0ee62fcf7d2",
};

const ghostClient = new TSGhostContentAPI(
  GhostAPIConfig.url,
  GhostAPIConfig.key,
  "v5.0" as const,
);

export const ghostService = {
  fetchPosts: async () => {
    const posts = ghostClient.posts
      .browse({ limit: 15 })
      .include({ tags: true, authors: true });

    let response: Awaited<ReturnType<typeof posts.fetch>>;
    try {
      response = await posts.fetch();
    } catch (error) {
      consola.log(error);
      throw createError({});
    }

    if (!response.success) {
      throw createError({});
    }

    consola.log(response.data);
    return response.data;

    //     let allPosts: GhostPost[] = [];

    // const posts = this.ghost.posts
    //   .browse({
    //     limit: 15 // Default limit in Ghost
    //   })
    //   .include({ tags: true, authors: true });

    // let response;
    // try {
    //   response = await posts.fetch();
    // } catch (fetchError: any) {
    //   // Network or connection error
    //   if (fetchError.code === 'ECONNREFUSED') {
    //     throw new Error(`Cannot connect to Ghost at ${this.config.ghost.url} - is Ghost running?`);
    //   }
    //   throw new Error(`Failed to connect to Ghost: ${fetchError.message || fetchError}`);
    // }

    // if (!response.success) {
    //   // API response error (401, 404, etc)
    //   const errors = response.errors || [];
    //   const errorMessage = errors.map((e: any) => e.message || e).join(', ');

    //   if (errors.some((e: any) => e.code === 'UNKNOWN_CONTENT_API_KEY')) {
    //     throw new Error(`Invalid Ghost API key: ${errorMessage}`);
    //   }

    //   throw new Error(`Ghost API error: ${errorMessage || 'Unknown error'}`);
    // }

    // allPosts = allPosts.concat(response.data);

    // // Get total number of posts and calculate pages
    // const total = response.meta.pagination.total;
    // const limit = response.meta.pagination.limit as number;
    // const totalPages = Math.ceil(total / limit);

    // // Fetch remaining pages
    // for (let page = 2; page <= totalPages; page++) {
    //   const pageResponse = await this.ghost.posts
    //     .browse({
    //       limit,
    //       page
    //     })
    //     .include({ tags: true, authors: true })
    //     .fetch();

    //   if (!pageResponse.success) {
    //     throw new Error(`Failed to fetch page ${page} from Ghost`);
    //   }

    //   allPosts = allPosts.concat(pageResponse.data);
    // }

    // console.log(`Found ${allPosts.length} posts to index`);
    // const documents = allPosts.map((post) => this.transformPost(post));
  },
};
