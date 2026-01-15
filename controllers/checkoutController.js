const Order = require("../models/Order");
const User = require("../models/User");
const MenuItem = require("../models/MenuItem");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Create Stripe Checkout Session - OPTIMIZED
 */
exports.createSession = async (req, res) => {
  try {
    const { prods, ...orderInfo } = req.body;

    if (!prods || !Array.isArray(prods) || prods.length === 0) {
      return res.status(400).json({ message: "Products array is required" });
    }

    // Extract product IDs
    const productIds = prods.map((p) => p.id);

    // Fetch menu items from database - only needed fields
    const menuItems = await MenuItem.find({
      _id: { $in: productIds },
    })
      .select("name description price image")
      .lean();

    if (menuItems.length === 0) {
      return res.status(404).json({ message: "No valid products found" });
    }

    // Map products with quantities
    const orderItems = menuItems.map((item) => {
      const prod = prods.find((p) => p.id === item._id.toString());
      return {
        ...item,
        quantity: prod ? prod.quantity : 1,
      };
    });

    // Create Stripe line items
    const line_items = orderItems.map((item) => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: item.name,
          description: item.description || "",
          images: item.image ? [`${process.env.BACKEND_URL}${item.image}`] : [],
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    // Calculate totals
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const discountAmount = orderInfo.discountAmount || 0;
    const loyaltyPointsUsed = orderInfo.loyaltyPointsUsed || 0;
    const loyaltyPointsEarned = Math.floor(subtotal / 10);
    const total = subtotal - discountAmount;

    // If user is logged in, validate loyalty points BEFORE creating order
    if (req.user && loyaltyPointsUsed > 0) {
      const user = await User.findById(req.user.id)
        .select("loyaltyPoints")
        .lean();
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.loyaltyPoints < loyaltyPointsUsed) {
        return res.status(400).json({
          message: "Insufficient loyalty points",
        });
      }
    }

    // Create order in database with "payment_pending" status
    const order = await Order.create({
      user: req.user?.id || null,
      orderItems: orderItems.map((item) => ({
        menuItem: item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      subtotal,
      discountAmount,
      loyaltyPointsUsed,
      loyaltyPointsEarned,
      total,
      status: "payment_pending",
      paymentMethod: "CARD",
      customerName: orderInfo.customerName || (req.user ? req.user.name : null),
      contactPhone: orderInfo.contactPhone,
      deliveryAddress: orderInfo.deliveryAddress,
      notes: orderInfo.notes,
      orderType: orderInfo.orderType || "DELIVERY",
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${process.env.FRONTEND_URL}/success?orderId=${order._id}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel?orderId=${order._id}`,
      metadata: {
        orderId: order._id.toString(),
        userId: req.user?.id || "guest",
      },
    });

    // Save Stripe session ID to order
    order.stripeSessionId = session.id;
    await order.save();

    res.status(201).json({
      message: "Checkout session created successfully",
      url: session.url,
      orderId: order._id,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({
      message: "Failed to create checkout session",
      error: error.message,
    });
  }
};

/**
 * Check Payment Status - OPTIMIZED
 * Verifies if payment was completed and updates order status
 */
exports.checkStatus = async (req, res) => {
  try {
    const { orderid } = req.query;

    if (!orderid) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    // Find order - only select needed fields
    const order = await Order.findById(orderid)
      .select(
        "stripeSessionId status user total loyaltyPointsEarned loyaltyPointsUsed",
      )
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!order.stripeSessionId) {
      return res
        .status(400)
        .json({ message: "No Stripe session found for this order" });
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(
      order.stripeSessionId,
    );

    // Check if payment was successful
    const isPaid = session.payment_status === "paid";

    if (isPaid && order.status === "payment_pending") {
      // Use atomic update for order status
      await Order.findByIdAndUpdate(orderid, {
        status: "pending",
        paymentStatus: "paid",
      });

      // Update user's loyalty points if user exists
      if (order.user) {
        await User.findByIdAndUpdate(order.user, {
          $inc: {
            loyaltyPoints:
              (order.loyaltyPointsEarned || 0) - (order.loyaltyPointsUsed || 0),
            totalSpent: order.total,
          },
        });
      }
    }

    res.status(200).json(isPaid);
  } catch (error) {
    console.error("Error checking payment status:", error);
    res.status(500).json({
      message: "Failed to check payment status",
      error: error.message,
    });
  }
};

/**
 * Webhook handler for Stripe events - OPTIMIZED
 * This ensures order updates even if user closes browser
 */
exports.handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Webhook secret not configured");
    return res.status(500).json({ message: "Webhook not configured" });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object;
      const orderId = session.metadata.orderId;

      if (orderId) {
        const order = await Order.findById(orderId)
          .select("status user total loyaltyPointsEarned loyaltyPointsUsed")
          .lean();

        if (order && order.status === "payment_pending") {
          // Update order status
          await Order.findByIdAndUpdate(orderId, {
            status: "pending",
            paymentStatus: "paid",
          });

          // Update user loyalty points using atomic operations
          if (order.user) {
            await User.findByIdAndUpdate(order.user, {
              $inc: {
                loyaltyPoints:
                  (order.loyaltyPointsEarned || 0) -
                  (order.loyaltyPointsUsed || 0),
                totalSpent: order.total,
              },
            });
          }
        }
      }
      break;

    case "checkout.session.expired":
      const expiredSession = event.data.object;
      const expiredOrderId = expiredSession.metadata.orderId;

      if (expiredOrderId) {
        await Order.findOneAndUpdate(
          { _id: expiredOrderId, status: "payment_pending" },
          { status: "cancelled", paymentStatus: "expired" },
        );
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};
