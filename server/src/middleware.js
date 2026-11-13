import jwt from 'jsonwebtoken';
import { User } from './models.js';
export async function requireAuth(req,res,next){ const token=req.cookies.token || (req.headers.authorization||'').replace(/^Bearer\s+/,''); if(!token)return res.status(401).json({message:'Please sign in to continue.'}); try{req.user=jwt.verify(token,process.env.JWT_SECRET);const account=await User.findById(req.user.id).select('authVersion active');if(!account||!account.active||account.authVersion!==(req.user.ver||0))return res.status(401).json({message:'Your session has expired. Please sign in again.'});next();}catch{return res.status(401).json({message:'Your session has expired. Please sign in again.'});} }
export function requireAdmin(req,res,next){ if(req.user?.role!=='admin')return res.status(403).json({message:'Administrator access required.'}); next(); }
export const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
