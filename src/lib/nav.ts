import type { LucideIcon } from "lucide-react";
import { Compass, Heart, Home, Library, Monitor, Trophy, User } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the mobile tab bar. Desktop shows the full set. */
  mobile: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", icon: Home, mobile: true },
  { href: "/explore", label: "Explore", icon: Compass, mobile: true },
  { href: "/favorites", label: "Favorites", icon: Heart, mobile: true },
  { href: "/library", label: "Library", icon: Library, mobile: true },
  { href: "/profile", label: "Profile", icon: User, mobile: true },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy, mobile: false },
  { href: "/devices", label: "Devices", icon: Monitor, mobile: false },
];

export const MOBILE_NAV = NAV_ITEMS.filter((i) => i.mobile);
