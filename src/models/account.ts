import { Schema, model } from 'mongoose';
import { Account } from '../types';

const accountSchema = new Schema<Account>(
  {
    accountId: { type: String, required: true, unique: true, index: true },
    userName: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    lastLoginDateTime: { type: Date, default: null },
    userId: { type: String, required: true, unique: true },
  },
  { timestamps: true, collection: 'account_login' },
);

accountSchema.index({ lastLoginDateTime: 1 });

accountSchema.set('toJSON', {
  virtuals: false,
  transform: (_doc, ret: any) => { delete ret._id; delete ret.__v; delete ret.password; return ret; },
});

export const AccountModel = model<Account>('Account', accountSchema);
