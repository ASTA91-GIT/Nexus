import NexusLanding from "@/components/landing/NexusLanding";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "NEXUS | AI-Powered Intelligence Platform",
  description: "Transform complex evidence, entities, relationships, and intelligence into actionable investigative insight.",
};

export default function Home() {
  return <NexusLanding />;
}
