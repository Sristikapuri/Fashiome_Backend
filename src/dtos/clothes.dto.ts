import { z } from "zod";

export const ClothesSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum([
    "tops",
    "bottoms",
    "shoes",
    "accessories",
    "dresses",
    "outerwear",
    "shirts",
    "sweaters",
    "pants",
    "skirts",
    "activewear",
  ], {
    message: "Category is required",
  }),
  size: z.string().min(1, "Size is required"),
  color: z.string().min(1, "Color is required"),
  price: z.number().min(0, "Price must be zero or more"),
  discountedPrice: z.number().min(0, "Discounted price must be zero or more").nullable().optional(),
  stock: z.number().int().min(0, "Stock must be zero or more"),
  imageUrl: z.string().default(""),
  description: z.string().default(""),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const ClothesCreateDTO = ClothesSchema;
export type ClothesCreateDTOType = z.infer<typeof ClothesCreateDTO>;

export const ClothesUpdateDTO = ClothesSchema.partial();
export type ClothesUpdateDTOType = z.infer<typeof ClothesUpdateDTO>;
