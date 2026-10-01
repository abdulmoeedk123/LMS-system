import 'dotenv/config';
import mongoose from 'mongoose';
import { Course } from './models.js';
await mongoose.connect(process.env.MONGO_URI);
await Course.deleteMany();
const lessons = t => [1, 2, 3].map(i => ({ title: `${t}: Lesson ${i}`, body: 'Lesson content goes here.' }));
await Course.insertMany([
  { title: 'Intro to Web Development', summary: 'HTML, CSS and the basics of how the web works.', level: 'Beginner', lessons: 3, premium: false, price: 0, content: lessons('Web Basics') },
  { title: 'Full-Stack MERN Mastery', summary: 'Build and deploy production-ready apps with MongoDB, Express, React and Node.', level: 'Intermediate', lessons: 3, premium: true, price: 49, content: lessons('MERN') },
  { title: 'Advanced System Design', summary: 'Scaling, caching, queues and architecture trade-offs.', level: 'Advanced', lessons: 3, premium: true, price: 79, content: lessons('Design') },
]);
console.log('Seeded'); process.exit();
