import { Router } from 'express';
import { CatalogController } from './catalog.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();

// Protect all catalog routes
router.use(authenticate);

router.post('/categories', CatalogController.createCategory);
router.get('/categories', CatalogController.getCategories);

router.post('/products', CatalogController.createProduct);
router.get('/products', CatalogController.getProducts);
router.get('/products/:id', CatalogController.getProductDetails);
router.put('/products/:id', CatalogController.updateProduct);
router.patch('/products/:id/status', CatalogController.toggleProductStatus);

router.post('/product-units', CatalogController.createProductUnit);

export default router;
