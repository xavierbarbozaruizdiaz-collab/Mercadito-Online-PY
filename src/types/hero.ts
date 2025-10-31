export type HeroSlide = {
  id: string;
  title: string | null;
  subtitle: string | null;
  cta_primary_label: string | null;
  cta_primary_href: string | null;
  cta_secondary_label: string | null;
  cta_secondary_href: string | null;
  bg_type: 'gradient' | 'image';
  bg_gradient_from: string | null;
  bg_gradient_to: string | null;
  storage_path: string | null;
  position: number;
  is_active: boolean;
};





