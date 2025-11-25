# Appwrite Collection Schemas

Create these collections in your Appwrite database. Use the exact attribute names shown.

---

## 1. `users` Collection

Stores Telegram users who interact with the bot.

| Attribute     | Type    | Required | Default | Description                    |
|---------------|---------|----------|---------|--------------------------------|
| telegramId    | Integer | Yes      | -       | Telegram user ID               |
| username      | String  | No       | null    | Telegram @username             |
| name          | String  | No       | null    | Display name (first + last)    |
| role          | String  | No       | "user"  | "user", "distributor", "admin" |
| createdAt     | String  | No       | -       | ISO datetime                   |

**Indexes:**
- `telegramId` (unique)

---

## 2. `lines` Collection

Water distribution lines.

| Attribute   | Type    | Required | Default | Description           |
|-------------|---------|----------|---------|-----------------------|
| name        | String  | Yes      | -       | Line name (e.g. "Line 1") |
| label       | String  | No       | null    | Display label         |
| description | String  | No       | null    | Optional description  |
| active      | Boolean | No       | true    | Is line active?       |

**Indexes:**
- `name` (unique)

**Seed Data:**
```
Line 1, Line 2, Line 3, Line 4, Line 5, Line 6, Line 7, Line 8, Line 9, Line 10
```

---

## 3. `schedules` Collection

Water schedule entries.

| Attribute | Type    | Required | Default | Description                           |
|-----------|---------|----------|---------|---------------------------------------|
| lineId    | String  | Yes      | -       | Reference to lines collection         |
| startAt   | String  | Yes      | -       | ISO datetime (start of water)         |
| endAt     | String  | Yes      | -       | ISO datetime (end of water)           |
| status    | String  | No       | "upcoming" | "upcoming", "ongoing", "done"      |
| notes     | String  | No       | null    | Optional notes                        |
| createdBy | Integer | No       | -       | Telegram ID of creator                |
| createdAt | String  | No       | -       | ISO datetime                          |

**Indexes:**
- `lineId`
- `startAt`
- `status`

---

## 4. `line_subscribers` Collection

User subscriptions to water lines.

| Attribute   | Type    | Required | Default | Description             |
|-------------|---------|----------|---------|-------------------------|
| telegramId  | Integer | Yes      | -       | Telegram user ID        |
| lineIds     | String[] | No      | []      | Array of line doc IDs   |
| subscribedAt| String  | No       | -       | ISO datetime            |

**Indexes:**
- `telegramId` (unique)

---

## Quick Setup in Appwrite Console

1. Go to Databases → Select your database
2. Create each collection with the name shown above
3. Add attributes matching the tables
4. Create indexes as specified
5. Seed the `lines` collection with Line 1 through Line 10

After creating, note the collection IDs and update your `.env`:
```
APPWRITE_COLL_USERS=<users_collection_id>
APPWRITE_COLL_LINES=<lines_collection_id>
APPWRITE_COLL_SCHEDULES=<schedules_collection_id>
APPWRITE_COLL_LINE_SUBSCRIBERS=<line_subscribers_collection_id>
```
