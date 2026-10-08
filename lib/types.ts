export type Trial = {
  id: number;
  created_at: string;
  session: string | null;
  shooter: string | null;
  draw_angle: number;
  front_pin: number;
  stop_pin: number;
  distance_in: number;
  surface: string;
  notes: string | null;
};
