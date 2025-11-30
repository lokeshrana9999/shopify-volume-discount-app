import { useState, useEffect, useCallback } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

// GraphQL query to fetch shop metafield and shop ID
const GET_SHOP_METAFIELD = `#graphql
  query GetShopMetafield($namespace: String!, $key: String!) {
    shop {
      id
      metafield(namespace: $namespace, key: $key) {
        id
        value
      }
    }
  }
`;

// GraphQL mutation to set metafield
const SET_METAFIELD = `#graphql
  mutation SetVolumeDiscount($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id }
      userErrors { field message }
    }
  }
`;

// GraphQL query to fetch product titles by IDs
const GET_PRODUCTS_BY_IDS = `#graphql
  query GetProductsByIds($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        title
      }
    }
  }
`;

interface DiscountConfig {
  products: string[];
  minQty: number;
  percentOff: number;
}

interface LoaderData {
  shopId: string;
  config: DiscountConfig | null;
  selectedProducts: Array<{ id: string; title: string }>;
}

interface ActionData {
  success?: boolean;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // Fetch shop metafield
  const response = await admin.graphql(GET_SHOP_METAFIELD, {
    variables: {
      namespace: "volume_discount",
      key: "rules",
    },
  });

  const responseJson = await response.json();
  const shop = responseJson.data?.shop;
  const metafield = shop?.metafield;

  let config: DiscountConfig | null = null;
  let selectedProducts: Array<{ id: string; title: string }> = [];

  if (metafield?.value) {
    try {
      config = JSON.parse(metafield.value) as DiscountConfig;

      // Fetch product titles for selected products
      if (config.products && config.products.length > 0) {
        const productsResponse = await admin.graphql(GET_PRODUCTS_BY_IDS, {
          variables: {
            ids: config.products,
          },
        });
        const productsJson = await productsResponse.json();
        selectedProducts = (productsJson.data?.nodes || [])
          .filter((node: any) => node !== null)
          .map((node: any) => ({
            id: node.id,
            title: node.title,
          }));
      }
    } catch (e) {
      console.error("Failed to parse metafield value:", e);
    }
  }

