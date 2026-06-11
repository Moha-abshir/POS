import re

with open('docs/DATABASE_SCHEMA.md', 'r') as f:
    content = f.read()

# Update Enum
content = content.replace("CREATE TYPE user_role AS ENUM ('OWNER');", "CREATE TYPE user_role AS ENUM ('OWNER', 'CASHIER');")

# Add businesses table
businesses_table = """### `businesses`
```sql
CREATE TABLE businesses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(255) NOT NULL,
  sector            VARCHAR(100),
  phone             VARCHAR(50),
  location          TEXT,
  is_setup_complete BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `users`"""

content = content.replace("### `users`", businesses_table)

# Insert business_id in all tables
tables_with_business_id = [
    'users', 'sessions', 'categories', 'products', 'product_units',
    'suppliers', 'purchases', 'purchase_items', 'customers', 'sales',
    'sale_items', 'payments', 'stock_movements', 'refunds', 'refund_items',
    'damaged_goods', 'audit_logs'
]

for table in tables_with_business_id:
    # Find CREATE TABLE `table` (
    pattern = rf"(CREATE TABLE {table} \(\n\s+id\s+UUID PRIMARY KEY DEFAULT gen_random_uuid\(\),\n)"
    replacement = r"\1  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,\n"
    content = re.sub(pattern, replacement, content)

with open('docs/DATABASE_SCHEMA.md', 'w') as f:
    f.write(content)
