import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { SignedOut } from "./dashboard.profile";

export const Route = createFileRoute("/dashboard/business")({
  head: () => ({
    meta: [
      { title: "Your business — Accountabul dashboard" },
      {
        name: "description",
        content: "Create, edit, and submit your Accountabul business profile for verification.",
      },
      { property: "og:title", content: "Your business — Accountabul dashboard" },
      {
        property: "og:description",
        content: "Create, edit, and submit your Accountabul business profile for verification.",
      },
    ],
  }),
  component: BusinessPage,
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function BusinessPage() {
  const { session, loading } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  const membership = useQuery({
    queryKey: ["my-business", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_members")
        .select("membership_role, businesses(*)")
        .eq("user_id", userId!)
        .eq("invitation_status", "active")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const business = membership.data?.businesses ?? null;

  const [form, setForm] = useState({
    legal_name: "",
    display_name: "",
    headline: "",
    description: "",
    website_url: "",
    public_email: "",
    public_phone: "",
    primary_industry: "",
    address_city: "",
    address_state: "",
    address_country: "",
  });

  useEffect(() => {
    if (business) {
      setForm({
        legal_name: business.legal_name ?? "",
        display_name: business.display_name ?? "",
        headline: business.headline ?? "",
        description: business.description ?? "",
        website_url: business.website_url ?? "",
        public_email: business.public_email ?? "",
        public_phone: business.public_phone ?? "",
        primary_industry: business.primary_industry ?? "",
        address_city: business.address_city ?? "",
        address_state: business.address_state ?? "",
        address_country: business.address_country ?? "",
      });
      return;
    }

    // Prefill from the business name captured during signup, if any.
    let pending = "";
    try {
      pending = window.sessionStorage.getItem("accountabul:business_name") ?? "";
      if (pending) window.sessionStorage.removeItem("accountabul:business_name");
    } catch {
      pending = "";
    }
    if (pending) {
      setForm((prev) =>
        prev.legal_name || prev.display_name
          ? prev
          : { ...prev, legal_name: pending, display_name: pending },
      );
    }
  }, [business]);

  const create = useMutation({
    mutationFn: async () => {
      const base = slugify(form.display_name || form.legal_name);
      const slug = `${base || "business"}-${Math.random().toString(36).slice(2, 7)}`;
      const { data, error } = await supabase
        .from("businesses")
        .insert({ ...form, slug, created_by: userId! })
        .select("id")
        .single();
      if (error) throw error;

      const { error: memberError } = await supabase.from("business_members").insert({
        business_id: data.id,
        user_id: userId!,
        membership_role: "owner",
        invitation_status: "active",
        joined_at: new Date().toISOString(),
      });
      if (memberError) throw memberError;
    },
    onSuccess: () => {
      toast.success("Business created. You are the owner.");
      void queryClient.invalidateQueries({ queryKey: ["my-business"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (patch: TablesUpdate<"businesses">) => {
      const { error } = await supabase.from("businesses").update(patch).eq("id", business!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Business updated.");
      void queryClient.invalidateQueries({ queryKey: ["my-business"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!session) return <SignedOut />;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">{business ? "Your business" : "Create your business"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {business
          ? `Status: ${business.profile_status} · Verification: ${business.verification_status}`
          : "Creating a business makes you its owner. Only owners and managers can edit it."}
      </p>

      <form
        className="surface-card mt-6 grid gap-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (business) update.mutate(form);
          else create.mutate();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Legal name"
            required
            value={form.legal_name}
            onChange={(v) => setForm({ ...form, legal_name: v })}
          />
          <Field
            label="Display name"
            required
            value={form.display_name}
            onChange={(v) => setForm({ ...form, display_name: v })}
          />
        </div>
        <Field
          label="Headline"
          value={form.headline}
          onChange={(v) => setForm({ ...form, headline: v })}
        />
        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Website"
            value={form.website_url}
            onChange={(v) => setForm({ ...form, website_url: v })}
          />
          <Field
            label="Public email"
            value={form.public_email}
            onChange={(v) => setForm({ ...form, public_email: v })}
          />
          <Field
            label="Public phone"
            value={form.public_phone}
            onChange={(v) => setForm({ ...form, public_phone: v })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field
            label="Industry"
            value={form.primary_industry}
            onChange={(v) => setForm({ ...form, primary_industry: v })}
          />
          <Field
            label="City"
            value={form.address_city}
            onChange={(v) => setForm({ ...form, address_city: v })}
          />
          <Field
            label="State"
            value={form.address_state}
            onChange={(v) => setForm({ ...form, address_state: v })}
          />
          <Field
            label="Country"
            value={form.address_country}
            onChange={(v) => setForm({ ...form, address_country: v })}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={create.isPending || update.isPending}>
            {business ? "Save business" : "Create business"}
          </Button>
          {business && business.profile_status === "draft" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                update.mutate({ profile_status: "pending_review", verification_status: "pending" })
              }
            >
              Submit for review
            </Button>
          ) : null}
        </div>
      </form>

      {business ? <CredentialsPanel businessId={business.id} /> : null}
    </div>
  );
}

function CredentialsPanel({ businessId }: { businessId: string }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState("");
  const [authority, setAuthority] = useState("");
  const [identifier, setIdentifier] = useState("");

  const credentials = useQuery({
    queryKey: ["credentials", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_credentials")
        .select("id, credential_type, issuing_authority, identifier, review_status")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("business_credentials").insert({
        business_id: businessId,
        credential_type: type,
        issuing_authority: authority || null,
        identifier: identifier || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setType("");
      setAuthority("");
      setIdentifier("");
      toast.success("Credential submitted for admin review.");
      void queryClient.invalidateQueries({ queryKey: ["credentials", businessId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="surface-card mt-6 p-6">
      <h2 className="text-lg font-semibold">Verification credentials</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Private to your business and platform admins. Never shown publicly unless an admin approves
        display.
      </p>

      <ul className="mt-4 grid gap-2">
        {(credentials.data ?? []).map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap justify-between gap-2 rounded-md border border-border p-3 text-sm"
          >
            <span>
              {c.credential_type}
              {c.issuing_authority ? ` · ${c.issuing_authority}` : ""}
              {c.identifier ? ` · ${c.identifier}` : ""}
            </span>
            <span className="text-muted-foreground">{c.review_status}</span>
          </li>
        ))}
        {credentials.data && credentials.data.length === 0 ? (
          <li className="text-sm text-muted-foreground">No credentials submitted yet.</li>
        ) : null}
      </ul>

      <form
        className="mt-5 grid gap-4 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
      >
        <Field label="Credential type" required value={type} onChange={setType} />
        <Field label="Issuing authority" value={authority} onChange={setAuthority} />
        <Field label="Identifier" value={identifier} onChange={setIdentifier} />
        <div className="sm:col-span-3">
          <Button type="submit" variant="outline" disabled={submit.isPending || !type}>
            Submit credential
          </Button>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} required={required} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
