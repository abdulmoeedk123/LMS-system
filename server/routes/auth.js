import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models.js';
import { protect } from '../middleware/auth.js';
const r = Router();
const sign = u => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const pub = u => ({ id: u._id, name: u.name, email: u.email, purchased: u.purchased });
r.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || (password || '').length < 6) return res.status(400).json({ message: 'Enter a name, email and a password of 6+ characters.' });
  if (await User.findOne({ email })) return res.status(409).json({ message: 'That email is already registered.' });
  const u = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: sign(u), user: pub(u) });
});
r.post('/login', async (req, res) => {
  const u = await User.findOne({ email: req.body.email });
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password))) return res.status(401).json({ message: 'Email or password is incorrect.' });
  res.json({ token: sign(u), user: pub(u) });
});
r.get('/me', protect, (req, res) => res.json({ user: pub(req.user) }));
export default r;
