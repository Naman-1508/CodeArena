
import jwt from 'jsonwebtoken';
import User from '../models/User.js';





import { clerkClient, verifyToken } from '@clerk/express';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      // Clerk's verifyToken takes the token directly
      const decoded = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      // Fetch user from DB using the clerk auth ID if they sync it, 
      // or we can fallback to email if clerk email matches DB
      // For now, let's assume the DB user ID matches Clerk's external ID, or we fetch user by Clerk ID
      // If we don't have user in DB yet, we might upsert it.
      
      // We will look up by email for simplicity in migration, or clerkId if added
      const clerkUser = await clerkClient.users.getUser(decoded.sub);
      const email = clerkUser.emailAddresses[0]?.emailAddress;

      let user = await User.findOne({ email });
      
      const clerkRole = clerkUser.publicMetadata?.role || 'User';

      if (!user && email) {
        // Upsert logic for new Clerk users logging in for the first time
        user = await User.create({
          username: clerkUser.username || email.split('@')[0],
          email: email,
          passwordHash: 'CLERK_MANAGED', // Password managed by Clerk
          role: clerkRole
        });
      } else if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      } else {
        // Sync role if it was changed in Clerk Dashboard
        if (user.role !== clerkRole) {
          user.role = clerkRole;
          await user.save();
        }
      }

      req.user = user;
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: `User role ${req.user?.role} is not authorized to access this route` });
      return;
    }
    next();
  };
};