"use client";

import {
  ArrowLeft,
  BadgeCheck,
  CircleCheck,
  Clock,
  Headphones,
  Lock,
  LogIn,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { fetchMe } from "@/components/rent/rent-catalog";
import { formatBdt, ToolIcon } from "@/components/rent/shared";
import { useToast } from "@/components/ui/toast";
import { apiFetch, clearFieldError, errorMessage, fieldErrorsOf } from "@/lib/client-api";
import type { PublicRentServiceDTO, RentOrderDTO } from "@/types";

type Me = Awaited<ReturnType<typeof fetchMe>>;

function Chip({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

export function RentServiceDetail({ id }: { id: string }) {
  const [service, setService] = useState<PublicRentServiceDTO | null>(null);
  const [ordersEnabled, setOrdersEnabled] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [me, setMe] = useState<Me | undefined>(undefined);

  useEffect(() => {
    let active = true;
    apiFetch<{ service: PublicRentServiceDTO; ordersEnabled: boolean }>(`/api/rent/services/${id}`)
      .then((data) => {
        if (!active) return;
        setService(data.service);
        setOrdersEnabled(data.ordersEnabled);
      })
      .catch((error: unknown) => active && setLoadError(errorMessage(error)));
    void fetchMe().then((value) => active && setMe(value));
    return () => {
      active = false;
    };
  }, [id]);

  if (loadError) {
    return (
      <div className="neon-card p-8 text-center">
        <p className="text-muted">{loadError}</p>
        <Link href="/rent" className="btn-outline mt-4 inline-flex min-h-10! px-4! text-sm">
          <ArrowLeft aria-hidden className="size-4" /> Back to Services
        </Link>
      </div>
    );
  }
  if (!service) {
    return (
      <div role="status" aria-label="Loading" className="space-y-4">
        <div className="skeleton h-48" />
        <div className="skeleton h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="neon-card overflow-hidden p-5 sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/35 via-purple/25 to-cyan/10"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/rent"
              className="inline-flex items-center gap-1.5 rounded-full border border-glass/20 bg-glass/5 px-3 py-1.5 text-xs font-medium hover:bg-glass/10"
            >
              <ArrowLeft aria-hidden className="size-3.5" /> Back to Services
            </Link>
            <div className="flex gap-2">
              <Chip className="bg-status-online/15 text-status-online">
                <span aria-hidden className="size-1.5 rounded-full bg-status-online" /> Active
              </Chip>
              <Chip className="bg-glass/10 text-foreground">
                <Tag aria-hidden className="size-3" /> Best price
              </Chip>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-4">
            <ToolIcon src={service.icon} name={service.name} size={64} />
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold wrap-break-word sm:text-3xl">{service.name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                {service.group && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin aria-hidden className="size-3.5" /> {service.group}
                  </span>
                )}
                <span>ID: #{service.code}</span>
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-glass/15 bg-background/40 p-4">
            <div>
              <p className="text-xs font-semibold tracking-widest text-muted uppercase">Service price</p>
              <p className="font-display text-3xl font-bold text-neon">
                {formatBdt(service.priceBdt)}
                <span className="ml-1 text-sm font-normal text-muted">/ per order</span>
              </p>
            </div>
            <span className="flex size-12 items-center justify-center rounded-xl bg-linear-to-br from-primary to-purple text-white">
              <ShoppingCart aria-hidden className="size-5" />
            </span>
          </div>
        </div>
      </section>

      {/* Order */}
      <section className="neon-card p-5 sm:p-7">
        <h2 className="flex items-center gap-3 font-display text-lg font-semibold">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <ShoppingCart aria-hidden className="size-4.5" />
          </span>
          Place your order
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip className="bg-primary/15 text-primary">Service</Chip>
          {service.deliveryTime && (
            <Chip className="bg-status-online/15 text-status-online">
              <Clock aria-hidden className="size-3" /> {service.deliveryTime}
            </Chip>
          )}
          <Chip className="bg-status-maintenance/15 text-status-maintenance">
            <BadgeCheck aria-hidden className="size-3" /> Pro quality
          </Chip>
        </div>

        {service.info && <p className="mt-4 text-sm whitespace-pre-line text-muted">{service.info}</p>}

        {me === undefined ? (
          <div className="skeleton mt-5 h-64" />
        ) : (
          <OrderForm service={service} me={me} ordersEnabled={ordersEnabled} />
        )}

        <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { icon: ShieldCheck, label: "Secure" },
            { icon: Headphones, label: "Support" },
            { icon: CircleCheck, label: "Safe" },
            { icon: Zap, label: "Fast" },
          ].map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 rounded-xl border border-line/40 px-3 py-2 text-sm text-muted">
              <Icon aria-hidden className="size-4 text-cyan" /> {label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function OrderForm({ service, me, ordersEnabled }: { service: PublicRentServiceDTO; me: Me; ordersEnabled: boolean }) {
  const minQuantity = service.minQuantity ?? 1;
  const maxQuantity = Math.max(service.maxQuantity ?? 1, minQuantity);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [quantityText, setQuantityText] = useState(String(minQuantity));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const parsedQuantity = Number(quantityText);
  const quantityValid = Number.isInteger(parsedQuantity) && parsedQuantity >= minQuantity && parsedQuantity <= maxQuantity;
  const quantity = quantityValid ? parsedQuantity : minQuantity;
  const total = service.priceBdt * quantity;
  const balance = me?.balance ?? 0;
  const shortBy = total - balance;
  const fixedQuantity = minQuantity === maxQuantity;
  const quantityError =
    errors.quantity ?? (quantityValid ? undefined : `Enter ${fixedQuantity ? minQuantity : `${minQuantity}–${maxQuantity}`}`);

  function step(delta: number) {
    const next = Math.min(maxQuantity, Math.max(minQuantity, quantity + delta));
    setQuantityText(String(next));
    setErrors((current) => clearFieldError(current, "quantity"));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setErrors({});
    try {
      const result = await apiFetch<{
        order: RentOrderDTO;
        balance: number;
        message: string;
      }>("/api/me/orders", {
        method: "POST",
        body: { serviceId: service.id, fields, quantity },
      });
      toast.success(result.message);
      router.push("/account");
    } catch (submitError) {
      setErrors(fieldErrorsOf(submitError));
      setError(errorMessage(submitError));
      setBusy(false);
    }
  }

  const next = encodeURIComponent(`/rent/${service.id}`);

  return (
    <form onSubmit={submit} noValidate className="mt-5 space-y-4">
      {service.customFields.map((field) => {
        const id = `field-${field.name}`;
        const fieldError = errors[field.name];
        const common = {
          id,
          value: fields[field.name] ?? "",
          "aria-invalid": Boolean(fieldError),
          className: "neon-input",
          onChange: (event: { target: { value: string } }) => {
            const value = event.target.value;
            setFields((current) => ({ ...current, [field.name]: value }));
            setErrors((current) => clearFieldError(current, field.name));
          },
        };
        return (
          <div key={field.name}>
            <label htmlFor={id} className="mb-1.5 block text-sm font-semibold uppercase">
              {field.name}
              {field.required && <span className="text-status-offline"> *</span>}
            </label>
            {field.options.length > 0 ? (
              <select {...common}>
                <option value="">Choose…</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input {...common} type="text" maxLength={300} placeholder={`Enter ${field.name}`} />
            )}
            {fieldError && <p className="mt-1 text-xs text-status-offline">{fieldError}</p>}
          </div>
        );
      })}

      {fixedQuantity ? (
        // The provider sells this service one order at a time, so there is nothing to type.
        <div>
          <p className="mb-1.5 text-sm font-semibold">Quantity</p>
          <div className="flex items-center gap-3 rounded-xl border border-line/40 bg-background/30 px-4 py-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/20 font-bold text-primary">
              {minQuantity}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted">
              <Lock aria-hidden className="size-3.5" /> This service is ordered{" "}
              {minQuantity === 1 ? "one at a time" : `${minQuantity} at a time`}.
            </span>
          </div>
        </div>
      ) : (
        <div>
          <label htmlFor="field-quantity" className="mb-1.5 block text-sm font-semibold">
            Quantity <span className="font-normal text-muted">{`(Min: ${minQuantity}, Max: ${maxQuantity})`}</span>
          </label>
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={quantity <= minQuantity}
              onClick={() => step(-1)}
              className="btn-outline min-h-11! w-12 shrink-0 px-0!"
            >
              <Minus aria-hidden className="size-4" />
            </button>
            <input
              id="field-quantity"
              // Text + numeric keyboard: no browser spinner arrows, and digits only.
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={quantityText}
              aria-invalid={Boolean(quantityError)}
              onChange={(event) => {
                setQuantityText(event.target.value.replace(/\D/g, "").slice(0, 5));
                setErrors((current) => clearFieldError(current, "quantity"));
              }}
              className="neon-input text-center font-semibold"
            />
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={quantity >= maxQuantity}
              onClick={() => step(1)}
              className="btn-outline min-h-11! w-12 shrink-0 px-0!"
            >
              <Plus aria-hidden className="size-4" />
            </button>
          </div>
          {quantityError && <p className="mt-1 text-xs text-status-offline">{quantityError}</p>}
        </div>
      )}

      <dl className="divide-y divide-line/30 rounded-xl border border-line/40 bg-background/30 text-sm">
        <div className="flex justify-between gap-3 px-4 py-2.5">
          <dt className="text-muted">Service cost</dt>
          <dd className="font-semibold">{formatBdt(service.priceBdt)}</dd>
        </div>
        <div className="flex justify-between gap-3 px-4 py-2.5">
          <dt className="text-muted">Estimated total{quantity > 1 && ` (× ${quantity})`}</dt>
          <dd className="font-bold text-neon">{formatBdt(total)}</dd>
        </div>
        {me && (
          <div className="flex justify-between gap-3 px-4 py-2.5">
            <dt className="text-muted">Account balance</dt>
            <dd className={`font-semibold ${shortBy > 0 ? "text-status-offline" : "text-status-online"}`}>
              {formatBdt(balance)}
            </dd>
          </div>
        )}
      </dl>

      {error && (
        <p role="alert" className="rounded-md border border-status-offline/40 bg-status-offline/10 px-3 py-2 text-sm">
          {error}
        </p>
      )}
      {!ordersEnabled ? (
        <p className="rounded-md bg-status-maintenance/10 px-3 py-2 text-sm text-status-maintenance">
          New orders are paused right now. Please check back soon.
        </p>
      ) : me && shortBy > 0 ? (
        <p className="rounded-md bg-status-maintenance/10 px-3 py-2 text-sm text-status-maintenance">
          You need {formatBdt(shortBy)} more. Contact us to add balance to your account.
        </p>
      ) : null}

      {me ? (
        <button type="submit" disabled={busy || shortBy > 0 || !ordersEnabled || !quantityValid} className="btn-neon w-full">
          <ShoppingCart aria-hidden className="size-4" />
          {busy ? "Placing order…" : `Place an order · ${formatBdt(total)}`}
        </button>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href={`/login?next=${next}`} className="btn-neon flex-1">
            <LogIn aria-hidden className="size-4" /> Sign in to order
          </Link>
          <Link href={`/register?next=${next}`} className="btn-outline flex-1">
            Create account
          </Link>
        </div>
      )}
    </form>
  );
}
