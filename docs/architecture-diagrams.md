# Architecture Diagrams

## Component Flow Diagram

This diagram shows the data flow from OpenStreetMap ingestion through analytics to the web viewer.

### Mermaid Diagram

```mermaid
graph TD
    subgraph "OSM Planet / API"
        A[OSM Planet Dump]
        B[OSM Notes API]
    end

    subgraph "Data Ingestion"
        C[OSM-Notes-Ingestion]
        C --> D[(PostgreSQL Database)]
        D --> |Stores| E[notes]
        D --> |Stores| F[note_comments]
        D --> |Stores| G[users]
        D --> |Stores| H[countries]
    end

    subgraph "Data Processing"
        I[OSM-Notes-Analytics]
        I --> |ETL Process| J[Data Warehouse]
        J --> |Star Schema| K[Datamarts]
        J --> |Exports| L[JSON/CSV Files]
    end

    subgraph "Data Repository"
        M[OSM-Notes-Data]
        M --> |Serves via| N[GitHub Pages / CDN]
    end

    subgraph "Web Frontend"
        O[OSM-Notes-Viewer]
        O --> |Vanilla JS| P[Chart.js]
        O --> |Features| Q[Responsive UI]
        O --> |Features| R[PWA]
    end

    subgraph "External Consumers"
        S[AI Assistants]
        T[Other Tools]
        U[Researchers]
    end

    A -->|Downloads notes| C
    B -->|Fetches notes| C
    C -->|Feeds raw data| I
    I -->|Exports JSON/CSV| M
    M -->|Serves static files| O
    O -->|Fetches on-demand| M
    N -->|Public access| S
    N -->|Public access| T
    N -->|Public access| U

    style A fill:#ADD8E6
    style B fill:#ADD8E6
    style C fill:#90EE90
    style D fill:#90EE90
    style I fill:#FFFFE0
    style J fill:#FFFFE0
    style M fill:#E0F6FF
    style N fill:#E0F6FF
    style O fill:#FFB6C1
```

### PlantUML Source

For more advanced diagrams, see `architecture-diagrams.puml` which can be rendered with [PlantUML](https://plantuml.com).

To render the PlantUML file:

```bash
# Install PlantUML
sudo apt-get install plantuml  # Ubuntu/Debian
brew install plantuml          # macOS

# Generate image
plantuml docs/architecture-diagrams.puml

# Output: docs/architecture-diagrams.png
```

### Online Rendering

You can also render these diagrams online:

- **Mermaid**: Use [Mermaid Live Editor](https://mermaid.live/) or [GitHub](https://github.com) (native support)
- **PlantUML**: Use [PlantUML Online Server](http://www.plantuml.com/plantuml/uml/) or [PlantText](https://www.planttext.com/)

## Data Flow Summary

1. **OSM Planet/API** provides raw notes data
2. **OSM-Notes-Ingestion** downloads and stores data in PostgreSQL
3. **OSM-Notes-Analytics** processes data into a star schema data warehouse
4. **OSM-Notes-Data** serves static exports via GitHub Pages
5. **OSM-Notes-Viewer** fetches and visualizes data in the browser
6. **External consumers** (AI, tools, researchers) access public exports

This architecture provides:
- ✅ Separation of concerns
- ✅ Scalable data processing
- ✅ Static, CDN-friendly web deployment
- ✅ Public, accessible data exports

