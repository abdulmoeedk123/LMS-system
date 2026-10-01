import mongoose from 'mongoose';
const { Schema, model } = mongoose;
export const User = model('User', new Schema({
  name: String, email: { type: String, unique: true }, password: String,
  role: { type: String, default: 'student' },
  purchased: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
}, { timestamps: true }));
export const Course = model('Course', new Schema({
  title: String, summary: String, level: String, lessons: Number,
  premium: { type: Boolean, default: false }, price: { type: Number, default: 0 },
  content: [{ title: String, body: String }],
}));
export const Order = model('Order', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  course: { type: Schema.Types.ObjectId, ref: 'Course' },
  paypalOrderId: { type: String, unique: true }, amount: Number, currency: { type: String, default: 'USD' },
  status: { type: String, default: 'CREATED' }, captureId: String,
}, { timestamps: true }));
