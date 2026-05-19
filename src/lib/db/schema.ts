import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  coverImage: text("cover_image"),
  categoryId: integer("category_id").references(() => categories.id),
  author: varchar("author", { length: 100 }).notNull().default("ByteVerse"),
  published: boolean("published").notNull().default(false),
  featured: boolean("featured").notNull().default(false),
  metaTitle: varchar("meta_title", { length: 70 }),
  metaDescription: varchar("meta_description", { length: 160 }),
  keywords: text("keywords"),
  readingTime: varchar("reading_time", { length: 20 }),
  views: integer("views").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  color: varchar("color", { length: 7 }).notNull().default("#6366f1"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const newsletter = pgTable("newsletter", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
  active: boolean("active").notNull().default(true),
});

export const authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  role: varchar("role", { length: 100 }).notNull().default("Author"),
  bio: text("bio"),
  email: varchar("email", { length: 255 }),
  avatar: text("avatar"),
  twitter: varchar("twitter", { length: 255 }),
  linkedin: varchar("linkedin", { length: 255 }),
  github: varchar("github", { length: 255 }),
  youtube: varchar("youtube", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Newsletter = typeof newsletter.$inferSelect;
export type Author = typeof authors.$inferSelect;
export type NewAuthor = typeof authors.$inferInsert;
