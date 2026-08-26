import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ITitle extends Document {
  slug: string;
  title: string;
  synopsis: string;
  genre: string;
  year: number;
  rating: number;
  durationSec: number;
  maturity: string;
  backdropUrl: string;
  streamSlug: string;
  trendingScore: number;
  featured: boolean;
  createdAt: Date;
}

export type NewTitle = {
  slug: string;
  title: string;
  synopsis: string;
  genre: string;
  year: number;
  rating?: number;
  durationSec?: number;
  maturity?: string;
  backdropUrl: string;
  streamSlug: string;
  trendingScore?: number;
  featured?: boolean;
};

const TitleSchema = new Schema<ITitle>({
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  synopsis: { type: String, required: true },
  genre: { type: String, required: true },
  year: { type: Number, required: true },
  rating: { type: Number, default: 0 },
  durationSec: { type: Number, default: 0 },
  maturity: { type: String, default: 'TV-14' },
  backdropUrl: { type: String, required: true },
  streamSlug: { type: String, required: true },
  trendingScore: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

export const TitleModel: Model<ITitle> = mongoose.models.Title || mongoose.model<ITitle>('Title', TitleSchema);

export const getAllTitles = async (): Promise<ITitle[]> => {
  return TitleModel.find().sort({ trendingScore: -1 }).exec();
};

export const getTitleById = async (id: string): Promise<ITitle | null> => {
  return TitleModel.findById(id).exec();
};

export const getHeroTitle = async (): Promise<ITitle | null> => {
  const featured = await TitleModel.findOne({ featured: true }).exec();
  if (featured) return featured;
  return TitleModel.findOne().sort({ trendingScore: -1 }).exec();
};

export const getTrending = async (limit = 12): Promise<ITitle[]> => {
  return TitleModel.find().sort({ trendingScore: -1 }).limit(limit).exec();
};

export const getTopRated = async (limit = 12): Promise<ITitle[]> => {
  return TitleModel.find().sort({ rating: -1 }).limit(limit).exec();
};

export const getGenreRows = async (): Promise<{ genre: string; items: ITitle[] }[]> => {
  const genres = await TitleModel.distinct('genre').exec();
  const rows = [] as { genre: string; items: ITitle[] }[];
  for (const genre of genres) {
    const items = await TitleModel.find({ genre }).sort({ rating: -1 }).limit(12).exec();
    rows.push({ genre, items });
  }
  return rows;
};

export const searchTitles = async (q: string, limit = 24): Promise<ITitle[]> => {
  const pattern = new RegExp(q, 'i');
  return TitleModel.find({ $or: [{ title: pattern }, { synopsis: pattern }, { genre: pattern }] })
    .sort({ rating: -1 })
    .limit(limit)
    .exec();
};

export const createTitle = async (input: NewTitle): Promise<ITitle> => {
  const title = new TitleModel({
    ...input,
    rating: input.rating ?? 0,
    durationSec: input.durationSec ?? 0,
    maturity: input.maturity ?? 'TV-14',
    trendingScore: input.trendingScore ?? 0,
    featured: input.featured ?? false,
  });
  return title.save();
};

export const updateTitle = async (id: string, patch: Partial<NewTitle>): Promise<ITitle | null> => {
  return TitleModel.findByIdAndUpdate(id, patch, { new: true }).exec();
};

export const deleteTitle = async (id: string): Promise<void> => {
  await TitleModel.findByIdAndDelete(id).exec();
};

export const getUsedStreamSlugs = async (): Promise<string[]> => {
  return TitleModel.distinct('streamSlug').exec();
};

export const titleCount = async (): Promise<number> => {
  return TitleModel.countDocuments().exec();
};
