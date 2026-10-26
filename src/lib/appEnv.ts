/** True when this build is the acceptance-testing admin (Vite mode `uat`). */
export const isUat =
  import.meta.env.MODE === "uat" || import.meta.env.VITE_APP_ENV === "uat";
