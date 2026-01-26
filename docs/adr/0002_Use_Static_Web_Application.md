# ADR-0002: Use Static Web Application

## Status

Accepted

## Context

We need to create a web application for viewing OSM Notes analytics. The application should be:
- Fast to load
- Easy to deploy
- Low maintenance
- Cost-effective
- Accessible without server infrastructure

## Decision

We will build a static web application using vanilla JavaScript, HTML, and CSS, deployable to GitHub Pages or any static hosting.

## Consequences

### Positive

- **Performance**: No server-side processing, fast page loads
- **Deployment**: Simple deployment to GitHub Pages or any static host
- **Cost**: Free hosting on GitHub Pages
- **Reliability**: No server to maintain, no downtime
- **Scalability**: CDN can handle unlimited traffic
- **Security**: No server-side attack surface
- **Offline capability**: Can work offline with service workers

### Negative

- **No server-side logic**: All logic must run client-side
- **API dependency**: Requires external API or data source
- **Browser compatibility**: Must work across different browsers
- **SEO limitations**: Less dynamic SEO capabilities

## Alternatives Considered

### Alternative 1: Server-side rendered application (Node.js, PHP, Python)

- **Description**: Build a traditional server-side application
- **Pros**: Server-side logic, better SEO, server-side rendering
- **Cons**: Requires server infrastructure, maintenance overhead, costs
- **Why not chosen**: Static app provides better performance and lower costs

### Alternative 2: Single Page Application (SPA) with build step (React, Vue, Angular)

- **Description**: Use modern SPA framework with build tools
- **Pros**: Modern development experience, component reusability
- **Cons**: Build complexity, larger bundle size, requires build infrastructure
- **Why not chosen**: Vanilla JS is simpler and sufficient for current needs

### Alternative 3: Progressive Web App (PWA) with framework

- **Description**: Build PWA with modern framework
- **Pros**: Modern features, offline support, app-like experience
- **Cons**: Complexity, build requirements, larger bundle
- **Why not chosen**: Can add PWA features to static app without framework overhead

## References

- [Architecture Documentation](Architecture.md)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
