import mongoose, { Document, Model, Schema } from 'mongoose';
import { ITitle } from './title.model';

export interface IProgress extends Document {
  userId: string;
  titleId: mongoose.Types.ObjectId;
  positionSec: number;
  durationSec: number;
  updatedAt: Date;
}

const ProgressSchema = new Schema<IProgress>({
  userId: { type: String, required: true },
  titleId: { type: Schema.Types.ObjectId, ref: 'Title', required: true },
  positionSec: { type: Number, required: true },
  durationSec: { type: Number, required: true },
  updatedAt: { type: Date, default: Date.now },
});

ProgressSchema.index({ userId: 1, titleId: 1 }, { unique: true });

export const ProgressModel: Model<IProgress> = mongoose.models.Progress || mongoose.model<IProgress>('Progress', ProgressSchema);

/** UPSERT — insert on first watch, update the playhead afterwards. */
export const upsertProgress = async (input: {
  userId: string;
  titleId: string;
  positionSec: number;
  durationSec: number;
}): Promise<void> => {
  await ProgressModel.findOneAndUpdate(
    { userId: input.userId, titleId: input.titleId },
    {
      $set: {
        positionSec: input.positionSec,
        durationSec: input.durationSec,
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  ).exec();
};

export const getProgress = async (
  userId: string,
  titleId: string
): Promise<{ positionSec: number; durationSec: number } | null> => {
  const doc = await ProgressModel.findOne({ userId, titleId }).exec();
  if (!doc) return null;
  return { positionSec: doc.positionSec, durationSec: doc.durationSec };
};

export interface ContinueWatchingItem {
  title: ITitle;
  positionSec: number;
  durationSec: number;
  progressRatio: number;
  updatedAt: Date;
}

/** Continue Watching row rules (same idea Netflix uses):
 *   - started:  position > 10s  (ignore accidental clicks)
 *   - unfinished: position < 0.95 * runtime (finished titles drop off the row)
 */
export const getContinueWatching = async (
  userId: string,
  limit = 12
): Promise<ContinueWatchingItem[]> => {
  const docs = await ProgressModel.find({ userId })
    .populate('titleId')
    .sort({ updatedAt: -1 })
    .limit(limit * 5)
    .exec();

  const filtered = docs.filter((doc) => {
    const started = doc.positionSec > 10;
    const unfinished = doc.positionSec < 0.95 * Math.max(doc.durationSec, 1);
    return started && unfinished && doc.titleId;
  });

  const items: ContinueWatchingItem[] = filtered
    .slice(0, limit)
    .map((doc) => ({
      title: (doc.titleId as unknown) as ITitle,
      positionSec: doc.positionSec,
      durationSec: doc.durationSec,
      progressRatio: doc.durationSec > 0 ? doc.positionSec / doc.durationSec : 0,
      updatedAt: doc.updatedAt,
    }));

  return items;
};
