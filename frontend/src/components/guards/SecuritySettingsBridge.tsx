"use client";

import { useEffect } from "react";
import { useGetSecuritySystemSettingsQuery } from "@/redux/api/systemSettingsApi";
import { setExposeRequiredPermissionsForErrors } from "@/utils/apiErrorUtils";

export function SecuritySettingsBridge() {
  const { data } = useGetSecuritySystemSettingsQuery();

  useEffect(() => {
    setExposeRequiredPermissionsForErrors(Boolean(data?.expose_required_permissions));
  }, [data?.expose_required_permissions]);

  return null;
}
