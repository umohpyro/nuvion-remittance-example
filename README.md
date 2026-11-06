# Nuvion remittance example

A small app that sends money home across currencies with the [Nuvion](https://docs.nuvion.co) sandbox. You save a recipient, see a transparent quote (the exact amount they receive, the rate and when the quote expires) before anything leaves your account, send, and follow delivery on a status timeline. It has **no database**: Nuvion holds all state. It runs on Next.js 16, React 19, Tailwind CSS 4 and shadcn/ui, and is built for phones first.

> Sandbox only. Nothing here is real and no money moves.

## What it shows

| Page | What it demonstrates | Nuvion calls |
|---|---|---|
| Send `/send` | Pick a recipient and a source account, get a quote with a locked rate, confirm before it expires | `POST /fx-quotes`, `GET /fx-quotes/{id}`, `GET /counterparties/{id}/payment-details`, `POST /transfers` |
| Recipients `/recipients` | A saved address book stored in Nuvion: an individual counterparty plus its payment details | `POST /counterparties`, `POST /payment-details`, `GET /counterparties`, `POST /counterparties/{id}/deactivate` |
| Activity `/activity` | Your transfers, and a delivery page per transfer with a timeline and receipt | `GET /transfers`, `GET /transfers/{id}`, `GET /fx-quotes/{id}` |
| Settings `/settings` | Bring your own key: look up your approved entities and connect one | `GET /entities`, `GET /accounts` |

Recipients can be in four corridors, each a rail from the [Send a Payout](https://docs.nuvion.co/guides/send-a-payout) guide:

| Country | Currency | Rail | Payment detail |
|---|---|---|---|
| Kenya | KES | M-Pesa mobile money (`momo-transfer`, scheme `mpesa`) | `phone_number` |
| Ghana | GHS | MTN mobile money (`momo-transfer`, scheme `mtn`) | `phone_number` |
| Nigeria | NGN | NIP bank transfer (`bank-transfer`) | `bank_name`, `bank_code`, `account_number` |
| United Kingdom | GBP | Faster Payments (`bank-transfer`) | `bank_name`, `sort_code`, `account_number` |

## Run it

The app is bring-your-own-key. Nothing about your Nuvion account is stored on the server or shared between visitors: each visitor connects their own sandbox on the **Settings** page, and everything runs in their own tenant, so you can confirm it in your own dashboard.

You need Node.js 20.9 or later, a Nuvion **sandbox** account, an approved entity, and a funded fiat account (for example USD) on it.

```bash
npm install
npm run dev
```

Open http://localhost:3000/settings, paste your sandbox API key (from the sandbox dashboard, [Settings > Developers](https://app.nuvion.dev/dashboard/settings); see [how API keys work](https://docs.nuvion.co/authentication)), pick an approved entity and connect. Your key is sealed in an `httpOnly` cookie that expires after eight hours. Then add a recipient and send.

| Variable | Description |
|---|---|
| `SESSION_SECRET` | Required in production: a long random string that seals the cookie. Local development generates one for you |
| `PUBLIC_APP_URL` | Optional. The public URL, used for the Open Graph image |
| `NUVION_API_URL` | Optional. Must be a `*.nuvion.dev` host |

Checks:

```bash
npm test
npm run typecheck
npm run lint
```

## How a send works

1. **Save the recipient.** `POST /counterparties` creates an `individual` counterparty tagged in its `meta` (`kind: "remit"`, the corridor and a masked label). `POST /payment-details` then attaches the rail details. If the second call fails, the counterparty is deactivated so a half-saved recipient never appears.
2. **Quote.** `POST /fx-quotes` with the source account's currency, the recipient's currency and `amount_from`. The response gives `amount_to`, the effective `rate` and `quote.expires_at`. The page counts down to it.
3. **Send.** The server re-reads the quote, checks it is `active` and matches the account and recipient, then calls `POST /transfers` with `amount` and `currency` in the **source** currency and `fx_quote_id`. The `unique_reference` is derived from the quote ID, and a quote is single use, so a double click cannot send twice.
4. **Track.** The delivery page reads the transfer on every visit and refreshes while it is `new` or `pending`.

## What to know about Nuvion before you build this

1. **There is no fee preview.** The docs describe no way to price a transfer before creating it. `applicable_fee` appears on the transfer, and Nuvion debits it from the source account on top of `amount`. The quote screen therefore says the fee is added on top and shows on the receipt, and the receipt shows the fee and the total debited.
2. **A failed transfer is not charged.** Nuvion reports an `applicable_fee` on a failed transfer but does not debit it. The receipt shows the fee as not charged and the total as zero.
3. **For a cross-currency payout, `amount` and `currency` are the source side.** `amount` must equal the quote's `amount_from`. The recipient's amount is fixed by the quote's `amount_to`.
4. **Quotes expire and are single use.** `valid_for` varies per quote, so the app reads `quote.expires_at` and does not assume a window.
5. **Nuvion keeps no per-step history of a transfer.** The timeline is derived from `status` (`new`, `pending`, `successful`, `failed`). A failed transfer does not say how far it got, so the middle step stays neutral.
6. **Mobile money and bank payouts have different fields.** Mobile money needs `scheme` and `phone_number` in international format; bank rails need the fields in the table above. Mobile money payouts have per-currency limits, and an amount outside them returns `error_validation_value_out_of_range` with the allowed range in the message, which the app shows as is.
7. **Counterparties cannot be deleted,** only deactivated, and creating one is not idempotent. The app filters its list to `status=active` and finds recipients with `search`, which matches names only (not `meta`).
8. **Counterparty creation needs an address and an email.** This example collects the recipient's address and uses a placeholder email (`recipient@example.com`) because it does not collect one.
9. **Child entities need `entity_id` on every call.** Leaving it out returns a confusing `404`.
10. **Lists return their rows under `data.data`.** Nuvion wraps every response in `data`, and lists put the rows and a `meta` block inside it.
11. **Cloudflare blocks the default user agent of some HTTP libraries.** `src/lib/nuvion.ts` sends its own `User-Agent`.

## What the sandbox can and can't do

The sandbox does not settle every payout. In testing, a GBP bank payout was created as `new` and then ended `failed` within seconds. Treat any corridor as able to end `failed` in the sandbox. The app shows that failure on the delivery page, and nothing is debited.

## Security

See [SECURITY.md](SECURITY.md). Keys are sealed with AES-256-GCM in an `httpOnly` cookie, never sent to client JavaScript, and the app refuses any Nuvion host that is not `*.nuvion.dev`.

## License

MIT
