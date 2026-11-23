import mongoose, { InferSchemaType, Model, Schema } from 'mongoose';
import { SUPPORTED_CHAIN_IDS } from '@/lib/wallets/chains';

const walletSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    address: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    label: {
      type: String,
      trim: true,
      default: 'Wallet',
      maxlength: 60,
    },
    chains: {
      type: [String],
      enum: SUPPORTED_CHAIN_IDS,
      default: () => [...SUPPORTED_CHAIN_IDS],
    },
  },
  { timestamps: true },
);

walletSchema.index({ userId: 1, address: 1 }, { unique: true });

export type WalletDocument = InferSchemaType<typeof walletSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const WalletModel =
  (mongoose.models.Wallet as Model<WalletDocument> | undefined) ||
  mongoose.model<WalletDocument>('Wallet', walletSchema, 'wallets');

export default WalletModel;
