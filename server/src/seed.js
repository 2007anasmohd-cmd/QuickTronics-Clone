import 'dotenv/config';
import mongoose from 'mongoose';
import { Category, Product, Coupon } from './models.js';

const categories = [
  ['Earphones','earphones'],['Headphones','headphones'],['Bluetooth Speakers','bluetooth-speakers'],['Chargers','chargers'],['Charging Cables','charging-cables'],['Power Banks','power-banks'],['Smart Watches','smart-watches'],['Mobile Accessories','mobile-accessories'],['Computer Accessories','computer-accessories'],['Other Gadgets','other-gadgets']
];
const inventory = [
  ['Sonic Pro Wireless Headphones','SONIQ','headphones',12999,9999,18,'photo-1505740420928-5e560c06d30e',4.9,true,true],
  ['AeroBeat Noise Cancelling Earbuds','SONIQ','earphones',8499,6499,24,'photo-1606220945770-b5b6c2c55bf1',4.8,true,true],
  ['Pulse Mini Bluetooth Speaker','VOLT','bluetooth-speakers',5999,4499,31,'photo-1608043152269-423dbba4e7e1',4.7,true,false],
  ['UltraCharge 20K Power Bank','VOLT','power-banks',4999,3799,12,'photo-1609091839311-d5365f9ff1c5',4.8,true,false],
  ['Series 9 Active Smartwatch','NOVA','smart-watches',16999,13999,9,'photo-1523275335684-37898b6baf30',4.9,false,true],
  ['Flex USB-C Braided Cable','VOLT','charging-cables',1299,899,50,'photo-1558618666-fcd25c85cd64',4.6,false,false],
  ['65W GaN Fast Charger','VOLT','chargers',3999,2999,22,'photo-1583863788434-e58a36330cf0',4.8,true,false],
  ['Studio Monitor Headphones','SONIQ','headphones',18999,15999,7,'photo-1484704849700-f032a568e944',4.9,false,true],
  ['MagSafe Everyday Phone Stand','NOVA','mobile-accessories',2499,1899,16,'photo-1602080858428-57174f9431cf',4.5,false,false],
  ['Precision Wireless Mouse','NOVA','computer-accessories',3499,2799,14,'photo-1527814050087-3793815479db',4.7,false,true],
  ['Pocket LED Projector','NOVA','other-gadgets',22999,19999,5,'photo-1478720568477-152d9b164e26',4.6,false,false],
  ['Boom 360 Portable Speaker','VOLT','bluetooth-speakers',7999,6499,11,'photo-1608043152269-423dbba4e7e1',4.8,false,true]
];

try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/quicktronics');
  const categoryIds = new Map();
  for (const [name,slug] of categories) {
    const category = await Category.findOneAndUpdate({slug},{name,slug,active:true},{upsert:true,new:true,setDefaultsOnInsert:true});
    categoryIds.set(slug,category._id);
  }
  for (const [name,brand,categorySlug,price,discountPrice,stock,image,rating,featured,bestseller] of inventory) {
    const slug=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    await Product.findOneAndUpdate({slug},{$setOnInsert:{name,slug,brand,category:categoryIds.get(categorySlug),price,discountPrice,stock,rating,reviewCount:0,images:[`https://images.unsplash.com/${image}?auto=format&fit=crop&w=900&q=85`],description:`Meet the ${name.toLowerCase()}, thoughtfully designed for dependable everyday performance. Carefully selected materials, considered details and a one-year warranty make it an easy upgrade.`,featured,bestseller,active:true}},{upsert:true,new:true,setDefaultsOnInsert:true});
  }
  await Coupon.findOneAndUpdate({code:'WELCOME300'},{$setOnInsert:{code:'WELCOME300',discount:300,minOrder:2000,expiresAt:new Date('2027-12-31T23:59:59.000Z'),enabled:true}},{upsert:true,new:true,setDefaultsOnInsert:true});
  console.log(`Seeded ${categories.length} categories and ${inventory.length} products.`);
} catch (error) {
  console.error('Seed failed:',error.message);
  process.exitCode=1;
} finally {
  await mongoose.disconnect();
}
