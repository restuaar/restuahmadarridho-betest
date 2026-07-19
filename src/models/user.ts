import { Schema, model } from 'mongoose';
import { User } from '../types';

const userSchema = new Schema<User>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true },
    accountNumber: { type: String, required: true, unique: true },
    emailAddress: {
      type: String, required: true, unique: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    registrationNumber: { type: String, required: true, unique: true },
    role: { type: String, required: true, enum: ['admin', 'user'] },
  },
  { timestamps: true, collection: 'user_info' },
);

userSchema.index({ role: 1 });
userSchema.index({ fullName: 1 }, { collation: { locale: 'en', strength: 2 } });

userSchema.set('toJSON', {
  virtuals: false,
  transform: (_doc, ret: any) => { delete ret._id; delete ret.__v; return ret; },
});

export const UserModel = model<User>('User', userSchema);
