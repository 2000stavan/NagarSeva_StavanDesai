// Haversine distance SQL fragment for use in WHERE clauses
export function withinRadiusSQL(latParam, lngParam, radiusParam, alias = 'i') {
  return `haversine_meters(${alias}.latitude, ${alias}.longitude, $${latParam}, $${lngParam}) <= $${radiusParam}`;
}

export const HAVERSINE_SELECT = `
  haversine_meters(i.latitude, i.longitude, $1, $2) AS distance_m
`;
