# Week 12 : Component and Deployment Diagrams

## Component Diagram

I drew the component diagram for the project in draw.io. The diagram shows five main components: the React frontend, the FastAPI backend, the PostgreSQL database, the ML models (acne and skin type), and the MediaPipe validation module. I drew dependency arrows to show which components call which. The ML models and MediaPipe are shown as internal components of the backend, not as external services, which is correct because they run in the same process.

## Deployment Diagram

I drew the deployment diagram showing the local development setup. It has two nodes: the developer's machine, which hosts both the React dev server (port 5173) and the FastAPI server (port 8000), and the PostgreSQL instance running as a local service. The two servers communicate over localhost.

## Recommendation Engine Cleanup

I cleaned up the `get_recommendations` function so the return type is consistent regardless of which filters are applied. Previously some code paths returned a dict and some returned a dataclass; I standardised on the dataclass used in the schema.

## Notes

The diagrams are in draw.io XML format in the repo. The component and deployment diagrams were part of the CE documentation requirements for this week.
