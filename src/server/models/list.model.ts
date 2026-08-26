import mongoose, { Document, Model, Schema } from 'mongoose';
import { ITitle } from './title.model';

export interface IWatchlist extends Document {
  userId: string;
  titleId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const WatchlistSchema = new Schema<IWatchlist>({
  userId: { type: String, required: true },
  titleId: { type: Schema.Types.ObjectId, ref: 'Title', required: true },
  createdAt: { type: Date, default: Date.now },
});

WatchlistSchema.index({ userId: 1, titleId: 1 }, { unique: true });

export const WatchlistModel: Model<IWatchlist> = mongoose.models.Watchlist || mongoose.model<IWatchlist>('Watchlist', WatchlistSchema);

/** Join watchlist -> titles so the frontend gets full title objects. */
export const getWatchlist = async (userId: string): Promise<ITitle[]> => {
  const entries = await WatchlistModel.find({ userId }).populate('titleId').exec();
  return entries.map((e) => (e.titleId as unknown) as ITitle);
};

/** Idempotent insert: the UNIQUE(user_id,title_id) index makes re-adds a no-op. */
export const addToWatchlist = async (userId: string, titleId: string): Promise<void> => {
  await WatchlistModel.updateOne(
    { userId, titleId },
    { $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  ).exec();
};

export const removeFromWatchlist = async (userId: string, titleId: string): Promise<void> => {
  await WatchlistModel.deleteOne({ userId, titleId }).exec();
};

export const isInWatchlist = async (userId: string, titleId: string): Promise<boolean> => {
  const count = await WatchlistModel.countDocuments({ userId, titleId }).exec();
  return count > 0;
};
