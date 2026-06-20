import { Router } from 'express';
import { MpesaSettingsController } from './mpesa.controller';
import { MpesaCheckoutController } from './mpesa-checkout.controller';
import { authenticate, authorize } from '../../core/middleware/auth';

const router = Router();

// Only OWNER should be able to manage M-Pesa credentials
router.use(authenticate, authorize(['OWNER']));

router.get('/settings', MpesaSettingsController.getAccounts);
router.post('/settings', MpesaSettingsController.createAccount);
router.put('/settings/:id', MpesaSettingsController.updateAccount);
router.delete('/settings/:id', MpesaSettingsController.deleteAccount);
router.get('/settings/:id/reveal', MpesaSettingsController.revealCredentials);
router.patch('/settings/:id/default', MpesaSettingsController.setDefaultAccount);

// Checkout and Webhook (Does not require OWNER role)
const checkoutRouter = Router();
checkoutRouter.post('/push', authenticate, MpesaCheckoutController.initiatePush);
checkoutRouter.get('/status/:id', authenticate, MpesaCheckoutController.checkStatus);
checkoutRouter.post('/query/:id', authenticate, MpesaCheckoutController.queryStatus);

// Webhook is public (Safaricom hits this)
const webhookRouter = Router();
webhookRouter.post('/callback', MpesaCheckoutController.handleCallback);

const mainRouter = Router();
mainRouter.use('/webhook', webhookRouter);
mainRouter.use('/checkout', checkoutRouter);
mainRouter.use('/', router);

export default mainRouter;
