import mongoose, { Document, Model, Schema } from 'mongoose';
import { config } from 'dotenv';
config();

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

export const UserModel: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export function toPublicUser(u: IUser): PublicUser {
  return { id: u._id.toString(), name: u.name, email: u.email, role: u.role };
}

export async function findUserByEmail(email: string): Promise<IUser | null> {
  return await UserModel.findOne({ email: email.toLowerCase() }).exec();
}

export async function createUser(input: { name: string; email: string; passwordHash: string; role?: 'user' | 'admin' }): Promise<IUser> {
  const user = new UserModel({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash: input.passwordHash,
    role: input.role ?? 'user',
  });
  return await user.save();
}
