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
router.patch('/settings/:id/default', MpesaSettingsController.setDefaultAccount);

// Checkout and Webhook (Does not require OWNER role)
const checkoutRouter = Router();
checkoutRouter.post('/push', authenticate, MpesaCheckoutController.initiatePush);
checkoutRouter.get('/status/:id', authenticate, MpesaCheckoutController.checkStatus);

// Webhook is public (Safaricom hits this)
const webhookRouter = Router();
webhookRouter.post('/callback', MpesaCheckoutController.handleCallback);

const mainRouter = Router();
mainRouter.use('/', router);
mainRouter.use('/checkout', checkoutRouter);
mainRouter.use('/webhook', webhookRouter);

export default mainRouter;
