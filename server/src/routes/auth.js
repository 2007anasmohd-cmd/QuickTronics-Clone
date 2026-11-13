import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { User } from '../models.js';
import { asyncRoute, requireAuth } from '../middleware.js';

export const authRouter = Router();
const limit = rateLimit({ windowMs: 15 * 60 * 1000, max: 12, standardHeaders: true, legacyHeaders: false });
const genericResetMessage = 'If an account matches that email, password reset instructions will be sent.';
const issue = (user, res) => {
  const token = jwt.sign({ id: user._id.toString(), role: user.role, ver: user.authVersion || 0 }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 86400000 });
  return { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone };
};

authRouter.post('/register', limit, asyncRoute(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !/^\S+@\S+\.\S+$/.test(email) || !password || password.length < 8) return res.status(400).json({ message: 'Enter a name, valid email, and password with at least 8 characters.' });
  if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ message: 'An account with that email already exists.' });
  const user = await User.create({ name, email, phone, password: await bcrypt.hash(password, 12) });
  res.status(201).json({ user: issue(user, res) });
}));
authRouter.post('/login', limit, asyncRoute(async (req, res) => {
  const user = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!user || !user.active || !await bcrypt.compare(req.body.password || '', user.password)) return res.status(401).json({ message: 'Email or password is incorrect.' });
  res.json({ user: issue(user, res) });
}));
authRouter.post('/admin/login', limit, asyncRoute(async (req, res) => {
  let user = await User.findOne({ email: (req.body.email || '').toLowerCase(), role: 'admin' });
  if (!user && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && req.body.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase() && req.body.password === process.env.ADMIN_PASSWORD) {
    user = await User.create({ name: 'Store Owner', email: process.env.ADMIN_EMAIL, password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12), role: 'admin' });
  }
  if (!user || !user.active || !await bcrypt.compare(req.body.password || '', user.password)) return res.status(401).json({ message: 'Admin credentials are incorrect.' });
  res.json({ user: issue(user, res) });
}));
authRouter.post('/logout', (_req, res) => { res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' }); res.json({ message: 'Signed out.' }); });
authRouter.get('/me', requireAuth, asyncRoute(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password -resetTokenHash -resetTokenExpires');
  if (!user) return res.status(401).json({ message: 'Account not found.' });
  res.json({ user });
}));
authRouter.patch('/profile', requireAuth, asyncRoute(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user.id, { name: req.body.name, phone: req.body.phone }, { new: true, runValidators: true }).select('-password -resetTokenHash -resetTokenExpires');
  res.json({ user });
}));
authRouter.post('/addresses', requireAuth, asyncRoute(async (req, res) => {
  const { line1, city, state, pincode } = req.body;
  if (!line1 || !city || !state || !pincode) return res.status(400).json({ message: 'Enter a street address, city, state and PIN code.' });
  const user = await User.findById(req.user.id);
  user.addresses.push({ name: req.body.name || user.name, phone: req.body.phone || user.phone, line1, line2: req.body.line2, city, state, pincode });
  await user.save();
  res.status(201).json({ user: await User.findById(req.user.id).select('-password -resetTokenHash -resetTokenExpires') });
}));
authRouter.delete('/addresses/:id', requireAuth, asyncRoute(async (req, res) => {
  const user = await User.findById(req.user.id);
  user.addresses = user.addresses.filter(address => address._id.toString() !== req.params.id);
  await user.save();
  res.json({ user: await User.findById(req.user.id).select('-password -resetTokenHash -resetTokenExpires') });
}));
authRouter.post('/change-password', requireAuth, asyncRoute(async (req, res) => {
  const { currentPassword, password } = req.body;
  if (!password || password.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters.' });
  const user = await User.findById(req.user.id);
  if (!await bcrypt.compare(currentPassword || '', user.password)) return res.status(400).json({ message: 'Current password is incorrect.' });
  user.password = await bcrypt.hash(password, 12);
  user.authVersion += 1;
  await user.save();
  res.json({ user: issue(user, res) });
}));
authRouter.post('/forgot-password', limit, asyncRoute(async (req, res) => {
  const email = (req.body.email || '').toLowerCase();
  const user = await User.findOne({ email, active: true });
  if (!user || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return res.json({ message: genericResetMessage });
  const rawToken = crypto.randomBytes(32).toString('hex');
  user.resetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
  try {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [user.email], subject: 'Reset your Quicktronics password', html: `<p>Use the link below to choose a new password. It expires in 30 minutes.</p><p><a href="${resetUrl}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>` }) });
    if (!response.ok) { user.resetTokenHash = undefined; user.resetTokenExpires = undefined; await user.save(); console.error('Password reset email provider returned an error.'); }
  } catch (error) { user.resetTokenHash = undefined; user.resetTokenExpires = undefined; await user.save(); console.error('Password reset email could not be sent:', error.message); }
  res.json({ message: genericResetMessage });
}));
authRouter.post('/reset-password', limit, asyncRoute(async (req, res) => {
  const { token, email, password } = req.body;
  if (!token || !email || !password || password.length < 8) return res.status(400).json({ message: 'Use a valid reset link and a password with at least 8 characters.' });
  const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({ email: email.toLowerCase(), resetTokenHash, resetTokenExpires: { $gt: new Date() }, active: true });
  if (!user) return res.status(400).json({ message: 'This reset link is invalid or expired. Request a new one.' });
  user.password = await bcrypt.hash(password, 12);
  user.resetTokenHash = undefined; user.resetTokenExpires = undefined; user.authVersion += 1;
  await user.save();
  res.json({ message: 'Password updated. You can now sign in.' });
}));
