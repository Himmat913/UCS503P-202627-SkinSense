# Week 4 : Project Timeline

## Gantt Chart

I worked on the SkinSense project timeline and checked the ordering of tasks according to technical dependencies.

The main sequence was arranged as:

`Data Preparation -> Face Verification -> Model Training -> API Integration -> Recommendation Engine -> AM/PM Routine -> Testing -> Pilot Testing -> Refinement`

Database schema design and product/ingredient data preparation were placed before the recommendation engine because the rule-based recommendation module depends on this data.

The timeline also separates the periodic skin-tracking feature from the core flow by marking it as a future/stretch feature.

## Technical Consistency Check

I compared the timeline with the planned system flow to ensure that later tasks do not depend on components that have not yet been scheduled.

## Reference Study

I reviewed the supplied ACNE04 classification method. The approach uses ResNet-50 with skip connections and modified bottleneck blocks. The reviewed preprocessing includes severity reclassification, class balancing, image resizing, and normalization.

No application code was written during this task.
