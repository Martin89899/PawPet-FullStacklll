const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Servicio para integración con Stripe
 */
class StripeService {
  /**
   * Crear Payment Intent para pago
   */
  async createPaymentIntent(paymentData) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: paymentData.amount,
        currency: paymentData.currency || 'usd',
        metadata: paymentData.metadata || {},
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error) {
      throw new Error(`Error creating Stripe payment intent: ${error.message}`);
    }
  }

  /**
   * Confirmar Payment Intent
   */
  async confirmPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      throw new Error(`Error confirming Stripe payment intent: ${error.message}`);
    }
  }

  /**
   * Cancelar Payment Intent
   */
  async cancelPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      throw new Error(`Error cancelling Stripe payment intent: ${error.message}`);
    }
  }

  /**
   * Obtener Payment Intent por ID
   */
  async getPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      throw new Error(`Error retrieving Stripe payment intent: ${error.message}`);
    }
  }

  /**
   * Crear Customer
   */
  async createCustomer(customerData) {
    try {
      const customer = await stripe.customers.create({
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone,
        metadata: customerData.metadata || {},
      });

      return customer;
    } catch (error) {
      throw new Error(`Error creating Stripe customer: ${error.message}`);
    }
  }

  /**
   * Obtener Customer por ID
   */
  async getCustomer(customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      return customer;
    } catch (error) {
      throw new Error(`Error retrieving Stripe customer: ${error.message}`);
    }
  }

  /**
   * Crear Charge (para pagos directos)
   */
  async createCharge(chargeData) {
    try {
      const charge = await stripe.charges.create({
        amount: chargeData.amount,
        currency: chargeData.currency || 'usd',
        source: chargeData.source,
        description: chargeData.description,
        metadata: chargeData.metadata || {},
      });

      return charge;
    } catch (error) {
      throw new Error(`Error creating Stripe charge: ${error.message}`);
    }
  }

  /**
   * Crear refund
   */
  async createRefund(chargeId, refundData = {}) {
    try {
      const refund = await stripe.refunds.create({
        charge: chargeId,
        amount: refundData.amount,
        reason: refundData.reason || 'requested_by_customer',
        metadata: refundData.metadata || {},
      });

      return refund;
    } catch (error) {
      throw new Error(`Error creating Stripe refund: ${error.message}`);
    }
  }

  /**
   * Verificar webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      return event;
    } catch (error) {
      throw new Error(`Invalid Stripe webhook signature: ${error.message}`);
    }
  }

  /**
   * Obtener balance
   */
  async getBalance() {
    try {
      const balance = await stripe.balance.retrieve();
      return balance;
    } catch (error) {
      throw new Error(`Error retrieving Stripe balance: ${error.message}`);
    }
  }

  /**
   * Listar transacciones
   */
  async listTransactions(options = {}) {
    try {
      const transactions = await stripe.balanceTransactions.list({
        limit: options.limit || 100,
        ...options
      });

      return transactions;
    } catch (error) {
      throw new Error(`Error listing Stripe transactions: ${error.message}`);
    }
  }

  /**
   * Crear Setup Intent para guardar métodos de pago
   */
  async createSetupIntent(customerId) {
    try {
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        usage: 'off_session',
      });

      return setupIntent;
    } catch (error) {
      throw new Error(`Error creating Stripe setup intent: ${error.message}`);
    }
  }

  /**
   * Obtener métodos de pago guardados de un customer
   */
  async getPaymentMethods(customerId, type = 'card') {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: type,
      });

      return paymentMethods;
    } catch (error) {
      throw new Error(`Error retrieving Stripe payment methods: ${error.message}`);
    }
  }
}

module.exports = new StripeService();
