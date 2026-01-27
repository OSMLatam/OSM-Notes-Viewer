# ADR-0003: Consume JSON from Separate Repository

## Status

Accepted

## Context

The Viewer needs to consume analytics data. We need to decide how to structure the data delivery:

- Should data be part of the Viewer repository?
- Should data be in a separate repository?
- How should data updates be handled?

## Decision

We will consume JSON data from a separate repository (OSM-Notes-Data) served via GitHub Pages,
rather than bundling data with the Viewer.

## Consequences

### Positive

- **Separation of concerns**: Data and viewer are independent
- **Easy updates**: Update data without rebuilding viewer
- **Better caching**: Separate caching for data and app
- **Scalability**: Easy to migrate to CDN later
- **Public data**: Data repository is publicly accessible
- **Independent versioning**: Data and viewer can evolve independently
- **Reduced repository size**: Viewer repository stays small

### Negative

- **External dependency**: Viewer depends on external data source
- **Network dependency**: Requires network access to fetch data
- **CORS considerations**: Must handle CORS if using different domains
- **Data availability**: Viewer fails if data source is unavailable

## Alternatives Considered

### Alternative 1: Bundle data with Viewer

- **Description**: Include JSON files in the Viewer repository
- **Pros**: No external dependency, works offline
- **Cons**: Large repository, requires rebuild to update data, tight coupling
- **Why not chosen**: Separation allows independent updates and better scalability

### Alternative 2: Use API for all data

- **Description**: Fetch all data from OSM-Notes-API
- **Pros**: Dynamic data, no pre-generation needed
- **Cons**: Requires API infrastructure, slower initial load, API dependency
- **Why not chosen**: Static JSON provides better performance for read-heavy workloads

### Alternative 3: Hybrid approach (current)

- **Description**: Use static JSON for most data, API for dynamic queries
- **Pros**: Best of both worlds, performance where needed, flexibility where needed
- **Cons**: Two data sources to maintain
- **Why not chosen**: This is actually what we're doing - static JSON for Viewer, API for dynamic
  needs

## References

- [Data Architecture](Architecture.md#data-architecture)
- [OSM-Notes-Data Repository](https://github.com/OSM-Notes/OSM-Notes-Data)
