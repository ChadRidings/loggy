import { Geostar_Fill, Roboto_Condensed } from "next/font/google";

export const robotoCondensed = Roboto_Condensed({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-roboto-condensed",
});

export const geostarFill = Geostar_Fill({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-geostar-fill",
});
