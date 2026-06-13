import os
import re

base_dir = "/home/moha/.gemini/antigravity/brain/c9cd9980-7fbd-4c40-b0be-c777d80be9f2/.system_generated/worktrees/subagent-Catalog-UI-Refactorer-CatalogAgent-f0f0c450/frontend/src/features/catalog/components"
add_modal = os.path.join(base_dir, "AddProductModal.tsx")
edit_modal = os.path.join(base_dir, "EditProductModal.tsx")

# --- AddProductModal.tsx ---
with open(add_modal, 'r') as f:
    content = f.read()

# 1. Update Category col-span
content = content.replace(
    '<div className="col-span-2">\n              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">\n                Category *',
    '<div className="col-span-2 sm:col-span-1">\n              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">\n                Category *'
)

# 2. Swap Selling Price and Cost Price to be Cost Price then Selling Price, and add Margin
old_prices = """            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                Selling Price (KSH) *
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
<div className="col-span-2 sm:col-span-1">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                Cost Price (KSH) *
              </label>
              <input
                name="costPrice"
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.costPrice}
                onChange={handleChange}
                placeholder="0.00"
                className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
              />
            </div>"""

new_prices = """            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                Cost Price (KSH) *
              </label>
              <input
                name="costPrice"
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.costPrice}
                onChange={handleChange}
                placeholder="0.00"
                className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                Selling Price (KSH) *
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

            {(!isNaN(parseFloat(formData.costPrice)) && !isNaN(parseFloat(formData.sellingPrice))) && (
              <div className={`col-span-2 text-[var(--text-sm)] -mt-2 ${parseFloat(formData.sellingPrice) < parseFloat(formData.costPrice) ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}`}>
                Margin: KSH {(parseFloat(formData.sellingPrice) - parseFloat(formData.costPrice)).toFixed(2)} {
                  parseFloat(formData.costPrice) > 0 
                    ? `(${(((parseFloat(formData.sellingPrice) - parseFloat(formData.costPrice)) / parseFloat(formData.costPrice)) * 100).toFixed(0)}%)`
                    : '(100%)'
                }
              </div>
            )}"""

content = content.replace(old_prices, new_prices)

# 3. Remove Description field
desc_block = """            <div className="col-span-2">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                Description (Optional)
              </label>
              <textarea
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                placeholder="Product details..."
                className="block w-full p-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors resize-none"
              />
            </div>"""

content = content.replace(desc_block, "")

# 4. Disable submit
content = content.replace(
    'disabled={createProduct.isPending || createProductUnit.isPending || !formData.name || !formData.categoryId || !formData.costPrice || !formData.sellingPrice || !formData.unitName}',
    'disabled={createProduct.isPending || createProductUnit.isPending || !formData.name || !formData.categoryId || !formData.costPrice || !formData.sellingPrice || !formData.unitName || (parseFloat(formData.sellingPrice) < parseFloat(formData.costPrice))}'
)

with open(add_modal, 'w') as f:
    f.write(content)
