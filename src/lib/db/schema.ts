import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}

// ---- BetterAuth core tables ----

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---- Business (single installation config) ----

export const business = pgTable('business', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  domain: text('domain'),
  logoUrl: text('logo_url'),
  defaultCurrency: text('default_currency').notNull().default('NGN'),
  timezone: text('timezone').notNull().default('Africa/Lagos'),
  activeProvider: text('active_provider').notNull().default('bachs'),
  // Encrypted at rest using AES-GCM with APP_ENCRYPTION_KEY.
  providerCredentials: jsonb('provider_credentials').$type<Record<string, string>>().notNull().default({}),
  emailFrom: text('email_from'),
  invoicePrefix: text('invoice_prefix').notNull().default('INV'),
  nextInvoiceNumber: integer('next_invoice_number').notNull().default(1),
  ...timestamps,
})

// ---- Catalog ----

export const product = pgTable('product', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  active: boolean('active').notNull().default(true),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps,
}, (t) => [index('product_active_idx').on(t.active)])

export const price = pgTable('price', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => product.id, { onDelete: 'cascade' }),
  type: text('type').notNull().default('one_time'), // one_time | recurring
  interval: text('interval'), // month | year (recurring only)
  amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
  currency: text('currency').notNull().default('NGN'),
  providerPlanId: text('provider_plan_id'),
  active: boolean('active').notNull().default(true),
  ...timestamps,
}, (t) => [index('price_product_idx').on(t.productId)])

// ---- Customers & checkout ----

export const customer = pgTable('customer', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  phone: text('phone'),
  providerCustomerId: text('provider_customer_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps,
})

export const checkout = pgTable('checkout', {
  id: uuid('id').primaryKey().defaultRandom(),
  reference: text('reference').notNull().unique(),
  productId: uuid('product_id').notNull().references(() => product.id),
  priceId: uuid('price_id').notNull().references(() => price.id),
  customerId: uuid('customer_id').references(() => customer.id),
  customerEmail: text('customer_email'),
  customerName: text('customer_name'),
  status: text('status').notNull().default('open'), // open | completed | failed | expired
  provider: text('provider').notNull(),
  providerSessionId: text('provider_session_id'),
  providerUrl: text('provider_url'),
  amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
  currency: text('currency').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps,
}, (t) => [index('checkout_status_idx').on(t.status)])

// ---- Orders, payments, subscriptions ----

export const order = pgTable('order', {
  id: uuid('id').primaryKey().defaultRandom(),
  number: text('number').notNull().unique(),
  customerId: uuid('customer_id').notNull().references(() => customer.id),
  checkoutId: uuid('checkout_id').references(() => checkout.id),
  status: text('status').notNull().default('pending'), // pending | paid | failed | refunded
  subtotal: numeric('subtotal', { precision: 19, scale: 4 }).notNull(),
  total: numeric('total', { precision: 19, scale: 4 }).notNull(),
  currency: text('currency').notNull(),
  ...timestamps,
}, (t) => [index('order_customer_idx').on(t.customerId)])

export const orderItem = pgTable('order_item', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => order.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => product.id),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitAmount: numeric('unit_amount', { precision: 19, scale: 4 }).notNull(),
  amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
})

export const payment = pgTable('payment', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => order.id),
  customerId: uuid('customer_id').notNull().references(() => customer.id),
  provider: text('provider').notNull(),
  providerReference: text('provider_reference').notNull().unique(),
  status: text('status').notNull(), // pending | succeeded | failed
  amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
  currency: text('currency').notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>(),
  ...timestamps,
})

export const refund = pgTable('refund', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull().references(() => payment.id),
  provider: text('provider').notNull(),
  providerReference: text('provider_reference'),
  amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
  reason: text('reason'),
  status: text('status').notNull().default('pending'),
  ...timestamps,
})

export const subscription = pgTable('subscription', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customer.id),
  priceId: uuid('price_id').notNull().references(() => price.id),
  provider: text('provider').notNull(),
  providerSubscriptionId: text('provider_subscription_id').notNull().unique(),
  status: text('status').notNull(), // trialing | active | past_due | unpaid | canceled | incomplete
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  // Paystack requires an email token with subscription codes to manage/cancel.
  managementToken: text('management_token'),
  // Tokenized recurring providers (card-on-file) store a reusable token here.
  paymentToken: text('payment_token'),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps,
}, (t) => [
  index('subscription_customer_idx').on(t.customerId),
  index('subscription_status_idx').on(t.status),
])

export const invoice = pgTable('invoice', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => order.id),
  customerId: uuid('customer_id').notNull().references(() => customer.id),
  number: text('number').notNull().unique(),
  status: text('status').notNull().default('draft'), // draft | issued | paid | void
  amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
  currency: text('currency').notNull(),
  pdfKey: text('pdf_key'),
  issuedAt: timestamp('issued_at', { withTimezone: true }),
  ...timestamps,
})

// ---- Infrastructure ----

export const providerEvent = pgTable('provider_event', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull(),
  eventId: text('event_id').notNull(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  status: text('status').notNull().default('pending'), // pending | processed | failed | ignored
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
}, (t) => [uniqueIndex('provider_event_unique').on(t.provider, t.eventId)])

export const webhookEndpoint = pgTable('webhook_endpoint', {
  id: uuid('id').primaryKey().defaultRandom(),
  url: text('url').notNull(),
  secret: text('secret').notNull(),
  events: jsonb('events').$type<string[]>().notNull().default([]),
  active: boolean('active').notNull().default(true),
  ...timestamps,
})

export const webhookDelivery = pgTable('webhook_delivery', {
  id: uuid('id').primaryKey().defaultRandom(),
  endpointId: uuid('endpoint_id').notNull().references(() => webhookEndpoint.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  status: text('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  responseCode: integer('response_code'),
  ...timestamps,
})

export const jobQueue = pgTable('job_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
  status: text('status').notNull().default('pending'), // pending | processing | completed | failed
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(5),
  runAt: timestamp('run_at', { withTimezone: true }).defaultNow().notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (t) => [index('job_queue_pending_idx').on(t.status, t.runAt)])

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorType: text('actor_type').notNull(), // admin | customer | system | provider
  actorId: text('actor_id'),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: text('target_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const emailLog = pgTable('email_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  to: text('to').notNull(),
  subject: text('subject').notNull(),
  template: text('template').notNull(),
  status: text('status').notNull().default('pending'),
  providerId: text('provider_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---- Relations ----

export const productRelations = relations(product, ({ many }) => ({
  prices: many(price),
}))

export const priceRelations = relations(price, ({ one }) => ({
  product: one(product, { fields: [price.productId], references: [product.id] }),
}))

export const customerRelations = relations(customer, ({ many }) => ({
  orders: many(order),
  subscriptions: many(subscription),
}))

export const orderRelations = relations(order, ({ one, many }) => ({
  customer: one(customer, { fields: [order.customerId], references: [customer.id] }),
  items: many(orderItem),
  payments: many(payment),
  invoice: many(invoice),
}))

export const paymentRelations = relations(payment, ({ one }) => ({
  order: one(order, { fields: [payment.orderId], references: [order.id] }),
}))

export const subscriptionRelations = relations(subscription, ({ one }) => ({
  customer: one(customer, { fields: [subscription.customerId], references: [customer.id] }),
  price: one(price, { fields: [subscription.priceId], references: [price.id] }),
}))
