<script setup lang="ts">
const fetchPosts = async () => {
  const posts = await $fetch("/api/v1/posts");
  console.log(posts);
};
</script>

<template>
  <div>
    <UButton @click="fetchPosts">Fetch Posts</UButton>
    <CollectionList />
  </div>
</template>