  return {
    shopId: shop?.id || "",
    config,
    selectedProducts,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();
  const productsJson = formData.get("products") as string;
  const percentOffStr = formData.get("percentOff") as string;
  const shopId = formData.get("shopId") as string;

  // Parse products
  let products: string[] = [];
  try {
    products = JSON.parse(productsJson || "[]");
  } catch (e) {
    return { error: "Invalid products data" };
  }

  // Validate products
  if (!products || products.length === 0) {
    return { error: "Please select at least one product" };
  }

  // Validate percentOff
  const percentOff = parseInt(percentOffStr, 10);
  if (isNaN(percentOff) || percentOff < 1 || percentOff > 80) {
    return { error: "Percent off must be between 1 and 80" };
  }

  // Build the config
  const config: DiscountConfig = {
    products,
    minQty: 2,
    percentOff,
  };

  // Save to metafield
  const response = await admin.graphql(SET_METAFIELD, {
    variables: {
      metafields: [
        {
          ownerId: shopId,
          namespace: "volume_discount",
          key: "rules",
          type: "json",
          value: JSON.stringify(config),
        },
      ],
    },
  });

  const responseJson = await response.json();
  const userErrors = responseJson.data?.metafieldsSet?.userErrors;

  if (userErrors && userErrors.length > 0) {
    return {
      error: userErrors.map((e: any) => e.message).join(", "),
      errors: userErrors,
    };
  }

  return { success: true };
};

export default function VolumeDiscountPage() {
  const loaderData = useLoaderData<LoaderData>();
  const fetcher = useFetcher<ActionData>();
  const shopify = useAppBridge();

  const [selectedProducts, setSelectedProducts] = useState<
    Array<{ id: string; title: string }>
  >(loaderData.selectedProducts || []);
  const [percentOff, setPercentOff] = useState<string>(
    loaderData.config?.percentOff?.toString() || "10"
  );

  const isSubmitting =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";

  // Show toast on success
  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Volume discount settings saved successfully!");
    }
  }, [fetcher.data?.success, shopify]);

  // Handle product selection using App Bridge resource picker
  const handleSelectProducts = useCallback(async () => {
    try {
      const selected = await shopify.resourcePicker({
        type: "product",
        multiple: true,
        selectionIds: selectedProducts.map((p) => ({ id: p.id })),
      });

      if (selected && selected.length > 0) {
        const products = selected.map((product: any) => ({
          id: product.id,
          title: product.title,
        }));
        setSelectedProducts(products);
      }
    } catch (e) {
      console.error("Resource picker error:", e);
    }
  }, [shopify, selectedProducts]);

  // Remove a product from selection
  const handleRemoveProduct = useCallback((productId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  // Validate percentOff input
  const handlePercentOffChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Allow empty or valid numbers
      if (value === "" || /^\d+$/.test(value)) {
        const num = parseInt(value, 10);
        if (value === "" || (num >= 0 && num <= 100)) {
          setPercentOff(value);
        }
      }
    },
    []
  );

  // Handle save
  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.append("products", JSON.stringify(selectedProducts.map((p) => p.id)));
    formData.append("percentOff", percentOff);
    formData.append("shopId", loaderData.shopId);
    
    fetcher.submit(formData, { method: "POST" });
  }, [fetcher, selectedProducts, percentOff, loaderData.shopId]);

  const percentOffNum = parseInt(percentOff, 10);
  const isPercentOffValid =
    !isNaN(percentOffNum) && percentOffNum >= 1 && percentOffNum <= 80;
  const hasProducts = selectedProducts.length > 0;
  const canSave = hasProducts && isPercentOffValid && !isSubmitting;

  return (
    <s-page heading="Volume Discount Settings">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={handleSave}
        disabled={!canSave}
        {...(isSubmitting ? { loading: true } : {})}
      >
        Save Settings
      </s-button>

      <s-section heading="Buy 2, get X% off configuration">
        <s-paragraph>
          Configure which products are eligible for the volume discount. When
          customers buy 2 or more of these products, they'll receive a
          percentage discount.
        </s-paragraph>

        {/* Error Banner */}
        {fetcher.data?.error && (
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="critical"
            style={{ marginBottom: "16px", marginTop: "16px" }}
          >
            <s-text tone="critical">{fetcher.data.error}</s-text>
          </s-box>
        )}

        {/* Success Banner */}
        {fetcher.data?.success && (
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="success"
            style={{ marginBottom: "16px", marginTop: "16px" }}
          >
            <s-text tone="success">Settings saved successfully!</s-text>
          </s-box>
        )}

        <s-stack direction="block" gap="large">
          {/* Product Selection */}
          <s-box>
            <s-stack direction="block" gap="base">
              <s-heading>Eligible Products</s-heading>
              <s-paragraph>
                Select the products that qualify for the "Buy 2, get X% off"
                discount.
              </s-paragraph>

              <s-button onClick={handleSelectProducts} variant="secondary">
                {selectedProducts.length > 0
                  ? "Change Products"
                  : "Select Products"}
              </s-button>

              {selectedProducts.length > 0 && (
                <s-box
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  background="subdued"
                >
                  <s-stack direction="block" gap="tight">
                    <s-text fontWeight="bold">
                      {selectedProducts.length} product
                      {selectedProducts.length !== 1 ? "s" : ""} selected:
                    </s-text>
                    {selectedProducts.map((product) => (
                      <s-stack
                        key={product.id}
                        direction="inline"
                        gap="base"
                        align="center"
                      >
                        <s-text>{product.title}</s-text>
                        <s-button
                          variant="tertiary"
                          tone="critical"
                          onClick={() => handleRemoveProduct(product.id)}
                        >
                          Remove
                        </s-button>
                      </s-stack>
                    ))}
                  </s-stack>
                </s-box>
              )}

              {!hasProducts && (
                <s-text tone="subdued">No products selected</s-text>
              )}
            </s-stack>
          </s-box>

          {/* Percent Off Input */}
          <s-box>
            <s-stack direction="block" gap="base">
              <s-heading>Discount Percentage</s-heading>
              <s-paragraph>
                Enter the percentage discount (1-80%) to apply when customers
                buy 2 or more eligible products.
              </s-paragraph>

              <s-stack direction="inline" gap="base" align="center">
                <input
                  type="number"
                  name="percentOff"
                  value={percentOff}
                  onChange={handlePercentOffChange}
                  min="1"
                  max="80"
                  style={{
                    padding: "8px 12px",
                    fontSize: "14px",
                    borderRadius: "4px",
                    border: `1px solid ${isPercentOffValid || percentOff === "" ? "#ccc" : "#d82c0d"}`,
                    width: "100px",
                  }}
                />
                <s-text>% off</s-text>
              </s-stack>

              {!isPercentOffValid && percentOff !== "" && (
                <s-text tone="critical">
                  Please enter a value between 1 and 80
                </s-text>
              )}
            </s-stack>
          </s-box>

          {/* Minimum Quantity (informational) */}
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="subdued"
          >
            <s-stack direction="inline" gap="base">
              <s-text fontWeight="bold">Minimum Quantity:</s-text>
              <s-text>2 items (fixed)</s-text>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      {/* Sidebar with instructions */}
      <s-section slot="aside" heading="How it works">
        <s-unordered-list>
          <s-list-item>
            Select the products eligible for the volume discount
          </s-list-item>
          <s-list-item>Set the discount percentage (1-80%)</s-list-item>
          <s-list-item>
            Customers who add 2+ eligible items to cart get the discount
          </s-list-item>
          <s-list-item>
            The discount is applied automatically at checkout
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section slot="aside" heading="Current Configuration">
        {loaderData.config ? (
          <s-stack direction="block" gap="tight">
            <s-text>
              <strong>Products:</strong> {loaderData.config.products.length}
            </s-text>
            <s-text>
              <strong>Min Qty:</strong> {loaderData.config.minQty}
            </s-text>
            <s-text>
              <strong>Discount:</strong> {loaderData.config.percentOff}% off
            </s-text>
          </s-stack>
        ) : (
          <s-text tone="subdued">No configuration saved yet</s-text>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

