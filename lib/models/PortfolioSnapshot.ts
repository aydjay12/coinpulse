import mongoose, { InferSchemaType, Model, Schema } from 'mongoose';

const portfolioSnapshotSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    totalBalanceUsd: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true },
);

portfolioSnapshotSchema.index({ userId: 1, createdAt: -1 });

export type PortfolioSnapshotDocument = InferSchemaType<typeof portfolioSnapshotSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const PortfolioSnapshot =
  (mongoose.models.PortfolioSnapshot as Model<PortfolioSnapshotDocument> | undefined) ||
  mongoose.model<PortfolioSnapshotDocument>(
    'PortfolioSnapshot',
    portfolioSnapshotSchema,
    'portfolio_snapshots',
  );

export default PortfolioSnapshot;
