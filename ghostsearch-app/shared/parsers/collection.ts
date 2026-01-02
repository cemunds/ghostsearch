import { z } from "zod";

export const TypesenseCollection = z.object({
  id: z.uuid(),
  name: z.string().nonempty(),
  adminKey: z.string().nonempty(),
  searchKey: z.string().nonempty(),
});

export const CreateTypesenseCollection = TypesenseCollection.pick({
  id: true,
  name: true,
  adminKey: true,
  searchKey: true,
});

export const UpdateTypesenseCollection = TypesenseCollection.pick({
  name: true,
}).partial();
