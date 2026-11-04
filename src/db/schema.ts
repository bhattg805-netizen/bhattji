import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, doublePrecision, index } from 'drizzle-orm/pg-core';

// 1. Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role').default('user').notNull(), // 'user' or 'admin'
  balance: doublePrecision('balance').default(0.0).notNull(),
  status: text('status').default('active').notNull(), // 'active', 'suspended'
  customRate: doublePrecision('custom_rate').default(1.0).notNull(), // Multiplier for custom pricing
  customProviderUrl: text('custom_provider_url'),
  customProviderKey: text('custom_provider_key'),
  apiKey: text('api_key'),
  password: text('password'),
  lastLoginAt: timestamp('last_login_at'),
  lastIp: text('last_ip'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Providers Table (API Provider Management)
export const providers = pgTable('providers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  apiUrl: text('api_url').notNull(),
  apiKey: text('api_key').notNull(),
  status: text('status').default('active').notNull(), // 'active', 'inactive'
  balance: doublePrecision('balance').default(0.0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. Categories Table
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  status: text('status').default('active').notNull(), // 'active', 'inactive'
  sortOrder: integer('sort_order').default(0).notNull(),
  icon: text('icon'), // Stores 'facebook', 'instagram', 'telegram', 'youtube', 'tiktok', 'twitter', 'globe', emoji, or custom URL
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Services Table
export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id')
    .references(() => categories.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  description: text('description'),
  pricePerThousand: doublePrecision('price_per_thousand').notNull(),
  minAmount: integer('min_amount').default(10).notNull(),
  maxAmount: integer('max_amount').default(10000).notNull(),
  status: text('status').default('active').notNull(), // 'active', 'inactive'
  providerId: integer('provider_id').references(() => providers.id, { onDelete: 'set null' }),
  providerServiceId: text('provider_service_id'),
  icon: text('icon'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Orders Table
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  serviceId: integer('service_id')
    .references(() => services.id, { onDelete: 'set null' }),
  serviceName: text('service_name'),
  link: text('link').notNull(),
  quantity: integer('quantity').notNull(),
  charge: doublePrecision('charge').notNull(),
  status: text('status').default('pending').notNull(), // 'pending', 'processing', 'completed', 'partial', 'cancelled', 'refunded'
  startCount: integer('start_count').default(0).notNull(),
  remains: integer('remains').default(0).notNull(),
  providerOrderId: text('provider_order_id'),
  refillStatus: text('refill_status').default('none').notNull(), // 'none', 'requested', 'completed', 'rejected'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. Payments Table
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  amount: doublePrecision('amount').notNull(),
  paymentMethod: text('payment_method').notNull(), // 'Stripe', 'PayPal', 'Razorpay', 'PhonePe', 'UPI', 'Manual'
  transactionId: text('transaction_id').unique(),
  status: text('status').default('pending').notNull(), // 'pending', 'completed', 'failed'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. Coupons Table
export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  discountPercent: integer('discount_percent').notNull(),
  maxUsage: integer('max_usage'),
  usageCount: integer('usage_count').default(0).notNull(),
  status: text('status').default('active').notNull(), // 'active', 'expired'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8. Tickets Table
export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  subject: text('subject').notNull(),
  status: text('status').default('open').notNull(), // 'open', 'answered', 'closed'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 9. Ticket Messages Table
export const ticketMessages = pgTable('ticket_messages', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id')
    .references(() => tickets.id, { onDelete: 'cascade' })
    .notNull(),
  senderId: integer('sender_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 10. Announcements Table
export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  type: text('type').default('info').notNull(), // 'info', 'success', 'warning', 'danger'
  status: text('status').default('active').notNull(), // 'active', 'inactive'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. Activity Logs Table
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  details: text('details'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 12. Affiliates Table (Affiliate Program)
export const affiliates = pgTable('affiliates', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull().unique(),
  referralCode: text('referral_code').notNull().unique(),
  earnings: doublePrecision('earnings').default(0.0).notNull(),
  visits: integer('visits').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 13. Referrals Table
export const referrals = pgTable('referrals', {
  id: serial('id').primaryKey(),
  affiliateId: integer('affiliate_id')
    .references(() => affiliates.id, { onDelete: 'cascade' })
    .notNull(),
  referredUserId: integer('referred_user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 14. Favorite Services Table
export const favoriteServices = pgTable('favorite_services', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  serviceId: integer('service_id')
    .references(() => services.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 15. Child Panels Table
export const childPanels = pgTable('child_panels', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  domain: text('domain').notNull(),
  currency: text('currency').default('USD').notNull(),
  adminUsername: text('admin_username').notNull(),
  adminPassword: text('admin_password').notNull(),
  price: doublePrecision('price').default(10.0).notNull(),
  status: text('status').default('pending').notNull(), // 'pending', 'active', 'expired', 'cancelled'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 16. Refill Requests Table
export const refillRequests = pgTable('refill_requests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  orderId: integer('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  status: text('status').default('pending').notNull(), // 'pending', 'processing', 'completed', 'rejected'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  orders: many(orders),
  payments: many(payments),
  tickets: many(tickets),
  ticketMessages: many(ticketMessages),
  activityLogs: many(activityLogs),
  affiliate: one(affiliates, {
    fields: [users.id],
    references: [affiliates.userId],
  }),
  referrals: many(referrals),
  favorites: many(favoriteServices),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  category: one(categories, {
    fields: [services.categoryId],
    references: [categories.id],
  }),
  provider: one(providers, {
    fields: [services.providerId],
    references: [providers.id],
  }),
  orders: many(orders),
  favorites: many(favoriteServices),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  service: one(services, {
    fields: [orders.serviceId],
    references: [services.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  user: one(users, {
    fields: [tickets.userId],
    references: [users.id],
  }),
  messages: many(ticketMessages),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketMessages.ticketId],
    references: [tickets.id],
  }),
  sender: one(users, {
    fields: [ticketMessages.senderId],
    references: [users.id],
  }),
}));

export const affiliatesRelations = relations(affiliates, ({ one, many }) => ({
  user: one(users, {
    fields: [affiliates.userId],
    references: [users.id],
  }),
  referrals: many(referrals),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  affiliate: one(affiliates, {
    fields: [referrals.affiliateId],
    references: [affiliates.id],
  }),
  referredUser: one(users, {
    fields: [referrals.referredUserId],
    references: [users.id],
  }),
}));

export const favoriteServicesRelations = relations(favoriteServices, ({ one }) => ({
  user: one(users, {
    fields: [favoriteServices.userId],
    references: [users.id],
  }),
  service: one(services, {
    fields: [favoriteServices.serviceId],
    references: [services.id],
  }),
}));

// 17. Settings Table
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 18. Blogs Table
export const blogs = pgTable('blogs', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  content: text('content').notNull(),
  authorId: integer('author_id').references(() => users.id, { onDelete: 'set null' }),
  status: text('status').default('published').notNull(), // 'published', 'draft'
  coverImage: text('cover_image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const blogsRelations = relations(blogs, ({ one }) => ({
  author: one(users, {
    fields: [blogs.authorId],
    references: [users.id],
  }),
}));

// 19. Appointments Table (Synced with Supabase)
export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  date: text('date').notNull(),
  timeSlot: text('time_slot').notNull(),
  serviceType: text('service_type').default('General Consultation'),
  message: text('message'),
  status: text('status').default('pending').notNull(), // 'pending', 'confirmed', 'completed', 'cancelled'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  user: one(users, {
    fields: [appointments.userId],
    references: [users.id],
  }),
}));


