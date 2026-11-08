/**
 * How many items each homepage grid shows before "View All". Servers and
 * partners use a slider on the homepage instead, which holds all of them.
 */
export const HOME_LIMITS = {
  services: 5,
  projects: 8,
} as const;

/** Items per page on each "View All" page. */
export const PAGE_SIZES = {
  services: 10,
  servers: 12,
  projects: 12,
  partners: 20,
} as const;
