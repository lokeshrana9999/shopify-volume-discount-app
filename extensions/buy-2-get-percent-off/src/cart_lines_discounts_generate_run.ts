import {
  RunInput,
  CartLinesDiscountsGenerateRunResult,
  ProductDiscountSelectionStrategy,
} from "../generated/api";

interface DiscountConfig {
  products?: string[];
  minQty?: number;
  percentOff?: number;
}

export function cartLinesDiscountsGenerateRun(
  input: RunInput
): CartLinesDiscountsGenerateRunResult {
  const metafield = input.shop?.metafield;

  if (!metafield?.jsonValue) {
    return { operations: [] };
  }

  const config = metafield.jsonValue as DiscountConfig;

  const products = new Set(config.products || []);
  const minQty = config.minQty ?? 2;
  const percentOff = config.percentOff ?? 0;

  if (!percentOff || products.size === 0) {
    return { operations: [] };
  }

  const candidates: {
    message: string;
    targets: { cartLine: { id: string } }[];
    value: { percentage: { value: number } };
  }[] = [];

  for (const line of input.cart.lines) {
    const merchandise = line.merchandise;
    const productId = merchandise.__typename === 'ProductVariant' 
      ? merchandise.product.id 
      : null;
    const quantity = line.quantity;

    if (!productId) continue;
    if (!products.has(productId)) continue;
    if (quantity < minQty) continue;

    candidates.push({
      message: `Buy ${minQty}, get ${percentOff}% off`,
      targets: [{ cartLine: { id: line.id } }],
      value: {
        percentage: {
          value: percentOff,
        },
      },
    });
  }

  if (candidates.length === 0) {
    return { operations: [] };
  }

  return {
    operations: [
      {
        productDiscountsAdd: {
          selectionStrategy: ProductDiscountSelectionStrategy.All,
          candidates,
        },
      },
    ],
  };
}
