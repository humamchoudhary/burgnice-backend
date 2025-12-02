const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.get('/orders', orderController.getOrders); // get all/user orders
router.get('/orders/:id', orderController.getOrderById); // get order by id
router.post('/orders', orderController.createOrder); // create order
router.put('/orders/:id/status', orderController.updateOrderStatus); // update order status
router.delete('/orders/:id', orderController.deleteOrder); // delete order

module.exports = router;
