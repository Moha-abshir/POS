import { Router } from 'express';
import { MpesaSettingsController } from './mpesa.controller';
import { MpesaCheckoutController } from './mpesa-checkout.controller';
import { authenticate, authorize, requireActiveBusiness } from '../../core/middleware/auth';

const router = Router();

// Only OWNER should be able to manage M-Pesa credentials
router.use(authenticate, requireActiveBusiness, authorize(['OWNER']));

const settingsController = MpesaSettingsController;
router.get('/settings', settingsController.getAccounts);
router.post('/settings', settingsController.createAccount);
router.put('/settings/:id', settingsController.updateAccount);
router.delete('/settings/:id', settingsController.deleteAccount);
router.get('/settings/:id/reveal', settingsController.revealCredentials);
router.patch('/settings/:id/default', settingsController.setDefaultAccount);

import { mpesaCustomerLimiter, mpesaTenantLimiter } from '../../core/middleware/rate-limiter';

// Checkout and Webhook (Does not require OWNER role)
const checkoutRouter = Router();
checkoutRouter.post('/push', authenticate, requireActiveBusiness, mpesaCustomerLimiter, mpesaTenantLimiter, MpesaCheckoutController.initiatePush);
checkoutRouter.get('/status/:id', authenticate, requireActiveBusiness, MpesaCheckoutController.checkStatus);
checkoutRouter.post('/query/:id', authenticate, requireActiveBusiness, mpesaTenantLimiter, MpesaCheckoutController.queryStatus);

// Webhook is public (Safaricom hits this)
const webhookRouter = Router();
webhookRouter.post('/callback', MpesaCheckoutController.handleCallback);

const mainRouter = Router();
mainRouter.use('/webhook', webhookRouter);
mainRouter.use('/checkout', checkoutRouter);
mainRouter.use('/', router);

export default mainRouter;
