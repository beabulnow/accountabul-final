# Route Map — Accountabul Platform Production

Preserved from the approved Accountabul concept. Every major task has a real route; the
product is never collapsed onto one long page.

| Route                   | File                                  | Audience        | Purpose                                                              | Phase       |
| ----------------------- | ------------------------------------- | --------------- | -------------------------------------------------------------------- | ----------- |
| `/`                     | `src/routes/index.tsx`                | Public          | Home, value proposition, featured live event, properties, businesses | 0 shell / 2 |
| `/signup`               | `src/routes/signup.tsx`               | Public          | Member or business onboarding choice                                 | 1           |
| `/login`                | `src/routes/login.tsx`                | Public          | Authentication and recovery                                          | 1           |
| `/live`                 | `src/routes/live.index.tsx`           | Public          | Current live room, schedule, replays                                 | 3           |
| `/live/$slug`           | `src/routes/live.$slug.tsx`           | Public/member   | Player, unified chat, reminders, tips                                | 3           |
| `/marketplace`          | `src/routes/marketplace.tsx`          | Public          | Searchable real-estate marketplace                                   | 2           |
| `/properties/$slug`     | `src/routes/properties.$slug.tsx`     | Public          | Property detail, gallery, save, inquiry                              | 2           |
| `/businesses`           | `src/routes/businesses.index.tsx`     | Public          | Business directory                                                   | 1           |
| `/businesses/$slug`     | `src/routes/businesses.$slug.tsx`     | Public          | Business profile, properties, services, credentials                  | 1           |
| `/saved`                | `src/routes/saved.tsx`                | Member          | Saved properties, followed businesses                                | 2           |
| `/dashboard`            | `src/routes/dashboard.index.tsx`      | Member/business | Summary and next actions                                             | 1           |
| `/dashboard/profile`    | `src/routes/dashboard.profile.tsx`    | Member/business | Profile/contact data; external notification preferences are deferred | 1           |
| `/dashboard/business`   | `src/routes/dashboard.business.tsx`   | Business        | Identity, staff, public page, verification                           | 1           |
| `/dashboard/properties` | `src/routes/dashboard.properties.tsx` | Business        | Drafts, submissions, published, performance                          | 2           |
| `/dashboard/services`   | `src/routes/dashboard.services.tsx`   | Business        | Services and availability                                            | 2           |
| `/dashboard/leads`      | `src/routes/dashboard.leads.tsx`      | Business        | Property and service inquiries                                       | 2           |
| `/dashboard/billing`    | `src/routes/dashboard.billing.tsx`    | Eligible roles  | Tip receipts, payment status, and reconciled tip history             | 4           |
| `/admin`                | `src/routes/admin.tsx`                | Admin/moderator | Review queues, live ops, moderation, audit                           | 1+          |

`src/routes/dashboard.tsx` is the dashboard layout (sub-navigation + `<Outlet />`).

## Cross-cutting route requirements

- Mobile, tablet, and desktop layouts; no overlapping or clipped controls.
- Keyboard operation with visible focus and correct focus order.
- Loading, empty, error, and success states on every data surface.
- Per-route `head()` metadata with a unique title, description, and Open Graph text.
- Slugs are stable and unique; slug changes must issue redirects.
