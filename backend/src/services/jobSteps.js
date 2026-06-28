export const STEP_FALLBACKS = {
  pothole: [
    { step_number: 1, label: 'Site inspection', instruction: 'Photograph the pothole with a scale reference.', photo_guidance: 'Full pothole with reference object', estimated_minutes: 10 },
    { step_number: 2, label: 'Mark and clean area', instruction: 'Clear debris and mark repair boundaries.', photo_guidance: 'Cleaned area ready for repair', estimated_minutes: 20 },
    { step_number: 3, label: 'Apply primer', instruction: 'Apply tack coat to the area.', photo_guidance: 'Wet primer on surface', estimated_minutes: 15 },
    { step_number: 4, label: 'Fill and compact', instruction: 'Fill with material and compact.', photo_guidance: 'Compaction in progress', estimated_minutes: 30 },
    { step_number: 5, label: 'Final surface', instruction: 'Level and finish the surface.', photo_guidance: 'Finished repair surface', estimated_minutes: 15 },
  ],
  water_leakage: [
    { step_number: 1, label: 'Locate source', instruction: 'Find and photograph the leak point.', photo_guidance: 'Active leak or wet spot', estimated_minutes: 15 },
    { step_number: 2, label: 'Shut off valve', instruction: 'Close water supply valve.', photo_guidance: 'Closed valve', estimated_minutes: 10 },
    { step_number: 3, label: 'Excavate', instruction: 'Dig to expose pipe if underground.', photo_guidance: 'Exposed pipe section', estimated_minutes: 45 },
    { step_number: 4, label: 'Repair pipe', instruction: 'Fix or replace damaged section.', photo_guidance: 'Repaired pipe joint', estimated_minutes: 60 },
    { step_number: 5, label: 'Test and close', instruction: 'Turn water on and verify no leak.', photo_guidance: 'Dry area after test', estimated_minutes: 20 },
    { step_number: 6, label: 'Restore surface', instruction: 'Backfill and restore ground.', photo_guidance: 'Restored surface', estimated_minutes: 30 },
  ],
  streetlight: [
    { step_number: 1, label: 'Safety isolation', instruction: 'Isolate power supply safely.', photo_guidance: 'Isolation switch off', estimated_minutes: 10 },
    { step_number: 2, label: 'Access fitting', instruction: 'Open lamp housing.', photo_guidance: 'Open housing', estimated_minutes: 15 },
    { step_number: 3, label: 'Replace component', instruction: 'Install new bulb or component.', photo_guidance: 'New component installed', estimated_minutes: 25 },
    { step_number: 4, label: 'Test light', instruction: 'Restore power and verify light works.', photo_guidance: 'Light illuminated', estimated_minutes: 10 },
    { step_number: 5, label: 'Secure housing', instruction: 'Close and secure fitting.', photo_guidance: 'Closed secure housing', estimated_minutes: 10 },
  ],
  waste: [
    { step_number: 1, label: 'Before photo', instruction: 'Photograph waste site before clearance.', photo_guidance: 'Full waste pile', estimated_minutes: 5 },
    { step_number: 2, label: 'Collection', instruction: 'Photograph team collecting waste.', photo_guidance: 'Workers collecting', estimated_minutes: 30 },
    { step_number: 3, label: 'Loading', instruction: 'Photograph waste being loaded.', photo_guidance: 'Waste in vehicle', estimated_minutes: 20 },
    { step_number: 4, label: 'Clear site', instruction: 'Photograph cleaned area.', photo_guidance: 'Empty clean site', estimated_minutes: 15 },
    { step_number: 5, label: 'Disposal confirmation', instruction: 'Confirm disposal location.', photo_guidance: 'Disposal site', estimated_minutes: 10 },
  ],
  road_damage: [
    { step_number: 1, label: 'Site inspection', instruction: 'Document road damage extent.', photo_guidance: 'Full damage area', estimated_minutes: 10 },
    { step_number: 2, label: 'Preparation', instruction: 'Prepare and clean repair zone.', photo_guidance: 'Prepared surface', estimated_minutes: 25 },
    { step_number: 3, label: 'Repair work', instruction: 'Apply repair materials.', photo_guidance: 'Repair in progress', estimated_minutes: 45 },
    { step_number: 4, label: 'Final check', instruction: 'Verify safe finished surface.', photo_guidance: 'Completed repair', estimated_minutes: 15 },
  ],
  other: [
    { step_number: 1, label: 'Site inspection', instruction: 'Photograph the issue site.', photo_guidance: 'Full issue view', estimated_minutes: 10 },
    { step_number: 2, label: 'Work in progress', instruction: 'Document repair work.', photo_guidance: 'Active repair', estimated_minutes: 30 },
    { step_number: 3, label: 'Final check', instruction: 'Photograph completed work.', photo_guidance: 'Finished result', estimated_minutes: 10 },
  ],
};

export function getFallbackSteps(category) {
  const steps = STEP_FALLBACKS[category] || STEP_FALLBACKS.other;
  return {
    steps,
    total_estimated_hours: steps.reduce((s, x) => s + x.estimated_minutes, 0) / 60,
    materials_needed: ['Standard repair kit'],
    safety_equipment: ['Helmet', 'Gloves', 'Safety vest'],
  };
}

export function calculatePerformanceScore(metrics) {
  const assigned = metrics.jobs_assigned || 1;
  const completionRate = (metrics.jobs_completed || 0) / assigned;
  const speedScore = metrics.avg_hours && metrics.estimated_hours
    ? Math.max(0, 1 - metrics.avg_hours / metrics.estimated_hours)
    : 0.5;
  const satisfactionScore = (metrics.citizen_satisfaction_avg || 3) / 5;
  const safetyScore = (metrics.sos_count || 0) === 0 ? 1 : Math.max(0, 1 - metrics.sos_count * 0.1);
  return Math.round((completionRate * 0.35 + speedScore * 0.25 + satisfactionScore * 0.3 + safetyScore * 0.1) * 100);
}
