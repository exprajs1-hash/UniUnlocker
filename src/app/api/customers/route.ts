import { adminRoute, json } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { serializeMany } from "@/lib/serialize";
import { Customer } from "@/models/Customer";
import type { CustomerDTO } from "@/types";

const PAGE_SIZE = 50;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** `?q=` searches name, email and phone. */
export const GET = adminRoute(async (request) => {
  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 100);
  const page = Math.max(1, Number(params.get("page")) || 1);
  const filter = q
    ? { $or: ["name", "email", "phone"].map((field) => ({ [field]: { $regex: escapeRegex(q), $options: "i" } })) }
    : {};

  await connectToDatabase();
  const [customers, total] = await Promise.all([
    Customer.find(filter, { tokenVersion: 0 })
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Customer.countDocuments(filter),
  ]);
  return json({ customers: serializeMany<CustomerDTO>(customers), total, page, pageSize: PAGE_SIZE });
});
