"use client";

import dynamic from "next/dynamic";

const CfoPresencePill = dynamic(() => import("@/components/CfoPresencePill"), {
  ssr: false,
});

/** Mounts CFO presence only on the client (login / hard-nav safe). */
export default function CfoPresenceHost() {
  return <CfoPresencePill />;
}
