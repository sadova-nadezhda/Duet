export type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
  couple_id: string | null;
};

export type Couple = {
  id: string;
  invite_code: string;
  together_since: string | null;
};

export type TaskKind = 'once' | 'weekly' | 'monthly';

export type Task = {
  id: string;
  couple_id: string;
  title: string;
  place: string | null;
  assignee: string | null;
  kind: TaskKind;
  due_date: string | null;
  weekday: number | null; // 1 = Пн … 7 = Вс
  every_n_months: number;
  remind_days_before: number | null;
  done: boolean;
  last_done: string | null;
  reactions: Record<string, string>;
  created_at: string;
};

export type Reminder = {
  id: string;
  title: string;
  assignee: string | null;
  time: string;
  days: number[];
  enabled: boolean;
  created_at: string;
};

export type ShoppingItem = { id: string; title: string; qty: string | null; checked: boolean; created_at: string };
export type Recipe = { id: string; title: string; url: string | null; notes: string | null; created_at: string };

export type WishCategory = 'gift' | 'see' | 'dream';
export type Wish = {
  id: string;
  owner: string;
  category: WishCategory;
  title: string;
  price: number | null;
  currency: string | null;
  url: string | null;
  image_url: string | null;
  note: string | null;
  created_at: string;
};
export type GiftReservation = { wish_id: string; giver: string; status: 'planned' | 'bought' };

export type Place = {
  id: string;
  title: string;
  category: string | null;
  address: string | null;
  visited: boolean;
  note: string | null;
  created_at: string;
};

export type Note = { id: string; author: string; text: string; created_at: string };

export type Movie = {
  id: string;
  tmdb_id: number | null;
  media_type: 'movie' | 'tv';
  title: string;
  original_title: string | null;
  poster_path: string | null;
  year: number | null;
  genres: string[];
  overview: string | null;
  runtime: number | null;
  status: 'want' | 'watched';
  added_by: string | null;
  watched_at: string | null;
  created_at: string;
};

export type MovieRating = {
  movie_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
};
