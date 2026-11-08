import "server-only";
import { Types, type Model } from "mongoose";

/** Sets displayOrder from the position of each id in the given list. */
export async function applyOrder<T>(model: Model<T>, ids: string[]): Promise<void> {
  // The native collection is used because displayOrder is the only field written.
  await model.collection.bulkWrite(
    ids.map((id, index) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(id) },
        update: { $set: { displayOrder: index } },
      },
    })),
  );
}
