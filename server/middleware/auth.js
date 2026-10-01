import jwt from 'jsonwebtoken';
import { User } from '../models.js';
export async function protect(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(id).select('-password');
    if (!req.user) throw new Error();
    next();
  } catch { res.status(401).json({ message: 'Please sign in to continue.' }); }
}
