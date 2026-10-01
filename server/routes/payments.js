import { Router } from 'express';
import { Course, Order, User } from '../models.js';
import { protect } from '../middleware/auth.js';
const r = Router();
const BASE = () => process.env.PAYPAL_BASE || 'https://api-m.sandbox.paypal.com';

async function token() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
  const res = await fetch(`${BASE()}/v1/oauth2/token`, {
    method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error('PayPal auth failed');
  return (await res.json()).access_token;
}
const pp = async (path, body) => {
  const res = await fetch(`${BASE()}${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'PayPal request failed');
  return data;
};

// 1) Price is read from the DB, never from the client.
r.post('/create-order', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.body.courseId);
    if (!course || !course.premium) return res.status(400).json({ message: 'This course is not available for purchase.' });
    if (req.user.purchased.some(id => id.equals(course._id))) return res.status(409).json({ message: 'You already own this course.' });
    const order = await pp('/v2/checkout/orders', {
      intent: 'CAPTURE',
      purchase_units: [{ reference_id: String(course._id), description: course.title, amount: { currency_code: 'USD', value: course.price.toFixed(2) } }],
    });
    await Order.create({ user: req.user._id, course: course._id, paypalOrderId: order.id, amount: course.price });
    res.json({ id: order.id });
  } catch (e) { res.status(502).json({ message: e.message }); }
});

// 2) Capture on the server, verify, then unlock access.
r.post('/capture-order', protect, async (req, res) => {
  try {
    const order = await Order.findOne({ paypalOrderId: req.body.orderId, user: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.status === 'COMPLETED') return res.json({ status: 'COMPLETED', courseId: order.course });
    const cap = await pp(`/v2/checkout/orders/${order.paypalOrderId}/capture`);
    const unit = cap.purchase_units?.[0]?.payments?.captures?.[0];
    const paid = cap.status === 'COMPLETED' && unit && Number(unit.amount.value) === order.amount;
    if (!paid) { order.status = 'FAILED'; await order.save(); return res.status(402).json({ message: 'Payment was not completed.' }); }
    order.status = 'COMPLETED'; order.captureId = unit.id; await order.save();
    await User.updateOne({ _id: req.user._id }, { $addToSet: { purchased: order.course } });
    res.json({ status: 'COMPLETED', courseId: order.course });
  } catch (e) { res.status(502).json({ message: e.message }); }
});

r.get('/my-orders', protect, async (req, res) =>
  res.json(await Order.find({ user: req.user._id, status: 'COMPLETED' }).populate('course', 'title').sort('-createdAt')));
export default r;
