/** Row shapes for the Phase 3 tables. Kept hand-written and narrow so the
 *  app never depends on generated types being regenerated. */

export interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  theme: string;
  created_at: string;
  updated_at: string;
}

export interface FavoriteRow {
  id: string;
  user_id: string;
  skill_id: string;
  skill_name: string;
  skill_source: string;
  created_at: string;
}

export interface CollectionRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CollectionSkillRow {
  id: string;
  collection_id: string;
  skill_id: string;
  skill_name: string;
  skill_source: string;
  position: number;
  created_at: string;
}

export interface CollectionWithCount extends CollectionRow {
  item_count: number;
}
