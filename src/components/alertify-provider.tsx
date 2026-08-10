"use client";

import { useEffect } from "react";

export function AlertifyProvider() {
  useEffect(() => {
    void import("alertifyjs").then(({ default: alertify }) => {
      alertify.set("notifier", "position", "top-right");
      alertify.set("notifier", "delay", 4);
    });
  }, []);
  return null;
}
