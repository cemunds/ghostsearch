<script setup lang="ts">
const { data: collections, refresh } = await useLazyFetch(
  "/api/v1/collections",
);

const collectionName = ref("");

const createCollection = async () => {
  await $fetch("/api/v1/collections", {
    method: "POST",
    body: {
      name: collectionName.value,
    },
  });

  await refresh();
};

const syncCollection = async (collectionId: string) => {
  await $fetch("/api/v1/collections/sync", {
    method: "POST",
    body: {
      collectionId,
    },
  });
};
</script>

<template>
  <div>
    <UInput v-model="collectionName" />
    <UButton @click="createCollection">Create collection</UButton>
    <ul>
      <li v-for="collection in collections" :key="collection.id">
        <span>{{ collection.name }}</span>
        <UButton @click="() => syncCollection(collection.id)">Sync</UButton>
      </li>
    </ul>
  </div>
</template>
