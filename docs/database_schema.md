# Database Schema (PostgreSQL)

## ERD Diagram

```mermaid
erDiagram
    USERS ||--o{ FRIENDS : has
    USERS ||--o{ VIOLATIONS : commits
    USERS ||--o{ SNAPSHOTS : generates
    USERS ||--o{ SETTINGS : has
    USERS ||--o{ GROUP_CALL_PARTICIPANTS : joins

    USERS {
        uuid id PK
        string email UK
        string private_id UK
        string avatar_url
        int reputation_score
        timestamp created_at
        timestamp last_active
        boolean is_banned
    }

    FRIENDS {
        uuid user_id FK
        uuid friend_id FK
        enum status "PENDING, ACCEPTED, BLOCKED"
        timestamp created_at
    }

    VIOLATIONS {
        uuid id PK
        uuid user_id FK
        enum type "NUDITY, VIOLENCE, TOXICITY, FAKE_CAM"
        float confidence_score
        timestamp detected_at
        jsonb metadata
    }

    SNAPSHOTS {
        uuid id PK
        uuid violation_id FK
        string storage_url
        timestamp expires_at
    }

    SETTINGS {
        uuid user_id PK, FK
        boolean allow_random_calls
        boolean allow_friend_calls
        boolean private_mode
        jsonb notification_prefs
    }

    GROUP_CALLS {
        uuid id PK
        uuid host_id FK
        timestamp started_at
        timestamp ended_at
        boolean is_active
    }

    GROUP_CALL_PARTICIPANTS {
        uuid call_id FK
        uuid user_id FK
        timestamp joined_at
        timestamp left_at
    }
```

## Table Definitions

### `users`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, Default: gen_random_uuid() | Unique User ID |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | User Email (Hidden) |
| `private_id` | VARCHAR(20) | UNIQUE, NOT NULL | Publicly shareable ID |
| `reputation_score` | INT | Default: 100 | Behavior score |

### `friends`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | UUID | FK -> users.id | Requester |
| `friend_id` | UUID | FK -> users.id | Recipient |
| `status` | ENUM | 'PENDING', 'ACCEPTED', 'BLOCKED' | Relationship status |

### `violations`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Violation ID |
| `user_id` | UUID | FK -> users.id | Offender |
| `type` | VARCHAR | NOT NULL | Type of violation |
| `evidence_id` | UUID | FK -> snapshots.id | Link to evidence |

### `rtmp_configs`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | UUID | FK -> users.id | Streamer |
| `stream_key` | VARCHAR | Encrypted | YouTube/Twitch Key |
| `platform` | VARCHAR | 'YOUTUBE', 'TWITCH' | Target Platform |
