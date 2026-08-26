# Week 4 : Technical Review

## Diagram Review

I reviewed the SkinSense Gantt chart and use-case diagram for consistency with the proposed system.

The main implementation dependency was verified as:

`Data Preparation -> Models -> API Integration -> Recommendation Engine -> Frontend -> Testing`

The use-case diagram correctly separates User functions from the Admin function for managing product and ingredient data. PostgreSQL is treated as an internal database component rather than an external actor.

## ACNE04 Review

I reviewed the supplied ACNE04 method for the planned acne-severity classifier. The method uses three severity groups: mild (1-5), moderate (6-20), and severe (>20), with class balancing, resizing, and normalization before training.

## Contribution

I checked the terminology and dependency order in both diagrams and recorded the model-related requirements for later implementation.

No application code was written during this task.
