import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBusinessContext } from "@/hooks/use-business";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";

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
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const { activeMembership, capabilities, isLoading: membershipsLoading } = useBusinessContext();
  const businessId = activeMembership?.business_id;

  const businessQuery = useQuery({
    queryKey: ["business-dashboard-detail", businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const business = businessQuery.data ?? null;
  const canEdit = !business || capabilities.manageBusiness;

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
      if (!userId) throw new Error("Sign in before creating a business.");
      if (!form.legal_name.trim() || !form.display_name.trim()) {
        throw new Error("Legal name and display name are required.");
      }
      const base = slugify(form.display_name || form.legal_name);
      const slug = `${base || "business"}-${Math.random().toString(36).slice(2, 7)}`;
      const { error } = await supabase.rpc("create_business_with_owner", {
        _slug: slug,
        _legal_name: form.legal_name,
        _display_name: form.display_name,
        ...(form.headline ? { _headline: form.headline } : {}),
        ...(form.description ? { _description: form.description } : {}),
        ...(form.website_url ? { _website_url: form.website_url } : {}),
        ...(form.public_email ? { _public_email: form.public_email } : {}),
        ...(form.public_phone ? { _public_phone: form.public_phone } : {}),
        ...(form.primary_industry ? { _primary_industry: form.primary_industry } : {}),
        ...(form.address_city ? { _address_city: form.address_city } : {}),
        ...(form.address_state ? { _address_state: form.address_state } : {}),
        ...(form.address_country ? { _address_country: form.address_country } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Business created. You are the owner.");
      void queryClient.invalidateQueries({ queryKey: ["my-business-memberships"] });
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
      void queryClient.invalidateQueries({ queryKey: ["business-dashboard-detail", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["my-business-memberships"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (membershipsLoading || businessQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading business…</p>;
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">{business ? "Your business" : "Create your business"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {business
          ? `Status: ${business.profile_status} · Verification: ${business.verification_status} · Role: ${activeMembership?.membership_role.replace("_", " ")}`
          : "Creating a business makes you its owner. Only owners and managers can edit it."}
      </p>
      {business && !canEdit ? (
        <p role="status" className="mt-3 rounded-md border border-border bg-secondary p-3 text-sm">
          This membership is read-only under the current business security policy.
        </p>
      ) : null}

      <form
        className="surface-card mt-6 grid gap-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (business) update.mutate(form);
          else create.mutate();
        }}
      >
        <fieldset disabled={!canEdit} className="contents">
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
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {business ? "Save business" : "Create business"}
              </Button>
              {business && business.profile_status === "draft" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    update.mutate({
                      profile_status: "pending_review",
                      verification_status: "pending",
                    })
                  }
                >
                  Submit for review
                </Button>
              ) : null}
            </div>
          ) : null}
        </fieldset>
      </form>

      {business && capabilities.manageBusiness ? (
        <CredentialsPanel businessId={business.id} />
      ) : null}
      {business ? (
        <StaffPanel businessId={business.id} canManage={capabilities.manageMembers} />
      ) : null}
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

function StaffPanel({ businessId, canManage }: { businessId: string; canManage: boolean }) {
  const queryClient = useQueryClient();
  const [memberEmail, setMemberEmail] = useState("");
  const [role, setRole] = useState<"manager" | "listing_manager" | "lead_manager" | "viewer">(
    "viewer",
  );
  const members = useQuery({
    queryKey: ["business-staff", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_members")
        .select("id, user_id, membership_role, invitation_status, joined_at")
        .eq("business_id", businessId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const addMember = useMutation({
    mutationFn: async () => {
      if (!memberEmail.trim() || !memberEmail.includes("@")) {
        throw new Error("Enter the member's Accountabul email.");
      }
      const { error } = await supabase.rpc("invite_business_member", {
        _business_id: businessId,
        _email: memberEmail.trim(),
        _role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMemberEmail("");
      toast.success("Invitation created. The member will see it after signing in.");
      void queryClient.invalidateQueries({ queryKey: ["business-staff", businessId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const changeRole = useMutation({
    mutationFn: async ({ id, nextRole }: { id: string; nextRole: typeof role }) => {
      const { error } = await supabase.rpc("update_business_member_role", {
        _membership_id: id,
        _role: nextRole,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Staff role updated.");
      void queryClient.invalidateQueries({ queryKey: ["business-staff", businessId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const revokeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("revoke_business_member", {
        _membership_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Staff access revoked.");
      void queryClient.invalidateQueries({ queryKey: ["business-staff", businessId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="surface-card mt-6 p-6">
      <h2 className="text-lg font-semibold">Staff access</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Owners can invite an existing Accountabul member by account email and assign least-privilege
        access. Invitations appear in the member's dashboard.
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        {members.data?.map((member) => (
          <li
            key={member.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
          >
            <span>{member.user_id.slice(0, 8)}…</span>
            <div className="flex flex-wrap items-center gap-2">
              {canManage &&
              member.membership_role !== "owner" &&
              member.invitation_status !== "revoked" ? (
                <select
                  aria-label={`Role for member ${member.user_id.slice(0, 8)}`}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={member.membership_role}
                  disabled={changeRole.isPending}
                  onChange={(event) =>
                    changeRole.mutate({
                      id: member.id,
                      nextRole: event.target.value as typeof role,
                    })
                  }
                >
                  <option value="manager">Manager</option>
                  <option value="listing_manager">Listing manager</option>
                  <option value="lead_manager">Lead manager</option>
                  <option value="viewer">Viewer</option>
                </select>
              ) : (
                <span>{member.membership_role.replace("_", " ")}</span>
              )}
              <span className="text-muted-foreground">{member.invitation_status}</span>
              {canManage &&
              member.membership_role !== "owner" &&
              member.invitation_status !== "revoked" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={revokeMember.isPending}
                  onClick={() => revokeMember.mutate(member.id)}
                >
                  Revoke
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {canManage ? (
        <form
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            addMember.mutate();
          }}
        >
          <Input
            type="email"
            value={memberEmail}
            onChange={(event) => setMemberEmail(event.target.value)}
            placeholder="member@example.com"
            aria-label="Existing member account email"
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={role}
            onChange={(event) => setRole(event.target.value as typeof role)}
            aria-label="Staff role"
          >
            <option value="manager">Manager</option>
            <option value="listing_manager">Listing manager</option>
            <option value="lead_manager">Lead manager</option>
            <option value="viewer">Viewer</option>
          </select>
          <Button type="submit" disabled={addMember.isPending || !memberEmail.trim()}>
            Invite staff
          </Button>
        </form>
      ) : null}
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
