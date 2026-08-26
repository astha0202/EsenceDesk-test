# Automatic Google Reviews Sync

The reviews page is wired for Google Business Profile API review retrieval. The frontend asks `/api/reviews` on page load and again every 5 minutes. The server fetches the reviews directly from Google's API, so no local review database is required.

Google's Business Profile API provides `accounts.locations.reviews.list` for listing all reviews for a managed location. It requires OAuth 2.0 credentials and the `business.manage` scope.

## Configure

1. Create/enable a Google Cloud project for the Business Profile APIs.
2. Create an OAuth web application and complete the Google consent setup.
3. Authorize the Google account that owns/manages the eSenceDesk Business Profile using the Business Profile scope.
4. Put the OAuth client ID, client secret, refresh token, and `accounts/.../locations/...` resource into environment variables using `.env.example` as the template.
5. Run the site with a server runtime (not Live Server only):

```bash
npm install
node server.js
```

## Important

Do not commit OAuth client secrets or refresh tokens to GitHub. Keep them in environment variables or your hosting provider's secret store.

Google's Business Profile API policies also limit how Business Profile content can be stored/cached; this implementation fetches reviews on demand rather than maintaining a permanent review database.
