import re

with open('frontend/src/features/catalog/components/AddProductModal.tsx', 'r') as f:
    content = f.read()

# Imports
content = content.replace(
    "import { useCategories, useCreateProduct } from '../api/catalog.api';",
    "import { useCategories, useCreateProduct, useCreateProductUnit } from '../api/catalog.api';"
)

# Initial State
content = content.replace(
    """  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    costPrice: '',
    baseStockQuantity: '',
    lowStockThreshold: '',
    description: '',
  });""",
    """  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    costPrice: '',
    baseStockQuantity: '',
    lowStockThreshold: '',
    description: '',
    unitName: 'Piece',
    sellingPrice: '',
  });"""
)

# Mutate Async for Unit
content = content.replace(
    "const createProduct = useCreateProduct();",
    "const createProduct = useCreateProduct();\n  const createProductUnit = useCreateProductUnit();"
)

# Form Submit
submit_find = """    try {
      await createProduct.mutateAsync({
        name: formData.name,
        categoryId: formData.categoryId,
        description: formData.description || undefined,
        costPrice: Number(formData.costPrice),
        baseStockQuantity: Number(formData.baseStockQuantity),
        lowStockThreshold: Number(formData.lowStockThreshold),
      });
      onClose();"""

submit_replace = """    try {
      const response = await createProduct.mutateAsync({
        name: formData.name,
        categoryId: formData.categoryId,
        description: formData.description || undefined,
        costPrice: Number(formData.costPrice),
        baseStockQuantity: Number(formData.baseStockQuantity),
        lowStockThreshold: Number(formData.lowStockThreshold),
      });
      
      if (response?.data?.id && formData.unitName && formData.sellingPrice) {
        await createProductUnit.mutateAsync({
          productId: response.data.id,
          name: formData.unitName,
          sellingPrice: Number(formData.sellingPrice),
          isDefault: true,
          conversionFactor: 1
        });
      }
      onClose();"""

content = content.replace(submit_find, submit_replace)

# UI additions
ui_addition = """            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                Base Unit Name *
              </label>
              <input
                name="unitName"
                type="text"
                required
                value={formData.unitName}
                onChange={handleChange}
                placeholder="e.g., Piece, Box"
                className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                Selling Price ($) *
              </label>
              <input
                name="sellingPrice"
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.sellingPrice}
                onChange={handleChange}
                placeholder="0.00"
                className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
              />
            </div>
"""

# Insert before cost price
content = content.replace(
    '            <div className="col-span-2 sm:col-span-1">\n              <label className="block text-[var(--text-sm)] font-medium text-[va\nr(--color-text-secondary)] mb-1">\n                Cost Price ($) *',
    ui_addition + '\n            <div className="col-span-2 sm:col-span-1">\n              <label className="block text-[var(--text-sm)] font-medium text-[va\nr(--color-text-secondary)] mb-1">\n                Cost Price ($) *'
)
# Wait, my replacement has newlines but maybe formatting is broken. I'll use regex.

content = re.sub(
    r'(<div className="col-span-2 sm:col-span-1">\s*<label className="block text-\[var\(--text-sm\)\] font-medium text-\[var\(--color-text-secondary\)\] mb-1">\s*Cost Price \(\$\) \*)',
    ui_addition + r'\1',
    content
)

# Fix loading and disable condition
content = content.replace(
    'disabled={createProduct.isPending || !formData.name || !formData.categoryId || !formData.costPrice}',
    'disabled={createProduct.isPending || createProductUnit.isPending || !formData.name || !formData.categoryId || !formData.costPrice || !formData.sellingPrice || !formData.unitName}'
)

with open('frontend/src/features/catalog/components/AddProductModal.tsx', 'w') as f:
    f.write(content)
