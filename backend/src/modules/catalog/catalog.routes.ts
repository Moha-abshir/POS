import { Router } from 'express';
import { CatalogController } from './catalog.controller';
import { authenticate, authorize } from '../../core/middleware/auth';
import { cacheMiddleware } from '../../core/middleware/cache';

const router = Router();

// Protect all catalog routes
router.use(authenticate);

router.post('/categories', authorize(['OWNER', 'MANAGER']), CatalogController.createCategory);
router.get('/categories', CatalogController.getCategories);

router.post('/products', authorize(['OWNER', 'MANAGER']), CatalogController.createProduct);
router.get('/products', cacheMiddleware(600), CatalogController.getProducts);
router.get('/products/:id', CatalogController.getProductDetails);
router.patch('/products/:id', authorize(['OWNER', 'MANAGER']), CatalogController.updateProduct);

router.post('/products/:id/variants', authorize(['OWNER', 'MANAGER']), CatalogController.createVariant);
router.patch('/products/:id/variants/:variantId', authorize(['OWNER', 'MANAGER']), CatalogController.updateVariant);
router.post('/products/:id/variants/:variantId/units', authorize(['OWNER', 'MANAGER']), CatalogController.createVariantUnit);
router.patch('/products/:id/variants/:variantId/units/:unitId', authorize(['OWNER', 'MANAGER']), CatalogController.updateVariantUnit);

export default router;
