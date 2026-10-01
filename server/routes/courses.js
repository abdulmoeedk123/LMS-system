import { Router } from 'express';
import { Course } from '../models.js';
import { protect } from '../middleware/auth.js';
const r = Router();
r.get('/', async (_q, res) => res.json(await Course.find().select('-content')));
r.get('/:id', async (req, res) => {
  const c = await Course.findById(req.params.id).select('-content');
  c ? res.json(c) : res.status(404).json({ message: 'Course not found.' });
});
// Access control: premium content only for buyers (or admins)
r.get('/:id/content', protect, async (req, res) => {
  const c = await Course.findById(req.params.id);
  if (!c) return res.status(404).json({ message: 'Course not found.' });
  const owns = req.user.purchased.some(id => id.equals(c._id));
  if (c.premium && !owns && req.user.role !== 'admin')
    return res.status(403).json({ message: 'This is a premium course. Purchase it to unlock the lessons.', code: 'PAYMENT_REQUIRED' });
  res.json(c);
});
export default r;
