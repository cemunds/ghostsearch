import { it, expect } from "vitest";
import { GhostService } from "../../server/services/ghost";

it("should verify a valid Ghost JWT", async () => {
  const jwt =
    "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6ImFkRU03alpoRWNwaFNDMWx5aVIwVDJSODUzM0JZcHctc2x0eEVSeWRlQ3MifQ.eyJzdWIiOiJjaHJpc3RvcGguZW11bmRzQGdtYWlsLmNvbSIsImtpZCI6ImFkRU03alpoRWNwaFNDMWx5aVIwVDJSODUzM0JZcHctc2x0eEVSeWRlQ3MiLCJpYXQiOjE3Njc5Njk0MjYsImV4cCI6MTc2Nzk3MDAyNiwiYXVkIjoiaHR0cHM6Ly9iaW1mbG93LmFwcC9tZW1iZXJzL2FwaSIsImlzcyI6Imh0dHBzOi8vYmltZmxvdy5hcHAvbWVtYmVycy9hcGkifQ.e4IvIWbHBHKjgqqiDREQvIq73a_tWQcOrIm7fMgmYsyu--XbAPkG4AHlQFs8eXFtXXh0pU9HYSVnbqmLVl0arl9PNUjM1ARNIvfxWWv1jzylqRBsrJ7_suBmz8jBNn7JkGwC46nEAzN9Q6sOd3-Z2KJjKwJw4WBefYop2SofQ7g";

  const ghostService = await GhostService.create({
    siteUrl: "https://bimflow.app",
    adminUrl: "https://admin.bimflow.app",
    adminApiKey:
      "69578b195411b50001d51c80:d5c2879fe8f9d91f05ec41f37f07a5dc6383eccb610e54d9a101ef5a532e93bc",
  });

  const member = await ghostService.verifyJWT(jwt, { ignoreExpiration: true });
  // console.log(member)

  expect(member.email).toBe("christoph.emunds@gmail.com");
});

it("should only fetch published posts", async () => {
  const ghostService = await GhostService.create({
    siteUrl: "https://bimflow.app",
    adminUrl: "https://admin.bimflow.app",
    adminApiKey:
      "69578b195411b50001d51c80:d5c2879fe8f9d91f05ec41f37f07a5dc6383eccb610e54d9a101ef5a532e93bc",
  });

  const posts = await ghostService.fetchAllPosts();
  // console.log(posts)

  expect(posts.length).toBeGreaterThan(0);
  expect(posts.filter((p) => p.status !== "published")).toHaveLength(0)
});

it("should only fetch published pages", async () => {
  const ghostService = await GhostService.create({
    siteUrl: "https://bimflow.app",
    adminUrl: "https://admin.bimflow.app",
    adminApiKey:
      "69578b195411b50001d51c80:d5c2879fe8f9d91f05ec41f37f07a5dc6383eccb610e54d9a101ef5a532e93bc",
  });

  const pages = await ghostService.fetchAllPages();
  // console.log(pages)

  expect(pages.length).toBeGreaterThan(0);
  expect(pages.filter((p) => p.status !== "published")).toHaveLength(0)
});

it("should fetch a post by id", async () => {
  const ghostService = await GhostService.create({
    siteUrl: "https://bimflow.app",
    adminUrl: "https://admin.bimflow.app",
    adminApiKey:
      "69578b195411b50001d51c80:d5c2879fe8f9d91f05ec41f37f07a5dc6383eccb610e54d9a101ef5a532e93bc",
  });

  const post = await ghostService.fetchPost("69500f693b02c70001ed6504");

  expect(post.title).toBe("Coming soon");
});

it("should fetch a page by id", async () => {
  const ghostService = await GhostService.create({
    siteUrl: "https://bimflow.app",
    adminUrl: "https://admin.bimflow.app",
    adminApiKey:
      "69578b195411b50001d51c80:d5c2879fe8f9d91f05ec41f37f07a5dc6383eccb610e54d9a101ef5a532e93bc",
  });

  const page = await ghostService.fetchPage("69500f6a3b02c70001ed6506");

  expect(page.slug).toBe("about");
});

it("should fetch a member by id", async () => {
  const ghostService = await GhostService.create({
    siteUrl: "https://bimflow.app",
    adminUrl: "https://admin.bimflow.app",
    adminApiKey:
      "69578b195411b50001d51c80:d5c2879fe8f9d91f05ec41f37f07a5dc6383eccb610e54d9a101ef5a532e93bc",
  });

  const member = await ghostService.fetchMember("6960d4e8ede2490001e8fc12");

  expect(member.email).toBe("christoph.emunds@gmail.com");
});
