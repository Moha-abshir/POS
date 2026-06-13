import os
import re

base_dir = "/home/moha/.gemini/antigravity/brain/c9cd9980-7fbd-4c40-b0be-c777d80be9f2/.system_generated/worktrees/subagent-Catalog-UI-Refactorer-CatalogAgent-f0f0c450/frontend/src/features/catalog/components"
edit_modal = os.path.join(base_dir, "EditProductModal.tsx")

with open(edit_modal, 'r') as f:
    content = f.read()

# Update state initialization
content = content.replace("""  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    description: '',
    costPrice: '',
    lowStockThreshold: '',
  });""", """  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    unitName: '',
    costPrice: '',
    sellingPrice: '',
    baseStockQuantity: '',
    lowStockThreshold: '',
  });""")

content = content.replace("""      setFormData({
        name: product.name || '',
        categoryId: product.categoryId || '',
        description: product.description || '',
        costPrice: product.costPrice ? product.costPrice.toString() : '',
        lowStockThreshold: product.lowStockThreshold ? product.lowStockThreshold.toString() : '0',
      });""", """      setFormData({
        name: product.name || '',
        categoryId: product.categoryId || '',
        unitName: '', // Edit doesn't have this currently
        costPrice: product.costPrice ? product.costPrice.toString() : '',
        sellingPrice: '', // Edit doesn't have this currently
        baseStockQuantity: product.baseStockQuantity ? product.baseStockQuantity.toString() : '0',
        lowStockThreshold: product.lowStockThreshold ? product.lowStockThreshold.toString() : '0',
      });""")

# Grid replacement
grid_pattern = re.compile(r'<div className="grid grid-cols-2 gap-4 mb-4">.*?</div>\s*\{errorMsg', re.DOTALL)

new_grid = """<div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                Product Name *
              </label>
              <input
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Dewalt Cordless Drill"
                className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                Category *
              </label>
              <select
                name="categoryId"
                required
                value={formData.categoryId}
                onChange={handleChange}
                className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
              >
                <option value="" disabled>Select a category</option>
                {categories?.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                Base Unit Name
              </label>
              <input
                name="unitName"
                type="text"
                value={formData.unitName}
                onChange={handleChange}
                placeholder="e.g., Piece, Box"
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
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                Selling Price (KSH)
              </label>
              <input
                name="sellingPrice"
                type="number"
                min="0"
                step="0.01"
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
            )}

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                Initial Stock
              </label>
              <input
                name="baseStockQuantity"
                type="number"
                min="0"
                value={formData.baseStockQuantity}
                onChange={handleChange}
                placeholder="0"
                className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                Low Stock Alert Threshold *
              </label>
              <input
                name="lowStockThreshold"
                type="number"
                min="0"
                required
                value={formData.lowStockThreshold}
                onChange={handleChange}
                placeholder="10"
                className="block w-full h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
              />
            </div>
          </div>
          
          {errorMsg"""

content = grid_pattern.sub(new_grid, content)

# Disable submit logic
old_submit = "disabled={updateProduct.isPending || !formData.name || !formData.categoryId || !formData.costPrice}"
new_submit = "disabled={updateProduct.isPending || !formData.name || !formData.categoryId || !formData.costPrice || (formData.sellingPrice && parseFloat(formData.sellingPrice) < parseFloat(formData.costPrice))}"

content = content.replace(old_submit, new_submit)

with open(edit_modal, 'w') as f:
    f.write(content)
