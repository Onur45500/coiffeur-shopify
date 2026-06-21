CREATE UNIQUE INDEX IF NOT EXISTS customers_shopify_customer_id_unique
  ON customers (shopify_customer_id)
  WHERE shopify_customer_id IS NOT NULL;
