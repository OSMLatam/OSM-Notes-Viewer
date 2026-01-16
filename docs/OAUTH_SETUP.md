# OAuth Setup Guide

This guide explains how to set up OAuth 2.0 authentication with OpenStreetMap for the OSM Notes Viewer.

## Overview

OAuth is required for users to perform actions on notes:
- Comment on notes
- Close notes
- Reopen notes

## Prerequisites

1. An OpenStreetMap account
2. Access to OSM's OAuth application registration page

## Step 1: Register OAuth Application

1. **Log in to OpenStreetMap**: https://www.openstreetmap.org
2. **Navigate to OAuth Applications**: 
   - Go to: https://www.openstreetmap.org/user/{your_username}/oauth_clients/new
   - Or: Settings → OAuth 2 Applications → New Application

3. **Fill in Application Details**:
   - **Name**: `OSM Notes Viewer` (or your preferred name)
   - **Redirect URI**: 
     - Production: `https://notes.osm.lat/pages/auth/callback.html`
     - Development: `http://localhost:5173/pages/auth/callback.html` (adjust port if needed)
   - **Permissions**: Select `write_notes` (required for note actions: comment, close, reopen)
   - **Description**: Optional description

4. **Save the Application**:
   - You will receive a **Client ID** (public)
   - If registered as a confidential client, you'll also get a **Client Secret** (keep this secret!)

## Step 2: Configure Credentials

### ⚠️ IMPORTANT: Client Secret Security

**The Client Secret should NEVER be committed to git or stored in documentation!**

For the current implementation (public client flow), the Client Secret is **NOT needed** in the frontend. However, if you need to store it for future use or server-side implementation:

1. **Create a `.env` file** (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. **Add your credentials** to `.env`:
   ```bash
   # .env (this file is NOT tracked by git)
   # Get your credentials from: https://www.openstreetmap.org/user/{username}/oauth_clients
   VITE_OSM_CLIENT_ID=your_client_id_here
   VITE_OSM_CLIENT_SECRET=your_client_secret_here
   ```

3. **Verify `.env` is in `.gitignore`** (it should be already):
   ```bash
   git check-ignore .env
   # Should output: .env
   ```

### Current Configuration

The Client ID is already configured in `src/js/auth/osmAuth.js` as a fallback. The code will use:
1. `VITE_OSM_CLIENT_ID` from environment variables (if set)
2. Fallback to the hardcoded Client ID

**Note**: Credentials should be obtained from your OSM OAuth application settings, not from documentation.

**For production**: Set `VITE_OSM_CLIENT_ID` as an environment variable in your hosting platform (Netlify, Vercel, etc.) instead of committing it to the code.

### Why Client Secret is Not Needed

The current implementation uses **OAuth 2.0 Public Client Flow** (Authorization Code without client_secret). This is safe for frontend applications because:
- The token exchange happens in the browser
- No server-side component is needed
- The Client Secret is not required

If you later implement a server-side token exchange, you would need the Client Secret, but it should be stored securely on the server, never in frontend code.

## Step 3: Update Redirect URI

Ensure the `redirectUri` in `src/js/auth/osmAuth.js` matches your registered redirect URI:

```javascript
redirectUri: `${window.location.origin}/pages/auth/callback.html`
```

**Important**: The redirect URI must **exactly match** what you registered in OSM, including:
- Protocol (http/https)
- Domain
- Path
- Trailing slashes (or lack thereof)

## Step 4: Test OAuth Flow

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to a note page**: `/pages/note.html?id=12345`

3. **Try to comment**: Click the "Comment" button

4. **You should be redirected** to OSM's authorization page

5. **Authorize the application**

6. **You should be redirected back** to the callback page, then to the note page

7. **Verify**: You should see "Logged in as {username}" message

## Troubleshooting

### Error: "Invalid redirect_uri"

**Problem**: The redirect URI doesn't match what's registered in OSM.

**Solution**: 
- Check the redirect URI in `osmAuth.js`
- Verify it matches exactly in OSM OAuth app settings
- Ensure protocol (http/https) matches

### Error: "Invalid client_id"

**Problem**: Client ID is not set or incorrect.

**Solution**:
- Verify `.env` file exists and has `VITE_OSM_CLIENT_ID`
- Check that the client ID is correct in OSM
- Restart development server after changing `.env`

### Error: "CORS error" or "Network error"

**Problem**: Browser blocking cross-origin requests.

**Solution**:
- OSM OAuth endpoints should support CORS
- Check browser console for specific error
- Ensure you're using HTTPS in production (required for OAuth)

### Error: "Authentication expired"

**Problem**: Token expired or invalid.

**Solution**:
- User needs to log in again
- Tokens are stored in localStorage
- Clear localStorage if tokens are corrupted

## Security Considerations

1. **Never commit Client Secret**: If using a confidential client, store the secret server-side only
2. **Use HTTPS in production**: OAuth requires HTTPS (except localhost)
3. **Validate state parameter**: Already implemented for CSRF protection
4. **Token storage**: Tokens are stored in localStorage (consider HttpOnly cookies for production)

## OAuth Flow Diagram

```
User clicks "Comment"
    ↓
Check if authenticated
    ↓ (No)
Redirect to OSM authorization
    ↓
User authorizes on OSM
    ↓
OSM redirects to callback.html with code
    ↓
Exchange code for access token
    ↓
Store token in localStorage
    ↓
Redirect back to note page
    ↓
User can now perform actions
```

## API Endpoints Used

- **Authorization**: `https://www.openstreetmap.org/oauth2/authorize`
- **Token Exchange**: `https://www.openstreetmap.org/oauth2/token`
- **User Details**: `https://api.openstreetmap.org/api/0.6/user/details.json`
- **Note Comment**: `https://api.openstreetmap.org/api/0.6/notes/{id}/comment`
- **Note Close**: `https://api.openstreetmap.org/api/0.6/notes/{id}/close`
- **Note Reopen**: `https://api.openstreetmap.org/api/0.6/notes/{id}/reopen`

## Required Scopes

- `write_notes`: Required for note actions (comment, close, reopen)

## Testing Without OAuth

For development/testing, you can temporarily disable OAuth checks by modifying `handleComment`, `handleClose`, and `handleReopen` functions. However, **actual API calls will fail** without valid authentication.

## Production Deployment

1. **Register production OAuth app** with production redirect URI
2. **Set environment variable** `VITE_OSM_CLIENT_ID` in hosting platform
3. **Verify HTTPS** is enabled
4. **Test OAuth flow** in production environment

## References

- [OSM OAuth Documentation](https://wiki.openstreetmap.org/wiki/OAuth)
- [OSM API Documentation](https://wiki.openstreetmap.org/wiki/API_v0.6)
- [OAuth 2.0 Specification](https://oauth.net/2/)
