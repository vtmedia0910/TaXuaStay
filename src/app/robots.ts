import type { MetadataRoute } from "next";
import { buildPublicRobotsFile } from "@/config/seo";

export default function robots(): MetadataRoute.Robots {
  return buildPublicRobotsFile();
}
