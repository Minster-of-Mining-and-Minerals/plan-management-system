import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldValues, Resolver } from "react-hook-form";
import type { z } from "zod";

/**
 * Bridges Zod v4 input/output inference with react-hook-form's resolver types.
 */
export function createFormResolver<TFieldValues extends FieldValues>(
  schema: z.ZodTypeAny
): Resolver<TFieldValues> {
  return zodResolver(schema as never) as Resolver<TFieldValues>;
}
